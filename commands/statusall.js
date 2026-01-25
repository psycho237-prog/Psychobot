module.exports = {
    name: "statusall",
    description: "Infos sur la lecture automatique des statuts.",
    run: async ({ sock, msg, replyWithTag }) => {
        const text = `ℹ️ *L'auto-statut est déjà actif !*

Votre Psycho-Bot surveille les nouveaux statuts 24h/24 et :
✅ Les marque comme "vus" automatiquement
❤️ Les "like" avec une réaction cœur

💡 *Note:* Le bot détecte uniquement les nouveaux statuts publiés après sa connexion.`;

        await replyWithTag(sock, msg.key.remoteJid, msg, text);
    }
};