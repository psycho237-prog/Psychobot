// commands/help.js
const log = require('../logger')(module);

module.exports = {
    name: 'help',
    description: "Affiche le menu d'aide du bot.",
    run: async ({ sock, msg, commands, replyWithTag }) => {
        if (!sock.user) return;

        const BOT_NAME = "PSYCHO BOT";
        const PREFIX = "!";
        const remoteJid = msg.key.remoteJid;
        const sender = msg.pushName || "Utilisateur";

        log(`Commande HELP reçue de ${remoteJid}`);

        let helpText = `╭───≼ 🤖 *${BOT_NAME}* ≽───╮\n`;
        helpText += `│\n`;
        helpText += `│  Salut *${sender}* 👋\n`;
        helpText += `│  Voici la liste de mes commandes :\n`;

        const availableCommands = Array.from(commands.values())
            .sort((a, b) => a.name.localeCompare(b.name));

        if (availableCommands.length > 0) {
            availableCommands.forEach(command => {
                helpText += `│\n│  ◈ *${PREFIX}${command.name}*\n│     ↳ _${command.description || 'Pas de description'}_\n`;
            });
        } else {
            helpText += `│\n│  ⚠️ Aucune commande disponible pour le moment.\n`;
        }

        helpText += `│\n╰───≼ 🔥 XYBERCLAN 🔥 ≽───╯`;

        try {
            await replyWithTag(sock, remoteJid, msg, helpText);
        } catch (e) {
            log(`[HELP] Impossible d'envoyer le menu d'aide : ${e.message}`);
        }
    }
};