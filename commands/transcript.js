const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const Groq = require('groq-sdk');

// Note: Initialization is handled only if key is present to avoid crash
let groq;
try {
    if (process.env.GROQ_API_KEY) {
        groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
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
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const audioMsg = quotedMsg?.audioMessage;

            if (!audioMsg) {
                return replyWithTag(sock, remoteJid, msg, "❌ Veuillez répondre à une note vocale avec !transcript.");
            }

            // 1. Download the audio from WhatsApp
            const stream = await downloadContentFromMessage(audioMsg, 'audio');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 2. Convert Buffer to a Virtual File for Groq
            // We use standard streaming to Groq Whisper (Turbo v3)
            const audioFile = await Groq.toFile(buffer, 'voice.m4a', { type: 'audio/m4a' });

            // 3. Send to Groq Whisper
            const response = await groq.audio.transcriptions.create({
                file: audioFile,
                model: "whisper-large-v3-turbo", // High quality, low latency
                response_format: "text",
                temperature: 0.0,
            });

            // 4. Send the result
            const responseText = `📝 *Transcription Audio*\n━━━━━━━━━━━━━━\n${response.trim()}`;
            await sock.sendMessage(remoteJid, { text: responseText }, { quoted: msg });

        } catch (err) {
            console.error('[Transcript Error]:', err.message);
            await replyWithTag(sock, msg.key.remoteJid, msg, "❌ Échec de la transcription. L'IA est peut-être saturée ou l'audio est trop long.");
        }
    }
};
