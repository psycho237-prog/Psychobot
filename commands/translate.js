const axios = require('axios');

module.exports = {
    name: 'translate',
    description: 'Traduit un texte dans la langue spécifiée. Usage: !translate <lang> <texte> ou répondez à un message avec !translate <lang>.',
    adminOnly: false,
    run: async ({ sock, msg, args, replyWithTag }) => {
        try {
            const remoteJid = msg.key.remoteJid;
            let targetLang = 'fr';
            let textToTranslate = "";

            if (args[0] && args[0].length === 2) {
                targetLang = args[0].toLowerCase();
                textToTranslate = args.slice(1).join(" ");
            } else {
                textToTranslate = args.join(" ");
            }

            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quotedMsg && !textToTranslate) {
                textToTranslate = quotedMsg.conversation ||
                    quotedMsg.extendedTextMessage?.text ||
                    quotedMsg.imageMessage?.caption ||
                    quotedMsg.videoMessage?.caption;
            }

            if (!textToTranslate || textToTranslate.trim() === "") {
                return replyWithTag(sock, remoteJid, msg, "❌ Usage: *!translate <lang> <texte>* ou répondez à un message avec *!translate <lang>*. Ex: !translate en Bonjour");
            }

            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
            const res = await axios.get(url, { timeout: 10000 });

            if (!res.data || !res.data[0]) throw new Error("Réponse vide");

            const translation = res.data[0].map(item => item[0]).join("");
            const detectedLang = res.data[2];

            const responseText = `🌐 *Traduction (${detectedLang.toUpperCase()} → ${targetLang.toUpperCase()})*\n━━━━━━━━━━━━━━\n${translation}`;
            await sock.sendMessage(remoteJid, { text: responseText }, { quoted: msg });

        } catch (err) {
            console.error('Translate Error:', err.message);
            await replyWithTag(sock, msg.key.remoteJid, msg, "❌ Erreur de traduction. Vérifiez le code langue.");
        }
    }
};
