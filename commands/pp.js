// commands/pp.js
const log = require('../logger')(module);

module.exports = {
    name: "pp",
    description: "Télécharge la photo de profil d'une personne en pleine résolution",
    adminOnly: false,
    run: async ({ sock, msg, args, replyWithTag }) => {
        try {
            const remoteJid = msg.key.remoteJid;
            const isGroup = remoteJid.endsWith("@g.us");

            let targetJid;
            const OWNER_PN = "237696814391";
            const OWNER_LID = "250865332039895";

            if (isGroup && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                targetJid = msg.message.extendedTextMessage.contextInfo.participant;
            } else {
                targetJid = isGroup ? msg.key.participant : remoteJid;
            }

            if (!targetJid) {
                return replyWithTag(sock, remoteJid, msg, "⚠️ Impossible de déterminer la personne.");
            }

            const cleanTarget = targetJid.split(':')[0].split('@')[0];
            if (cleanTarget === OWNER_PN || cleanTarget === OWNER_LID) {
                return replyWithTag(sock, remoteJid, msg, "🛡️ La photo de profil du propriétaire est protégée.");
            }

            // Récupérer la photo de profil en pleine résolution
            const ppUrl = await sock.profilePictureUrl(targetJid, 'image').catch(() => null);

            if (!ppUrl) {
                return replyWithTag(sock, remoteJid, msg, "⚠️ Cette personne n'a pas de photo de profil.");
            }

            await sock.sendMessage(remoteJid, { image: { url: ppUrl }, caption: "📸 Photo de profil" }, { quoted: msg });
            log(`[PP] Photo de profil envoyée pour ${targetJid}`);

        } catch (err) {
            console.error("[PP] Erreur :", err);
            await replyWithTag(sock, msg.key.remoteJid, msg, "❌ Une erreur est survenue lors de la récupération de la photo de profil.");
        }
    },
};