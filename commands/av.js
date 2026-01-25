const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const axios = require('axios');

const genAI = new GoogleGenerativeAI('YOUR_API_KEY');

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

async function getAIResponse(prompt) {
    // 1. Gemini 2.5
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', safetySettings });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text && text.trim().length > 5) return text.trim();
    } catch (e) { console.error('[Gemini 2.5 Error]:', e.message || e); }

    // 2. Gemini 1.5
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', safetySettings });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text && text.trim().length > 5) return text.trim();
    } catch (e) { console.error('[Gemini 1.5 Error]:', e.message || e); }

    // 3. Llama 3 (Fallback)
    try {
        const llamaApi = `https://api.bk9.site/ai/llama3?q=${encodeURIComponent(prompt)}`;
        const res = await axios.get(llamaApi, { timeout: 15000 });
        if (res.data && res.data.BK9) return res.data.BK9.trim();
    } catch (e) { console.error('[Llama 3 Error]: Failed'); }

    // 4. Proxys
    const apis = [
        { url: `https://api.maher-zubair.tech/ai/chatgpt?q=${encodeURIComponent(prompt)}`, extract: (d) => d.result },
        { url: `https://api.vreden.my.id/api/gpt4?text=${encodeURIComponent(prompt)}`, extract: (d) => d.result || d.reply },
        { url: `https://widipe.com/gpt?prompt=${encodeURIComponent(prompt)}`, extract: (d) => d.result },
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