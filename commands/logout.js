const fs = require('fs-extra');
const path = require('path');

module.exports = {
    name: 'logout',
    description: 'Efface la session et redémarre le bot (utile en cas d\'erreurs de décryptage)',
    adminOnly: true,
    run: async ({ sock, msg, replyWithTag }) => {
        // Restricted to owner usually or just anyone if it's a private bot
        const remoteJid = msg.key.remoteJid;

        await replyWithTag(sock, remoteJid, msg, "👋 Déconnexion en cours... La session sera effacée. Veuillez scanner le nouveau QR code sur le dashboard Render.");

        const AUTH_FOLDER = path.join(__dirname, "../session");

        setTimeout(() => {
            try {
                sock.logout();
                fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                console.log("[LOGOUT] Session cleared. Exiting...");
                process.exit(0);
            } catch (err) {
                console.error("Logout error:", err);
            }
        }, 3000);
    }
};
