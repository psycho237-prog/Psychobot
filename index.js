// Psychobot - Core V2 (Clean Slate Refactor + WS Support)
const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore, delay, makeInMemoryStore } = require('@whiskeysockets/baileys');
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
const googleTTS = require('google-tts-api');
require('dotenv').config();
const Groq = require("groq-sdk");
let groq;
try {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
} catch (e) {
    console.warn("⚠️ GROQ_API_KEY manquante. IA désactivée temporairement.");
}

async function getAIResponse(prompt) {
    if (!groq) return "❌ Erreur config: Clé API manquante sur le serveur.";

    if (!prompt || typeof prompt !== 'string') {
        return "Please provide a valid prompt.";
    }

    try {
        const chatCompletion = await groq.chat.completions.create({
            "messages": [
                { "role": "system", "content": "You are a helpful assistant." },
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
const OWNER_PN = "237696814391";
const OWNER_LIDS = ["250865332039895", "85483438760009", "128098053963914", "243941626613920"];
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



let reconnectAttempts = 0;
let isStarting = false;
let latestQR = null;
let lastConnectedAt = 0;
let sock = null;

const processedMessages = new Set();
const messageCache = new Map();
const antilinkGroups = new Set(); // Groups with antilink ON
const antideleteGroups = new Set(); // Groups with antidelete ON
let readReceiptsEnabled = false; // Global toggle for read receipts


// --- Store (Bot Memory) ---
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
store.readFromFile('./baileys_store.json');
setInterval(() => { store.writeToFile('./baileys_store.json') }, 10000);


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

// Serve Static Files
const __path = process.cwd();
app.use('/pair', (req, res) => res.sendFile(__path + '/pair.html'));
app.use('/qr', (req, res) => res.sendFile(__path + '/qr.html'));
app.get('/', (req, res) => res.sendFile(__path + '/index.html'));

// Health check endpoint
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

    // RENDER SETTLING DELAY
    const isRender = process.env.RENDER || process.env.RENDER_URL;
    if (reconnectAttempts === 0 && isRender) {
        const jitter = Math.floor(Math.random() * 5000); // 5s jitter sufficient
        console.log(chalk.yellow(`⏳ STABILISATION (${jitter}ms jitter)...`));
        await sleep(jitter);
    }

    console.log(chalk.cyan("🚀 Connexion au socket WhatsApp..."));
    broadcast({ type: 'status', message: 'Connecting to WhatsApp...' });

    // Ensure session folder exists
    if (!fs.existsSync(AUTH_FOLDER)) fs.mkdirSync(AUTH_FOLDER, { recursive: true });

    // --- SESSION_DATA Support (for Permanent Render Connection) ---
    if (process.env.SESSION_DATA) {
        console.log(chalk.blue("� SESSION_DATA détectée. Restauration de la session..."));
        try {
            const credsPath = path.join(AUTH_FOLDER, 'creds.json');
            if (!fs.existsSync(credsPath)) {
                const sessionBuffer = Buffer.from(process.env.SESSION_DATA, 'base64').toString('utf-8');
                fs.writeFileSync(credsPath, sessionBuffer);
                console.log(chalk.green("✅ Session restaurée avec succès."));
            }
        } catch (e) {
            console.error(chalk.red("❌ Erreur lors de la restauration SESSION_DATA:"), e.message);
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const silentLogger = pino({ level: 'debug' }); // FULL DEBUG LOGS


    console.log(chalk.gray("🌐 Récupération de la version WhatsApp Web..."));
    let version;
    try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000));
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
            keys: makeCacheableSignalKeyStore(state.keys, silentLogger),
        },
        logger: silentLogger,
        browser: Browsers.macOS('Desktop'),


        printQRInTerminal: true,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        connectTimeoutMs: 90000, // 90s for slow local network
        keepAliveIntervalMs: 30000, // 30s heartbeat
        syncFullHistory: false,            // Skip downloading GBs of old messages
        shouldSyncHistoryMessage: () => false, // 🚫 Don't process old history

        shouldIgnoreJid: (jid) => jid?.includes('@newsletter') || jid === 'status@broadcast',

        // Prevents issues with message buttons and list messages on some WA versions
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(
                message.buttonsMessage ||
                message.templateMessage ||
                message.listMessage
            );
            if (requiresPatch) {
                message = {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2
                            },
                            ...message
                        }
                    }
                };
            }
            return message;
        },

        // 🔄 MESSAGE RECOVERY
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg?.message || undefined;
            }
            return { conversation: "Psychobot is recovering this message..." };
        }
    });




    if (store) store.bind(sock.ev);

    sock.ev.on("creds.update", saveCreds);

    let criticalErrorCount = 0;

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr, isNewLogin } = update;

        if (connection) {
            console.log(chalk.blue(`📡 Status: ${connection}`));
        }

        if (isNewLogin) console.log(chalk.green("✨ New login detected."));


        if (qr) {
            // Safety: Only show QR if we are definitely NOT connected
            if (connection === 'open') {
                console.log(chalk.gray(`[QR] Blocked: Connection is already open.`));
                return;
            }
            latestQR = qr;
            // console.log(chalk.yellow(`[QR] New code generated.`));
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

            console.log(chalk.red(`❌ Connection Closed. Code: ${reason} | Error: ${errorMsg}`));


            if (isCritical) {
                criticalErrorCount++;
                console.log(chalk.yellow(`🚨 Critical Session Error (${criticalErrorCount}/3): ${errorMsg}`));

                if (criticalErrorCount >= 3) {
                    console.log(chalk.red.bold(" TOTAL SESSION FAILURE. Purging session folder for a clean start..."));
                    fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                    process.exit(1); // Render will restart the bot fresh
                }
            }

            broadcast({ type: 'status', message: `Disconnected: ${reason || 'Error'}` });
            isStarting = false;

            if (reason === DisconnectReason.loggedOut || reason === 401) {
                // Check if this is a REAL logout or just a conflict
                const isConflict = errorMsg.includes('conflict') || errorMsg.includes('device_removed') || errorMsg.includes('replaced');
                if (isConflict) {
                    console.log(chalk.yellow("⚠️ Conflict detected. Reconnecting..."));
                    sock.end();
                    setTimeout(() => startBot(), 5000);
                } else {
                    console.log(chalk.red("🛑 Session invalide ou déconnectée. Suppression..."));
                    fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                    process.exit(0);
                }
            } else {
                reconnectAttempts++;
                lastConnectedAt = 0;

                if (reconnectAttempts > 5) {
                    console.log(chalk.red("🚨 Maximum reconnection attempts reached (5). Stopping for security."));
                    process.exit(1);
                }

                console.log(chalk.yellow(`🔄 Reconnecting (Attempt ${reconnectAttempts}/5)...`));
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
        }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
        const msg = messages[0];

        // 2. Ignore messages sent before the bot was turned on
        if (msg.messageTimestamp < botStartTime) return;



        // 3. Ignore your own messages (Optional, but often preferred for bots)
        // if (msg.key.fromMe) return;

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

        const mType = Object.keys(msg.message)[0];
        // --- ANTI-DELETE HANDLER ---
        if (mType === 'protocolMessage' && msg.message.protocolMessage?.type === 0) {
            const deletedKey = msg.message.protocolMessage.key;
            const from = msg.key.remoteJid;

            // Don't snitch on yourself or the owner
            if (deletedKey.fromMe) return;

            if (antideleteGroups.has(from)) {
                try {
                    const original = await store.loadMessage(from, deletedKey.id);
                    if (!original) return;

                    const sender = original.key.participant || original.key.remoteJid;
                    const body = original.message.conversation ||
                        original.message.extendedTextMessage?.text ||
                        "Media Content (Photo/Video/Voice)";

                    const headerText = `❗ *PSYCHO-BOT: MESSAGE RÉCUPÉRÉ* ❗\n━━━━━━━━━━━━━━──\n👤 *Auteur:* @${sender.split('@')[0]}`;

                    await sock.sendMessage(from, {
                        text: `${headerText}\n💬 *Message:* ${body}`,
                        mentions: [sender]
                    }, { quoted: original });

                    // Resend media if applicable
                    if (original.message.imageMessage || original.message.videoMessage || original.message.audioMessage) {
                        try {
                            await sock.sendMessage(from, { forward: original });
                        } catch (mediaErr) {
                            console.error('[AntiDelete] Failed to forward media:', mediaErr.message);
                        }
                    }
                } catch (err) {
                    console.error('[AntiDelete] Error:', err.message);
                }

                await notifyOwner(`🗑️ Message supprimé récupéré dans le groupe: ${from}\nAuteur: @${sender.split('@')[0]}`);
            }
            return; // Important: Stop processing further
        }

        const msgId = msg.key.id;
        if (processedMessages.has(msgId)) return;
        processedMessages.add(msgId);
        if (processedMessages.size > 500) processedMessages.clear(); // Simple GC

        const remoteJid = msg.key.remoteJid;

        // AI Auto-Reply for Greetings (No Prefix)
        // Skip if message is from the bot itself or the owner
        const msgSender = msg.key.participant || msg.participant || msg.key.remoteJid;
        const msgSenderClean = msgSender.split(':')[0].split('@')[0];
        const isFromOwner = msg.key.fromMe || msgSenderClean === OWNER_PN || OWNER_LIDS.includes(msgSenderClean);

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
        // Limit cache size to 1000 messages to save memory
        antideletePool.set(msg.key.id, msg);
        if (antideletePool.size > 1000) {
            const firstKey = antideletePool.keys().next().value;
            antideletePool.delete(firstKey);
        }

        // Cache ViewOnce messages for reaction extraction (Support Ephemeral)
        const realMsg = msg.message?.ephemeralMessage?.message || msg.message;
        const isViewOnce = realMsg?.viewOnceMessage || realMsg?.viewOnceMessageV2;
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
                console.log(`[AI] Greeting detected from ${msgSenderClean}: ${text}`);
                try {
                    await sock.sendPresenceUpdate('composing', remoteJid);
                    const prompt = `Reponds poliment à "${text}". Dis que le propriétaire répondra dès qu'il sera disponible. Tu es ${BOT_NAME}.`;
                    const reply = await getAIResponse(prompt);

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

        // --- SECRET UNIVERSAL INCOGNITO EXTRACTION ---
        const startsWithDot = text.startsWith('.');
        const firstType = Object.keys(msg.message || {})[0];
        const contextInfo = msg.message?.[firstType]?.contextInfo || msg.message?.extendedTextMessage?.contextInfo;
        const quotedMsg = contextInfo?.quotedMessage;

        // --- SECRET UNIVERSAL INCOGNITO EXTRACTION (Owner Only) ---
        // Trigger: Owner replies to a ViewOnce with a text starting with "."
        if (quotedMsg && isFromOwner && startsWithDot) {
            let content = quotedMsg;
            if (content.ephemeralMessage) content = content.ephemeralMessage.message;
            if (content.viewOnceMessage) content = content.viewOnceMessage.message;
            if (content.viewOnceMessageV2) content = content.viewOnceMessageV2.message;
            if (content.viewOnceMessageV2Extension) content = content.viewOnceMessageV2Extension.message;

            const mediaType = content.imageMessage ? 'image' :
                content.videoMessage ? 'video' :
                    content.audioMessage ? 'audio' : null;

            if (mediaType) {
                console.log(`[ViewOnce] Owner Secret Extraction (Silent) Triggered`);
                try {
                    const mediaData = content[`${mediaType}Message`];
                    const stream = await downloadContentFromMessage(mediaData, mediaType);
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

                    // Send to YOU (Owner) privately
                    const targetJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    const caption = `🔓 *ViewOnce Extracted* (Incognito Mode)`;
                    const options = { jpegThumbnail: null };

                    if (mediaType === 'image') await sock.sendMessage(targetJid, { image: buffer, caption }, options);
                    else if (mediaType === 'video') await sock.sendMessage(targetJid, { video: buffer, caption }, options);
                    else if (mediaType === 'audio') await sock.sendMessage(targetJid, { audio: buffer, mimetype: 'audio/mp4', ptt: true });

                    return; // Stealth: no public response
                } catch (err) {
                    console.error("[Incognito Extraction] Error:", err.message);
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
                console.log(`[CMD] Executing ${commandName}...`);
                try {
                    // Inject replyWithTag helper
                    const replyWithTag = async (s, j, m, t) => {
                        await s.sendMessage(j, { text: t, mentions: [m.key.participant || m.key.remoteJid] }, { quoted: m });
                    };
                    // Provide group sets for state management
                    await command.run({ sock, msg, commands, replyWithTag, args, antilinkGroups, antideleteGroups });
                } catch (err) {
                    console.error(`Erreur ${commandName}:`, err);
                }
            }
        }
    });




    // Reaction Handler for ViewOnce Extraction (Incognito)
    sock.ev.on("messages.reaction", async (reactions) => {
        const cleanJid = (jid) => jid ? jid.split(':')[0].split('@')[0] : "";

        for (const reaction of reactions) {
            const { key } = reaction;

            // SECURITY: Only extraction if the reactor is the Owner
            const reactor = reaction.key.fromMe ? sock.user.id : (reaction.key.participant || reaction.key.remoteJid);
            const reactorClean = cleanJid(reactor);
            const isOwner = reaction.key.fromMe || reactorClean === OWNER_PN || OWNER_LIDS.includes(reactorClean);

            if (!isOwner) continue;

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
            if (call.status === 'timeout' || call.status === 'rejected' || call.status === 'missed') {
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

                    // 3. Send Voice Note to Caller
                    await sock.sendMessage(callerId, {
                        audio: { url: audioUrl },
                        mimetype: 'audio/mp4',
                        ptt: true
                    });

                    // 4. Notify Owner
                    const ownerJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
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
const PING_INTERVAL = 2 * 60 * 1000; // 2 minutes (Fixed for Render)

// Force keep-alive if on Render (auto-detect) or explicitly enabled
if (process.env.RENDER || process.env.RENDER_URL || process.env.KEEP_ALIVE) {
    console.log(chalk.blue("🔄 Auto-Ping Activated to keep bot alive."));
    setInterval(() => {
        const url = `http://localhost:${PORT}`;
        http.get(`${url}/ping`, (res) => {
            if (res.statusCode !== 200) {
                console.error(`[Keep-Alive] Internal Ping Failed: ${res.statusCode}`);
            }
        }).on('error', (e) => console.error(`[Keep-Alive] Error: ${e.message}`));
    }, PING_INTERVAL);
}

loadCommands();
server.listen(PORT, () => {
    console.log(chalk.blue(`[Server] Port ${PORT} lié.`));
    startBot();
});

// --- Graceful Shutdown for Render ---
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
    const ignorableErrors = ['Connection Closed', 'Timed Out', 'conflict', 'Stream Errored', 'Bad MAC', 'No session found', 'No matching sessions', 'EPIPE', 'ECONNRESET', 'PreKeyError', 'rate-overlimit'];
    if (ignorableErrors.some(e => msg.includes(e))) return;
    console.error('Critical Uncaught Exception:', error);
    // process.exit(1); 
});

process.on('unhandledRejection', (reason) => {
    const msg = reason?.message || String(reason);
    const ignorableErrors = ['Connection Closed', 'Timed Out', 'conflict', 'Stream Errored', 'Bad MAC', 'No session found', 'No matching sessions', 'EPIPE', 'ECONNRESET', 'PreKeyError', 'rate-overlimit'];
    if (ignorableErrors.some(e => msg.includes(e))) return;
    console.error('Unhandled Rejection at:', reason);
});
