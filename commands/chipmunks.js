const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const ffmpegPath = require('ffmpeg-static');

// Setup temp dir
const TMP_DIR = path.join(__dirname, '../temp_audio');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

function runChipmunksEffect(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const ffmpegArgs = [
      "-y",
      "-i", inputPath,
      "-vn",
      "-af", "asetrate=44100*1.6,aresample=44100,atempo=0.9",
      "-c:a", "libopus",
      "-b:a", "64k",
      outputPath
    ];

    const ff = spawn(ffmpegPath, ffmpegArgs); // Use static ffmpeg path
    let stderr = "";
    ff.stderr.on("data", (d) => { stderr += d.toString(); });
    ff.on("close", (code) => {
      if (code === 0) return resolve();
      return reject(new Error("ffmpeg failed: " + stderr));
    });
  });
}

module.exports = {
  name: "chipmunks",
  description: "Applique un effet voix de chipmunk sur un audio",
  run: async ({ sock, msg, replyWithTag }) => {
    const remoteJid = msg.key.remoteJid;

    // Check quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) {
      return replyWithTag(sock, remoteJid, msg, "❌ Réponds à une note vocale avec `!chipmunks`.");
    }

    const mediaKey = quoted.audioMessage ? "audioMessage" : null;
    if (!mediaKey) {
      return replyWithTag(sock, remoteJid, msg, "❌ Le message cité n'est pas un audio.");
    }

    try {
      await replyWithTag(sock, remoteJid, msg, "🎶 Transformation en cours...");

      // Download media
      const stream = await downloadContentFromMessage(quoted[mediaKey], "audio");
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const idShort = Date.now();
      const inputPath = path.join(TMP_DIR, `in_${idShort}.opus`);
      const outputPath = path.join(TMP_DIR, `out_${idShort}.opus`);

      fs.writeFileSync(inputPath, buffer);

      // Process
      await runChipmunksEffect(inputPath, outputPath);

      // Send
      const outBuffer = fs.readFileSync(outputPath);
      await sock.sendMessage(remoteJid, {
        audio: outBuffer,
        ptt: true // Send as voice note
      }, { quoted: msg });

      // Cleanup
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);

    } catch (err) {
      console.error("[CHIPMUNKS] Error:", err);
      await replyWithTag(sock, remoteJid, msg, "❌ Erreur de traitement: " + err.message);
    }
  }
};