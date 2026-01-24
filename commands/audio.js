const fs = require("fs");
const axios = require("axios");
const path = require("path");

module.exports = {
    name: "audio",
    description: "Envoie la note vocale depuis Google Drive",
    run: async ({ sock, msg }) => {
        const from = msg.key.remoteJid;
        const tempPath = path.join(__dirname, "temp_audio.opus");

        try {
            // --- Téléchargement du fichier depuis Google Drive ---
            const driveLink = "https://drive.google.com/uc?export=download&id=1EiYIBggIijVQ586e-yqYAY97EIaxuurY";
            const response = await axios({
                url: driveLink,
                method: "GET",
                responseType: "arraybuffer"
            });

            fs.writeFileSync(tempPath, Buffer.from(response.data));

            // --- Envoi comme note vocale (PTT) ---
            await sock.sendMessage(from, {
                audio: { url: tempPath },
                mimetype: "audio/opus",
                ptt: true
            });

            console.log("[AUDIO] Note vocale envoyée ✅");
        } catch (err) {
            console.error("[AUDIO] Erreur :", err);
            await sock.sendMessage(from, { text: "❌ Impossible d’envoyer la note vocale." });
        } finally {
            // --- Nettoyage du fichier temporaire ---
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
    }
};