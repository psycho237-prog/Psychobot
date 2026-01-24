const sessions = new Map();

module.exports = {
    name: "guess",
    description: "Devinez un nombre entre 1 et 10.",
    run: async ({ sock, msg }) => {
        const from = msg.key.remoteJid;
        const random = Math.floor(Math.random() * 10) + 1;

        sessions.set(from, random);

        await sock.sendMessage(from, { text: "🎲 *DEVINE LE NOMBRE* 🎲\n\nJ'ai choisi un nombre entre *1 et 10*.\nRéponds uniquement avec le chiffre !\n\n_(Tu as 15 secondes)_" }, { quoted: msg });

        // Handling via a simple timeout check for clean deletion
        setTimeout(() => {
            if (sessions.has(from)) {
                sock.sendMessage(from, { text: `⏰ Temps écoulé ! C'était le *${random}*.` });
                sessions.delete(from);
            }
        }, 15000);
    },
    // We will hook this into index.js or handle it globally
    onMessage: async (sock, msg, text, sessionsMap) => {
        const from = msg.key.remoteJid;
        if (!sessions.has(from)) return false;

        const guess = parseInt(text.trim());
        if (isNaN(guess)) return false;

        const answer = sessions.get(from);
        if (guess === answer) {
            await sock.sendMessage(from, { text: `🎉 *BRAVO !* C'était bien le ${answer} !` }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text: `❌ Dommage ! C'était le *${answer}*.` }, { quoted: msg });
        }

        sessions.delete(from);
        return true; // Handled
    }
};