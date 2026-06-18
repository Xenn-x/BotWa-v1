import { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import readline from 'readline/promises';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function startBot() {
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Menggunakan WA Web v${version.join('.')}, isLatest: ${isLatest}`);

    const { state, saveCreds } = await useMultiFileAuthState('xenn_session');

    let phoneNumber = '';
    if (!state.creds.registered) {
        let inputNumber = await rl.question('📱 Masukkan Nomor HP Bot (contoh: 628xxx): ');
        phoneNumber = inputNumber.replace(/[^0-9]/g, '');
    }

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }), 
        printQRInTerminal: false,
        auth: state,
        browser: Browsers.ubuntu('Chrome'), 
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false, 
        getMessage: async () => { return { conversation: 'Ping!' }; }
    });

    if (!sock.authState.creds.registered && phoneNumber) {
        console.log('⏳ Sabar ngab, lagi nego Pairing Code sama server WA...');
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n🔑 NIH PAIRING CODE LU: ${code?.match(/.{1,4}/g)?.join("-") || code}\n`);
            } catch (err) {
                console.error('❌ Gagal dapet kode! Coba hapus folder "xenn_session" dan ulang lagi.', err?.message);
            }
        }, 3000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                console.log('❌ Bot di-logout! Hapus folder "xenn_session" dan scan ulang.');
                process.exit(1);
            } else {
                console.log(`⚠️ Koneksi putus (Kode: ${reason}). Nyambungin ulang...`);
                startBot(); 
            }
        } else if (connection === 'open') {
            console.log('Bot online');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const m = messages[0];
        if (!m.message) return;

        try {
            const { messageHandler } = await import('./handler.js?update=' + Date.now());
            await messageHandler(sock, m);
        } catch (error) {
            console.error('⚠️ Error pas nge-load handler:', error);
        }
    });

    // Dengerin pas ada yang keluar/masuk grup
    sock.ev.on('group-participants.update', async (update) => {
        try {
            const { id, participants, action } = update;
            
            // Looping buat nyapa/ngucapin selamat tinggal
            for (const participant of participants) {
    // 1. Pastikan kita ngambil string ID-nya dulu, entah itu Object atau String
    const jid = typeof participant === 'object' ? participant.id : participant;
    
    if (action === 'add') {
        await sock.sendMessage(id, { 
            text: `Welcome to the club bos @${jid.split('@')[0]}! 🥳\n\nJangan lupa patuhi rules grup ya, jangan rusuh!`, 
            mentions: [jid] 
        });
    } else if (action === 'remove') {
        await sock.sendMessage(id, { 
            text: `Selamat jalan @${jid.split('@')[0]}... Semoga tenang di grup sebelah 👋`, 
            mentions: [jid] 
        });
    }
}
        } catch (err) {
            console.error('⚠️ Error fitur welcome/goodbye:', err);
        }
    });
}

startBot();