const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('AIzaSyCaqZKBKdBLTRgOtX7cvAycZZTQSlD639c');

async function getAIResponse(prompt) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        if (text && text.trim().length > 0) {
            return text.trim();
        }
        return "Désolé, je n'ai pas pu générer de réponse.";
    } catch (error) {
        console.error('[Gemini Error]:', error.message);
        return "Désolé, l'IA est temporairement indisponible. Réessayez plus tard !";
    }
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
