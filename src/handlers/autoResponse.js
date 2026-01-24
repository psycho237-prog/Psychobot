const aiService = require('../services/ai');

module.exports = async (msg, sock) => {
    const remoteJid = msg.key.remoteJid;
    const isGroup = remoteJid.endsWith('@g.us');
    const isDM = remoteJid.endsWith('@s.whatsapp.net');

    // Check content
    let text = "";
    let isMentioned = false;

    if (msg.message.conversation) {
        text = msg.message.conversation;
    } else if (msg.message.extendedTextMessage) {
        text = msg.message.extendedTextMessage.text;
        // Check mentions
        const mentions = msg.message.extendedTextMessage.contextInfo?.mentionedJid || [];
        if (mentions.includes(sock.user.id.split(':')[0] + '@s.whatsapp.net') || mentions.includes(sock.user.id)) {
            isMentioned = true;
        }
    }

    if (!text) return;

    // Trigger if DM or Mentioned in Group
    if (isDM || (isGroup && isMentioned)) {
        console.log("Auto Response Triggered for:", text);

        // Simple check for greeting "Are you a greeting?" logic handled by AI
        // User asked: "DM messages (ONLY DM messages and Tages) will be send to that model that will detect if it's a salutation... if it is not a greating nothing is done."

        try {
            const aiResponse = await aiService.getAIResponse(text);

            // For now, if AI says it's a greeting, we reply.
            // Since it's a mock AI, we'll just check if it *looks* like a greeting for this demo.
            // In real app, AI decides.

            // Mock logic: If text contains hello/hi/salut/bonjour
            const lowerText = text.toLowerCase();
            const greetings = ['hello', 'hi', 'hey', 'salut', 'bonjour', 'coucou', 'yo'];
            const isMockGreeting = greetings.some(g => lowerText.includes(g));

            if (isMockGreeting) {
                await sock.sendMessage(remoteJid, { text: aiResponse }, { quoted: msg });
            } else if (lowerText === '!ping') {
                await sock.sendMessage(remoteJid, { text: 'Pong! 🏓\nAuto-Response Active' }, { quoted: msg });
            } else {
                // If real AI was used, we would check if aiResponse indicates "Not a greeting"
                // For now, do nothing if not a greeting
                console.log("Not a greeting, ignoring.");
            }

        } catch (error) {
            console.error("Error in auto-response:", error);
        }
    }
};
