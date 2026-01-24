const axios = require('axios');

async function getAIResponse(prompt) {
    const apis = [
        { url: `https://hercai.onrender.com/v3/hercai?question=${encodeURIComponent(prompt)}`, extract: (d) => d.reply },
        { url: `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}`, extract: (d) => d.response },
        { url: `https://sh-api-one.vercel.app/api/gpt?q=${encodeURIComponent(prompt)}`, extract: (d) => d.answer }
    ];

    for (const api of apis) {
        try {
            const res = await axios.get(api.url, { timeout: 10000 });
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
            return replyWithTag(sock, from, msg, "🎲 *Jeu Action ou Vérité*\n\nUtilisation:\n- `!av action` : Pour un défi physique/social\n- `!av vérité` : Pour une question indiscrète");
        }

        const isAction = type === 'action';
        await replyWithTag(sock, from, msg, `🪄 L'IA prépare votre ${isAction ? 'défi' : 'question'}...`);

        const prompt = isAction
            ? "Donne moi un défi 'Action' drôle ou osé à faire dans un groupe WhatsApp. Sois créatif et court (une phrase)."
            : "Pose moi une question 'Vérité' embarrassante ou curieuse pour un jeu entre amis. Sois créatif et direct (une phrase).";

        try {
            let challenge = await getAIResponse(prompt);

            if (!challenge) {
                // Fallbacks if AI is down
                const actions = ["Envoie un screen de tes 3 derniers emojis utilisés.", "Chante le refrain de ta chanson préférée en vocal.", "Dis quel est le membre le plus bavard du groupe."];
                const truths = ["Quel est ton plus grand regret ?", "Quelle est la personne que tu détestes le plus ici ?", "As-tu déjà menti pour éviter un rendez-vous ?"];
                challenge = isAction ? actions[Math.floor(Math.random() * actions.length)] : truths[Math.floor(Math.random() * truths.length)];
            }

            const header = isAction ? "🔥 *ACTION*" : "📝 *VÉRITÉ*";
            await sock.sendMessage(from, { text: `${header}\n\n${challenge}` }, { quoted: msg });

        } catch (err) {
            await replyWithTag(sock, from, msg, "❌ Erreur lors de la génération du défi.");
        }
    }
};