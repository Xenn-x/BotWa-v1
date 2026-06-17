import fs from 'fs'

const dbPath = './config/configsw.json'

let swConfig = {
    active: false,
    emoji: '🗿',
    whitelist: [],
    filterMode: true
}

// Auto Load Data
if (fs.existsSync(dbPath)) {
    try {
        swConfig = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
        console.log('✅ Data SW Emot berhasil nangkring!')
    } catch (e) {
        console.error('⚠️ Waduh, database SW gagal dimuat. Pake default dulu dah.')
    }
}

const saveConfig = () => {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(swConfig, null, 2)) 
    } catch (e) {
        console.error('⚠️ Gagal nyimpen config ngab:', e)
    }
}

export const handleStatusReaction = async (sock, m) => {
    if (!swConfig.active || m.key.fromMe) return

    const sender = m.key.participant || m.key.remoteJid

    if (swConfig.filterMode && !swConfig.whitelist.includes(sender)) return 

    try {
        const delay = Math.floor(Math.random() * 10000) + 7000 // Jeda natural
        setTimeout(async () => {
            await sock.sendMessage('status@broadcast', {
                react: { text: swConfig.emoji, key: m.key }
            }, { statusJidList: [sender] })
            console.log(`[REACT] Kasih ${swConfig.emoji} ke statusnya: ${sender.split('@')[0]}`)
        }, delay)
    } catch (e) {
        console.error('❌ Gagal ngasih emot ke status:', e)
    }
}

export const handleSwCommand = async (sock, m, args) => {
    const remoteJid = m.key.remoteJid
    const action = args[0]?.toLowerCase()
    const quotedMsg = m.message.extendedTextMessage?.contextInfo
    const quotedUser = quotedMsg?.participant || quotedMsg?.remoteJid
    
    switch(action) {
        case 'nyala':
            swConfig.active = true; saveConfig()
            return sock.sendMessage(remoteJid, { text: '✅ SW Emot: ON! Gas terus bos.' }, { quoted: m })
        
        case 'mati':
            swConfig.active = false; saveConfig()
            return sock.sendMessage(remoteJid, { text: '❌ SW Emot: OFF! Bot istirahat dulu.' }, { quoted: m })
        
        case 'swap':
            if (!args[1]) return sock.sendMessage(remoteJid, { text: '⚠️ Emot-nya mana woi? Contoh: @swemot swap 🔥' }, { quoted: m })
            swConfig.emoji = args[1]; saveConfig()
            return sock.sendMessage(remoteJid, { text: `✅ Emot sukses diganti jadi: ${args[1]}` }, { quoted: m })
        
        case 'add':
            if (!quotedUser) return sock.sendMessage(remoteJid, { text: '⚠️ Reply dulu chat/status targetnya ngab!' }, { quoted: m })
            if (swConfig.whitelist.includes(quotedUser)) return sock.sendMessage(remoteJid, { text: '⚠️ Orang ini udah masuk list bos.' }, { quoted: m })
            swConfig.whitelist.push(quotedUser); saveConfig()
            return sock.sendMessage(remoteJid, { text: `✅ @${quotedUser.split('@')[0]} berhasil masuk VIP whitelist!`, mentions: [quotedUser] }, { quoted: m })

        case 'del':
            if (!quotedUser) return sock.sendMessage(remoteJid, { text: '⚠️ Reply chat/status target yang mau ditendang!' }, { quoted: m })
            swConfig.whitelist = swConfig.whitelist.filter(id => id !== quotedUser); saveConfig()
            return sock.sendMessage(remoteJid, { text: `✅ @${quotedUser.split('@')[0]} udah ditendang dari whitelist.`, mentions: [quotedUser] }, { quoted: m })

        case 'list':
            const textList = swConfig.whitelist.map((id, i) => `${i + 1}. @${id.split('@')[0]}`).join('\n')
            return sock.sendMessage(remoteJid, { 
                text: `📜 *DATABASE SW EMOT*\n\n🔋 Status: ${swConfig.active ? 'ON' : 'OFF'}\n🎭 Emot: ${swConfig.emoji}\n👥 Total Target: ${swConfig.whitelist.length}\n\n*Daftar Whitelist:*\n${textList || 'Kosong melompong'}`,
                mentions: swConfig.whitelist 
            }, { quoted: m })

        default:
            const txt = `*SW EMOT MENU*\n\n🔋 Status: ${swConfig.active ? 'ON' : 'OFF'}\n🎭 Emot: ${swConfig.emoji}\n\n*Command:*\n- @swemot add (Reply target)\n- @swemot del (Reply target)\n- @swemot nyala / mati\n- @swemot swap <emoji>\n- @swemot list`
            return sock.sendMessage(remoteJid, { text: txt }, { quoted: m })
    }
}