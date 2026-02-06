const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Downloads audio from a URL and converts it to OGG Opus (WhatsApp Voice Note format).
 * @param {string} url - The URL of the audio (e.g., Google TTS).
 * @returns {Promise<string>} - Path to the local OGG file.
 */
async function convertToOpus(url) {
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}.mp3`);
    const outputPath = path.join(tempDir, `voice_${Date.now()}.ogg`);

    try {
        // 1. Download the MP3
        // Added User-Agent to avoid Google 403 blocks
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const writer = fs.createWriteStream(inputPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', (err) => {
                console.error("Audio Write Error:", err);
                reject(err);
            });
        });

        // 2. Convert to OGG Opus using ffmpeg
        // WhatsApp requires: OGG container, Opus codec.
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .audioCodec('libopus')
                .toFormat('ogg')
                .addOutputOption('-avoid_negative_ts make_zero') // Fix playback issues
                .on('end', () => resolve())
                .on('error', (err) => {
                    console.error("FFmpeg Conversion Error:", err);
                    reject(err);
                })
                .save(outputPath);
        });

        // Cleanup input immediately
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

        return outputPath;

    } catch (error) {
        // Cleanup on error
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        console.error("AudioHelper Error:", error.message);
        throw error;
    }
}

module.exports = { convertToOpus };
