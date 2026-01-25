const Groq = require("groq-sdk");
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getAIResponse(prompt) {
    if (!prompt || typeof prompt !== 'string') return null;

    try {
        const chatCompletion = await groq.chat.completions.create({
            "messages": [
                { "role": "system", "content": "You are a fun game host for Action or Vérité (Truth or Dare). Public is adult. Be provocative and engaging." },
                { "role": "user", "content": prompt }
            ],
            "model": "llama-3.3-70b-versatile",
            "temperature": 0.9,
            "max_tokens": 512,
            "top_p": 1,
            "stream": false
        });

        return chatCompletion.choices[0].message.content.trim();
    } catch (error) {
        console.error('[Groq Error]:', error.message);
        return null;
    }
}

module.exports = {
    name: "av",
    description: "Jeu Action ou Vérité (Automatique via Llama 3.3).",
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
            await replyWithTag(sock, remoteJid, msg, `🔥 L'IA (Llama 3.3) prépare votre ${type}...`);

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