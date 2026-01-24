const { proto } = require("@whiskeysockets/baileys");

module.exports = async (msg, sock) => {
    // 1. Get text content
    let text = "";
    if (msg.message.conversation) {
        text = msg.message.conversation;
    } else if (msg.message.extendedTextMessage) {
        text = msg.message.extendedTextMessage.text;
    } else if (msg.message.imageMessage) {
        text = msg.message.imageMessage.caption;
    } else if (msg.message.videoMessage) {
        text = msg.message.videoMessage.caption;
    }

    if (!text) return;

    // 2. Extract first emoji
    // Regex for emojis (broad coverage)
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u;
    const match = text.match(emojiRegex);

    if (match) {
        const emoji = match[0];
        try {
            await sock.sendMessage(msg.key.remoteJid, {
                react: {
                    text: emoji,
                    key: msg.key
                }
            });
        } catch (error) {
            console.error("Error sending auto-reaction:", error);
        }
    }
};
