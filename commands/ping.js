module.exports = {
    name: "ping",
    description: "Teste la réactivité du bot",
    run: async ({ sock, msg }) => {
        const start = Date.now();
        await sock.sendMessage(msg.key.remoteJid, { text: "⏳ Ping..." });
        const latency = Date.now() - start;

        await sock.sendMessage(msg.key.remoteJid, { text: `🏓 Pong ! Latence : *${latency}ms*` });
    }
};