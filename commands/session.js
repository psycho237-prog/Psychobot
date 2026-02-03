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
            const hasRenderInfo = process.env.RENDER_API_KEY && process.env.RENDER_SERVICE_ID;

            let statusMsg = `🤫 *SESSION ID (NE PAS PARTAGER)*\n\n`;
            statusMsg += `Copiez le texte ci-dessous et ajoutez-le comme variable d'environnement sur Render avec le nom : *SESSION_DATA*\n\n`;
            statusMsg += `\`\`\`${sessionBase64}\`\`\`\n\n`;
            statusMsg += `ℹ️ *Statut Persistance :*\n`;
            statusMsg += hasRenderInfo ? `✅ *Auto-Sync Active* (Render API liée).` : `❌ *Auto-Sync Inactive*. Veuillez configurer RENDER_API_KEY pour la persistance automatique.`;

            await sock.sendMessage(msg.key.remoteJid, { text: statusMsg }, { quoted: msg });

        } catch (err) {
            console.error('Session Error:', err);
            await replyWithTag(sock, msg.key.remoteJid, msg, "❌ Une erreur est survenue.");
        }
    }
};
