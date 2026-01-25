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
    description: "Jeu Action ou Vérité (Automatique).",
    run: async ({ sock, msg, args, replyWithTag, isGroup, isAdmins }) => {
        const remoteJid = msg.key.remoteJid;
        const type = args[0] ? args[0].toLowerCase() : null;

        if (type !== 'action' && type !== 'vérité' && type !== 'verite') {
            const menu = `*🔞 JEU ACTION OU VÉRITÉ 🔞*\n\n` +
                `Prêt à pimenter votre groupe ? Utilisez :\n` +
                `👉 *!av action* : Pour un défi.\n` +
                `👉 *!av vérité* : Pour une question.\n\n` +
                `⚠️ *Amusant, Culturel ou Osé !*`;
            return await replyWithTag(sock, remoteJid, msg, menu);
        }

        try {
            // Prompt polyvalent : Mixe humour, culture, et adulte
            const prompt = `Tu es l'animateur d'un jeu Action ou Vérité ultra-polyvalent. 
            Génère une seule proposition de type "${type}". 
            VARIE LES PLAISIRS de manière aléatoire parmi ces styles :
            1. DRÔLE & ENGAGEANT (ex: Imiter un animal, raconter une honte).
            2. CULTURE GÉNÉRALE (ex: Citer 3 pays d'Asie, une question piège).
            3. PROVOCATEUR & ADULTE (ex: Un secret osé, un défi sexy).
            4. SOCIAL (ex: Envoyer un message bizarre à un contact).
            
            Le ton doit être dynamique. Ne cite jamais ton modèle (Llama, AI, etc.). 
            Donne UNIQUEMENT le texte de l'action ou de la vérité.`;

            const challenge = await getAIResponse(prompt);

            if (!challenge) {
                return await replyWithTag(sock, remoteJid, msg, "❌ L'IA est indisponible. Réessayez !");
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