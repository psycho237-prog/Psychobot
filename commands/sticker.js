// commands/sticker.js
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const path = require('path');
const log = require('../logger')(module);

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
    name: 'sticker',
    description: 'Crée un sticker à partir d\'une image, GIF ou vidéo.',
    adminOnly: false,
    run: async ({ sock, msg, replyWithTag }) => {
        const remoteJid = msg.key.remoteJid;
        log(`[STICKER] Commande reçue de ${remoteJid}`);

        const tempDir = path.join(__dirname, "../temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const uniqueId = Date.now();
        const tempInput = path.join(tempDir, `input_${uniqueId}`);
        const tempOutput = path.join(tempDir, `output_${uniqueId}.webp`);

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const messageWithMedia = quoted || msg.message;
        const mediaType = messageWithMedia.imageMessage ? 'image' :
                          messageWithMedia.videoMessage ? 'video' : null;

        if (!mediaType) return replyWithTag(sock, remoteJid, msg, '❌ Envoyez une image ou vidéo, ou répondez à un média.');

        await replyWithTag(sock, remoteJid, msg, '⏳ Création du sticker en cours...');

        // Fonction retry pour le téléchargement
        const downloadWithRetry = async (attempts = 3) => {
            for (let i = 1; i <= attempts; i++) {
                try {
                    let buffer = Buffer.from([]);
                    const stream = await downloadContentFromMessage(
                        messageWithMedia.imageMessage || messageWithMedia.videoMessage,
                        mediaType
                    );
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                    if (!buffer || buffer.length === 0) throw new Error("Buffer vide");
                    return buffer;
                } catch (err) {
                    log(`[STICKER] Tentative ${i} échouée : ${err.message}`);
                    if (i === attempts) throw err;
                }
            }
        };

        try {
            const buffer = await downloadWithRetry();
            fs.writeFileSync(tempInput, buffer);
            log(`[STICKER] Média téléchargé : ${tempInput} (${buffer.length} bytes)`);

            // Conversion en sticker WebP
            await new Promise((resolve, reject) => {
                ffmpeg(tempInput)
                    .outputOptions([
                        "-vcodec", "libwebp",
                        "-vf", "scale='min(512,iw)':'min(512,ih)':force_original_aspect_ratio=decrease,fps=15",
                        "-loop", "0", "-preset", "default", "-an", "-vsync", "0",
                    ])
                    .toFormat("webp")
                    .save(tempOutput)
                    .on("end", () => { log("[STICKER] Conversion terminée."); resolve(); })
                    .on("error", err => { log("[STICKER] Erreur FFmpeg :", err.message); reject(err); });
            });

            await sock.sendMessage(remoteJid, { sticker: { url: tempOutput } });
            log("[STICKER] Sticker envoyé ✅");

        } catch (error) {
            log("[STICKER] Erreur :", error.message);
            await replyWithTag(sock, remoteJid, msg, '❌ Impossible de créer le sticker.');

            // Fallback → renvoyer le média original
            if (fs.existsSync(tempInput)) {
                await sock.sendMessage(remoteJid, { 
                    [mediaType]: { url: tempInput }, 
                    caption: "⚠️ Impossible de créer le sticker, voici le média original." 
                });
            }
        } finally {
            [tempInput, tempOutput].forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
            log("[STICKER] Nettoyage terminé.");
        }
    }
};
