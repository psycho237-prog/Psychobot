module.exports = {
   name: 'listgame',
   description: 'Affiche la liste des mini-jeux disponibles.',
   run: async ({ sock, msg, replyWithTag }) => {
      const text = `🎮 *CENTRE DE JEUX PSYCHO-BOT* 🎮

Voici les jeux auxquels vous pouvez jouer :

1️⃣ *Mot à Compléter*
   👉 Tapez : \`!motgame\`

2️⃣ *Action ou Vérité (AI)*
   👉 Tapez : \`!av action\` ou \`!av verite\`

3️⃣ *Pile ou Face*
   👉 Tapez : \`!coin\`

4️⃣ *Deviner le Nombre*
   👉 Tapez : \`!guess\`

5️⃣ *Devinez le Mot*
   👉 Tapez : \`!guessword\`

━━━━━━━━━━━━━━
💡 _Tapez la commande pour lancer une partie !_`;

      await replyWithTag(sock, msg.key.remoteJid, msg, text);
   }
};