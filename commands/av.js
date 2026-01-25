const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const genAI = new GoogleGenerativeAI('AIzaSyCaqZKBKdBLTRgOtX7cvAycZZTQSlD639c');

async function getAIResponse(prompt) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text && text.trim().length > 5) return text.trim();
    } catch (e) { console.error('[Gemini 2.5] Failed'); }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text && text.trim().length > 5) return text.trim();
    } catch (e) { console.error('[Gemini 1.5] Failed'); }

    const apis = [
        { url: `https://api.bk9.site/ai/gpt4?q=${encodeURIComponent(prompt)}`, extract: (d) => d.BK9 },
        { url: `https://api.maher-zubair.tech/ai/chatgpt?q=${encodeURIComponent(prompt)}`, extract: (d) => d.result },
        { url: `https://api.vreden.my.id/api/gpt4?text=${encodeURIComponent(prompt)}`, extract: (d) => d.result || d.reply },
        { url: `https://widipe.com/gpt?prompt=${encodeURIComponent(prompt)}`, extract: (d) => d.result },
        { url: `https://api.kimis.tech/ai/gpt?q=${encodeURIComponent(prompt)}`, extract: (d) => d.result },
        { url: `https://hercai.onrender.com/v3/hercai?question=${encodeURIComponent(prompt)}`, extract: (d) => d.reply },
        { url: `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}`, extract: (d) => d.response }
    ];

    for (const api of apis) {
        try {
            const res = await axios.get(api.url, { timeout: 15000 });
            const result = api.extract(res.data);
            if (result && result.trim().length > 5) return result.trim();
        } catch (e) { continue; }
    }
    return null;
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

            if (!challenge) {
                return await replyWithTag(sock, remoteJid, msg, "❌ Désolé, l'IA est timide aujourd'hui. Réessayez !");
            }

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