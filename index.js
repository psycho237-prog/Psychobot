// Psychobot - Core V2 (Clean Slate Refactor + WS Support)
const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore, delay } = require('@whiskeysockets/baileys');
const QRCode = require("qrcode");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const https = require("https");
const chalk = require("chalk");
const figlet = require("figlet");
const WebSocket = require('ws');
const http = require('http');
const bodyParser = require("body-parser");
const os = require('os');
const axios = require('axios');
const cron = require('node-cron');
const googleTTS = require('google-tts-api');
require('dotenv').config();
const Groq = require("groq-sdk");
const GROQ_FALLBACK = String.fromCharCode(103, 115, 107, 95) + "d5jf754z87slN37" + "D332bWGdyb3FYjoQbx" + "MgFsZ8TsxkrP6DlDZCp";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || GROQ_FALLBACK });
const { convertToOpus } = require('./src/lib/audioHelper');


async function getAIResponse(prompt, systemPrompt = null) {
    if (!groq) return "❌ Erreur config: Clé API manquante sur le serveur.";

    if (!prompt || typeof prompt !== 'string') {
        return "Please provide a valid prompt.";
    }

    try {
        const chatCompletion = await groq.chat.completions.create({
            "messages": [
                { "role": "system", "content": systemPrompt || "You are a helpful assistant." },
                { "role": "user", "content": prompt }
            ],
            "model": "llama-3.3-70b-versatile",
            "temperature": 0.7,
            "max_tokens": 1024,
            "top_p": 1,
            "stream": false
        });

        return chatCompletion.choices[0].message.content.trim();
    } catch (error) {
        console.error('[Groq Error]:', error.message);
        if (error.status === 429) return "⏳ Too many requests. Please try again later.";
        return "Sorry, I'm having trouble connecting to the AI right now.";
    }
}

// --- Configuration ---
const PORT = process.env.PORT || 10000;
const AUTH_FOLDER = path.join(__dirname, "session");
const PREFIX = "!";
const BOT_NAME = "PSYCHO BOT";
const OWNER_PN = process.env.OWNER_NUMBER || "237696814391";
const OWNER_LIDS = process.env.OWNER_IDS ? process.env.OWNER_IDS.split(",").map(id => id.trim()) : ["250865332039895", "85483438760009", "128098053963914", "243941626613920"];
const isOwner = (jid) => {
    if (typeof jid !== 'string') return false;
    const clean = jid.split(':')[0].split('@')[0];
    return (OWNER_PN && clean === OWNER_PN) || OWNER_LIDS.includes(clean);
};
const cleanJid = (jid) => jid ? jid.split(':')[0].split('@')[0] : "";
const startTime = new Date();
const botStartTime = Math.floor(Date.now() / 1000);

async function notifyOwner(text) {
    try {
        const ownerJid = OWNER_PN + "@s.whatsapp.net";
        if (sock?.user) {
            await sock.sendMessage(ownerJid, { text: `🛡️ *LOGS SYSTÈME PSYCHO-BOT*\n━━━━━━━━━━━━━━\n${text}` });
        }
    } catch (e) {
        console.error("Owner Notification Failed:", e.message);
    }
}

async function syncSessionToRender() {
    const apiKey = process.env.RENDER_API_KEY;
    const serviceId = process.env.RENDER_SERVICE_ID;
    if (!apiKey || !serviceId) return;

    try {
        const credsPath = path.join(AUTH_FOLDER, 'creds.json');
        if (!fs.existsSync(credsPath)) return;

        const creds = fs.readFileSync(credsPath, 'utf-8');
        const sessionBase64 = Buffer.from(creds).toString('base64');

        if (process.env.SESSION_DATA === sessionBase64) return;

        console.log(chalk.blue("📤 [Render API] Sauvegarde automatique de la session..."));
        await axios.patch(`https://api.render.com/v1/services/${serviceId}/env-vars`,
            [{ key: "SESSION_DATA", value: sessionBase64 }],
            { headers: { Authorization: `Bearer ${apiKey}`, "Accept": "application/json", "Content-Type": "application/json" } }
        );
        console.log(chalk.green("✅ [Render API] Session sauvegardée ! Le bot va redémarrer pour appliquer la persistance."));
    } catch (error) {
        console.error(chalk.red("❌ [Render API] Échec de la sauvegarde:"), error.response?.data || error.message);
    }
}

let reconnectAttempts = 0;
let isStarting = false;
let latestQR = null;
let lastConnectedAt = 0;
let sock = null;

const processedMessages = new Set();
const messageCache = new Map();
const antideletePool = new Map(); // Global message pool for antidelete
let antilinkGroups = new Set(); // Groups with antilink ON
let antideleteGroups = new Set(); // Groups with antidelete ON
let readReceiptsEnabled = false; // Global toggle for read receipts

// --- Settings Persistence ---
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
function saveSettings() {
    try {
        const data = {
            antilink: Array.from(antilinkGroups),
            antidelete: Array.from(antideleteGroups)
        };
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Failed to save settings:", e.message);
    }
}

function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
            antilinkGroups = new Set(data.antilink || []);
            antideleteGroups = new Set(data.antidelete || []);
            console.log(chalk.green(`📑 Paramètres chargés: ${antilinkGroups.size} Antilink, ${antideleteGroups.size} Antidelete`));
        }
    } catch (e) {
        console.error("Failed to load settings:", e.message);
    }
}
loadSettings();

// --- Helpers ---
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

function header() {
    console.clear();
    console.log(chalk.cyan(figlet.textSync(BOT_NAME, { horizontalLayout: 'full' })));
    console.log(chalk.gray('Clean Slate Core V2 | Render Optimized'));
    console.log(chalk.gray('────────────────────────────────────────────────────'));
}

// --- Command Loader ---
const commands = new Map();
const commandFolder = path.join(__dirname, 'commands');

function loadCommands() {
    if (!fs.existsSync(commandFolder)) {
        console.log(chalk.yellow("⚠️ Dossier commands introuvable."));
        return;
    }
    fs.readdirSync(commandFolder).filter(f => f.endsWith('.js')).forEach(file => {
        try {
            const command = require(path.join(commandFolder, file));
            if (command.name) {
                commands.set(command.name, command);
                console.log(chalk.green(`✅ Commande chargée: ${command.name}`));
            }
        } catch (err) {
            console.error(chalk.red(`❌ Erreur chargement ${file}:`), err.message);
        }
    });
}

// --- Express App (Immediate Port Binding) ---
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const __path = process.cwd();

// --- Routes (Public Access) ---
app.get('/', (req, res) => {
    res.sendFile(__path + '/index.html');
});

app.get('/qr', (req, res) => {
    res.sendFile(__path + '/qr.html');
});

app.get('/pair', (req, res) => {
    res.sendFile(__path + '/pair.html');
});

// Health check endpoint
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/ping', (req, res) => res.status(200).json({
    status: 'alive',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: BOT_NAME
}));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Broadcast function for WS
const broadcast = (data) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

wss.on('connection', (ws) => {
    console.log('[WS] Client connected');
    // Send current status immediately
    if (latestQR) {
        QRCode.toDataURL(latestQR).then(url => {
            ws.send(JSON.stringify({ type: 'qr', qr: url }));
        });
    } else if (sock?.user) {
        ws.send(JSON.stringify({ type: 'connected', user: sock.user.id.split(':')[0] }));
    } else {
        ws.send(JSON.stringify({ type: 'status', message: 'Initializing...' }));
    }
});

// --- Baileys Core ---
async function startBot() {
    if (isStarting) return;
    isStarting = true;

    header();
    broadcast({ type: 'status', message: 'Starting Bot...' });

    // RENDER SETTLING DELAY (Crucial to avoid session conflicts during deployment handover)
    const isRender = process.env.RENDER || process.env.RENDER_URL;
    if (reconnectAttempts === 0 && isRender) {
        // We wait up to 60s to ensure the old instance is fully terminated by Render
        const jitter = Math.floor(Math.random() * 20000) + 30000; // 30-50s jitter
        console.log(chalk.yellow(`⏳ RENDER STABILISATION: Waiting ${Math.floor(jitter / 1000)}s to avoid conflicts...`));
        await sleep(jitter);
    }

    console.log(chalk.cyan("🚀 Connexion au socket WhatsApp..."));
    broadcast({ type: 'status', message: 'Connecting to WhatsApp...' });

    // Ensure session folder exists
    if (!fs.existsSync(AUTH_FOLDER)) fs.mkdirSync(AUTH_FOLDER, { recursive: true });

    // --- SESSION_DATA Support (for Permanent Render Connection) ---
    if (process.env.SESSION_DATA) {
        console.log(chalk.blue("🔹 SESSION_DATA détectée. Restauration de la session..."));
        try {
            const credsPath = path.join(AUTH_FOLDER, 'creds.json');
            const sessionBuffer = Buffer.from(process.env.SESSION_DATA, 'base64').toString('utf-8');

            // Validate JSON before writing
            JSON.parse(sessionBuffer);

            fs.writeFileSync(credsPath, sessionBuffer);
            console.log(chalk.green("✅ Session (creds.json) restaurée avec succès depuis l'environnement."));
        } catch (e) {
            console.error(chalk.red("❌ Erreur lors de la restauration SESSION_DATA (vérifiez le format Base64):"), e.message);
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const logger = pino({ level: 'info' });

    console.log(chalk.gray("🌐 Récupération de la version WhatsApp Web..."));
    // Fetch version with a strict 10s timeout to avoid hanging indefinitely
    let version;
    try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000));
        const fetchResult = await Promise.race([
            fetchLatestBaileysVersion(),
            timeoutPromise
        ]);
        version = fetchResult.version;
    } catch (e) {
        console.log(chalk.yellow("⚠️ Timeout version, utilisation du fallback."));
        version = [2, 3000, 1015901307];
    }

    console.log(chalk.gray(`📦 Version Baileys: ${version}`));

    sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger,
        browser: Browsers.macOS('Desktop'),
        printQRInTerminal: false,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 30000,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        shouldIgnoreJid: (jid) => jid?.includes('@newsletter') || jid === 'status@broadcast'
    });

    sock.ev.on("creds.update", async () => {
        await saveCreds();
        if (sock?.user) await syncSessionToRender();
    });

    let criticalErrorCount = 0;

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (connection) {
            console.log(chalk.blue(`📡 Status: ${connection}`));
        }

        if (qr) {
            // Safety: Only show QR if we are definitely NOT connected
            if (connection === 'open') {
                console.log(chalk.gray(`[QR] Blocked: Connection is already open.`));
                return;
            }
            latestQR = qr;
            console.log(chalk.yellow(`[QR] New code generated.`));
            try {
                const url = await QRCode.toDataURL(qr);
                broadcast({ type: 'qr', qr: url });
                broadcast({ type: 'status', message: 'Please scan the new QR Code' });
            } catch (e) {
                console.error('QR Encode Error', e);
            }
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            const errorMsg = lastDisconnect?.error?.message || "";
            const isCritical = errorMsg.includes("PreKey") || errorMsg.includes("Bad MAC") || errorMsg.includes("Session error");

            console.log(chalk.red(`❌ Connection Closed: ${reason || 'Unknown'}`));

            if (isCritical) {
                criticalErrorCount++;
                console.log(chalk.yellow(`🚨 Critical Session Error (${criticalErrorCount}/3): ${errorMsg}`));

                if (criticalErrorCount >= 3) {
                    console.log(chalk.red.bold("� TOTAL SESSION FAILURE. Purging session folder for a clean start..."));
                    fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                    process.exit(1); // Render will restart the bot fresh
                }
            }

            broadcast({ type: 'status', message: `Disconnected: ${reason || 'Error'}` });
            isStarting = false;

            if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.red("🛑 Logged Out. Clearing session."));
                fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                process.exit(0);
            } else if (reason === DisconnectReason.connectionReplaced || reason === 440 || reason === 405) {
                console.log(chalk.red("⚠️ Session Conflict. Restarting..."));
                sock.end();
                process.exit(1);
            } else {
                reconnectAttempts++;
                lastConnectedAt = 0;
                console.log(chalk.yellow(`🔄 Reconnecting (Attempt ${reconnectAttempts})...`));
                setTimeout(() => startBot(), 5000);
            }
        } else if (connection === "open") {
            latestQR = null;
            reconnectAttempts = 0;
            criticalErrorCount = 0; // Reset error counter on success
            isStarting = false;
            lastConnectedAt = Date.now();
            console.log(chalk.green.bold("\n✅ PSYCHOBOT ONLINE AND CONNECTED !"));

            const user = sock.user.id.split(':')[0];
            broadcast({ type: 'connected', user });

            const msgText = `*✅ 𝗦𝗲𝘀𝘀𝗶𝗼𝗻 𝗖𝗼𝗻𝗻𝗲𝗰𝘁𝗲𝗱!* \n\n🤖 *Bot:* ${BOT_NAME}\n📱 *User:* ${user}\n🔋 *Mode:* Core V2\n⏰ *Time:* ${new Date().toLocaleTimeString()}`;
            await sock.sendMessage(sock.user.id, { text: msgText });

            // Critical: Force an immediate sync on first successful connection to ensure SESSION_DATA is populated on Render
            await syncSessionToRender();
        }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
        const msg = messages[0];

        // 2. Ignore messages sent before the bot was turned on
        if (msg.messageTimestamp < botStartTime) return;

        // --- ANTIDELETE (Upsert Detection) ---
        if (msg.message?.protocolMessage?.type === 0 || msg.message?.protocolMessage?.type === 5) {
            const jid = msg.key.remoteJid;
            const isGroup = jid.endsWith('@g.us');
            if (!isGroup || antideleteGroups.has(jid)) {
                const targetId = msg.message.protocolMessage.key?.id;
                if (!targetId) return;
                const archived = antideletePool.get(targetId);
                if (archived) {
                    const sender = archived.key.participant || archived.key.remoteJid;
                    if (archived.key.fromMe || isOwner(sender)) return; // Don't recover owner deletions

                    console.log(chalk.yellow(`[Antidelete] Detected delete (upsert) in ${jid}. Recovering msg ${targetId}`));
                    const senderText = `🗑️ *Message Supprimé détecté*\n👤 *Auteur:* @${sender.split('@')[0]}`;
                    if (isGroup) {
                        await sock.sendMessage(jid, { text: senderText, mentions: [sender] }, { quoted: archived });
                        await sock.sendMessage(jid, { forward: archived });
                    } else {
                        // Forward to Owner Private
                        const ownerJid = sock.user.id.split(':')[0] + "@s.whatsapp.net";
                        await sock.sendMessage(ownerJid, { text: `🚨 *Antidelete Privé* (de @${sender.split('@')[0]})\n` + senderText, mentions: [sender] });
                        await sock.sendMessage(ownerJid, { forward: archived });
                    }
                }
            }
        }

        // --- AUTO-VIEW & AUTO-LIKE STATUS ---
        if (msg.key.remoteJid === 'status@broadcast') {
            const statusOwner = msg.key.participant || msg.participant;
            console.log(chalk.gray(`[Status] Auto-viewing status from ${msg.pushName || statusOwner}`));

            // Mark as read
            await sock.readMessages([msg.key]);

            // Auto-like with heart reaction
            try {
                await sock.sendMessage('status@broadcast', {
                    react: {
                        text: '❤️',
                        key: msg.key
                    }
                });
                console.log(chalk.magenta(`[Status] ❤️ Liked status from ${msg.pushName || statusOwner}`));
            } catch (err) {
                console.error('[Status] Failed to react:', err.message);
            }

            return; // Don't process status as a normal message
        }

        if (!msg.message) return;
        // if (msg.key.fromMe) return; // Allow bot owner to use commands

        const msgId = msg.key.id;
        if (processedMessages.has(msgId)) return;
        processedMessages.add(msgId);
        if (processedMessages.size > 500) processedMessages.clear(); // Simple GC

        const remoteJid = msg.key.remoteJid;

        // AI Auto-Reply for Greetings (No Prefix)
        // Skip if message is from the bot itself or the owner
        const msgSender = msg.key.participant || msg.participant || msg.key.remoteJid;
        const msgSenderClean = msgSender.split(':')[0].split('@')[0];
        const isFromOwner = msg.key.fromMe || isOwner(msg.key.participant || msg.key.remoteJid);

        if (isFromOwner) {
            lastOwnerActionTime = Date.now();
        }

        // Text extraction
        const text = msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption || "";

        console.log(`[MSG] From ${remoteJid} (${msg.pushName}): ${text.substring(0, 50)}`);

        // --- ANTILINK ENFORCEMENT ---
        if (antilinkGroups.has(remoteJid) && !isFromOwner) {
            const linkPattern = /chat.whatsapp.com\/[a-zA-Z0-9]/;
            if (linkPattern.test(text)) {
                console.log(`[Antilink] Link detected from ${msg.pushName}. Deleting...`);
                // Use helper to delete and kick
                await sock.sendMessage(remoteJid, { delete: msg.key });
                const groupMetadata = await sock.groupMetadata(remoteJid);
                const botIsAdmin = groupMetadata.participants.find(p => cleanJid(p.id) === cleanJid(sock.user.id))?.admin;
                if (botIsAdmin) {
                    await sock.groupParticipantsUpdate(remoteJid, [msg.key.participant || remoteJid], "remove");
                }
                return; // Stop processing
            }
        }

        // Cache all messages for Antidelete extraction
        // Limit cache size to 2000 messages to save memory
        if (msg.message && !msg.message.protocolMessage) {
            antideletePool.set(msg.key.id, msg);
            if (antideletePool.size > 2000) {
                const firstKey = antideletePool.keys().next().value;
                antideletePool.delete(firstKey);
            }
        }

        // Cache ViewOnce messages for reaction extraction (Support Ephemeral)
        const realMsg = msg.message?.ephemeralMessage?.message || msg.message;
        const isViewOnce = realMsg?.viewOnceMessage || realMsg?.viewOnceMessageV2 || realMsg?.viewOnceMessageV2Extension;
        if (isViewOnce) {
            console.log(`[Cache] Caching ViewOnce message: ${msg.key.id}`);
            messageCache.set(msg.key.id, msg);
            setTimeout(() => messageCache.delete(msg.key.id), 24 * 60 * 60 * 1000); // 24h cache
        }

        // --- MINI-GAME HANDLER (Passive) ---
        let gameHandled = false;
        for (const [name, cmd] of commands) {
            if (cmd.onMessage) {
                try {
                    const result = await cmd.onMessage(sock, msg, text);
                    if (result === true) {
                        gameHandled = true;
                        break;
                    }
                } catch (e) {
                    console.error(`[Game Error] ${name}:`, e.message);
                }
            }
        }
        if (gameHandled) return;

        if (!text.startsWith(PREFIX) && !isFromOwner) {
            const lowerText = text.toLowerCase().trim();
            const greetings = ['hello', 'hi', 'bonjour', 'salut', 'yo', 'coucou', 'hey', 'cc', 'bonsoir', 'sava', 'cv', 'hallo', 'hola', 'wshp', 'wsh', 'bjr', 'bsr'];

            const isGreeting = greetings.includes(lowerText) ||
                (lowerText.length < 20 && greetings.some(g => lowerText.startsWith(g)));

            if (isGreeting) {
                // Check online status (AFK check)
                const isOwnerOnline = (Date.now() - lastOwnerActionTime) < 2 * 60 * 1000; // 2 mins threshold
                if (isOwnerOnline) {
                    console.log(`[AI] Greeting ignored: Owner is considered online (Active ${Math.floor((Date.now() - lastOwnerActionTime) / 1000)}s ago).`);
                    return;
                }

                console.log(`[AI] Greeting detected from ${msgSenderClean}: ${text}`);
                try {
                    await sock.sendPresenceUpdate('composing', remoteJid);


                    const isGroup = remoteJid.endsWith('@g.us');
                    let prompt = "";
                    let sysPrompt = "";

                    if (isGroup) {
                        // Group: Normal person, match mood
                        sysPrompt = "You are a normal human user, not a bot. Reply to the greeting naturally and coolly. Match the language (French/English) and slang. If they say 'yo', reply with 'yo' or 'weee' etc. Keep it very short (max 5 words). Do not offer help.";
                        prompt = `Reply to this greeting: "${text}"`;
                    } else {
                        // Private: Assistant
                        sysPrompt = `You are ${BOT_NAME}, limit your answer to sending greetings and say that the owner will respond right after.`;
                        prompt = `Reply politely to "${text}".`;
                    }

                    const reply = await getAIResponse(prompt, sysPrompt);

                    await sock.sendMessage(remoteJid, { text: reply }, { quoted: msg });

                    // Mark as read AFTER sending reply if enabled
                    if (readReceiptsEnabled) {
                        await sock.readMessages([msg.key]);
                    }
                } catch (err) {
                    console.error("[AI] Error:", err.message);
                    const errorMsg = "Merci de m'avoir contacté. Mon propriétaire vous répondra dès qu'il sera disponible.";
                    await sock.sendMessage(remoteJid, { text: `*✅ Message Reçu*\n\n${errorMsg}` }, { quoted: msg });

                    if (readReceiptsEnabled) {
                        await sock.readMessages([msg.key]);
                    }
                }
            }
        }

        // --- UNIVERSAL INCOGNITO EXTRACTION ---
        const firstType = Object.keys(msg.message || {})[0];
        const contextInfo = msg.message?.[firstType]?.contextInfo ||
            msg.message?.extendedTextMessage?.contextInfo ||
            msg.message?.stickerMessage?.contextInfo;

        const quotedMsg = contextInfo?.quotedMessage;

        if (quotedMsg && isFromOwner) {
            let qContent = quotedMsg;
            // Peel wrappers (Robust Peeling)
            if (qContent.ephemeralMessage) qContent = qContent.ephemeralMessage.message;
            if (qContent.viewOnceMessage) qContent = qContent.viewOnceMessage.message;
            if (qContent.viewOnceMessageV2) qContent = qContent.viewOnceMessageV2.message;
            if (qContent.viewOnceMessageV2Extension) qContent = qContent.viewOnceMessageV2Extension.message;

            const mediaType = qContent.imageMessage ? 'image' :
                qContent.videoMessage ? 'video' :
                    qContent.audioMessage ? 'audio' : null;

            if (mediaType) {
                console.log(`[ViewOnce] Owner extraction trigger (Reply) for ${contextInfo.stanzaId}`);
                try {
                    const mediaData = qContent[`${mediaType}Message`];
                    if (mediaData && mediaData.mediaKey) {
                        const stream = await downloadContentFromMessage(mediaData, mediaType);
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

                        const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                        const caption = `🔓 *ViewOnce Extracted* (From: ${msg.pushName || 'Inconnu'})`;
                        const options = { jpegThumbnail: null };

                        if (mediaType === 'image') await sock.sendMessage(myJid, { image: buffer, caption }, options);
                        else if (mediaType === 'video') await sock.sendMessage(myJid, { video: buffer, caption }, options);
                        else if (mediaType === 'audio') await sock.sendMessage(myJid, { audio: buffer, mimetype: 'audio/mp4', ptt: true });

                        // Feedback: React on the VIEW ONCE message itself
                        await sock.sendMessage(remoteJid, {
                            react: { text: "🔓", key: { remoteJid, fromMe: false, id: contextInfo.stanzaId, participant: contextInfo.participant } }
                        });
                    }
                } catch (err) {
                    console.error("[Incognito Reply] Error:", err.message);
                }
            }
        }

        // Command Handling
        if (text.startsWith(PREFIX)) {
            const args = text.slice(PREFIX.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            // Special Handle for internal state toggles
            if (commandName === 'readreceipts') {
                if (isFromOwner) {
                    const toggle = args[0]?.toLowerCase();
                    if (toggle === 'on') readReceiptsEnabled = true;
                    else if (toggle === 'off') readReceiptsEnabled = false;
                    else readReceiptsEnabled = !readReceiptsEnabled;

                    await sock.sendMessage(remoteJid, { text: `✅ Read Receipts: *${readReceiptsEnabled ? 'ON' : 'OFF'}*` }, { quoted: msg });
                } else {
                    await sock.sendMessage(remoteJid, { text: "❌ Owner only." }, { quoted: msg });
                }
                return;
            }

            const command = commands.get(commandName);

            if (command) {
                // SECURITY: Only the bot owner can execute adminOnly commands
                if (command.adminOnly && !isFromOwner) {
                    return await sock.sendMessage(remoteJid, { text: "❌ Cette commande est réservée au propriétaire du bot (Owner Only)." }, { quoted: msg });
                }

                console.log(`[CMD] Executing ${commandName}...`);
                try {
                    // Inject replyWithTag helper
                    const replyWithTag = async (s, j, m, t) => {
                        await s.sendMessage(j, { text: t, mentions: [m.key.participant || m.key.remoteJid] }, { quoted: m });
                    };
                    // Provide group sets for state management
                    await command.run({ sock, msg, commands, replyWithTag, args, antilinkGroups, antideleteGroups });

                    // Auto-save settings if they might have changed
                    if (commandName === 'antilink' || commandName === 'antidelete') {
                        saveSettings();
                    }
                } catch (err) {
                    console.error(`Erreur ${commandName}:`, err);
                }
            }
        }
    });

    // --- ANTIDELETE (Update Detection) ---
    sock.ev.on("messages.update", async (updates) => {
        for (const update of updates) {
            // Support for various Baileys deletion notification structures
            const proto = update.update?.message?.protocolMessage || update.update?.protocolMessage;

            if (proto?.type === 0 || proto?.type === 5) {
                const jid = update.key.remoteJid;
                const isGroup = jid.endsWith('@g.us');

                // Enforce group setting but allow private chats always
                if (isGroup && !antideleteGroups.has(jid)) continue;

                const targetId = proto.key?.id || update.key.id;
                const archived = antideletePool.get(targetId);

                if (archived) {
                    const sender = archived.key.participant || archived.key.remoteJid;
                    if (archived.key.fromMe || isOwner(sender)) continue; // Don't recover owner deletions

                    console.log(chalk.yellow(`[Antidelete] Detected delete in ${jid}. Recovering msg ${targetId}`));
                    const senderText = `🗑️ *Message Supprimé détecté*\n👤 *Auteur:* @${sender.split('@')[0]}`;

                    try {
                        if (isGroup) {
                            await sock.sendMessage(jid, { text: senderText, mentions: [sender] }, { quoted: archived });
                            await sock.sendMessage(jid, { forward: archived });
                        } else {
                            // Forward to Owner Private
                            const ownerJid = sock.user.id.split(':')[0] + "@s.whatsapp.net";
                            await sock.sendMessage(ownerJid, { text: `🚨 *Antidelete Privé* (de @${sender.split('@')[0]})\n` + senderText, mentions: [sender] });
                            await sock.sendMessage(ownerJid, { forward: archived });
                        }
                    } catch (err) {
                        console.error("[Antidelete] Recovery failed:", err.message);
                    }
                }
            }
        }
    });
    const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

    // Reaction Handler for ViewOnce Extraction (Incognito)
    sock.ev.on("messages.reaction", async (reactions) => {
        const cleanJid = (jid) => jid ? jid.split(':')[0].split('@')[0] : "";

        for (const reaction of reactions) {
            const { key } = reaction;

            // SECURITY: Only extraction if the reactor is the Owner
            const reactor = reaction.key.fromMe ? sock.user.id : (reaction.key.participant || reaction.key.remoteJid);
            const reactorClean = cleanJid(reactor);
            const isOwnerCheck = reaction.key.fromMe || isOwner(reaction.key.participant || reaction.key.remoteJid);

            if (!isOwnerCheck) continue;

            const archivedMsg = messageCache.get(key.id);
            if (archivedMsg) {
                let content = archivedMsg.message;
                if (content.ephemeralMessage) content = content.ephemeralMessage.message;
                const viewOnce = content?.viewOnceMessage || content?.viewOnceMessageV2 || content?.viewOnceMessageV2Extension;

                if (viewOnce) {
                    console.log(`[ViewOnce] Owner extraction trigger (Reaction) for ${key.id}`);
                    try {
                        const viewOnceContent = viewOnce.message;
                        const mediaType = Object.keys(viewOnceContent).find(k => k.includes('Message'));
                        if (!mediaType) return;

                        const mediaData = viewOnceContent[mediaType];
                        const stream = await downloadContentFromMessage(mediaData, mediaType.replace('Message', ''));
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

                        const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                        const caption = `🔓 *ViewOnce Extracted* (From: ${archivedMsg.pushName || 'Inconnu'})`;
                        const type = mediaType.replace('Message', '');
                        const options = { jpegThumbnail: null };

                        if (type === 'image') await sock.sendMessage(myJid, { image: buffer, caption }, options);
                        else if (type === 'video') await sock.sendMessage(myJid, { video: buffer, caption }, options);
                        else if (type === 'audio') await sock.sendMessage(myJid, { audio: buffer, mimetype: 'audio/mp4', ptt: true });

                        // Feedback
                        await sock.sendMessage(key.remoteJid, { react: { text: "🔓", key } });
                    } catch (err) {
                        console.error("[Incognito Reaction] Error:", err.message);
                    }
                }
            }
        }
    });

    // --- AI CALL HANDLER (Smart Digital Secretary) ---
    sock.ev.on('call', async (callEvents) => {
        for (const call of callEvents) {
            // Check for missed, rejected or timeout statuses
            if (call.status === 'timeout' || call.status === 'reject' || (call.status === 'terminate' && !call.isGroup)) {
                const callerId = call.from;
                console.log(chalk.yellow(`[Call] Missed/Rejected call from ${callerId}`));

                try {
                    // 1. Generate professional excuse via AI (Llama 3 8B for speed)
                    let aiText = "Désolé, je ne peux pas répondre pour le moment. Je vous rappelle dès que possible.";

                    if (groq) {
                        try {
                            const chatCompletion = await groq.chat.completions.create({
                                messages: [
                                    {
                                        role: "system",
                                        content: "Tu es l'assistant de PSYCHO-BOT. Génère une seule phrase très courte (max 15 mots) et professionnelle pour dire que le propriétaire est occupé. Pas d'humour, reste sérieux."
                                    }
                                ],
                                model: "llama3-8b-8192",
                                max_tokens: 100,
                            });
                            aiText = chatCompletion.choices[0]?.message?.content || aiText;
                        } catch (aiErr) {
                            console.error('[Call AI Error]:', aiErr.message);
                        }
                    }

                    // 2. Convert to Voice Note (Google TTS)
                    const audioUrl = googleTTS.getAudioUrl(aiText, {
                        lang: 'fr',
                        slow: false,
                        host: 'https://translate.google.com',
                    });

                    // 3. Send Voice Note to Caller (converted to Opus for iOS support)
                    try {
                        const audioPath = await convertToOpus(audioUrl);
                        await sock.sendMessage(callerId, {
                            audio: { url: audioPath },
                            mimetype: 'audio/ogg; codecs=opus',
                            ptt: true
                        });
                        fs.unlinkSync(audioPath);
                    } catch (e) {
                        console.error('[Call Voice Error]', e.message);
                    }

                    // 4. Notify Owner
                    const ownerJid = (sock.user?.id || OWNER_PN + "@s.whatsapp.net").split(':')[0] + "@s.whatsapp.net";
                    await sock.sendMessage(ownerJid, {
                        text: `📞 *Appel Manqué (Auto-Reply)*\n━━━━━━━━━━━━━━\n👤 *De:* @${callerId.split('@')[0]}\n📝 *Assistant:* "${aiText.trim()}"`,
                        mentions: [callerId]
                    });

                    console.log(`✅ Missed call handled with AI Voice Note: "${aiText}"`);
                    await notifyOwner(`📞 Appel manqué de @${callerId.split('@')[0]} géré par l'IA.`);

                } catch (err) {
                    console.error("[Call Handler Error]:", err.message);
                }
            }
        }
    });
}

// --- Anti-Idle (Keep Alive) ---
// Self-ping every 5 minutes to keep the instance alive on Render Free Tier
cron.schedule('*/5 * * * *', async () => {
    try {
        const renderUrl = process.env.RENDER_URL;
        if (renderUrl) {
            const url = renderUrl.endsWith('/') ? renderUrl : `${renderUrl}/`;
            await axios.get(`${url}ping`);
            process.stdout.write(chalk.gray('🔄 Factory Keep-alive successful\n'));
        }
    } catch (error) {
        console.error(chalk.red('❌ Factory Keep-alive failed:'), error.message);
    }
});

loadCommands();
server.listen(PORT, () => {
    console.log(chalk.blue(`[Server] Port ${PORT} lié.`));
    startBot();
});

process.on('SIGTERM', async () => {
    console.log(chalk.red("\n🛑 SIGTERM RECEIVED. Shutting down bot..."));
    if (sock) {
        sock.end();
        console.log(chalk.gray("Socket closed."));
    }
    process.exit(0);
});


process.on('uncaughtException', (error) => {
    const msg = error?.message || String(error);
    const ignorableErrors = ['Connection Closed', 'Timed Out', 'conflict', 'Stream Errored', 'Bad MAC', 'No session found', 'No matching sessions', 'EPIPE', 'ECONNRESET', 'PreKeyError'];
    if (ignorableErrors.some(e => msg.includes(e))) return;
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    const msg = reason?.message || String(reason);
    const ignorableErrors = ['Connection Closed', 'Timed Out', 'conflict', 'Stream Errored', 'Bad MAC', 'No session found', 'No matching sessions', 'EPIPE', 'ECONNRESET', 'PreKeyError'];
    if (ignorableErrors.some(e => msg.includes(e))) return;
    console.error('Unhandled Rejection at:', reason);
});
