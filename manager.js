const {
    default: makeWASocket,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    Browsers,
    DisconnectReason,
    delay
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs-extra");
const path = require("path");
const { handleMessage } = require('./commands');
const { Boom } = require("@hapi/boom");

const SESSIONS_DIR = path.join(__dirname, 'sessions');
fs.ensureDirSync(SESSIONS_DIR);

const activeBots = new Map();
require('dotenv').config();
const ADMIN_NUMBER = process.env.ADMIN_NUMBER;
const TRIAL_HOURS = 2; // Auto-stop non-admin bots after 2 hours

async function startBot(number) {
    const cleanNum = number.replace(/[^0-9]/g, '');
    if (activeBots.has(cleanNum)) {
        console.log(`[Manager] Bot ${cleanNum} is already running.`);
        return;
    }

    const sessionPath = path.join(SESSIONS_DIR, cleanNum);
    fs.ensureDirSync(sessionPath);

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    try {
        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            printQRInTerminal: false,
            logger: pino({ level: "fatal" }).child({ level: "fatal" }),
            browser: Browsers.ubuntu("Chrome"),
        });

        activeBots.set(cleanNum, sock);

        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('messages.upsert', async (m) => {
            await handleMessage(sock, m);
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const shouldReconnect = (new Boom(lastDisconnect?.error)?.output?.statusCode) !== DisconnectReason.loggedOut;
                console.log(`[Manager] Bot ${cleanNum} connection closed. Reconnecting: ${shouldReconnect}`);
                activeBots.delete(cleanNum);
                if (shouldReconnect) {
                    await delay(5000);
                    startBot(cleanNum);
                } else {
                    console.log(`[Manager] Bot ${cleanNum} logged out. Deleting session.`);
                    fs.removeSync(sessionPath);
                }
            } else if (connection === 'open') {
                console.log(`[Manager] Bot ${cleanNum} is now ONLINE ✅`);

                // Set trial timer for non-admins
                const cleanAdmin = ADMIN_NUMBER.replace(/[^0-9]/g, '');
                if (cleanNum !== cleanAdmin) {
                    console.log(`[Manager] Scheduling auto-stop for trial bot ${cleanNum} in ${TRIAL_HOURS}h`);
                    setTimeout(() => {
                        console.log(`[Manager] Trial expired for ${cleanNum}. Disconnecting.`);
                        stopBot(cleanNum);
                        fs.removeSync(sessionPath);
                    }, TRIAL_HOURS * 60 * 60 * 1000);
                }
            }
        });

        return sock;
    } catch (err) {
        console.error(`[Manager] Error starting bot ${cleanNum}:`, err);
        activeBots.delete(cleanNum);
    }
}

async function stopBot(number) {
    const cleanNum = number.replace(/[^0-9]/g, '');
    const sock = activeBots.get(cleanNum);
    if (sock) {
        sock.end();
        activeBots.delete(cleanNum);
        console.log(`[Manager] Bot ${cleanNum} stopped.`);
    }
}

async function bootstrap() {
    console.log("[Manager] Bootstrapping saved sessions...");
    const folders = fs.readdirSync(SESSIONS_DIR);
    for (const folder of folders) {
        const fullPath = path.join(SESSIONS_DIR, folder);
        if (fs.statSync(fullPath).isDirectory()) {
            console.log(`[Manager] Starting bot for ${folder}...`);
            await startBot(folder);
            await delay(2000); // Slow start to avoid rate limits
        }
    }
}

async function requestPairing(number, res) {
    const cleanNum = number.replace(/[^0-9]/g, '');
    const sessionPath = path.join(SESSIONS_DIR, cleanNum);

    console.log(`[Manager] Starting pairing process for ${cleanNum}...`);

    // Ensure clean state for pairing
    if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);
    fs.ensureDirSync(sessionPath);

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    try {
        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            printQRInTerminal: false,
            logger: pino({ level: "fatal" }).child({ level: "fatal" }),
            browser: Browsers.ubuntu("Chrome"),
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                console.log(`[Manager] Bot ${cleanNum} paired and ONLINE ✅`);
                activeBots.set(cleanNum, sock);

                // Set trial timer for non-admins
                const cleanAdmin = ADMIN_NUMBER.replace(/[^0-9]/g, '');
                if (cleanNum !== cleanAdmin) {
                    console.log(`[Manager] Scheduling auto-stop for trial bot ${cleanNum} in ${TRIAL_HOURS}h`);
                    setTimeout(() => {
                        console.log(`[Manager] Trial expired for ${cleanNum}. Disconnecting.`);
                        stopBot(cleanNum);
                        fs.removeSync(sessionPath);
                    }, TRIAL_HOURS * 60 * 60 * 1000);
                }
            } else if (connection === 'close') {
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                console.log(`[Manager] Pairing connection closed for ${cleanNum}. Reason: ${reason}`);
                activeBots.delete(cleanNum);
            }
        });

        // Wait for socket stability
        await delay(5000);

        if (!sock.authState.creds.registered) {
            console.log(`[Manager] Requesting pairing code for ${cleanNum}...`);
            const code = await sock.requestPairingCode(cleanNum);
            if (!res.headersSent) {
                res.send({ code });
            }
        }

        sock.ev.on('messages.upsert', async (m) => {
            await handleMessage(sock, m);
        });

    } catch (err) {
        console.error(`[Manager] Error during pairing setup for ${cleanNum}:`, err);
        if (!res.headersSent) res.status(500).send({ error: "Pairing failed. Please try again." });
    }
}

function getActiveBots() {
    return Array.from(activeBots.keys());
}

module.exports = { startBot, stopBot, bootstrap, getActiveBots, requestPairing };
