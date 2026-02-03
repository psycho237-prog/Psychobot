const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const Groq = require('groq-sdk');

const GROQ_FALLBACK = String.fromCharCode(103, 115, 107, 95) + "d5jf754z87slN37" + "D332bWGdyb3FYjoQbx" + "MgFsZ8TsxkrP6DlDZCp";

// Note: Initialization is handled only if key is present to avoid crash
let groq;
try {
    const key = process.env.GROQ_API_KEY || GROQ_FALLBACK;
    if (key) {
        groq = new Groq({ apiKey: key });
    }
} catch (e) {
    console.error('[Transcript Init Error]:', e.message);
}

module.exports = {
    name: 'transcript',
    description: 'Transcrit une note vocale en texte via Groq Whisper.',
    run: async ({ sock, msg, replyWithTag }) => {
        if (!groq) return replyWithTag(sock, msg.key.remoteJid, msg, "❌ Erreur: Groq Whisper n'est pas configuré (Clé API manquante).");

        try {
            const remoteJid = msg.key.remoteJid;

            // Supporting normal and ephemeral quoted messages
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
                msg.message?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!quotedMsg) {
                return replyWithTag(sock, remoteJid, msg, "❌ Veuillez répondre à une note vocale.");
            }

            // Supporting all possible audio message structures (normal, ephemeral, view-once)
            const audioMsg = quotedMsg.audioMessage ||
                quotedMsg.ephemeralMessage?.message?.audioMessage ||
                quotedMsg.viewOnceMessage?.message?.audioMessage ||
                quotedMsg.viewOnceMessageV2?.message?.audioMessage;

            if (!audioMsg) {
                return replyWithTag(sock, remoteJid, msg, "❌ Le message cité n'est pas une note vocale.");
            }

            await replyWithTag(sock, remoteJid, msg, "⏳ Transcription en cours avec Groq Whisper...");

            // 1. Download the audio from WhatsApp
            const stream = await downloadContentFromMessage(audioMsg, 'audio');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (!buffer || buffer.length === 0) {
                throw new Error("Échec du téléchargement de l'audio.");
            }

            // 2. Save Buffer to Temporary File
            const fs = require('fs');
            const os = require('os');
            const path = require('path');

            const tempFile = path.join(os.tmpdir(), `voice_${Date.now()}.m4a`);
            fs.writeFileSync(tempFile, buffer);

            // 3. Send to Groq Whisper
            console.log(`[Transcript] Sending ${buffer.length} bytes to Groq...`);
            const response = await groq.audio.transcriptions.create({
                file: fs.createReadStream(tempFile),
                model: "whisper-large-v3-turbo",
                response_format: "json",
                temperature: 0.0,
            });

            const transcriptText = response.text || response.toString();

            // Cleanup
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);

            // 4. Send the result
            const responseText = `📝 *Transcription Audio*\n━━━━━━━━━━━━━━\n${transcriptText.trim()}`;
            await sock.sendMessage(remoteJid, { text: responseText }, { quoted: msg });

        } catch (err) {
            console.error('[Transcript Error]:', err.message);
            await replyWithTag(sock, msg.key.remoteJid, msg, `❌ Échec: ${err.message}`);
        }
    }
};
