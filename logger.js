// logger.js
const chalk = require('chalk');
const util = require('util'); // On importe l'outil d'inspection de Node.js
const path = require('path');

function getTimestamp() {
    return `[${new Date().toLocaleTimeString('fr-FR')}]`;
}

module.exports = function (caller) {
    const tag = caller?.filename ? caller.filename.split(/\\|\//).pop().replace('.js', '').toUpperCase() : 'LOG';
    
    return function (...args) {
        // --- LA CORRECTION EST ICI ---
        const message = args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
                // Utilise util.inspect pour une conversion sûre des objets, même circulaires.
                // depth: 4 montre 4 niveaux de l'objet, ce qui est suffisant pour le débogage.
                return util.inspect(arg, { depth: 4, colors: true });
            }
            return arg;
        }).join(' ');
        
        console.log(`${chalk.gray.italic(getTimestamp())} ${chalk.cyan.bold(`[${tag}]`)} ${message}`);
    };
};