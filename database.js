// database.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./bot.db');
const log = require('./logger')(module); // Utilise le logger pour la cohérence

db.serialize(() => {
    log("Connexion à SQLite réussie.");
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            firstSeen TEXT,
            commandCount INTEGER DEFAULT 0
        )
    `);
});

function getOrRegisterUser(userId, name) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
            if (err) return reject(err);
            if (row) {
                resolve(row);
            } else {
                const firstSeen = new Date().toISOString();
                db.run("INSERT INTO users (id, name, firstSeen) VALUES (?, ?, ?)", [userId, name, firstSeen], (err) => {
                    if (err) return reject(err);
                    log(`Nouvel utilisateur enregistré : ${name} (${userId})`);
                    resolve({ id: userId, name, firstSeen, commandCount: 0 });
                });
            }
        });
    });
}

function incrementCommandCount(userId) {
    return new Promise((resolve, reject) => {
        db.run("UPDATE users SET commandCount = commandCount + 1 WHERE id = ?", [userId], (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

// --- LES FONCTIONS MANQUANTES SONT ICI ---

function getTotalUsers() {
    return new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            if (err) return reject(err);
            resolve(row.count || 0);
        });
    });
}

function getTotalCommands() {
    return new Promise((resolve, reject) => {
        db.get("SELECT COALESCE(SUM(commandCount), 0) as total FROM users", (err, row) => {
            if (err) return reject(err);
            resolve(row.total || 0);
        });
    });
}


// --- ON S'ASSURE QU'ELLES SONT BIEN EXPORTÉES ---
module.exports = {
    getOrRegisterUser,
    incrementCommandCount,
    getTotalUsers,     // <--- Ligne cruciale
    getTotalCommands,  // <--- Ligne cruciale
};