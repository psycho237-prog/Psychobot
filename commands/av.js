const axios = require('axios');

async function getAIResponse(prompt) {
    // 1. Input Validation
    if (!prompt || typeof prompt !== 'string') {
        return "Please provide a valid prompt.";
    }

    try {
        const llamaApi = `https://api.bk9.site/ai/llama3?q=${encodeURIComponent(prompt)}`;

        // 2. Axios Request
        const res = await axios.get(llamaApi, {
            timeout: 20000,
            headers: { 'Accept': 'application/json' }
        });

        // 3. Structured Data Validation
        const responseData = res.data?.BK9;
        if (responseData) {
            return responseData.trim();
        }

        throw new Error("Empty response payload");

    } catch (error) {
        // 4. Enhanced Error Feedback
        if (error.code === 'ECONNABORTED') return "⏳ Request timed out.";
        if (error.response?.status === 429) return "⏳ Too many requests. Please try again later.";

        console.error('[Llama 3 Error]:', error.message);
        return "Sorry, I'm having trouble connecting to the AI right now.";
    }
}

module.exports = {
    name: "av",
    description: "Jeu Action ou Vérité (Automatique).",
    run: async ({ sock, msg, args, replyWithTag, isGroup, isAdmins }) => {
        const remoteJid = msg.key.remoteJid;
        const type = args[0] ? args[0].toLowerCase() : null;

        if (type !== 'action' && type !== 'vérité' && type !== 'verite') {
            const menu = `*🔞 JEU ACTION OU VÉRITÉ 🔞*\n\n` +
                `Prêt à pimenter votre groupe ? Utilisez :\n` +
                `👉 *!av action* : Pour un défi osé.\n` +
                `👉 *!av vérité* : Pour une question indiscrète.\n\n` +
                `⚠️ *Réservé aux adultes (+18).*`;
            return await replyWithTag(sock, remoteJid, msg, menu);
        }

        try {
            await replyWithTag(sock, remoteJid, msg, `🔥 L'IA prépare votre ${type}...`);

            const prompt = `Génère un défi ou une question de type "${type}" pour un jeu "Action ou Vérité". Le public est adulte et le ton doit être amusant, provocateur et engageant. Donne juste le texte de l'action ou de la vérité, sans blabla autour.`;

            const challenge = await getAIResponse(prompt);

            const finalMsg = `*🔞 ACTION OU VÉRITÉ 🔞*\n\n` +
                `*Type:* ${type.toUpperCase()}\n` +
                `*Challenge:* ${challenge}\n\n` +
                `Alors, cap ou pas cap ? 😏`;

            await sock.sendMessage(remoteJid, { text: finalMsg }, { quoted: msg });

        } catch (err) {
            console.error(err);
            await replyWithTag(sock, remoteJid, msg, "❌ Une erreur est survenue.");
        }
    }
};