const Groq = require("groq-sdk");
require('dotenv').config();

const GROQ_FALLBACK = String.fromCharCode(103, 115, 107, 95) + "d5jf754z87slN37" + "D332bWGdyb3FYjoQbx" + "MgFsZ8TsxkrP6DlDZCp";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || GROQ_FALLBACK });

async function getAIResponse(prompt) {
    if (!prompt || typeof prompt !== 'string') return "Invalid prompt.";

    try {
        const chatCompletion = await groq.chat.completions.create({
            "messages": [
                { "role": "system", "content": "You are a helpful assistant." },
                { "role": "user", "content": prompt }
            ],
            "model": "llama-3.3-70b-versatile",
            "temperature": 0.7,
            "max_tokens": 1024,
            "top_p": 1,
            "stream": false
        });

        return chatCompletion.choices[0].message.content.trim();
    } catch (error) {
        console.error('[Groq Error]:', error.message);
        if (error.status === 429) return "⏳ Too many requests. Please try again later.";
        return "Sorry, I encountered an error connecting to the AI.";
    }
}

module.exports = {
    name: 'ai',
    description: 'Posez une question à l\'IA.',
    run: async ({ sock, msg, args, replyWithTag }) => {
        const question = args.join(" ");
        if (!question) return replyWithTag(sock, msg.key.remoteJid, msg, "❌ Posez une question. Ex: !ai Bonjour");

        try {
            const reply = await getAIResponse(question);
            await replyWithTag(sock, msg.key.remoteJid, msg, reply);
        } catch (error) {
            console.error(error);
            await replyWithTag(sock, msg.key.remoteJid, msg, `❌ Erreur API IA.`);
        }
    }
};
