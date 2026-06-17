import fs from 'fs'
import { downloadContentFromMessage, downloadMediaMessage } from '@whiskeysockets/baileys'
import { handleStatusReaction, handleSwCommand } from './lib/swEmot.js'
import { tiktok2 } from './lib/tiktokdld.js'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import Jimp from 'jimp'

// 1. CONFIG OWNER
const ownerNumber = '263548185911443' // Ingat, ini kode negara Zimbabwe wkwk
const longSpace = '\u2800\n'.repeat(29) 

// Tinggal lo ganti teksnya sesuai selera
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

    // Efek semi-blur ala brat
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
    // 1. Kita masukin Menu aja dulu sebagai pancingan
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
                grouped[cat].push(`- *@${cmd}${aliasText}* : ${commands[cmd].desc}`);
            }

            for (const cat in grouped) {
                menuText += `*${cat}*\n${grouped[cat].join('\n')}\n\n`;
            }
            menuText += `> *Bot by Xenn 💻 | Auto-Generated Menu*`;

            await sock.sendMessage(remoteJid, { text: menuText }, { quoted: m })
        }
    }
    // Nanti lu bisa tambahin fitur lain ke sini pelan-pelan
};

// Daftarin alias buat menu
commands['help'] = { hide: true, run: commands['menu'].run };

// --- HANDLER UTAMA ---
export async function messageHandler(sock, m) {
    try {
        if (!m.message) return

        const remoteJid = m.key.remoteJid;
        
        // --- TAMBAHIN BARIS INI DI SINI ---
        const isGroup = remoteJid?.endsWith('@g.us'); 
        // ----------------------------------

        // ... (Kalo ada definisi textMessage atau senderJid biarin aja di sini) ...

        // 1. KITA CEK DULU STATUS ADMIN
        let isSenderAdmin = false;
        let isBotAdmin = false;

        if (isGroup) { // Nah, sekarang mesinnya udah tau isGroup itu apa!
            const groupMeta = await sock.groupMetadata(remoteJid);
            // ... kode admin lu ...
        } 

        const isStatus = remoteJid === 'status@broadcast'
        if (isStatus) {
            await handleStatusReaction(sock, m)
            return
        }

        // --- 🔥 ILMU HITAM ANTI-LID DARI GITHUB 🔥 ---
        let senderJid = m.key.participant || remoteJid
        if (m.key.senderPn) {
            senderJid = m.key.senderPn
        }
        const senderNumber = senderJid.split('@')[0].split(':')[0] 
        const isOwner = senderNumber === ownerNumber

        const textMessage = m.message.conversation || m.message.extendedTextMessage?.text || ""

        // ==========================================
        // 🌟 CCTV TERMINAL SUPER BERSIH 🌟
        // ==========================================
        if (textMessage || m.message.imageMessage || m.message.videoMessage) {
            const isGroup = remoteJid.endsWith('@g.us')
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

        // ==========================================
        // 🛡️ SISTEM KEAMANAN GRUP (ANTI-LINK)
        // ==========================================

        if (isGroup) {
            const groupMeta = await sock.groupMetadata(remoteJid)
            const groupAdmins = groupMeta.participants.filter(v => v.admin !== null).map(v => v.id)
            
            isSenderAdmin = groupAdmins.includes(senderJid)
            // Cek apakah bot dikasih pangkat admin
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net'
            isBotAdmin = groupAdmins.includes(botId)

            // Radar Pendeteksi Link (WA, Web, Pinjol, dll)
            const linkRegex = /(chat\.whatsapp\.com|wa\.me|bit\.ly|https?:\/\/)/i
            
            if (linkRegex.test(textMessage) && !isSenderAdmin && !isOwner) {
                if (!isBotAdmin) {
                    console.log('Ada yang ngirim link, tapi bot bukan admin jadi gabisa ngapus pesannya.')
                } else {
                    // Eksekusi: Hapus pesan & kasih peringatan
                    await sock.sendMessage(remoteJid, { delete: m.key })
                    await sock.sendMessage(remoteJid, { 
                        text: `⚠️ *ANTI-LINK DETECTED*\n\nMaaf @${senderNumber}, ngirim link dilarang keras di grup ini. Pesan lu gue sapu! 🧹`,
                        mentions: [senderJid]
                    })
                    return // Berhenti di sini, command di bawah gak akan dieksekusi
                }
            }
        }
        // ==========================================
        // ==========================================

        if (!textMessage.startsWith('@')) return

        const args = textMessage.slice(1).trim().split(/\s+/)
        const command = args.shift().toLowerCase()
        const textArgs = args.join(' ')

        const ctx = { 
            isGroup, isSenderAdmin: false, isOwner, isBotAdmin: false, // (isSenderAdmin dll sesuain sama var di code lu ya)
            pushName: m.pushName || 'User', 
            jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), 
            senderNumber, senderJid, textMessage, command 
        }

        // 🚦 EXECUTION ROUTER (Cek di Object dulu)
        if (commands[command]) {
            try {
                await commands[command].run(sock, m, remoteJid, args, textArgs, ctx)
            } catch (err) {
                console.error(`⚠️ Error di command ${command}:`, err)
                await sock.sendMessage(remoteJid, { text: '❌ Waduh, mesin botnya error pas jalanin ini ngab.' }, { quoted: m })
            }
        } 
        // Kalau ga ada di Object, baru lari ke Switch-Case lama lu
        else {

        switch (command) {
            case 'ping':
                await sock.sendMessage(remoteJid, { text: 'System loaded succesfully ✅' }, { quoted: m })
                break

            case 'rvo':
            case 'readviewonce':
                if (!isOwner && !m.key.fromMe) return sock.sendMessage(remoteJid, { text: 'Akses Ditolak!' }, { quoted: m })

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
                break

            case 'swemot':
                if (isOwner) {
                    await handleSwCommand(sock, m, args)
                } else {
                    await sock.sendMessage(remoteJid, { text: '⛔ Eits, dilarang masuk! Ini fitur khusus Bos Xenn.' }, { quoted: m })
                }
                break

            case 'shutdown':
                if (!isOwner) return
                await sock.sendMessage(remoteJid, { text: '👋 Oke bos, bot cabut dulu...' })
                process.exit()
                break

            case 'ttdl':
            case 'tiktok':
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
                break

            case 'hidetag':
                if (!remoteJid.endsWith('@g.us') || !isOwner) return
                try {
                    const groupMetadata = await sock.groupMetadata(remoteJid)
                    const participants = groupMetadata.participants
                    const allMembers = participants.map(mem => mem.id)
                    const commandRegex = new RegExp(`^@${command}\\s*`, 'i')
                    const pesan = textMessage.replace(commandRegex, '').trim() || '📢 *PENGUMUMAN PENTING* 📢'

                    await sock.sendMessage(remoteJid, { text: pesan, mentions: allMembers })
                } catch (err) {
                    await sock.sendMessage(remoteJid, { text: '❌ Waduh gagal hidetag, bot udah jadi admin belum?' }, { quoted: m })
                }
                break

            // --- FITUR STICKER BARU ---
            case 's':
            case 'sticker':
                try {
                    const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage
                    const isMedia = m.message.imageMessage || m.message.videoMessage || quoted?.imageMessage || quoted?.videoMessage
                    
                    if (!isMedia) return await sock.sendMessage(remoteJid, { text: '⚠️ Kirim/reply gambar atau video (<10 detik) dengan caption @s' }, { quoted: m })

                    await sock.sendMessage(remoteJid, { react: { text: '⏳', key: m.key }})
                    
                    // Nentuin target download (pesan asli atau yang direply)
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
                break

            case 'brat':
                if (!textArgs) return await sock.sendMessage(remoteJid, { text: '⚠️ Contoh: @brat anak rpl nih senggol dong' }, { quoted: m })
                await sock.sendMessage(remoteJid, { react: { text: '✍️', key: m.key }})

                const bratBuffer = await makeBratSticker(textArgs)
                if (!bratBuffer) return await sock.sendMessage(remoteJid, { text: '❌ Gagal membuat brat sticker.' }, { quoted: m })

                await sock.sendMessage(remoteJid, { sticker: bratBuffer }, { quoted: m })
                break

            case 'meme':
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
                break

        // --- FITUR AUTO-KICK ---
            case 'kick':
            case 'tendang':
                if (!isGroup) return await sock.sendMessage(remoteJid, { text: '⚠️ Woy, fitur ini cuma bisa dipake di dalem grup!' }, { quoted: m })
                if (!isSenderAdmin && !isOwner) return await sock.sendMessage(remoteJid, { text: '⚠️ Lu sapa? Fitur sadis ini cuma buat Admin & Owner!' }, { quoted: m })
                if (!isBotAdmin) return await sock.sendMessage(remoteJid, { text: '⚠️ Botnya jadiin admin dulu bos, gimana mau nendang anak orang!' }, { quoted: m })

                // Cari tau siapa targetnya (bisa dari reply chat atau di-tag langsung)
                const quotedUser = m.message.extendedTextMessage?.contextInfo?.participant
                const mentionedUsers = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
                const targetKick = quotedUser || (mentionedUsers.length > 0 ? mentionedUsers[0] : null)

                if (!targetKick) return await sock.sendMessage(remoteJid, { text: '⚠️ Tag atau balas chat orang yang mau ditendang!\nContoh: *@kick @orangnya*' }, { quoted: m })
                if (targetKick === ownerNumber + '@s.whatsapp.net') return await sock.sendMessage(remoteJid, { text: '⚠️ Mana berani gue nendang Bos Xenn!' }, { quoted: m })
                if (targetKick === sock.user.id.split(':')[0] + '@s.whatsapp.net') return await sock.sendMessage(remoteJid, { text: '⚠️ Buset, botnya mau nendang diri sendiri?!' }, { quoted: m })

                // Eksekusi Tendang
                await sock.sendMessage(remoteJid, { text: `👢 Bye bye @${targetKick.split('@')[0]}... Sayonara!`, mentions: [targetKick] })
                await sock.groupParticipantsUpdate(remoteJid, [targetKick], 'remove')
                break
                }
            }
        } catch (err) {
            console.error('⚠️ Error di handler utama:', err)
            }
}