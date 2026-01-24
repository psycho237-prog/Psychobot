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

            // Vérifie si on répond à un statut
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted) {
                return await replyWithTag(sock, remoteJid, msg, "⚠️ Vous devez répondre à un statut avec cette commande.");
            }

            const statusMessage = Object.values(quoted)[0]; // récupère photoMessage ou videoMessage
            const mediaType = statusMessage.imageMessage ? "image" : statusMessage.videoMessage ? "video" : null;

            if (!mediaType) {
                return await replyWithTag(sock, remoteJid, msg, "⚠️ Le message répondu n'est pas un statut photo ou vidéo.");
            }

            const stream = await downloadContentFromMessage(quoted, mediaType);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);

            const ext = mediaType === "video" ? "mp4" : "jpg";
            const fileName = path.join(__dirname, `../downloads/status_${Date.now()}.${ext}`);
            fs.writeFileSync(fileName, Buffer.concat(chunks));

            await replyWithTag(sock, remoteJid, msg, `✅ Statut téléchargé : ${fileName}`);
        } catch (err) {
            console.error(err);
            await replyWithTag(sock, msg.key.remoteJid, msg, "❌ Impossible de télécharger le statut.");
        }
    }
};