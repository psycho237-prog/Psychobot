module.exports = {
    name: "demote",
    description: "Démote un admin en membre",
    adminOnly: true,
    run: async ({ sock, msg, args }) => {
        if (!msg.key.remoteJid.endsWith("@g.us")) return;
        const from = msg.key.remoteJid;
        const groupMetadata = await sock.groupMetadata(from);

        const cleanJid = (jid) => jid ? jid.split(':')[0].split('@')[0] : "";
        const sender = msg.key.participant || msg.participant || msg.key.remoteJid;
        const senderClean = cleanJid(sender);
        const OWNER_PN = "237696814391";
        const OWNER_LID = "250865332039895";

        const senderIsAdmin = groupMetadata.participants.some(p => {
            const pClean = cleanJid(p.id);
            return pClean === senderClean && (p.admin === "admin" || p.admin === "superadmin");
        });

        const isOwner = senderClean === OWNER_PN || senderClean === OWNER_LID;
        const canExecute = isOwner || senderIsAdmin;

        if (!canExecute) {
            await sock.sendMessage(from, { text: "❌ Vous devez être admin pour utiliser cette commande." });
            return;
        }

        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (!mentioned || mentioned.length === 0) {
            await sock.sendMessage(msg.key.remoteJid, { text: "❌ Veuillez mentionner un admin à rétrograder." });
            return;
        }

        try {
            await sock.groupParticipantsUpdate(msg.key.remoteJid, mentioned, "demote");
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Admin rétrogradé en membre !` });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(msg.key.remoteJid, { text: "❌ Impossible de rétrograder cet admin." });
        }
    }
};