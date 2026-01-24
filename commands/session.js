const fs = require('fs-extra');
const path = require('path');

module.exports = {
    name: 'session',
    description: 'Affiche la session ID (Base64) pour une connexion permanente sur Render.',
    adminOnly: true,
    run: async ({ sock, msg, replyWithTag }) => {
        try {
            const AUTH_FOLDER = path.join(__dirname, "../session");
            const credsPath = path.join(AUTH_FOLDER, 'creds.json');

            if (!fs.existsSync(credsPath)) {
                return replyWithTag(sock, msg.key.remoteJid, msg, "❌ Fichier de session introuvable.");
            }

            const creds = fs.readFileSync(credsPath, 'utf-8');
            const sessionBase64 = Buffer.from(creds).toString('base64');

            await sock.sendMessage(msg.key.remoteJid, {
                text: `🤫 *SESSION ID (NE PAS PARTAGER)*\n\nCopiez le texte ci-dessous et ajoutez-le comme variable d'environnement sur Render avec le nom : *SESSION_DATA*\n\n\`\`\`${sessionBase64}\`\`\``
            }, { quoted: msg });

        } catch (err) {
            console.error('Session Error:', err);
            await replyWithTag(sock, msg.key.remoteJid, msg, "❌ Une erreur est survenue lors de la génération de l'ID.");
        }
    }
};
