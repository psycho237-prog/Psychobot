// commands/antidelete.js
module.exports = {
    name: "antidelete",
    description: "Restaure les messages supprimés dans le chat.",
    adminOnly: true,
    run: async ({ sock, msg, replyWithTag }) => {
        // Stocker les messages reçus globalement
        if (!global.allMessages) global.allMessages = {};

        const jid = msg.key.remoteJid;
        if (!global.allMessages[jid]) global.allMessages[jid] = [];

        // Sauvegarder le message
        global.allMessages[jid].push(msg);

        // Informer
        await replyWithTag(sock, jid, msg, "✅ Message enregistré pour anti-delete.");
    },
    // Listener pour messages supprimés (revoke)
    onMessageDelete: async ({ sock, key, deletedMessage }) => {
        const jid = key.remoteJid;
        const original = global.allMessages?.[jid]?.find(m => m.key.id === key.id);
        if (original) {
            await sock.sendMessage(jid, { text: `⚠️ Un message a été supprimé par ${key.participant || "l'utilisateur"} :\n${original.message.conversation || "[Media]"}` });
        }
    }
};