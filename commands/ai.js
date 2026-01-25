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
            timeout: 20000, // Slightly longer for LLM latency
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
    name: 'ai',
    description: 'Posez une question à Meta Llama 3',
    run: async ({ sock, msg, args, replyWithTag }) => {
        const question = args.join(" ");
        if (!question) return replyWithTag(sock, msg.key.remoteJid, msg, "❌ Posez une question. Ex: !ai Bonjour");

        try {
            await replyWithTag(sock, msg.key.remoteJid, msg, "🤔 Réflexion (Llama 3)...");
            const reply = await getAIResponse(question);
            await replyWithTag(sock, msg.key.remoteJid, msg, reply);
        } catch (error) {
            console.error(error);
            await replyWithTag(sock, msg.key.remoteJid, msg, `❌ Erreur API IA.`);
        }
    }
};
