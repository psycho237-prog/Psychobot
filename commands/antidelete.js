module.exports = {
    name: "antidelete",
    description: "Active ou désactive la récupération des messages supprimés dans ce groupe.",
    adminOnly: true,
    run: async ({ sock, msg, antideleteGroups, replyWithTag }) => {
        const from = msg.key.remoteJid;

        if (antideleteGroups.has(from)) {
            antideleteGroups.delete(from);
            await replyWithTag(sock, from, msg, `🚫 *Anti-Delete Désactivé* pour ${from.endsWith("@g.us") ? "ce groupe" : "cette discussion"}.`);
        } else {
            antideleteGroups.add(from);
            await replyWithTag(sock, from, msg, `✅ *Anti-Delete Activé* pour ${from.endsWith("@g.us") ? "ce groupe" : "cette discussion"}.\n_(Les messages supprimés me seront envoyés)_`);
        }
    }
};