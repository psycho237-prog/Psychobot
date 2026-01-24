module.exports = {
    name: "antidelete",
    description: "Active ou désactive la récupération des messages supprimés dans ce groupe.",
    adminOnly: true,
    run: async ({ sock, msg, antideleteGroups, replyWithTag }) => {
        const from = msg.key.remoteJid;

        if (!from.endsWith("@g.us")) {
            return replyWithTag(sock, from, msg, "❌ Cette commande ne fonctionne que dans un groupe.");
        }

        if (antideleteGroups.has(from)) {
            antideleteGroups.delete(from);
            await replyWithTag(sock, from, msg, "🚫 *Anti-Delete Désactivé* pour ce groupe.");
        } else {
            antideleteGroups.add(from);
            await replyWithTag(sock, from, msg, "✅ *Anti-Delete Activé* pour ce groupe.\n_(Les messages supprimés seront envoyés à mon maître)_");
        }
    }
};