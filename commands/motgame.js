const sessions = new Map();

module.exports = {
    name: 'motgame',
    description: 'Devinez le mot mélangé.',
    run: async ({ sock, msg, replyWithTag }) => {
        const from = msg.key.remoteJid;
        const words = ["WHATSAPP", "PYTHON", "BOT", "TELEPHONE", "ORDINATEUR", "INTERNET", "PROGRAMMATION", "AFRIQUE", "CAMEROUN", "BASKETBALL", "MUSIQUE"];
        const word = words[Math.floor(Math.random() * words.length)];
        const scrambled = word.split('').sort(() => 0.5 - Math.random()).join('');

        sessions.set(from, word);

        const text = `🎯 *JEU DU MOT MÉLANGÉ* 🎯\n\nRemettez les lettres dans l'ordre :\n👉 *${scrambled}*\n\n_(Répondez directement avec le mot ! 30s)_`;
        await replyWithTag(sock, from, msg, text);

        setTimeout(() => {
            if (sessions.has(from) && sessions.get(from) === word) {
                sock.sendMessage(from, { text: `⏰ Temps écoulé ! Le mot était : *${word}*` });
                sessions.delete(from);
            }
        }, 30000);
    },
    onMessage: async (sock, msg, text) => {
        const from = msg.key.remoteJid;
        if (!sessions.has(from)) return false;

        const answer = sessions.get(from);
        if (text.toUpperCase().trim() === answer) {
            await sock.sendMessage(from, { text: `🎉 *GAGNÉ !* Le mot était bien *${answer}* !` }, { quoted: msg });
            sessions.delete(from);
            return true;
        }
        return false;
    }
};