const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

module.exports = {
    name: 'play',
    description: "Recherche et télécharge une musique YouTube.",
    run: async ({ sock, msg, args, replyWithTag }) => {
        const query = args.join(" ");
        const from = msg.key.remoteJid;

        if (!query) return replyWithTag(sock, from, msg, "❌ Entrez le nom d'une musique.");

        const tempDir = path.join(__dirname, "../temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        try {
            await replyWithTag(sock, from, msg, `🔎 Recherche de "${query}"...`);

            // Check how to call yt-dlp
            let ytdlpCmd = 'yt-dlp';
            try { await execAsync('yt-dlp --version'); }
            catch (e) { ytdlpCmd = 'python3 -m yt_dlp'; }

            // Search with yt-dlp
            const searchCmd = `${ytdlpCmd} "ytsearch:${query}" --get-id --get-title --get-duration --no-warnings --quiet`;
            const { stdout: searchOutput } = await execAsync(searchCmd);

            const lines = searchOutput.trim().split('\n');
            if (lines.length < 3) return replyWithTag(sock, from, msg, "❌ Aucun résultat trouvé.");

            const videoTitle = lines[0];
            const videoDuration = lines[1];
            const videoId = lines[2];
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

            await sock.sendMessage(from, { text: `🎵 *Musique trouvée :* ${videoTitle}\n⏱️ *Durée :* ${videoDuration}` }, { quoted: msg });
            await replyWithTag(sock, from, msg, "⏳ Téléchargement en cours...");

            const fileName = `audio_${Date.now()}`;
            const outputPath = path.join(tempDir, fileName);

            // Try download
            const downloadCmd = `${ytdlpCmd} "${videoUrl}" --extract-audio --audio-format mp3 --output "${outputPath}.%(ext)s" --no-warnings --quiet`;
            await execAsync(downloadCmd, { timeout: 120000 });

            const filePath = `${outputPath}.mp3`;
            if (!fs.existsSync(filePath)) throw new Error("Outil introuvable.");

            await sock.sendMessage(from, {
                audio: { url: filePath },
                mimetype: 'audio/mp4',
                fileName: videoTitle + ".mp3",
                ptt: false
            }, { quoted: msg });

            fs.unlinkSync(filePath);
        } catch (err) {
            console.error('[Play Error]:', err.message);
            await replyWithTag(sock, from, msg, "❌ Échec. Si le problème persiste, c'est que l'outil de téléchargement n'est pas installé sur le serveur.");
        }
    }
};