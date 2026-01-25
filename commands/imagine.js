const sharp = require('sharp');
const axios = require('axios');

module.exports = {
    name: 'imagine',
    description: "Générez une image AI avec le modèle Flux.",
    run: async ({ sock, msg, args, replyWithTag }) => {
        const from = msg.key.remoteJid;
        const prompt = args.join(" ");
        if (!prompt) return replyWithTag(sock, from, msg, "❌ Prompt manquant.");

        try {
            await replyWithTag(sock, from, msg, "🎨 Création de l'image en cours...");

            const seed = Math.floor(Math.random() * 1000000);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`;

            // 1. Download
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const inputBuffer = Buffer.from(response.data);

            // 2. Create the Watermark SVG (Aligned Bottom-Right)
            const svgWatermark = `
                <svg width="1024" height="1024" viewBox="0 0 1024 1024">
                    <style>
                        .title { fill: white; font-size: 35px; font-weight: bold; font-family: sans-serif; opacity: 0.8; text-shadow: 2px 2px 4px black; }
                        .bg { fill: black; opacity: 0.5; }
                    </style>
                    <!-- Background Box -->
                    <rect x="730" y="960" width="280" height="50" class="bg" rx="10" />
                    <!-- Text -->
                    <text x="750" y="995" class="title">PSYCHO-BOT</text>
                </svg>`;

            // 3. Composite (Resize to ensure match)
            const watermarkedBuffer = await sharp(inputBuffer)
                .resize(1024, 1024)
                .composite([{ input: Buffer.from(svgWatermark), top: 0, left: 0 }])
                .jpeg()
                .toBuffer();

            // 4. Send
            await sock.sendMessage(from, {
                image: watermarkedBuffer,
                caption: `✨ *Prompt:* ${prompt}\n\n_By PSYCHO-BOT_`
            }, { quoted: msg });

        } catch (err) {
            console.error(err);
            await replyWithTag(sock, from, msg, "❌ Erreur de génération.");
        }
    }
};
