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
            .filter(cmd => !cmd.adminOnly)
            .sort((a, b) => a.name.localeCompare(b.name));

        if (availableCommands.length > 0) {
            availableCommands.forEach(command => {
                helpText += `│\n│  ◈ *${PREFIX}${command.name}*\n│     ↳ _${command.description || 'Pas de description'}_\n`;
            });
            helpText += `│\n│  💡 *Propriétaire/Admin?* Tapez *!admin* pour les outils de gestion.\n`;
        } else {
            helpText += `│\n│  ⚠️ Aucune commande publique disponible.\n`;
        }

        helpText += `│\n│  🌐 *Portfolio:* https://psycho.is-a.dev\n╰───≼ 🔥 XYBERCLAN 🔥 ≽───╯`;

        try {
            await replyWithTag(sock, remoteJid, msg, helpText);
        } catch (e) {
            log(`[HELP] Impossible d'envoyer le menu d'aide : ${e.message}`);
        }
    }
};