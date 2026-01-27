module.exports = {
    name: "delete",
    description: "Supprime n’importe quel message dans le groupe (le bot doit être admin).",
    adminOnly: true,
    run: async ({ sock, msg }) => {
        const from = msg.key.remoteJid;

        const groupMetadata = from.endsWith("@g.us") ? await sock.groupMetadata(from) : null;

        const cleanJid = (jid) => jid ? jid.split(':')[0].split('@')[0] : "";
        const sender = msg.key.participant || msg.participant || msg.key.remoteJid;
        const senderClean = cleanJid(sender);
        const OWNER_PN = "237696814391";
        const OWNER_LID = "250865332039895";

        let isAdmin = false;
        if (groupMetadata) {
            isAdmin = groupMetadata.participants.some(p => {
                const pClean = cleanJid(p.id);
                return pClean === senderClean && (p.admin === "admin" || p.admin === "superadmin");
            });
        }

        const isOwner = senderClean === OWNER_PN || senderClean === OWNER_LID;
        const canExecute = isOwner || isAdmin;

        if (!canExecute && from.endsWith("@g.us")) {
            return sock.sendMessage(from, { text: "❌ Tu dois être admin pour utiliser cette commande." });
        }

        // Vérifie si c'est une réponse à un message
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const stanzaId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
        const participant = msg.message?.extendedTextMessage?.contextInfo?.participant;

        if (!quoted || !stanzaId) {
            return sock.sendMessage(from, { text: "❌ Réponds à un message pour le supprimer." });
        }

        try {
            // Envoie la requête de suppression
            await sock.sendMessage(from, {
                delete: {
                    remoteJid: from,
                    fromMe: false,
                    id: stanzaId,
                    participant: participant
                }
            });
            console.log(`[DELETE] Message supprimé par le bot dans ${from}`);
        } catch (err) {
            console.error("[DELETE] Impossible de supprimer le message :", err);
            await sock.sendMessage(from, { text: "❌ Impossible de supprimer ce message. Assure-toi que le bot est admin." });
        }
    }
};