module.exports = {
    name: "kick",
    description: "Exclut un ou plusieurs membres du groupe (usage : !kick <numéro(s)> ou !kick @membre(s))",
    adminOnly: true,
    run: async ({ sock, msg, args }) => {
        const from = msg.key.remoteJid;

        if (!from.endsWith("@g.us")) {
            return sock.sendMessage(from, { text: "❌ Cette commande ne fonctionne que dans un groupe." });
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

        const isOwner = (senderClean === OWNER_PN || senderClean === OWNER_LID);
        const canExecute = isOwner || senderIsAdmin;

        console.log("========== [DEBUG KICK] ==========");
        console.log("Sender Clean  :", senderClean);
        console.log("Is Owner      :", isOwner);
        console.log("Is Admin      :", senderIsAdmin);
        console.log("Can Execute   :", canExecute);
        console.log("==================================");

        // Allow if owner OR group admin
        if (!canExecute) {
            return sock.sendMessage(from, { text: "❌ Tu dois être admin pour utiliser cette commande." });
        }

        // Vérifie si le bot est admin dans le groupe
        const botIsAdmin = groupMetadata.participants.some(p => {
            const pClean = cleanJid(p.id);
            return pClean === botNumberClean && (p.admin === "admin" || p.admin === "superadmin");
        });

        // SECURITY: If you are the OWNER, the bot will try the action even if the check fails 
        // (This fixes the error in your screenshot where it thinks it's not admin)
        if (!botIsAdmin && !isOwner) {
            return sock.sendMessage(from, { text: "❌ Je dois être admin pour exclure des membres." });
        }

        // Vérifie si l’utilisateur a mentionné quelqu’un ou répond à un message
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
        const mentions = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];

        const numbers = args.map(num => {
            const raw = num.replace(/[^0-9]/g, "");
            if (raw.length < 5) return null; // Avoid tiny numbers
            const suffix = raw.length > 14 ? "@lid" : "@s.whatsapp.net";
            return raw + suffix;
        }).filter(n => n !== null);

        // Build list: replies + mentions + direct numbers
        const listToClean = [...mentions, ...numbers];
        if (quoted) listToClean.push(quoted);

        // Liste finale des JIDs à exclure (hors bot et sender)
        const toRemove = listToClean.filter(jid => {
            const jClean = cleanJid(jid);
            return jClean && jClean !== botNumberClean && jClean !== senderClean;
        });

        if (!toRemove.length) {
            return sock.sendMessage(from, { text: "❌ Mentionne un membre, fournis un numéro ou réponds à un message pour exclure." });
        }

        // Empêche d’exclure les admins
        const adminJids = groupMetadata.participants
            .filter(p => p.admin)
            .map(p => cleanJid(p.id));

        const finalList = toRemove.filter(jid => !adminJids.includes(cleanJid(jid)));

        if (!finalList.length) {
            return sock.sendMessage(from, { text: "❌ Impossible d’exclure des membres (ils sont peut-être admins ou invalides)." });
        }

        try {
            await sock.groupParticipantsUpdate(from, finalList, "remove");
            sock.sendMessage(from, {
                text: `✅ Membre(s) exclu(s) avec succès.`,
                mentions: finalList
            });
        } catch (err) {
            sock.sendMessage(from, { text: "❌ Erreur lors de l’exclusion. Vérifie mes permissions admin." });
            console.error(err);
        }
    }
};