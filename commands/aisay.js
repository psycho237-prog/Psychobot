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
    name: "aisay",
    description: "L'IA vous répond par message vocal (TTS).",
    run: async ({ sock, msg, args, replyWithTag }) => {
        const question = args.join(" ");
        if (!question) return replyWithTag(sock, msg.key.remoteJid, msg, "❌ Veuillez poser une question.");

        try {
            await replyWithTag(sock, msg.key.remoteJid, msg, "🗣️ L'IA prépare son message vocal...");
            const reply = await getAIResponse(question);

            const encoded = encodeURIComponent(reply.substring(0, 500));
            const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=fr&client=tw-ob`;

            await sock.sendMessage(msg.key.remoteJid, {
                audio: { url: ttsUrl },
                mimetype: 'audio/mp4',
                ptt: true
            }, { quoted: msg });

        } catch (error) {
            console.error(error);
            await replyWithTag(sock, msg.key.remoteJid, msg, "❌ Erreur: Impossible de générer la réponse vocale.");
        }
    }
};
