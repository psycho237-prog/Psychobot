const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const path = require('path');
const pino = require('pino');

const prefix = '!';
const adminNumber = '237696814391';

// Cache to store view-once media contents temporarily
const viewOnceCache = new Map();

// Cleanup cache every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [id, data] of viewOnceCache.entries()) {
        if (now - data.timestamp > 3600000) viewOnceCache.delete(id);
    }
}, 600000);

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

        // 1. CACHE VIEW-ONCE MESSAGES AS THEY ARRIVE
        const isViewOnce = msg.message.viewOnceMessage || msg.message.viewOnceMessageV2;
        if (isViewOnce) {
            viewOnceCache.set(msg.key.id, {
                message: isViewOnce.message,
                timestamp: Date.now()
            });
        }

        // 2. HANDLE REACTIONS FOR ANONYMOUS EXTRACTION
        if (msg.message.reactionMessage) {
            const reaction = msg.message.reactionMessage;
            const targetId = reaction.key.id;
            const cached = viewOnceCache.get(targetId);

            if (cached) {
                const reactor = msg.key.participant || from;
                try {
                    const viewOncePhoto = cached.message.imageMessage;
                    const viewOnceVideo = cached.message.videoMessage;

                    const buffer = await downloadMediaMessage(
                        { message: cached.message },
                        'buffer',
                        {},
                        { logger: pino({ level: 'fatal' }), rekey: true }
                    );

                    const caption = "🕵️ *Extraction Anonyme*\n_Voici le média à vue unique demandé._";

                    if (viewOncePhoto) {
                        await conn.sendMessage(reactor, { image: buffer, caption });
                    } else if (viewOnceVideo) {
                        await conn.sendMessage(reactor, { video: buffer, caption });
                    }

                    // Optional: remove from cache after extraction? 
                    // No, let others extract if they want or keep for TTL.
                } catch (e) {
                    console.error("Reaction extraction error:", e);
                }
            }
            return; // Don't process reactions as commands
        }

        if (!text.startsWith(prefix)) return;

        const args = text.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const isGroup = from.endsWith('@g.us');
        const sender = msg.key.participant || from;

        // Dynamic Admin Recognition for SaaS
        // The person who paired the bot is its owner/admin
        const botOwner = conn.user.id.split(':')[0];
        const isOwner = sender.includes(botOwner) || sender.includes(adminNumber);

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

            case 'extract':
                const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                if (!quoted) return reply("Répondez à un message 'Vue Unique' avec !extract");

                // Check for view-once in photo or video
                const viewOncePhoto = quoted.viewOnceMessage?.message?.imageMessage || quoted.viewOnceMessageV2?.message?.imageMessage;
                const viewOnceVideo = quoted.viewOnceMessage?.message?.videoMessage || quoted.viewOnceMessageV2?.message?.videoMessage;

                if (!viewOncePhoto && !viewOnceVideo) {
                    return reply("Ce n'est pas un message 'Vue Unique'.");
                }

                try {
                    await reply("Extraction en cours... 🔄");
                    const mediaMsg = {
                        message: viewOncePhoto ? (quoted.viewOnceMessage?.message || quoted.viewOnceMessageV2?.message) : (quoted.viewOnceMessage?.message || quoted.viewOnceMessageV2?.message)
                    };

                    const buffer = await downloadMediaMessage(
                        { message: mediaMsg.message },
                        'buffer',
                        {},
                        { logger: pino({ level: 'fatal' }), rekey: true }
                    );

                    if (viewOncePhoto) {
                        await conn.sendMessage(from, { image: buffer, caption: "✅ Image extraite par Psycho Bot" }, { quoted: msg });
                    } else {
                        await conn.sendMessage(from, { video: buffer, caption: "✅ Vidéo extraite par Psycho Bot" }, { quoted: msg });
                    }
                } catch (e) {
                    console.error("Extraction error:", e);
                    await reply("Échec de l'extraction. Le média a peut-être déjà été expiré ou est corrompu.");
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
