module.exports = {
    name: "statusall",
    description: "Infos sur la lecture automatique des statuts.",
    run: async ({ sock, msg, replyWithTag }) => {
        const text = `ℹ️ *L'auto-statut est déjà actif !*

Votre Psycho-Bot surveille les nouveaux statuts 24h/24 et les marque comme "vus" dès qu'ils apparaissent.

💡 *Note:* En raison de l'architecture sans base de données, il ne peut pas "charger" les anciens statuts passés, mais il lira tous les futurs statuts automatiquement.`;

        await replyWithTag(sock, msg.key.remoteJid, msg, text);
    }
};