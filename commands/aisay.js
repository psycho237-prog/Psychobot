const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const genAI = new GoogleGenerativeAI('AIzaSyCaqZKBKdBLTRgOtX7cvAycZZTQSlD639c');

async function getAIResponse(prompt) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text && text.trim().length > 0) return text.trim();
    } catch (e) { console.error('[Gemini 2.5] Failed'); }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text && text.trim().length > 0) return text.trim();
    } catch (e) { console.error('[Gemini 1.5] Failed'); }

    const apis = [
        { url: `https://api.bk9.site/ai/gpt4?q=${encodeURIComponent(prompt)}`, extract: (d) => d.BK9 },
        { url: `https://api.maher-zubair.tech/ai/chatgpt?q=${encodeURIComponent(prompt)}`, extract: (d) => d.result },
        { url: `https://api.vreden.my.id/api/gpt4?text=${encodeURIComponent(prompt)}`, extract: (d) => d.result || d.reply },
        { url: `https://widipe.com/gpt?prompt=${encodeURIComponent(prompt)}`, extract: (d) => d.result },
        { url: `https://api.kimis.tech/ai/gpt?q=${encodeURIComponent(prompt)}`, extract: (d) => d.result },
        { url: `https://hercai.onrender.com/v3/hercai?question=${encodeURIComponent(prompt)}`, extract: (d) => d.reply },
        { url: `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}`, extract: (d) => d.response },
        { url: `https://api.simsimi.net/v2/?text=${encodeURIComponent(prompt)}&lc=fr`, extract: (d) => d.success }
    ];

    for (const api of apis) {
        try {
            const res = await axios.get(api.url, { timeout: 10000 });
            const result = api.extract(res.data);
            if (result && result.trim().length > 2) return result.trim();
        } catch (e) { continue; }
    }
    return "Toutes les IA sont saturées.";
}

module.exports = {
    name: "aisay",
    description: "L'IA vous répond par message vocal (TTS).",
    run: async ({ sock, msg, args, replyWithTag }) => {
        const question = args.join(" ");
        if (!question) return replyWithTag(sock, msg.key.remoteJid, msg, "❌ Veuillez poser une question.");

        try {
            await replyWithTag(sock, msg.key.remoteJid, msg, "🗣️ L'IA prépare son message vocal...");
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
            await replyWithTag(sock, msg.key.remoteJid, msg, "❌ Erreur: Impossible de générer la réponse vocale.");
        }
    }
};
