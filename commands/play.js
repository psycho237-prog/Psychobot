const fs = require('fs');
const path = require('path');
const yts = require('yt-search');
const axios = require('axios');

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
            const search = await yts(query);
            const video = search.videos[0];

            if (!video) return replyWithTag(sock, from, msg, "❌ Aucun résultat trouvé.");

            const infoText = `🎵 *Audio trouvé :* ${video.title}\n👤 *Artiste :* ${video.author.name}\n⏱️ *Durée :* ${video.timestamp}`;
            await sock.sendMessage(from, { text: infoText }, { quoted: msg });

            await replyWithTag(sock, from, msg, "⏳ Préparation du téléchargement...");

            // Use a public reliable API for conversion
            const dlApi = `https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(video.url)}`;
            const res = await axios.get(dlApi);

            if (!res.data || !res.data.result || !res.data.result.download) {
                // Fallback to second API
                const dlApi2 = `https://api.agatz.xyz/api/ytmp3?url=${encodeURIComponent(video.url)}`;
                const res2 = await axios.get(dlApi2);
                if (!res2.data || !res2.data.data || !res2.data.data.download) {
                    throw new Error("API Down");
                }
                var downloadUrl = res2.data.data.download;
            } else {
                var downloadUrl = res.data.result.download;
            }

            const fileName = `audio_${Date.now()}.mp3`;
            const filePath = path.join(tempDir, fileName);

            const fileRes = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
            fs.writeFileSync(filePath, Buffer.from(fileRes.data));

            await sock.sendMessage(from, {
                audio: { url: filePath },
                mimetype: 'audio/mp4',
                fileName: video.title + ".mp3",
                ptt: false
            }, { quoted: msg });

            fs.unlinkSync(filePath);

        } catch (err) {
            console.error(err);
            await replyWithTag(sock, from, msg, "❌ Le téléchargement a échoué (Serveur saturé).");
        }
    }
};