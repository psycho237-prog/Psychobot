const express = require('express');
const fs = require('fs-extra');
const { exec } = require("child_process");
let router = express.Router();
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const MESSAGE = process.env.MESSAGE || `*SESSION GÉNÉRÉE AVEC SUCCÈS* ✅`;

// REMOVED: const uploadToPastebin = require('./Paste'); 
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    DisconnectReason
} = require("@whiskeysockets/baileys");

// Ensure the directory is empty when the app starts
// NOTE: We keep the temporary auth_info_baileys folder for Baileys to store credentials initially.
if (fs.existsSync('./auth_info_baileys')) {
    fs.emptyDirSync(__dirname + '/auth_info_baileys');
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function SUHAIL() {
        // Baileys needs a directory to save files, we'll move creds.json later.
        const { state, saveCreds } = await useMultiFileAuthState(`./auth_info_baileys`);
        try {
            let Smd = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Desktop"),
            });

            if (!Smd.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await Smd.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            Smd.ev.on('creds.update', saveCreds);
            Smd.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    try {
                        await delay(10000);
                        
                        // Check if the temporary creds file exists after a successful connection
                        if (fs.existsSync('./auth_info_baileys/creds.json')) {
                            const tempCredsFilePath = './auth_info_baileys/creds.json';
                            const finalCredsFilePath = './creds.json'; // New location: same directory

                            // 1. Move/Copy creds.json to the required location (current directory)
                            await fs.copy(tempCredsFilePath, finalCredsFilePath);

                            let user = Smd.user.id;
                            
                            // 2. Send the session success message
                            let msgsss = await Smd.sendMessage(user, { text: MESSAGE });

                            // REMOVED: Group joining logic
                            
                            // 3. Clean up the temporary directory
                            await delay(1000);
                            try { await fs.emptyDirSync(__dirname + '/auth_info_baileys'); } catch (e) {}
                        }
                    } catch (e) {
                        console.log("Error during file operation or message send: ", e);
                        // Using Smd for sendMessage instead of Smb (likely a typo in original code)
                        Smd.sendMessage(Smd.user.id, { text: "An error occurred try again later" });
                                              
                    }

                    await delay(100);
                    // Ensure final cleanup
                    await fs.emptyDirSync(__dirname + '/auth_info_baileys');
                }

                // Handle connection closures
                if (connection === "close") {
                    let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
                    if (reason === DisconnectReason.connectionClosed) {
                        console.log("Connection closed!");
                    } else if (reason === DisconnectReason.connectionLost) {
                        console.log("Connection Lost from Server!");
                    } else if (reason === DisconnectReason.restartRequired) {
                        console.log("Restart Required, Restarting...");
                        SUHAIL().catch(err => console.log(err));
                    } else if (reason === DisconnectReason.timedOut) {
                        console.log("Connection TimedOut!");
                    } else {
                        console.log('Connection closed with bot. Please run again.');
                        console.log(reason);
                        await delay(5000);
                        exec('pm2 restart qasim');
                    }
                }
            });

        } catch (err) {
            console.log("Error in SUHAIL function: ", err);
            exec('pm2 restart qasim');
            console.log("Service restarted due to error");
            SUHAIL();
            await fs.emptyDirSync(__dirname + '/auth_info_baileys');
            if (!res.headersSent) {
                await res.send({ code: "Try After Few Minutes" });
            }
        }
    }

   return await SUHAIL();
});

module.exports = router;