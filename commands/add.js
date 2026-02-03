module.exports = {
    name: "add",
    description: "Ajoute un ou plusieurs membres au groupe (admin uniquement).",
    run: async ({ sock, msg, args, replyWithTag }) => {
        const remoteJid = msg.key.remoteJid;

        // Vérifie si c'est un groupe
        if (!remoteJid.endsWith('@g.us')) {
            return await replyWithTag(sock, remoteJid, msg, "❌ Cette commande fonctionne uniquement dans les groupes.");
        }

        try {
            // Récupère les métadonnées du groupe
            const groupMetadata = await sock.groupMetadata(remoteJid);
            const participants = groupMetadata.participants;
            const botNumber = sock.user.id.split(':')[0];
            const senderNumber = msg.key.participant ? msg.key.participant.split('@')[0] : msg.key.remoteJid.split('@')[0];

            // Vérifie si le bot est admin
            const botParticipant = participants.find(p => p.id.split('@')[0] === botNumber);
            if (!botParticipant || !botParticipant.admin) {
                return await replyWithTag(sock, remoteJid, msg, "❌ Je dois être administrateur pour ajouter des membres.");
            }

            // Vérifie si l'utilisateur est admin ou proprietaire
            const senderParticipant = participants.find(p => p.id.split('@')[0] === senderNumber);
            const isOwner = (senderNumber + '@s.whatsapp.net') === sock.user.id ||
                (process.env.OWNER_NUMBER && process.env.OWNER_NUMBER.includes(senderNumber));

            if (!isOwner && (!senderParticipant || !senderParticipant.admin)) {
                return await replyWithTag(sock, remoteJid, msg, "❌ Seuls les administrateurs peuvent ajouter des membres.");
            }

            // Récupère les numéros à ajouter
            let numbersToAdd = [];

            // Méthode 1: Mention (@)
            const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentionedJids.length > 0) {
                numbersToAdd = mentionedJids;
            }
            // Méthode 2: Numéros en arguments
            else if (args.length > 0) {
                numbersToAdd = args.map(num => {
                    // Nettoie le numéro (retire espaces, +, etc.)
                    const cleaned = num.replace(/[^0-9]/g, '');
                    return cleaned + '@s.whatsapp.net';
                });
            } else {
                return await replyWithTag(sock, remoteJid, msg, "❌ Utilisation:\n• `!add @mention` (mentionner)\n• `!add 237123456789` (numéro)\n• `!add 237123456789 237987654321` (plusieurs)");
            }

            if (numbersToAdd.length === 0) {
                return await replyWithTag(sock, remoteJid, msg, "❌ Aucun numéro valide détecté.");
            }

            // Ajoute les membres
            await replyWithTag(sock, remoteJid, msg, `⏳ Ajout de ${numbersToAdd.length} membre(s)...`);

            const result = await sock.groupParticipantsUpdate(remoteJid, numbersToAdd, 'add');

            // Analyse les résultats
            let successCount = 0;
            let failedNumbers = [];

            result.forEach((res, index) => {
                if (res.status === "200" || res.status === 200) {
                    successCount++;
                } else {
                    const number = numbersToAdd[index].split('@')[0];
                    failedNumbers.push(`${number} (${res.status})`);
                }
            });

            // Message de résultat
            let resultMsg = `✅ *Résultat de l'ajout:*\n\n`;
            resultMsg += `✔️ Ajoutés: ${successCount}\n`;

            if (failedNumbers.length > 0) {
                resultMsg += `❌ Échecs: ${failedNumbers.length}\n\n`;
                resultMsg += `*Détails des échecs:*\n`;
                failedNumbers.forEach(num => {
                    resultMsg += `• ${num}\n`;
                });
                resultMsg += `\n💡 *Raisons possibles:*\n`;
                resultMsg += `• Numéro invalide\n`;
                resultMsg += `• Paramètres de confidentialité\n`;
                resultMsg += `• Déjà membre du groupe`;
            }

            await sock.sendMessage(remoteJid, { text: resultMsg }, { quoted: msg });

        } catch (err) {
            console.error('[Add Command Error]:', err);
            await replyWithTag(sock, remoteJid, msg, `❌ Erreur lors de l'ajout: ${err.message}`);
        }
    }
};
