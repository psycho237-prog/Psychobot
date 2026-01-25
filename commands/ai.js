const axios = require('axios');

async function getAIResponse(prompt) {
    const apis = [
        { url: `https://api.bk9.site/ai/gpt4?q=${encodeURIComponent(prompt)}`, extract: (d) => d.BK9 },
        { url: `https://api.maher-zubair.tech/ai/chatgpt?q=${encodeURIComponent(prompt)}`, extract: (d) => d.result },
        { url: `https://api.vreden.my.id/api/gpt4?text=${encodeURIComponent(prompt)}`, extract: (d) => d.result || d.reply },
        { url: `https://widipe.com/gpt?prompt=${encodeURIComponent(prompt)}`, extract: (d) => d.result },
        { url: `https://api.kimis.tech/ai/gpt?q=${encodeURIComponent(prompt)}`, extract: (d) => d.result },
        { url: `https://api.agatz.xyz/api/gpt4?message=${encodeURIComponent(prompt)}`, extract: (d) => d.data },
        { url: `https://sh-api-one.vercel.app/api/gpt?q=${encodeURIComponent(prompt)}`, extract: (d) => d.answer },
        { url: `https://hercai.onrender.com/v3/hercai?question=${encodeURIComponent(prompt)}`, extract: (d) => d.reply },
        { url: `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}`, extract: (d) => d.response },
        { url: `https://guruapi.tech/api/chatgpt?text=${encodeURIComponent(prompt)}`, extract: (d) => d.result },
        { url: `https://api.simsimi.net/v2/?text=${encodeURIComponent(prompt)}&lc=fr`, extract: (d) => d.success }
    ];

    for (const api of apis) {
        try {
            const res = await axios.get(api.url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
            const result = api.extract(res.data);
            if (result && result.trim().length > 2 && !result.toLowerCase().includes("limit") && !result.toLowerCase().includes("error")) {
                return result.trim();
            }
        } catch (e) {
            continue;
        }
    }
    throw new Error("Toutes les IA sont saturées. Réessayez plus tard !");
}

module.exports = {
    name: 'ai',
    description: 'Posez une question à l\'IA (GPT-4)',
    run: async ({ sock, msg, args, replyWithTag }) => {
        const question = args.join(" ");
        if (!question) return replyWithTag(sock, msg.key.remoteJid, msg, "❌ Posez une question. Ex: !ai Bonjour");

        try {
            await replyWithTag(sock, msg.key.remoteJid, msg, "🤔 Réflexion...");
            const reply = await getAIResponse(question);
            await replyWithTag(sock, msg.key.remoteJid, msg, reply);
        } catch (error) {
            console.error(error);
            await replyWithTag(sock, msg.key.remoteJid, msg, `❌ ${error.message || "Erreur API IA."}`);
        }
    }
};
