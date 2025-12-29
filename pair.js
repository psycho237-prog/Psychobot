const express = require('express');
const router = express.Router();
const manager = require('./manager');

require('dotenv').config();
const ADMIN_NUMBER = process.env.ADMIN_NUMBER;

router.get('/', async (req, res) => {
    let num = req.query.number;

    if (!num) {
        return res.status(400).send({ error: "Phone number is required" });
    }

    const cleanNum = num.replace(/[^0-9]/g, '');
    const cleanAdmin = ADMIN_NUMBER.replace(/[^0-9]/g, '');

    // CHECK IF ALREADY ACTIVE
    const activeBots = manager.getActiveBots();
    if (activeBots.includes(cleanNum)) {
        return res.status(200).send({ status: "ALREADY_ACTIVE", message: "Your bot is already online and connected!" });
    }

    // Restriction Logic
    if (cleanNum !== cleanAdmin) {
        // Here you could add a database check for paid users
        // For now, we allow them to pair, but we could limit their bot lifetime in manager.js
        // However, the user said "it is free only for the admin"
        return res.status(403).send({
            error: "PAID_SERVICE",
            message: "This bot hosting service is currently restricted to the administrator."
        });
    }

    // Start pairing flow via manager
    await manager.requestPairing(cleanNum, res);
});

module.exports = router;
