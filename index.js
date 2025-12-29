const express = require('express');
const bodyParser = require("body-parser");
const path = require('path');
const pair = require('./pair');
const manager = require('./manager');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

app.get('/status', (req, res) => {
    const num = req.query.number;
    if (!num) return res.status(400).send({ error: "Missing number" });
    const cleanNum = num.replace(/[^0-9]/g, '');
    const active = manager.getActiveBots().includes(cleanNum);
    res.send({ status: active ? "ONLINE" : "OFFLINE" });
});

// Bootstrap saved sessions on startup
manager.bootstrap().catch(err => console.error("Error bootstrapping:", err));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Pairing routes
app.use('/code', pair);

app.get('/pair', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Psychobot Pairing Server running on http://localhost:${PORT}`);
});

module.exports = app;
