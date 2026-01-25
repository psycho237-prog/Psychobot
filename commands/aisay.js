const Groq = require("groq-sdk");
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
    description: "L'IA vous répond par message vocal (Llama 3.3).",
    run: async ({ sock, msg, args, replyWithTag }) => {
        const question = args.join(" ");
        if (!question) return replyWithTag(sock, msg.key.remoteJid, msg, "❌ Veuillez poser une question.");

        try {
            await replyWithTag(sock, msg.key.remoteJid, msg, "🗣️ L'IA réfléchit...");
            const reply = await getAIResponse(question);

            const encoded = encodeURIComponent(reply.substring(0, 500));
            const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=fr&client=tw-ob`;

            await sock.sendMessage(msg.key.remoteJid, {
                audio: { url: ttsUrl },
                mimetype: 'audio/mp4',
                ptt: true
            }, { quoted: msg });

        } catch (error) {
            console.error(error);
            await replyWithTag(sock, msg.key.remoteJid, msg, "❌ Impossible de générer la voix.");
        }
    }
};
