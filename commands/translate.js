const axios = require('axios');

module.exports = {
    name: 'translate',
    description: 'Traduit un texte. Usage: !translate <lang> <texte> ou répondez à un message avec !translate <lang>.',
    run: async ({ sock, msg, args, replyWithTag }) => {
        try {
            const remoteJid = msg.key.remoteJid;
            let targetLang = 'fr'; // Langue par défaut
            let textToTranslate = "";

            // 1. Analyse des arguments pour la langue cible
            // On vérifie si le premier argument est un code de langue (ex: 'en', 'ar', 'es')
            if (args[0] && args[0].length === 2) {
                targetLang = args[0].toLowerCase();
                textToTranslate = args.slice(1).join(" ");
            } else {
                textToTranslate = args.join(" ");
            }

            // 2. Gestion du message répondu (Reply)
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quotedMsg && (!textToTranslate || textToTranslate.trim() === "")) {
                textToTranslate = quotedMsg.conversation ||
                    quotedMsg.extendedTextMessage?.text ||
                    quotedMsg.imageMessage?.caption ||
                    quotedMsg.videoMessage?.caption;
            }

            // 3. Validation
            if (!textToTranslate || textToTranslate.trim() === "") {
                return replyWithTag(sock, remoteJid, msg, "❌ *Usage:* \n!translate <lang> <texte>\n_Ex: !translate en Bonjour_\n\nOu répondez à un message avec: \n!translate <lang>");
            }

            // 4. Appel à l'API Google Translate
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`;

            const res = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0' // Aide à éviter les blocages
                }
            });

            if (!res.data || !res.data[0]) throw new Error("Réponse vide");

            // Extraction de la traduction (Google renvoie un tableau de segments)
            const translation = res.data[0].map(item => item[0]).join("");
            const detectedLang = res.data[2];

            // 5. Envoi de la réponse
            const responseText = `🌐 *Traduction*\n` +
                `━━━━━━━━━━━━━━\n` +
                `📥 *De:* ${detectedLang.toUpperCase()}\n` +
                `📤 *Vers:* ${targetLang.toUpperCase()}\n` +
                `📝 *Résultat:* ${translation}`;

            await sock.sendMessage(remoteJid, { text: responseText }, { quoted: msg });

        } catch (err) {
            console.error('Translate Error:', err.message);
            await replyWithTag(sock, msg.key.remoteJid, msg, "❌ Erreur: Langue non supportée ou problème de connexion.");
        }
    }
};
