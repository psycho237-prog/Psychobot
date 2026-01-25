module.exports = {
    name: "say",
    description: "Convertit du texte en message vocal (TTS).",
    run: async ({ sock, msg, args, replyWithTag }) => {
        const text = args.join(" ");
        if (!text) return replyWithTag(sock, msg.key.remoteJid, msg, "❌ Veuillez fournir le texte pour le vocal.");

        if (text.length > 1000) return replyWithTag(sock, msg.key.remoteJid, msg, "❌ Texte trop long (max 1000 caractères).");

        // Google TTS URL (Direct build to avoid extra dependencies)
        const encoded = encodeURIComponent(text);
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=fr&client=tw-ob`;

        try {
            await sock.sendMessage(msg.key.remoteJid, {
                audio: { url },
                mimetype: 'audio/mp4',
                ptt: true
            }, { quoted: msg });
        } catch (err) {
            console.error(err);
            await replyWithTag(sock, msg.key.remoteJid, msg, "❌ Erreur lors de la génération du vocal.");
        }
    }
};
