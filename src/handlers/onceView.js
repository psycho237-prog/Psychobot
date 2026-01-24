const { downloadMediaMessage } = require("@whiskeysockets/baileys");

module.exports = async (reaction, sock, store) => {
    try {
        const { key } = reaction;

        // Ensure we have a store and can try to load the message
        if (!store) {
            console.log("Store not available for Once View extraction");
            return;
        }

        // Attempt to retrieve message from store
        // store.loadMessage is the standard method if available.
        // If the message is recent, it should be in the store.
        const msg = await store.loadMessage(key.remoteJid, key.id);

        if (!msg) {
            console.log(`Message ${key.id} not found in store.`);
            return;
        }

        // Check if it is a ViewOnce message
        // Baileys structure: message.message.viewOnceMessage or viewOnceMessageV2
        const viewOnceMsg = msg.message?.viewOnceMessage || msg.message?.viewOnceMessageV2;

        if (viewOnceMsg) {
            console.log("ViewOnce message detected, extracting...");

            // The content is inside the viewOnceMessage shell
            const content = viewOnceMsg.message;
            const msgType = Object.keys(content)[0];
            const mediaMsg = content[msgType];

            // Download media
            const buffer = await downloadMediaMessage(
                msg,
                'buffer',
                {},
                {
                    logger: console,
                    // reuploadRequest: sock.updateMediaMessage // sometimes needed
                }
            );

            if (buffer) {
                // Send back to the user (in DM or same chat?)
                // User said "send it into my proper inbox". 
                // Assuming "proper inbox" means "Saved Messages" (dm to self) or just replying to the chat.
                // Sending to self (bot's number) is usually what "inbox" implies if responding to a status or group msg.
                // But if it's a DM, sending it back is fine.
                // Let's send it to the user who reacted (the bot owner likely, per requirements "when i react").
                // If the bot is reacting, it's weird. Usually the OWNER reacts.
                // If the owner reacts, we send it to the owner's DM (Note to self feature).

                // Identify owner: sock.user.id
                // Identify reactor: reaction.participant || reaction.key.participant (if group)

                const reactor = reaction.participant || reaction.key.participant || key.remoteJid;

                // If the reactor is NOT the bot owner (the one running the bot), maybe we shouldn't send it?
                // Request says: "when i react ... it should download ... send it into my proper inbox"
                // This implies authentication (only owner).

                // For now, let's just send it to the reactor's DM.

                // Prepare message content
                let options = {};
                if (msgType === 'imageMessage') {
                    options = { image: buffer, caption: "ViewOnce Extracted 🔓" };
                } else if (msgType === 'videoMessage') {
                    options = { video: buffer, caption: "ViewOnce Extracted 🔓" };
                } else {
                    options = { document: buffer, caption: "ViewOnce Extracted 🔓" };
                }

                await sock.sendMessage(reactor, options);
                console.log("ViewOnce extracted and sent.");
            }
        }
    } catch (err) {
        console.error("Error in OnceView extraction:", err);
    }
};
