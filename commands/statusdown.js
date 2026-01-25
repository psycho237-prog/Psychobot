// commands/statusdown.js
const fs = require("fs");
const path = require("path");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

module.exports = {
    name: "statusdown",
    description: "Télécharge le statut d'un contact (répondre au statut avec la commande).",
    run: async ({ sock, msg, replyWithTag }) => {
        try {
            const remoteJid = msg.key.remoteJid;

            // Vérifie si on répond à un message
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted) {
                return await replyWithTag(sock, remoteJid, msg, "⚠️ Vous devez répondre à un statut avec cette commande.");
            }

            // Extraire le vrai message (peut être dans viewOnceMessage, ephemeralMessage, ou direct)
            let realMsg = quoted.viewOnceMessage?.message ||
                quoted.viewOnceMessageV2?.message ||
                quoted.ephemeralMessage?.message ||
                quoted;

            // Détecter le type de média
            const imageMsg = realMsg.imageMessage;
            const videoMsg = realMsg.videoMessage;

            if (!imageMsg && !videoMsg) {
                return await replyWithTag(sock, remoteJid, msg, "⚠️ Le message répondu n'est pas un statut photo ou vidéo.");
            }

            const mediaType = imageMsg ? "image" : "video";
            const mediaMsg = imageMsg || videoMsg;

            const stream = await downloadContentFromMessage(mediaMsg, mediaType);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);

            const ext = mediaType === "video" ? "mp4" : "jpg";
            const downloadDir = path.join(__dirname, '../downloads');
            if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

            const fileName = `status_${Date.now()}.${ext}`;
            const filePath = path.join(downloadDir, fileName);
            fs.writeFileSync(filePath, Buffer.concat(chunks));

            // Envoi du fichier
            const messageOptions = {};
            if (mediaType === "image") {
                messageOptions.image = { url: filePath };
            } else {
                messageOptions.video = { url: filePath };
            }
            messageOptions.caption = "✅ *Statut téléchargé avec succès !*";

            await sock.sendMessage(remoteJid, messageOptions, { quoted: msg });

            // Nettoyage après 5 secondes
            setTimeout(() => {
                try {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                } catch (e) { }
            }, 5000);

        } catch (err) {
            console.error('[StatusDown Error]:', err);
            await replyWithTag(sock, msg.key.remoteJid, msg, "❌ Impossible de télécharger le statut.");
        }
    }
};