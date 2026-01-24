module.exports = {
    name: "antilink",
    description: "Active ou désactive la suppression automatique des liens de groupes WhatsApp.",
    adminOnly: true,
    run: async ({ sock, msg, antilinkGroups, replyWithTag }) => {
        const from = msg.key.remoteJid;

        if (!from.endsWith("@g.us")) {
            return replyWithTag(sock, from, msg, "❌ Cette commande ne fonctionne que dans un groupe.");
        }

        if (antilinkGroups.has(from)) {
            antilinkGroups.delete(from);
            await replyWithTag(sock, from, msg, "🚫 *Anti-Link Désactivé* pour ce groupe.");
        } else {
            antilinkGroups.add(from);
            await replyWithTag(sock, from, msg, "✅ *Anti-Link Activé* pour ce groupe.\n_(Les pubs de groupes seront supprimées et l'auteur exclu si je suis admin)_");
        }
    }
};
