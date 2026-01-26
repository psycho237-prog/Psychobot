// 🚀 PSYCHO BOT - 2025 ENTERPRISE EDITION
// ============================================
// Latest Baileys 7.0+ Compatible | Optimized Connection Handling
// Better Error Recovery | Enhanced Stability | Modern Stack

const express = require('express');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers,
    makeCacheableSignalKeyStore,
    makeInMemoryStore,
    downloadContentFromMessage,
    delay
} = require('@whiskeysockets/baileys');
const QRCode = require("qrcode");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const figlet = require("figlet");
const WebSocket = require('ws');
const http = require('http');
const bodyParser = require("body-parser");
const axios = require('axios');
const cron = require('node-cron');
const googleTTS = require('google-tts-api');
require('dotenv').config();

// ✅ AI CONFIG
const Groq = require("groq-sdk");
let groq;
try {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
} catch (e) {
    console.warn("⚠️ GROQ_API_KEY missing. AI disabled temporarily.");
}

async function getAIResponse(prompt) {
    if (!groq) return "❌ Error: API key missing on server.";
    if (!prompt || typeof prompt !== 'string') return "Please provide a valid prompt.";

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024,
            top_p: 1,
            stream: false
        });
        return chatCompletion.choices[0].message.content.trim();
    } catch (error) {
        console.error('[Groq Error]:', error.message);
        if (error.status === 429) return "⏳ Too many requests. Try again later.";
        return "Sorry, AI connection failed right now.";
    }
}

// ✅ CONFIGURATION
const PORT = process.env.PORT || 10000;
const AUTH_FOLDER = path.join(__dirname, "session");
const PREFIX = "!";
const BOT_NAME = "PSYCHO BOT";
const OWNER_PN = "237696814391";
const OWNER_LIDS = ["250865332039895", "85483438760009", "128098053963914", "243941626613920"];
const cleanJid = (jid) => jid ? jid.split(':')[0].split('@')[0] : "";
const botStartTime = Math.floor(Date.now() / 1000);

// ✅ STATE MANAGEMENT
let reconnectAttempts = 0;
let isStarting = false;
let latestQR = null;
let sock = null;

const processedMessages = new Set();
const messageCache = new Map();
const antideletePool = new Map();
const antilinkGroups = new Set();
const antideleteGroups = new Set();
let readReceiptsEnabled = false;

// ✅ STORE
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
store.readFromFile('./baileys_store.json');
setInterval(() => { store.writeToFile('./baileys_store.json') }, 10000);

// ✅ HELPERS
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

function header() {
    console.clear();
    console.log(chalk.cyan(figlet.textSync(BOT_NAME, { horizontalLayout: 'full' })));
    console.log(chalk.gray('🚀 2025 Enterprise Edition | Baileys 7.0+'));
    console.log(chalk.gray('────────────────────────────────────────────────────'));
}

// ✅ OWNER NOTIFICATION
async function notifyOwner(text) {
    try {
        if (sock?.user) {
            const ownerJid = OWNER_PN + "@s.whatsapp.net";
            await sock.sendMessage(ownerJid, { text: `🛡️ *SYSTEM LOGS*\n━━━━━━━━━━━\n${text}` });
        }
    } catch (e) {
        console.error("Owner notification failed:", e.message);
    }
}

// ✅ COMMAND LOADER
const commands = new Map();
const commandFolder = path.join(__dirname, 'commands');

function loadCommands() {
    if (!fs.existsSync(commandFolder)) {
        console.log(chalk.yellow("⚠️ Commands folder not found."));
        return;
    }
    fs.readdirSync(commandFolder)
        .filter(f => f.endsWith('.js'))
        .forEach(file => {
            try {
                const command = require(path.join(commandFolder, file));
                if (command.name) {
                    commands.set(command.name, command);
                    console.log(chalk.green(`✅ Command loaded: ${command.name}`));
                }
            } catch (err) {
                console.error(chalk.red(`❌ Load error ${file}:`), err.message);
            }
        });
}

// ✅ EXPRESS SETUP
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const __path = process.cwd();
app.use('/pair', (req, res) => res.sendFile(__path + '/pair.html'));
app.use('/qr', (req, res) => res.sendFile(__path + '/qr.html'));
app.get('/', (req, res) => res.send('Psycho Bot Factory is Online! 🏭🚀'));
app.get('/health', (req, res) => res.status(200).send('OK'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const broadcast = (data) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

wss.on('connection', (ws) => {
    console.log('[WS] Client connected');
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

// ✅ BAILEYS CORE - MODERNIZED
async function startBot() {
    if (isStarting) return;
    isStarting = true;

    // Ghost instance killer for Render
    const isRender = process.env.RENDER || process.env.RENDER_URL;
    if (reconnectAttempts === 0 && isRender) {
        process.stdout.write(chalk.yellow("⏳ Render detected. Waiting 15s to kill ghost instances...\n"));
        await sleep(15000);
    }

    process.stdout.write(chalk.cyan("🚀 Connecting to WhatsApp Socket...\n"));
    broadcast({ type: 'status', message: 'Connecting...' });

    if (!fs.existsSync(AUTH_FOLDER)) fs.mkdirSync(AUTH_FOLDER, { recursive: true });

    // SESSION_DATA Restoration with Validation
    if (process.env.SESSION_DATA) {
        console.log(chalk.blue("🔄 SESSION_DATA detected. Validating..."));
        try {
            const { state: testState } = await useMultiFileAuthState(AUTH_FOLDER);
            if (testState.creds?.me?.id) {
                console.log(chalk.green("✅ Valid local session. Using it."));
            } else {
                const credsPath = path.join(AUTH_FOLDER, 'creds.json');
                if (!fs.existsSync(credsPath)) {
                    const sessionBuffer = Buffer.from(process.env.SESSION_DATA, 'base64').toString('utf-8');
                    fs.writeFileSync(credsPath, sessionBuffer);
                    console.log(chalk.green("✅ Session restored from SESSION_DATA."));
                }
            }
        } catch (e) {
            console.warn(chalk.yellow("⚠️ SESSION_DATA validation skipped."));
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const logger = pino({ level: process.env.DEBUG ? 'debug' : 'error' });

    // ✅ DYNAMIC VERSION - CRITICAL FIX
    let version;
    try {
        const versionInfo = await fetchLatestBaileysVersion();
        version = versionInfo.version;
        console.log(chalk.gray(`📦 Baileys Version: ${version.join('.')}`));
    } catch (err) {
        console.warn(chalk.yellow("⚠️ Could not fetch version. Using fallback."));
        version = [2, 3000, 1015901307];
    }

    sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger,
        browser: Browsers.ubuntu('Chrome'),
        printQRInTerminal: false,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        
        // ✅ IMPROVED TIMEOUT SETTINGS
        connectTimeoutMs: 180000,      // 3 minutes
        defaultQueryTimeoutMs: 180000, // 3 minutes
        keepAliveIntervalMs: 35000,    // 35 seconds
        retryRequestDelayMs: 5000,
        maxRetries: 5,
        
        getMessage: async (key) => ({ conversation: '' }),
        shouldIgnoreJid: (jid) => jid === 'status@broadcast',
        
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
        }
    });

    if (store) store.bind(sock.ev);

    sock.ev.on("creds.update", saveCreds);

    // ✅ CONNECTION HANDLER - IMPROVED
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr, isNewLogin } = update;

        if (connection) console.log(chalk.blue(`📡 Status: ${connection}`));
        if (isNewLogin) console.log(chalk.green("✨ New login detected."));

        if (qr) {
            if (connection === 'open') return;
            latestQR = qr;
            try {
                const url = await QRCode.toDataURL(qr);
                broadcast({ type: 'qr', qr: url });
                broadcast({ type: 'status', message: 'Please scan the QR Code' });
            } catch (e) { }
        }

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const reason = DisconnectReason[statusCode];

            console.log(chalk.red(`\n❌ DISCONNECTED`));
            console.log(chalk.red(`   Code: ${statusCode} | Reason: ${reason || 'Unknown'}`));
            
            broadcast({ type: 'status', message: `Disconnected: ${reason || statusCode}` });
            isStarting = false;

            // Auth errors - restart with fresh QR
            if (statusCode === 401 || statusCode === 405 || statusCode === 409) {
                console.log(chalk.red("🛑 Auth error. Clearing session..."));
                if (fs.existsSync(AUTH_FOLDER)) {
                    fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                }
                reconnectAttempts = 0;
                process.exit(1);
            }

            // Network/Server errors - retry with backoff
            if (statusCode === 500 || statusCode === 408 || statusCode === 503 || statusCode === 515) {
                console.log(chalk.yellow("🔄 Server error. Retrying..."));
                reconnectAttempts++;
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                setTimeout(() => startBot(), delay);
            } else if (shouldReconnect) {
                reconnectAttempts++;
                if (reconnectAttempts > 5) {
                    console.log(chalk.red("❌ Max reconnection attempts. Exiting."));
                    process.exit(1);
                }
                console.log(chalk.yellow(`🔄 Reconnecting (${reconnectAttempts}/5)...`));
                setTimeout(() => startBot(), 5000);
            } else {
                console.log(chalk.red("❌ Logged out. Exit."));
                process.exit(0);
            }
        } else if (connection === "open") {
            latestQR = null;
            reconnectAttempts = 0;
            isStarting = false;
            console.log(chalk.green.bold("\n✅ PSYCHOBOT CONNECTED AND ONLINE!"));
            broadcast({ type: 'connected', user: sock.user.id.split(':')[0] });
        }
    });

    // ✅ MESSAGE HANDLER
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
        const msg = messages[0];

        if (msg.messageTimestamp < botStartTime) return;

        // Status auto-view
        if (msg.key.remoteJid === 'status@broadcast') {
            await sock.readMessages([msg.key]);
            try {
                await sock.sendMessage('status@broadcast', {
                    react: { text: '❤️', key: msg.key }
                });
            } catch (err) {
                console.error('[Status] Failed to react:', err.message);
            }
            return;
        }

        if (!msg.message) return;

        const mType = Object.keys(msg.message)[0];

        // Anti-delete handler
        if (mType === 'protocolMessage' && msg.message.protocolMessage?.type === 0) {
            const deletedKey = msg.message.protocolMessage.key;
            const from = msg.key.remoteJid;

            if (deletedKey.fromMe) return;

            if (antideleteGroups.has(from)) {
                try {
                    const original = await store.loadMessage(from, deletedKey.id);
                    if (!original) return;

                    const sender = original.key.participant || original.key.remoteJid;
                    const body = original.message.conversation ||
                        original.message.extendedTextMessage?.text ||
                        "Media Content (Photo/Video/Voice)";

                    await sock.sendMessage(from, {
                        text: `❗ *MESSAGE RECOVERED*\n━━━━━━━━━━━━\n👤 *From:* @${sender.split('@')[0]}\n💬 *Text:* ${body}`,
                        mentions: [sender]
                    }, { quoted: original });

                    if (original.message.imageMessage || original.message.videoMessage || original.message.audioMessage) {
                        try {
                            await sock.sendMessage(from, { forward: original });
                        } catch (mediaErr) {
                            console.error('[AntiDelete] Media forward failed:', mediaErr.message);
                        }
                    }
                } catch (err) {
                    console.error('[AntiDelete] Error:', err.message);
                }
                await notifyOwner(`🗑️ Recovered message in: ${from}`);
            }
            return;
        }

        const msgId = msg.key.id;
        if (processedMessages.has(msgId)) return;
        processedMessages.add(msgId);
        if (processedMessages.size > 500) processedMessages.clear();

        const remoteJid = msg.key.remoteJid;
        const msgSender = msg.key.participant || msg.participant || msg.key.remoteJid;
        const msgSenderClean = msgSender.split(':')[0].split('@')[0];
        const isFromOwner = msg.key.fromMe || msgSenderClean === OWNER_PN || OWNER_LIDS.includes(msgSenderClean);

        const text = msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption || "";

        console.log(`[MSG] From ${remoteJid}: ${text.substring(0, 50)}`);

        // Antilink enforcement
        if (antilinkGroups.has(remoteJid) && !isFromOwner) {
            const linkPattern = /chat.whatsapp.com\/[a-zA-Z0-9]/;
            if (linkPattern.test(text)) {
                console.log(`[Antilink] Link detected. Removing...`);
                await sock.sendMessage(remoteJid, { delete: msg.key });
                try {
                    const groupMetadata = await sock.groupMetadata(remoteJid);
                    const botIsAdmin = groupMetadata.participants.find(p => cleanJid(p.id) === cleanJid(sock.user.id))?.admin;
                    if (botIsAdmin) {
                        await sock.groupParticipantsUpdate(remoteJid, [msg.key.participant || remoteJid], "remove");
                    }
                } catch (err) {
                    console.error('[Antilink] Error:', err.message);
                }
                return;
            }
        }

        // Cache for antidelete
        antideletePool.set(msg.key.id, msg);
        if (antideletePool.size > 1000) {
            const firstKey = antideletePool.keys().next().value;
            antideletePool.delete(firstKey);
        }

        // Cache ViewOnce
        const realMsg = msg.message?.ephemeralMessage?.message || msg.message;
        const isViewOnce = realMsg?.viewOnceMessage || realMsg?.viewOnceMessageV2;
        if (isViewOnce) {
            messageCache.set(msg.key.id, msg);
            setTimeout(() => messageCache.delete(msg.key.id), 24 * 60 * 60 * 1000);
        }

        // Game handler
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

        // AI greetings
        if (!text.startsWith(PREFIX) && !isFromOwner) {
            const lowerText = text.toLowerCase().trim();
            const greetings = ['hello', 'hi', 'bonjour', 'salut', 'yo', 'hey', 'cc', 'wsh', 'bjr'];

            const isGreeting = greetings.includes(lowerText) ||
                (lowerText.length < 20 && greetings.some(g => lowerText.startsWith(g)));

            if (isGreeting) {
                try {
                    await sock.sendPresenceUpdate('composing', remoteJid);
                    const prompt = `Reply politely to "${text}". Say the owner will respond soon. You are ${BOT_NAME}.`;
                    const reply = await getAIResponse(prompt);
                    await sock.sendMessage(remoteJid, { text: reply }, { quoted: msg });

                    if (readReceiptsEnabled) {
                        await sock.readMessages([msg.key]);
                    }
                } catch (err) {
                    console.error("[AI] Error:", err.message);
                }
            }
        }

        // ViewOnce extraction (owner only)
        const startsWithDot = text.startsWith('.');
        const firstType = Object.keys(msg.message || {})[0];
        const contextInfo = msg.message?.[firstType]?.contextInfo || msg.message?.extendedTextMessage?.contextInfo;
        const quotedMsg = contextInfo?.quotedMessage;

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
                try {
                    const mediaData = content[`${mediaType}Message`];
                    const stream = await downloadContentFromMessage(mediaData, mediaType);
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

                    const targetJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    if (mediaType === 'image') await sock.sendMessage(targetJid, { image: buffer, caption: '🔓 ViewOnce Extracted' });
                    else if (mediaType === 'video') await sock.sendMessage(targetJid, { video: buffer, caption: '🔓 ViewOnce Extracted' });
                    else if (mediaType === 'audio') await sock.sendMessage(targetJid, { audio: buffer, mimetype: 'audio/mp4', ptt: true });

                    return;
                } catch (err) {
                    console.error("[Incognito] Error:", err.message);
                }
            }
        }

        // Command handling
        if (text.startsWith(PREFIX)) {
            const args = text.slice(PREFIX.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

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
                try {
                    const replyWithTag = async (s, j, m, t) => {
                        await s.sendMessage(j, { text: t, mentions: [m.key.participant || m.key.remoteJid] }, { quoted: m });
                    };
                    await command.run({ sock, msg, commands, replyWithTag, args, antilinkGroups, antideleteGroups });
                } catch (err) {
                    console.error(`Command error ${commandName}:`, err);
                }
            }
        }
    });

    // Reaction handler
    sock.ev.on("messages.reaction", async (reactions) => {
        for (const reaction of reactions) {
            const { key } = reaction;
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
                    try {
                        const viewOnceContent = viewOnce.message;
                        const mediaType = Object.keys(viewOnceContent).find(k => k.includes('Message'));
                        if (!mediaType) return;

                        const mediaData = viewOnceContent[mediaType];
                        const stream = await downloadContentFromMessage(mediaData, mediaType.replace('Message', ''));
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

                        const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                        const type = mediaType.replace('Message', '');

                        if (type === 'image') await sock.sendMessage(myJid, { image: buffer, caption: '🔓 ViewOnce (Reaction)' });
                        else if (type === 'video') await sock.sendMessage(myJid, { video: buffer, caption: '🔓 ViewOnce (Reaction)' });
                        else if (type === 'audio') await sock.sendMessage(myJid, { audio: buffer, mimetype: 'audio/mp4', ptt: true });
                    } catch (err) {
                        console.error("[Reaction Handler] Error:", err.message);
                    }
                }
            }
        }
    });

    // Call handler
    sock.ev.on('call', async (callEvents) => {
        for (const call of callEvents) {
            if (call.status === 'timeout' || call.status === 'rejected' || call.status === 'missed') {
                const callerId = call.from;
                console.log(chalk.yellow(`[Call] Missed call from ${callerId}`));

                try {
                    let aiText = "Sorry, can't answer right now. I'll call back soon.";
                    
                    if (groq) {
                        try {
                            const chatCompletion = await groq.chat.completions.create({
                                messages: [{ role: "system", content: "Generate a 1-sentence professional message saying the owner is busy. Max 15 words. Serious tone." }],
                                model: "llama3-8b-8192",
                                max_tokens: 50,
                            });
                            aiText = chatCompletion.choices[0]?.message?.content || aiText;
                        } catch (aiErr) {
                            console.error('[Call AI Error]:', aiErr.message);
                        }
                    }

                    const audioUrl = googleTTS.getAudioUrl(aiText, {
                        lang: 'en',
                        slow: false,
                        host: 'https://translate.google.com',
                    });

                    await sock.sendMessage(callerId, {
                        audio: { url: audioUrl },
                        mimetype: 'audio/mp4',
                        ptt: true
                    });

                    const ownerJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    await sock.sendMessage(ownerJid, {
                        text: `📞 *Missed Call (Auto-Reply)*\n━━━━━━━━━━\n👤 *From:* @${callerId.split('@')[0]}\n📝 *Message:* "${aiText}"`,
                        mentions: [callerId]
                    });

                    await notifyOwner(`📞 Missed call from @${callerId.split('@')[0]} (auto-replied).`);
                } catch (err) {
                    console.error("[Call Handler] Error:", err.message);
                }
            }
        }
    });
}

// ✅ KEEP ALIVE
cron.schedule('*/10 * * * *', async () => {
    try {
        const renderUrl = process.env.RENDER_URL;
        if (renderUrl) {
            const url = renderUrl.endsWith('/') ? renderUrl : `${renderUrl}/`;
            await axios.get(`${url}health`);
            process.stdout.write(chalk.gray('🔄 Keep-alive OK\n'));
        }
    } catch (error) {
        console.error(chalk.red('❌ Keep-alive failed'));
    }
});

// ✅ SERVER START
server.listen(PORT, () => {
    console.log(chalk.blue(`[Server] Listening on port ${PORT}`));
    header();
    loadCommands();
    startBot();
});

// ✅ GRACEFUL SHUTDOWN
process.on('SIGTERM', async () => {
    console.log(chalk.red("\n🛑 SIGTERM received. Shutting down..."));
    if (sock) {
        sock.end();
        console.log(chalk.gray("Socket closed."));
    }
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    const msg = error?.message || String(error);
    const ignorableErrors = ['Connection Closed', 'Timed Out', 'conflict', 'Stream Errored', 'Bad MAC', 'No session found', 'EPIPE', 'ECONNRESET', 'PreKeyError'];
    if (ignorableErrors.some(e => msg.includes(e))) return;
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    const msg = reason?.message || String(reason);
    const ignorableErrors = ['Connection Closed', 'Timed Out', 'conflict', 'Stream Errored', 'Bad MAC', 'No session found', 'EPIPE', 'ECONNRESET', 'PreKeyError'];
    if (ignorableErrors.some(e => msg.includes(e))) return;
    console.error('Unhandled Rejection:', reason);
});
