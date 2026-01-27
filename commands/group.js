module.exports = {
    name: "group",
    description: "Gère les paramètres du groupe: !group close (fermer) ou !group open (ouvrir)",
    adminOnly: true,
    run: async ({ sock, msg, args }) => {
        const from = msg.key.remoteJid;

        if (!from.endsWith("@g.us")) {
            return sock.sendMessage(from, { text: "❌ Cette commande ne fonctionne que dans un groupe." });
        }

        const action = args[0]?.toLowerCase();
        if (!action || !['open', 'close'].includes(action)) {
            return sock.sendMessage(from, { text: "❓ Usage: *!group open* ou *!group close*" });
        }

        const groupMetadata = await sock.groupMetadata(from);

        const cleanJid = (jid) => jid ? jid.split(':')[0].split('@')[0] : "";
        const sender = msg.key.participant || msg.participant || msg.key.remoteJid;
        const senderClean = cleanJid(sender);
        const botNumberClean = cleanJid(sock.user.id);
        const OWNER_PN = "237696814391";
        const OWNER_LID = "250865332039895";

        const senderIsAdmin = groupMetadata.participants.some(p => {
            const pClean = cleanJid(p.id);
            return pClean === senderClean && (p.admin === "admin" || p.admin === "superadmin");
        });

        const isOwner = senderClean === OWNER_PN || senderClean === OWNER_LID;
        const canExecute = isOwner || senderIsAdmin;

        if (!canExecute) {
            return sock.sendMessage(from, { text: "❌ Tu dois être admin pour gérer ce groupe." });
        }

        // Check if bot is admin
        const botIsAdmin = groupMetadata.participants.some(p => {
            const pClean = cleanJid(p.id);
            return pClean === botNumberClean && (p.admin === "admin" || p.admin === "superadmin");
        });

        if (!botIsAdmin && !isOwner) {
            return sock.sendMessage(from, { text: "❌ Je dois être admin pour modifier les réglages." });
        }

        try {
            const setting = action === 'close' ? 'announcement' : 'not_announcement';
            await sock.groupSettingUpdate(from, setting);

            const message = action === 'close'
                ? "🔒 *Groupe Fermé* : Seuls les admins peuvent envoyer des messages."
                : "🔓 *Groupe Ouvert* : Tout le monde peut envoyer des messages.";

            await sock.sendMessage(from, { text: message });

        } catch (err) {
            console.error('Group Update Error:', err);
            await sock.sendMessage(from, { text: "❌ Erreur lors de la mise à jour du groupe." });
        }
    }
};
