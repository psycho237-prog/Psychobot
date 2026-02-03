const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const ytSearch = require('yt-search');
const ffmpegPath = require('ffmpeg-static');
const os = require('os');
const axios = require('axios');

module.exports = {
    name: 'play',
    description: "Recherche et télécharge une musique YouTube (Compatible Render).",
    run: async ({ sock, msg, args, replyWithTag }) => {
        const query = args.join(" ");
        const from = msg.key.remoteJid;

        if (!query) return replyWithTag(sock, from, msg, "❌ Entrez le nom d'une musique.");

        const tempDir = os.tmpdir(); // Use system temp for Render compatibility
        const binDir = path.join(tempDir, 'bin'); // Separate bin dir in temp
        if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

        // Helper: Download yt-dlp if missing
        const ytDlpPath = path.join(binDir, 'yt-dlp');
        async function ensureYtDlp() {
            if (fs.existsSync(ytDlpPath)) return ytDlpPath;
            try {
                // Determine download URL based on platform (assuming Linux for Render)
                const url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
                const response = await axios({
                    url,
                    method: 'GET',
                    responseType: 'stream'
                });

                const writer = fs.createWriteStream(ytDlpPath);
                response.data.pipe(writer);

                return new Promise((resolve, reject) => {
                    writer.on('finish', async () => {
                        await execAsync(`chmod +x "${ytDlpPath}"`);
                        resolve(ytDlpPath);
                    });
                    writer.on('error', reject);
                });
            } catch (e) {
                throw new Error("Impossible de télécharger yt-dlp: " + e.message);
            }
        }

        try {
            await replyWithTag(sock, from, msg, `🔎 Recherche de "${query}"...`);

            // 1. Search using yt-search (No binary needed)
            const searchResult = await ytSearch(query);
            const video = searchResult.videos.length > 0 ? searchResult.videos[0] : null;

            if (!video) return replyWithTag(sock, from, msg, "❌ Aucun résultat trouvé.");

            const { title, timestamp, url, duration } = video;

            await sock.sendMessage(from, {
                text: `🎵 *Musique trouvée :* ${title}\n⏱️ *Durée :* ${timestamp}\n🔗 *Lien :* ${url}`
            }, { quoted: msg });

            await replyWithTag(sock, from, msg, "⏳ Téléchargement et conversion en cours (cela peut prendre quelques secondes)...");

            // 2. Ensure yt-dlp binary
            const ytPath = await ensureYtDlp();

            // 3. Download Audio (Optimized for Speed: Native m4a/aac)
            const fileName = `audio_${Date.now()}`;
            // Output template defines extension automatically
            const outputTemplate = path.join(tempDir, fileName) + ".%(ext)s";

            // Check for cookies.txt
            const cookiesPath = path.join(__dirname, '../cookies.txt');
            let cookieArg = "";
            if (fs.existsSync(cookiesPath)) {
                cookieArg = `--cookies "${cookiesPath}"`;
            }

            // Command: Use Android client with fallback to video+convert (verified working)
            const cmd = `"${ytPath}" -f "bestaudio/best" -x --audio-format m4a --ffmpeg-location "${ffmpegPath}" --extractor-args "youtube:player_client=android" ${cookieArg} -o "${outputTemplate}" "${url}" --no-playlist --no-warnings --no-check-certificate --add-header "referer:youtube.com"`;

            await execAsync(cmd, { timeout: 300000 });

            // Find the generated file (could be .m4a)
            const files = fs.readdirSync(tempDir).filter(f => f.startsWith(fileName) && f.endsWith('.m4a'));
            if (files.length === 0) throw new Error("Fichier audio non généré.");

            const downloadedFile = path.join(tempDir, files[0]);
            const finalExt = path.extname(downloadedFile);

            // 4. Send
            await sock.sendMessage(from, {
                audio: { url: downloadedFile },
                mimetype: 'audio/mp4', // WhatsApp handles m4a/mp4 well
                fileName: title + finalExt,
                ptt: false
            }, { quoted: msg });

            // Cleanup
            fs.unlinkSync(downloadedFile);

        } catch (err) {
            console.error('[Play Error]:', err);
            await replyWithTag(sock, from, msg, `❌ Erreur: ${err.message}`);
        }
    }
};