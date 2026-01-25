const { create: createYtDl } = require('yt-dlp-exec');
const fs = require('fs');
const path = require('path');

// Logic for finding the best yt-dlp binary
let ytDl;
const localBin = path.join(__dirname, '../node_modules/yt-dlp-exec/bin/yt-dlp');
const systemBin = '/usr/local/bin/yt-dlp'; // Common for Docker/Render custom installs
const fallbackBin = 'yt-dlp';

if (fs.existsSync(localBin)) {
    ytDl = createYtDl(localBin);
} else if (fs.existsSync(systemBin)) {
    ytDl = createYtDl(systemBin);
} else {
    ytDl = createYtDl(fallbackBin);
}

module.exports = {
    name: 'play',
    description: "Recherche et télécharge une musique YouTube (Optimisé Render).",
    run: async ({ sock, msg, args, replyWithTag }) => {
        const query = args.join(" ");
        const from = msg.key.remoteJid;
        const tempDir = path.join(__dirname, "../temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        if (!query) return replyWithTag(sock, from, msg, "❌ Entrez le nom d'une musique.");

        try {
            // 1. Search and get Metadata
            const meta = await ytDl(`ytsearch1:${query}`, {
                dumpSingleJson: true,
                noWarnings: true,
                preferFreeFormats: true,
            });

            if (!meta.entries || !meta.entries.length) {
                return replyWithTag(sock, from, msg, "❌ Aucun résultat trouvé.");
            }

            const video = meta.entries[0];
            const fileName = `audio_${Date.now()}.mp3`;
            const filePath = path.join(tempDir, fileName);

            await sock.sendMessage(from, {
                text: `🎵 *Musique trouvée :* ${video.title}\n⏱️ *Durée :* ${video.duration_string}\n⏳ *Téléchargement en cours...*`
            }, { quoted: msg });

            // 2. Download directly using the library
            await ytDl(video.webpage_url, {
                extractAudio: true,
                audioFormat: 'mp3',
                output: filePath,
                noWarnings: true,
                addHeader: [
                    'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                ]
            });

            if (!fs.existsSync(filePath)) {
                throw new Error("Le fichier n'a pas pu être généré.");
            }

            // 3. Send to WhatsApp
            await sock.sendMessage(from, {
                audio: { url: filePath },
                mimetype: 'audio/mp4',
                fileName: `${video.title}.mp3`,
                ptt: false
            }, { quoted: msg });

            // Clean up
            setTimeout(() => {
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
            }, 5000);

        } catch (err) {
            console.error('[Play Error]:', err.message);
            // Check if it's an ffmpeg or yt-dlp missing error
            if (err.message.includes('NOT_FOUND') || err.message.includes('ENOENT')) {
                await replyWithTag(sock, from, msg, "❌ Erreur système: FFmpeg ou yt-dlp est manquant sur le serveur. Déploie avec Docker pour corriger.");
            } else {
                await replyWithTag(sock, from, msg, `❌ Échec du téléchargement : ${err.message}`);
            }
        }
    }
};