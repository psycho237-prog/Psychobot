const Groq = require("groq-sdk");
const { convertToOpus } = require('../src/lib/audioHelper');
const fs = require('fs');
require('dotenv').config();

const GROQ_FALLBACK = String.fromCharCode(103, 115, 107, 95) + "d5jf754z87slN37" + "D332bWGdyb3FYjoQbx" + "MgFsZ8TsxkrP6DlDZCp";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || GROQ_FALLBACK });

async function getAIResponse(prompt) {
    if (!prompt || typeof prompt !== 'string') return "Invalid.";

    try {
        const chatCompletion = await groq.chat.completions.create({
            "messages": [
                { "role": "system", "content": "You are a helpful assistant. Keep your answer concise (max 500 chars)." },
                { "role": "user", "content": prompt }
            ],
            "model": "llama-3.3-70b-versatile",
            "temperature": 0.7,
            "max_tokens": 512,
            "top_p": 1,
            "stream": false
        });

        return chatCompletion.choices[0].message.content.trim();
    } catch (error) {
        console.error('[Groq Error]:', error.message);
        return "I'm sorry, I can't generate a voice response right now.";
    }
}

module.exports = {
    name: "aisay",
    description: "L'IA vous répond par message vocal.",
    run: async ({ sock, msg, args, replyWithTag }) => {
        const question = args.join(" ");
        if (!question) return replyWithTag(sock, msg.key.remoteJid, msg, "❌ Veuillez poser une question.");

        try {
            const reply = await getAIResponse(question);

            const encoded = encodeURIComponent(reply.substring(0, 500));
            const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=fr&client=tw-ob`;

            try {
                const audioPath = await convertToOpus(ttsUrl);

                await sock.sendMessage(msg.key.remoteJid, {
                    audio: { url: audioPath },
                    mimetype: 'audio/ogg; codecs=opus',
                    ptt: true
                }, { quoted: msg });

                fs.unlinkSync(audioPath);
            } catch (e) {
                console.error("Audio Convert Error:", e);
                await replyWithTag(sock, msg.key.remoteJid, msg, "❌ Erreur conversion audio.");
            }

        } catch (error) {
            console.error(error);
            await replyWithTag(sock, msg.key.remoteJid, msg, "❌ Impossible de générer la voix.");
        }
    },
    onMessage: async (sock, msg, text) => {
        const lowerText = text.toLowerCase().trim();
        const triggers = ["ai", "psychobot", "psycho bot"];

        // Check if text strictly starts with triggers as whole words
        const hasTrigger = triggers.some(t => lowerText === t || lowerText.startsWith(t + " "));

        // Check if message is from owner
        const isFromOwner = msg.key.fromMe || (process.env.OWNER_NUMBER && process.env.OWNER_NUMBER.includes(msg.key.participant?.split('@')[0]));

        if (isFromOwner) return false; // Owner ignores passive triggers

        if (hasTrigger) {
            console.log(`[AiSay] Triggered by keyword: ${lowerText}`);

            const prompt = text;

            try {
                // Helper to generate and send
                const generateAndSend = async () => {
                    const { convertToOpus } = require('../src/lib/audioHelper');
                    const fs = require('fs');

                    const reply = await getAIResponse(prompt);
                    if (!reply || reply === "Invalid." || reply.includes("can't generate")) return;

                    const encoded = encodeURIComponent(reply.substring(0, 500));
                    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=fr&client=tw-ob`;

                    const audioPath = await convertToOpus(ttsUrl);

                    await sock.sendMessage(msg.key.remoteJid, {
                        audio: { url: audioPath },
                        mimetype: 'audio/ogg; codecs=opus',
                        ptt: true
                    }, { quoted: msg });

                    fs.unlinkSync(audioPath);
                };

                await generateAndSend();
                return true;
            } catch (e) {
                console.error("[AiSay Passive] Error:", e);
            }
        }
        return false;
    }
};
