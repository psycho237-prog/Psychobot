const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
    name: 'transcript',
    description: 'Transcrit une note vocale ou un fichier audio en texte. Répondez à un audio avec !transcript.',
    adminOnly: false,
    run: async ({ sock, msg, replyWithTag }) => {
        try {
            const remoteJid = msg.key.remoteJid;
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            // Check if it is an audio message (voice note or audio file)
            const audioMsg = quotedMsg?.audioMessage;

            if (!audioMsg) {
                return replyWithTag(sock, remoteJid, msg, "❌ Veuillez répondre à une note vocale ou un fichier audio avec cette commande.");
            }

            await replyWithTag(sock, remoteJid, msg, "🔄 Transcription en cours (Whisper AI)...");

            // Download audio
            const stream = await downloadContentFromMessage(audioMsg, 'audio');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Prepare Form Data for Transcription APIs
            const providers = [
                {
                    url: 'https://api.vreden.my.id/api/stt',
                    makeForm: (buf) => {
                        const fd = new FormData();
                        fd.append('file', buf, { filename: 'audio.mp3', contentType: 'audio/mpeg' });
                        return fd;
                    },
                    extract: (res) => res.data.result || res.data.text
                },
                {
                    url: 'https://api.agatz.xyz/api/stt',
                    makeForm: (buf) => {
                        const fd = new FormData();
                        fd.append('file', buf, { filename: 'audio.mp3', contentType: 'audio/mpeg' });
                        return fd;
                    },
                    extract: (res) => res.data.data?.text || res.data.result
                }
            ];

            let transcript = null;
            for (const provider of providers) {
                try {
                    console.log(`[Transcript] Trying provider: ${provider.url}`);
                    const form = provider.makeForm(buffer);
                    const res = await axios.post(provider.url, form, {
                        headers: { ...form.getHeaders() },
                        timeout: 45000
                    });
                    transcript = provider.extract(res);
                    if (transcript && transcript.trim().length > 1) break;
                } catch (e) {
                    console.warn(`[Transcript] Provider ${provider.url} failed:`, e.message);
                    continue;
                }
            }

            if (!transcript) {
                throw new Error("Saturation STT (Aucun serveur n'a répondu)");
            }

            const responseText = `📝 *Transcription Audio*\n━━━━━━━━━━━━━━\n${transcript}`;
            await sock.sendMessage(remoteJid, { text: responseText }, { quoted: msg });

        } catch (err) {
            console.error('Transcription Error:', err);
            await replyWithTag(sock, msg.key.remoteJid, msg, "❌ Impossible de transcrire l'audio. L'IA est peut-être saturée ou le format est invalide.");
        }
    }
};
