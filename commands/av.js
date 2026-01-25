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
            if (result && result.trim().length > 5) return result.trim();
        } catch (e) { continue; }
    }
    return null;
}

module.exports = {
    name: 'av',
    description: 'Obtenez une Action ou une Vérité générée par IA.',
    run: async ({ sock, msg, args, replyWithTag }) => {
        const type = args[0]?.toLowerCase();
        const from = msg.key.remoteJid;

        if (type !== 'action' && type !== 'vérité' && type !== 'verite') {
            return replyWithTag(sock, from, msg, "🔞 *Jeu Action ou Vérité (ADULTE/18+)*\n\nUtilisation:\n- `!av action` : Pour un défi osé/trash\n- `!av vérité` : Pour une question sans tabou");
        }

        const isAction = type === 'action';
        await replyWithTag(sock, from, msg, `🪄 L'IA concocte un truc ${isAction ? 'bien chaud' : 'très indiscret'}...`);

        // Randomize the context to avoid repetitions
        const themes = ["secret inavouable", "ex-partenaires", "fantasmes", "situations gênantes", "corps et physique", "vie nocturne", "mensonges", "première fois"];
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];

        const prompt = isAction
            ? `Donne moi un défi 'Action' unique, très osé, embarrassant et pour adultes (18+) sur le thème : ${randomTheme}. Sois trash, explicite et court (une phrase). Change radicalement de sujet.`
            : `Pose moi une question 'Vérité' unique, très indiscrète, sexuelle ou embarrassante pour adultes (18+) sur le thème : ${randomTheme}. Sois trash, explicite et direct (une phrase). Change radicalement de sujet.`;

        try {
            let challenge = await getAIResponse(prompt);

            if (!challenge) {
                // Expanded Fallbacks
                const actions = [
                    "Sucer son propre pouce en imitant un bébé pendant 1 minute.",
                    "Faire une simulation d'orgasme en note vocale.",
                    "Envoyer un message à ton ex pour lui dire 'Tu me manques'.",
                    "Raconte ton fantasme le plus sale au groupe.",
                    "Envoie une photo de tes sous-vêtements (ou décris-les en détail).",
                    "Appelle un contact au hasard et gémis au téléphone.",
                    "Mets une photo de profil sexy pendant 1 heure."
                ];
                const truths = [
                    "Quelle est ta position préférée au lit ?",
                    "Quel est ton fantasme le plus inavouable ?",
                    "As-tu déjà fait ça dans un lieu public ?",
                    "Avec qui dans ce groupe aimerais-tu passer une nuit ?",
                    "Quelle est la chose la plus dégoûtante que tu aies faite au lit ?",
                    "As-tu déjà été surpris en plein acte ?",
                    "Quel est le plus grand nombre de partenaires que tu as eu ?"
                ];
                challenge = isAction ? actions[Math.floor(Math.random() * actions.length)] : truths[Math.floor(Math.random() * truths.length)];
            }

            const header = isAction ? "🔥 *ACTION*" : "📝 *VÉRITÉ*";
            await sock.sendMessage(from, { text: `${header}\n\n${challenge}` }, { quoted: msg });

        } catch (err) {
            await replyWithTag(sock, from, msg, "❌ Erreur lors de la génération du défi.");
        }
    }
};