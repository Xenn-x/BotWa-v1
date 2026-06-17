import fs from 'fs'
import { downloadContentFromMessage, downloadMediaMessage } from '@whiskeysockets/baileys'
import { handleStatusReaction, handleSwCommand } from './lib/swEmot.js'
import { tiktok2 } from './lib/tiktokdld.js'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import Jimp from 'jimp'

// 1. CONFIG OWNER
const ownerNumber = '263548185911443' 
const longSpace = '\u2800\n'.repeat(29) 

const packname = `Created by Xenn Project\n\n${longSpace}make doang gk donate\nhttps://tako.id/Xenn_al\nFollow`
const author = 'Follow ig- @Xenn_al_'

// --- UTILITY STICKER ---
const createSticker = async (buffer, type = StickerTypes.FULL, pName = packname, aName = author) => {
    const sticker = new Sticker(buffer, {
        pack: pName,
        author: aName,
        type: type,
        quality: 70,
    })
    return await sticker.toBuffer()
}

const makeBratSticker = async (text) => {
    if (!text) return null;
    const image = new Jimp(512, 512, 0xFFFFFFFF);
    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
    
    const centerX = 256;
    const centerY = 256;
    const textWidth = Jimp.measureText(font, text);
    const textHeight = Jimp.measureTextHeight(font, text, 480);

    const x = centerX - (textWidth / 2);
    const y = centerY - (textHeight / 2);

    image.print(font, x+2, y+2, { text: text, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, 480);
    image.print(font, x-2, y-2, { text: text, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, 480);
    image.print(font, x, y, { text: text, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, 480);

    const imageBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
    return await createSticker(imageBuffer, StickerTypes.FULL);
};

// ==========================================
// 🧠 COMMAND REGISTRY (AUTO-UPDATE MENU)
// ==========================================
const commands = {
    'menu': {
        kategori: '🛠️ UTILITY',
        desc: 'Nampilin daftar fitur otomatis',
        aliases: ['help'],
        run: async (sock, m, remoteJid, args, textArgs, ctx) => {
            let menuText = `*🤖 XENNBOT V2 COMMAND MENU 🤖*\n\n👤 *User :* ${ctx.pushName}\n⏰ *Waktu :* ${ctx.jam}\n\n`;
            
            const grouped = {};
            for (const cmd in commands) {
                if (commands[cmd].hide) continue; 
                const cat = commands[cmd].kategori;
                if (!grouped[cat]) grouped[cat] = [];
                
                const aliasText = commands[cmd].aliases ? ` / @${commands[cmd].aliases.join(' / @')}` : '';
                grouped[cat].push(`- */${cmd}${aliasText}* : ${commands[cmd].desc}`);
            }

            for (const cat in grouped) {
                menuText += `*${cat}*\n${grouped[cat].join('\n')}\n\n`;
            }
            menuText += `> *Bot by Xenn 💻 | Auto-Generated Menu*`;

            await sock.sendMessage(remoteJid, { text: menuText }, { quoted: m })
        }
    },
        'ping': {
            kategori: '🛠️ UTILITY',
            desc: 'Cek respon & info server',
            aliases: ['info', 'server'],
            run: async (sock, m, remoteJid, args, textArgs, ctx) => {
                const os = await import('os');

                // Kalkulasi Latensi (Ping)
                const timestamp = m.messageTimestamp.low ? m.messageTimestamp.low : m.messageTimestamp;
                const latency = Date.now() - (timestamp * 1000);

                // Kalkulasi RAM
                const totalMem = os.totalmem();
                const freeMem = os.freemem();
                const usedMem = totalMem - freeMem;
                const formatSize = (bytes) => (bytes / (1024 ** 3)).toFixed(2) + ' GB';

                // Kalkulasi Uptime Server
                const uptimeSeconds = os.uptime();
                const days = Math.floor(uptimeSeconds / (3600 * 24));
                const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
                const minutes = Math.floor((uptimeSeconds % 3600) / 60);
            
                // Ambil Info CPU
                const cpuModel = os.cpus()[0].model;
                const cpuCores = os.cpus().length;
            
                const serverInfo = `*>-< || SERVER STATUS || >-<*

    *>- Speed:* ${latency} ms
    *>- Uptime:* ${days} Hari ${hours} Jam ${minutes} Menit
    *>- OS:* ${os.type()} ${os.release()} (${os.arch()})
    *>- CPU:* ${cpuModel} (${cpuCores} Cores)
    *>- RAM:* ${formatSize(usedMem)} / ${formatSize(totalMem)}
            
> *Xenn-Bot System Monitor*`;
            
                await sock.sendMessage(remoteJid, { text: serverInfo }, { quoted: m });
            }
        },
    'rvo': {
        kategori: '👑 OWNER ONLY',
        desc: 'Bobol media 1x lihat',
        aliases: ['readviewonce'],
        run: async (sock, m, remoteJid, args, textArgs, ctx) => {
            if (!ctx.isOwner && !m.key.fromMe) return sock.sendMessage(remoteJid, { text: 'Akses Ditolak!' }, { quoted: m })

            const quotedMsg = m.message.extendedTextMessage?.contextInfo?.quotedMessage
            if (!quotedMsg) return sock.sendMessage(remoteJid, { text: '⚠️ Bos, reply dulu foto/video 1x lihatnya!' }, { quoted: m })

            let realMsg = quotedMsg.viewOnceMessageV2?.message || quotedMsg.viewOnceMessage?.message || quotedMsg.viewOnceMessageV2Extension?.message || quotedMsg
            const mediaType = Object.keys(realMsg).find(key => key === 'imageMessage' || key === 'videoMessage')
            
            if (!mediaType) return sock.sendMessage(remoteJid, { text: 'yang lu reply bukan media bos!' }, { quoted: m })

            const mediaObj = realMsg[mediaType]
            const isViewOnce = mediaObj?.viewOnce || quotedMsg.viewOnceMessageV2 || quotedMsg.viewOnceMessage || quotedMsg.viewOnceMessageV2Extension
            
            if (!isViewOnce) return sock.sendMessage(remoteJid, { text: '⚠️ Kocak, itu kan foto/video biasa, ngapain dibobol!' }, { quoted: m })

            await sock.sendMessage(remoteJid, { react: { text: '⏳', key: m.key } })

            try {
                const stream = await downloadContentFromMessage(mediaObj, mediaType.replace('Message', ''))
                let buffer = Buffer.from([])
                for await(const chunk of stream) buffer = Buffer.concat([buffer, chunk])

                const finalCaption = mediaObj.caption ? `\n> *Caption:* ${mediaObj.caption}` : ''

                if (mediaType === 'imageMessage') {
                    await sock.sendMessage(remoteJid, { image: buffer, caption: finalCaption }, { quoted: m })
                } else if (mediaType === 'videoMessage') {
                    await sock.sendMessage(remoteJid, { video: buffer, caption: finalCaption, mimetype: 'video/mp4' }, { quoted: m })
                }
                
                await sock.sendMessage(remoteJid, { react: { text: '🔥', key: m.key } })
            } catch (err) {
                console.error('Error bobol RVO:', err)
                await sock.sendMessage(remoteJid, { text: 'Waduh, gagal jir' }, { quoted: m })
            }
        }
    },
    'swemot': {
        kategori: '👑 OWNER ONLY',
        desc: 'Menu radar react status',
        run: async (sock, m, remoteJid, args, textArgs, ctx) => {
            if (ctx.isOwner) {
                await handleSwCommand(sock, m, args)
            } else {
                await sock.sendMessage(remoteJid, { text: '⛔ Eits, dilarang masuk! Ini fitur khusus Bos Xenn.' }, { quoted: m })
            }
        }
    },
    'shutdown': {
        kategori: '👑 OWNER ONLY',
        desc: 'Matiin mesin bot',
        run: async (sock, m, remoteJid, args, textArgs, ctx) => {
            if (!ctx.isOwner) return
            await sock.sendMessage(remoteJid, { text: '👋 Oke bos, bot cabut dulu...' })
            process.exit()
        }
    },
    'ttdl': {
        kategori: '🎨 STICKER & MEDIA',
        desc: 'Download VT tanpa watermark',
        aliases: ['tiktok'],
        run: async (sock, m, remoteJid, args) => {
            if (!args[0]) return sock.sendMessage(remoteJid, { text: '⚠ *Mana link TikTok-nya ngab?*' }, { quoted: m })

            await sock.sendMessage(remoteJid, { react: { text: '⏳', key: m.key } })
            try {
                const result = await tiktok2(args[0])
                await sock.sendMessage(
                    remoteJid,
                    {
                        video: result.videoBuffer,
                        mimetype: 'video/mp4',
                        caption: `*🎁 Xenn Tiktok Downloader*\n\n👤 *Author:* @${result.author}\n📝 *Desc:* ${result.title}\n🎵 *Music:* ${result.music}\n\n> *di-download pake keringat xennBot*`
                    },
                    { quoted: m }
                )
                await sock.sendMessage(remoteJid, { react: { text: '✅', key: m.key } })
            } catch (error) {
                await sock.sendMessage(remoteJid, { text: '❌ *Waduh gagal!* Link-nya bener ga tuh?' }, { quoted: m })
            }
        }
    },
    'hidetag': {
        kategori: '👑 OWNER ONLY',
        desc: 'Tag semua member tanpa ketahuan',
        run: async (sock, m, remoteJid, args, textArgs, ctx) => {
            if (!ctx.isGroup || !ctx.isOwner) return
            try {
                const groupMetadata = await sock.groupMetadata(remoteJid)
                const participants = groupMetadata.participants
                const allMembers = participants.map(mem => mem.id)
                const commandRegex = new RegExp(`^@${ctx.command}\\s*`, 'i')
                const pesan = ctx.textMessage.replace(commandRegex, '').trim() || '📢 *PENGUMUMAN PENTING* 📢'

                await sock.sendMessage(remoteJid, { text: pesan, mentions: allMembers })
            } catch (err) {
                await sock.sendMessage(remoteJid, { text: '❌ Waduh gagal hidetag, bot udah jadi admin belum?' }, { quoted: m })
            }
        }
    },
    's': {
        kategori: '🎨 STICKER & MEDIA',
        desc: 'Convert gambar/video jadi stiker',
        aliases: ['sticker'],
        run: async (sock, m, remoteJid) => {
            try {
                const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage
                const isMedia = m.message.imageMessage || m.message.videoMessage || quoted?.imageMessage || quoted?.videoMessage
                
                if (!isMedia) return await sock.sendMessage(remoteJid, { text: '⚠️ Kirim/reply gambar atau video (<10 detik) dengan caption @s' }, { quoted: m })

                await sock.sendMessage(remoteJid, { react: { text: '⏳', key: m.key }})
                
                let mediaTarget = quoted?.imageMessage || quoted?.videoMessage ? quoted : m.message
                let mediaType = mediaTarget.imageMessage ? 'imageMessage' : 'videoMessage'
                
                const stream = await downloadContentFromMessage(mediaTarget[mediaType], mediaType.replace('Message', ''))
                let mediaBuffer = Buffer.from([])
                for await(const chunk of stream) mediaBuffer = Buffer.concat([mediaBuffer, chunk])

                let stickerType = mediaType === 'videoMessage' ? StickerTypes.CROP : StickerTypes.FULL;
                const stickerBuffer = await createSticker(mediaBuffer, stickerType)
                
                await sock.sendMessage(remoteJid, { sticker: stickerBuffer }, { quoted: m })
                await sock.sendMessage(remoteJid, { react: { text: '✅', key: m.key }})
            } catch (err) {
                console.error(err)
                await sock.sendMessage(remoteJid, { text: '❌ Gagal bikin stiker ngab.' }, { quoted: m })
            }
        }
    },
    'brat': {
        kategori: '🎨 STICKER & MEDIA',
        desc: 'Bikin stiker teks ala brat',
        run: async (sock, m, remoteJid, args, textArgs) => {
            if (!textArgs) return await sock.sendMessage(remoteJid, { text: '⚠️ Contoh: @brat anak rpl nih senggol dong' }, { quoted: m })
            await sock.sendMessage(remoteJid, { react: { text: '✍️', key: m.key }})

            const bratBuffer = await makeBratSticker(textArgs)
            if (!bratBuffer) return await sock.sendMessage(remoteJid, { text: '❌ Gagal membuat brat sticker.' }, { quoted: m })

            await sock.sendMessage(remoteJid, { sticker: bratBuffer }, { quoted: m })
        }
    },
    'meme': {
        kategori: '🎨 STICKER & MEDIA',
        desc: 'Nempelin teks meme di gambar',
        run: async (sock, m, remoteJid, args, textArgs) => {
            try {
                const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage
                const isImage = m.message.imageMessage || quoted?.imageMessage
                
                if (!isImage) return await sock.sendMessage(remoteJid, { text: '⚠️ Balas/kirim GAMBAR dengan caption @meme Atas | Bawah' }, { quoted: m })
                if (!textArgs.includes('|')) return await sock.sendMessage(remoteJid, { text: '⚠️ Gunakan format: @meme Teks Atas | Teks Bawah' }, { quoted: m })

                await sock.sendMessage(remoteJid, { react: { text: '⏳', key: m.key }})
                
                let mediaTarget = quoted?.imageMessage ? quoted : m.message
                const stream = await downloadContentFromMessage(mediaTarget.imageMessage, 'image')
                let mediaBuffer = Buffer.from([])
                for await(const chunk of stream) mediaBuffer = Buffer.concat([mediaBuffer, chunk])

                const [topText, bottomText] = textArgs.split('|').map(t => t.trim())

                const image = await Jimp.read(mediaBuffer)
                image.cover(512, 512)
                const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE)
                const fontBorder = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK)

                const printOutline = (img, fnt, fntBorder, x, y, txt, width) => {
                     img.print(fntBorder, x-2, y-2, { text: txt, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, width)
                     img.print(fntBorder, x+2, y-2, { text: txt, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, width)
                     img.print(fntBorder, x-2, y+2, { text: txt, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, width)
                     img.print(fntBorder, x+2, y+2, { text: txt, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, width)
                     img.print(fnt, x, y, { text: txt, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, width)
                }

                if (topText) printOutline(image, font, fontBorder, 10, 20, topText, 492)
                if (bottomText) {
                    const bottomHeight = Jimp.measureTextHeight(font, bottomText, 492)
                    printOutline(image, font, fontBorder, 10, 512 - bottomHeight - 20, bottomText, 492)
                }

                const memeBuffer = await image.getBufferAsync(Jimp.MIME_PNG)
                const stickerMeme = await createSticker(memeBuffer, StickerTypes.FULL)
                
                await sock.sendMessage(remoteJid, { sticker: stickerMeme }, { quoted: m })
                await sock.sendMessage(remoteJid, { react: { text: '✅', key: m.key }})
            } catch (err) {
                console.error(err)
                await sock.sendMessage(remoteJid, { text: '❌ Gagal bikin meme ngab.' }, { quoted: m })
            }
        }
    },
    'kick': {
        kategori: '🛡️ ADMIN & GRUP',
        desc: 'Tendang member dari grup',
        aliases: ['tendang', 'kill_him', 'eliminate'],
        run: async (sock, m, remoteJid, args, textArgs, ctx) => {
            if (!ctx.isGroup) return await sock.sendMessage(remoteJid, { text: '⚠️ Woy, fitur ini cuma bisa dipake di dalem grup!' }, { quoted: m })
            if (!ctx.isSenderAdmin && !ctx.isOwner) return await sock.sendMessage(remoteJid, { text: '⚠️ Lu sapa? Fitur sadis ini cuma buat Admin & Owner!' }, { quoted: m })
            if (!ctx.isBotAdmin) return await sock.sendMessage(remoteJid, { text: '⚠️ Botnya jadiin admin dulu bos, gimana mau nendang anak orang!' }, { quoted: m })

            const quotedUser = m.message.extendedTextMessage?.contextInfo?.participant
            const mentionedUsers = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
            const targetKick = quotedUser || (mentionedUsers.length > 0 ? mentionedUsers[0] : null)

            if (!targetKick) return await sock.sendMessage(remoteJid, { text: '⚠️ Tag atau balas chat orang yang mau ditendang!\nContoh: *@kick @orangnya*' }, { quoted: m })
            if (targetKick === ownerNumber + '@s.whatsapp.net') return await sock.sendMessage(remoteJid, { text: '⚠️ Mana berani gue nendang Bos Xenn!' }, { quoted: m })
            if (targetKick === sock.user.id.split(':')[0] + '@s.whatsapp.net') return await sock.sendMessage(remoteJid, { text: '⚠️ Buset, botnya mau nendang diri sendiri?!' }, { quoted: m })

            await sock.sendMessage(remoteJid, { text: `Bye bye @${targetKick.split('@')[0]}... Sayonara!`, mentions: [targetKick] })
            await sock.groupParticipantsUpdate(remoteJid, [targetKick], 'remove')
        }
    }
};

// ==========================================
// ⚙️ AUTO-REGISTER ALIAS (Biar gk ribet nulis manual)
// ==========================================
for (const cmd in commands) {
    if (commands[cmd].aliases) {
        commands[cmd].aliases.forEach(alias => {
            commands[alias] = { hide: true, run: commands[cmd].run };
        });
    }
}

// --- HANDLER UTAMA ---
export async function messageHandler(sock, m) {
    try {
        if (!m.message) return

const remoteJid = m.key.remoteJid;
        const isGroup = remoteJid?.endsWith('@g.us'); 

        // 1. 🔥 KELUARIN ILMU HITAM ANTI-LID DULU (Pindah ke Atas!) 🔥
        let senderJid = m.key.participant || remoteJid;
        if (m.key.senderPn) {
            senderJid = m.key.senderPn;
        }
        const senderNumber = senderJid.split('@')[0].split(':')[0];
        const isOwner = senderNumber === ownerNumber;

        // 2. 🛡️ BARU KITA CEK STATUS ADMIN 🛡️
        let isSenderAdmin = false;
        let isBotAdmin = false;

        if (isGroup) { 
            const groupMeta = await sock.groupMetadata(remoteJid);
            const groupAdmins = groupMeta.participants.filter(v => v.admin !== null).map(v => v.id);
            
            // Sekarang ngeceknya pake senderJid yang udah tembus anti-LID
            isSenderAdmin = groupAdmins.includes(senderJid);
            const botNumber = '263548185911443'; 
            
            // Cek: Apakah ada salah satu ID admin yang MENGANDUNG nomor bot?
            isBotAdmin = groupAdmins.some(adminId => adminId.includes(botNumber));
        } 

        // 3. CEK STATUS WA
        const isStatus = remoteJid === 'status@broadcast';
        if (isStatus) {
            await handleStatusReaction(sock, m);
            return;
        }

        const textMessage = m.message.conversation || m.message.extendedTextMessage?.text || "";

        // (Lanjut ke kode CCTV Terminal lu di bawahnya...)
        if (textMessage || m.message.imageMessage || m.message.videoMessage) {
            let chatType = 'Pribadi'

            if (isGroup) {
                try {
                    const groupMeta = await sock.groupMetadata(remoteJid)
                    chatType = `Grub [${groupMeta.subject}]`
                } catch (err) {
                    chatType = `Grub [Nama Tidak Diketahui]`
                }
            }
            
            const pushName = m.pushName || 'Tanpa Nama'
            const now = new Date()
            const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            const tglBulanTahun = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
            
            let logType = textMessage ? textMessage : (m.message.imageMessage ? '[Gambar]' : '[Video]')
            
            console.log('\n=-====-====-====-====-====-=')
            console.log(chatType)
            console.log(`${senderNumber} (${pushName}) : ${logType}`)
            console.log(`${jam} ${tglBulanTahun}`)
        }

        if (isGroup) {
            const linkRegex = /(chat\.whatsapp\.com|wa\.me|bit\.ly|https?:\/\/)/i
            
            if (linkRegex.test(textMessage) && !isSenderAdmin && !isOwner) {
                if (!isBotAdmin) {
                    console.log('Ada yang ngirim link, tapi bot bukan admin jadi gabisa ngapus pesannya.')
                } else {
                    await sock.sendMessage(remoteJid, { delete: m.key })
                    await sock.sendMessage(remoteJid, { 
                        text: `⚠️ *ANTI-LINK DETECTED*\n\nMaaf @${senderNumber}, ngirim link dilarang keras di grup ini. Pesan lu gue sapu! 🧹`,
                        mentions: [senderJid]
                    })
                    return 
                }
            }
        }

        if (!textMessage.startsWith('/')) return

        const args = textMessage.slice(1).trim().split(/\s+/)
        const command = args.shift().toLowerCase()
        const textArgs = args.join(' ')

        const ctx = { 
            isGroup, isSenderAdmin, isOwner, isBotAdmin,
            pushName: m.pushName || 'User', 
            jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), 
            senderNumber, senderJid, textMessage, command 
        }

        if (commands[command]) {
            try {
                await commands[command].run(sock, m, remoteJid, args, textArgs, ctx)
            } catch (err) {
                console.error(`⚠️ Error di command ${command}:`, err)
                await sock.sendMessage(remoteJid, { text: '❌ Waduh, mesin botnya error pas jalanin ini ngab.' }, { quoted: m })
            }
        } 
    } catch (err) {
        console.error('⚠️ Error di handler utama:', err)
    }
}