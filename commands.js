const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const path = require('path');

const prefix = '!';
const adminNumber = '237696814391';

const aboutInfo = `
*PSYCHO BOT 👨🏻‍💻*
--------------------------
*Nom:* ONANA GREGOIRE LEGRAND (Psycho)
*Bio:* Passionné de cybersécurité, étudiant en informatique à l'Université de Yaoundé 1.
*Fondateur:* Communauté XYBERCLAN.
*Stack:* JavaScript, Python, Linux, PenTesting.

*Projets Phares:*
- *Psychobot:* Bot WhatsApp multifonctionnel.
- *Emma-ai:* Assistant Linux intelligent.
- *Quizbox-AI:* Détection de questions en temps réel.

*Liens:*
- Portfolio: https://psycho237-prog.github.io/Portfolio-/
- YouTube: @psychogreg
- LinkedIn: ONANA GREGOIRE LEGRAND
--------------------------
*Powered by XYBERCLAN*
`;

async function handleMessage(conn, m) {
    try {
        if (!m.messages || !m.messages[0]) return;
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption || "";

        if (!text.startsWith(prefix)) return;

        const args = text.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const isGroup = from.endsWith('@g.us');
        const sender = msg.key.participant || from;
        const isOwner = sender.includes(adminNumber);

        const reply = async (teks) => {
            await conn.sendMessage(from, { text: teks }, { quoted: msg });
        };

        switch (command) {
            case 'help':
            case 'menu':
                const menu = `
*PSYCHO BOT MENU* 🤖
-------------------
- !help : Affiche ce menu
- !about : Infos sur le créateur
- !tagall : Mentionner tout le monde (Admin)
- !pp : Voir la photo de profil
- !extract : Extraire un média
- !play : Chercher de la musique
- !promote : Nommer admin
- !demote : Retirer admin
- !delete : Supprimer un message

_Prefix: ${prefix}_
`;
                await reply(menu);
                break;

            case 'about':
                await reply(aboutInfo);
                break;

            case 'tagall':
                if (!isGroup) return reply("Cette commande est réservée aux groupes.");
                const groupMetadata = await conn.groupMetadata(from);
                const participants = groupMetadata.participants;
                let teks = `*Tag All*\n\n`;
                for (let mem of participants) {
                    teks += `@${mem.id.split('@')[0]}\n`;
                }
                await conn.sendMessage(from, { text: teks, mentions: participants.map(a => a.id) }, { quoted: msg });
                break;

            case 'pp':
                const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
                try {
                    const ppUrl = await conn.profilePictureUrl(target, 'image');
                    await conn.sendMessage(from, { image: { url: ppUrl }, caption: `Photo de @${target.split('@')[0]}` }, { quoted: msg });
                } catch (e) {
                    await reply("Impossible de récupérer la photo de profil.");
                }
                break;

            case 'play':
                await reply("La fonction !play nécessite yt-dlp et un traitement lourd. Pour l'instant, c'est désactivé sur ce serveur de session.");
                break;

            case 'promote':
            case 'demote':
            case 'delete':
                if (!isOwner) return reply("Usage réservé à l'Admin (Psycho).");
                await reply(`Commande ${command} validée, mais nécessite des permissions spéciales du bot sur le groupe.`);
                break;

            default:
                // Silent for unknown commands
                break;
        }
    } catch (e) {
        console.error("Error in bot handler:", e);
    }
}

module.exports = { handleMessage };
