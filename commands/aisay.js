const axios = require('axios');

async function getAIResponse(prompt) {
    const apis = [
        { url: `https://hercai.onrender.com/v3/hercai?question=${encodeURIComponent(prompt)}`, extract: (d) => d.reply },
        { url: `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(prompt)}`, extract: (d) => d.response },
        { url: `https://sh-api-one.vercel.app/api/gpt?q=${encodeURIComponent(prompt)}`, extract: (d) => d.answer },
        { url: `https://api.vreden.my.id/api/gpt4?text=${encodeURIComponent(prompt)}`, extract: (d) => d.result || d.reply },
        { url: `https://api.agatz.xyz/api/gpt4?message=${encodeURIComponent(prompt)}`, extract: (d) => d.data },
        { url: `https://guruapi.tech/api/chatgpt?text=${encodeURIComponent(prompt)}`, extract: (d) => d.result }
    ];

    for (const api of apis) {
        try {
            const res = await axios.get(api.url, { timeout: 15000 });
            const result = api.extract(res.data);
            if (result && result.trim().length > 2) return result.trim();
        } catch (e) { continue; }
    }
    throw new Error("Toutes les sources IA sont saturées.");
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
