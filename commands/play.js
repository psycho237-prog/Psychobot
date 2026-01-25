const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

module.exports = {
    name: 'play',
    description: "Recherche et télécharge une musique YouTube avec yt-dlp.",
    run: async ({ sock, msg, args, replyWithTag }) => {
        const query = args.join(" ");
        const from = msg.key.remoteJid;

        if (!query) return replyWithTag(sock, from, msg, "❌ Entrez le nom d'une musique.");

        const tempDir = path.join(__dirname, "../temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        try {
            await replyWithTag(sock, from, msg, `🔎 Recherche de "${query}"...`);

            // Recherche avec yt-dlp (plus fiable que yts)
            const searchCmd = `yt-dlp "ytsearch:${query}" --get-id --get-title --get-duration --cookies-from-browser firefox --no-warnings --quiet`;
            const { stdout: searchOutput } = await execAsync(searchCmd);

            const lines = searchOutput.trim().split('\n');
            if (lines.length < 3) {
                return replyWithTag(sock, from, msg, "❌ Aucun résultat trouvé.");
            }

            const videoTitle = lines[0];
            const videoDuration = lines[1];
            const videoId = lines[2];
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

            const infoText = `🎵 *Audio trouvé :* ${videoTitle}\n⏱️ *Durée :* ${videoDuration}`;
            await sock.sendMessage(from, { text: infoText }, { quoted: msg });

            await replyWithTag(sock, from, msg, "⏳ Téléchargement en cours...");

            // Télécharge avec yt-dlp + cookies du navigateur
            const fileName = `audio_${Date.now()}`;
            const outputPath = path.join(tempDir, fileName);

            const downloadCmd = `yt-dlp "${videoUrl}" \
                --cookies-from-browser firefox \
                --extract-audio \
                --audio-format mp3 \
                --audio-quality 0 \
                --output "${outputPath}.%(ext)s" \
                --no-warnings \
                --quiet`;

            await execAsync(downloadCmd, { timeout: 120000 }); // 2 min timeout

            const filePath = `${outputPath}.mp3`;

            if (!fs.existsSync(filePath)) {
                throw new Error("Le fichier téléchargé est introuvable.");
            }

            await sock.sendMessage(from, {
                audio: { url: filePath },
                mimetype: 'audio/mp4',
                fileName: videoTitle + ".mp3",
                ptt: false
            }, { quoted: msg });

            // Nettoyage
            fs.unlinkSync(filePath);

        } catch (err) {
            console.error('[Play Error]:', err.message);
            await replyWithTag(sock, from, msg, `❌ Le téléchargement a échoué: ${err.message}`);
        }
    }
};