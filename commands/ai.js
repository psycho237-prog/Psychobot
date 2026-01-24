const axios = require('axios');

async function getAIResponse(prompt) {
    const apis = [
        { url: `https://hercai.onrender.com/v3/hercai?question=${encodeURIComponent(prompt)}`, extract: (d) => d.reply },
        { url: `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}`, extract: (d) => d.response },
        { url: `https://sh-api-one.vercel.app/api/gpt?q=${encodeURIComponent(prompt)}`, extract: (d) => d.answer },
        { url: `https://api.vreden.my.id/api/gpt4?text=${encodeURIComponent(prompt)}`, extract: (d) => d.result || d.reply },
        { url: `https://api.agatz.xyz/api/gpt4?message=${encodeURIComponent(prompt)}`, extract: (d) => d.data },
        { url: `https://guruapi.tech/api/chatgpt?text=${encodeURIComponent(prompt)}`, extract: (d) => d.result }
    ];

    for (const api of apis) {
        try {
            console.log(`[AI] Checking: ${api.url.split('?')[0]}`);
            const res = await axios.get(api.url, { timeout: 20000 });
            const result = api.extract(res.data);
            if (result && result.trim().length > 2 && !result.toLowerCase().includes("failed") && !result.toLowerCase().includes("error")) {
                return result.trim();
            }
        } catch (e) {
            console.warn(`[AI] Provider ${api.url.split('?')[0]} failed: ${e.message}`);
            continue;
        }
    }
    throw new Error("Désolé, les serveurs IA sont actuellement saturés. Réessayez dans un moment !");
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
