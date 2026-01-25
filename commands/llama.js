const axios = require('axios');

module.exports = {
    name: "llama",
    description: "Posez une question à Meta Llama 3 70B.",
    run: async ({ sock, msg, args, replyWithTag }) => {
        const query = args.join(" ");
        const from = msg.key.remoteJid;

        if (!query) return replyWithTag(sock, from, msg, "❌ Posez une question à Llama. Ex: !llama Bonjour !");

        try {
            await replyWithTag(sock, from, msg, "🦙 *Llama 3 réfléchit...*");

            // Utilisation d'un proxy Llama 3 stable (BK9 API)
            const llamaApi = `https://api.bk9.site/ai/llama3?q=${encodeURIComponent(query)}`;
            const res = await axios.get(llamaApi, { timeout: 15000 });

            if (res.data && res.data.BK9) {
                const response = res.data.BK9.trim();
                await replyWithTag(sock, from, msg, `✨ *Réponse de Llama 3 :*\n\n${response}`);
            } else {
                throw new Error("Réponse vide de Llama");
            }

        } catch (err) {
            console.error('[Llama Error]:', err.message);
            await replyWithTag(sock, from, msg, "❌ L'IA Llama est temporairement saturée. Réessayez plus tard !");
        }
    }
};
