# 🤖 PSYCHOBOT V2 - GUIDE COMPLET D'INSTALLATION

Bienvenue dans le guide officiel pour installer et utiliser **Psycho-Bot**, votre assistant WhatsApp intelligent et multifonctions. Suivez ces étapes simples pour lancer votre propre instance en moins de 10 minutes !

---

## 🚀 ÉTAPE 1 : Préparation du compte GitHub
GitHub est l'endroit où le code de votre bot est stocké.
1. Rendez-vous sur [github.com](https://github.com/).
2. Cliquez sur **Sign Up** et créez votre compte gratuitement.
3. Une fois connecté, allez sur la page du projet : [https://github.com/psycho237-prog/Psychobot](https://github.com/psycho237-prog/Psychobot).
4. En haut à droite, cliquez sur le bouton **Fork** 🔱. Cela crée une copie du bot sur votre propre compte.

---

## ☁️ ÉTAPE 2 : Hébergement sur Render
Render est la plateforme qui fera tourner votre bot 24h/24 gratuitement.
1. Allez sur [render.com](https://render.com/).
2. Cliquez sur **GET STARTED** puis choisissez **Sign up with GitHub**.
3. Autorisez Render à accéder à vos dépôts GitHub.

---

## 🛠️ ÉTAPE 3 : Déploiement du Bot
1. Sur votre tableau de bord Render, cliquez sur le bouton bleu **New +** puis sur **Web Service**.
2. Dans la liste, vous verrez votre dépôt `Psychobot`. Cliquez sur **Connect**.
3. **Paramètres de configuration :**
   - **Name :** Donnez un nom à votre bot (ex: `mon-psychobot`).
   - **Region :** Choisissez la zone la plus proche de vous (ex: Frankfurt).
   - **Branch :** `main`.
   - **Runtime :** `Node`.
   - **Build Command :** `npm install` (devrait être automatique).
   - **Start Command :** `pm2 start index.js --attach`.
4. **Variables d'environnement (INDISPENSABLE) :**
   - Cliquez sur l'onglet **Environment**.
   - Ajoutez une variable nommée `OWNER_NUMBER` avec votre numéro au format international (ex: `237696814391`).
   - Ajoutez `RENDER_URL` avec l'adresse que Render va vous donner (ex: `https://mon-bot.onrender.com`).
5. Cliquez sur **Deploy Web Service**.

---

## 📱 ÉTAPE 4 : Connexion à WhatsApp
1. Une fois le déploiement terminé (statut "Live"), cliquez sur le lien URL de votre application Render.
2. Une page web s'ouvre avec un **QR Code** ou une option **Pairing Code**.
3. Ouvrez WhatsApp sur votre téléphone > Réglages > Appareils liés > **Lier un appareil**.
4. Scannez le code affiché sur votre page Render.
5. **FÉLICITATIONS !** Votre bot est maintenant en ligne.

---

## 🔥 GUIDE DES COMMANDES

### 🤖 Intelligence Artificielle (Groq)
- `!ai [question]` : Posez n'importe quelle question à Llama 3.
- `!aisay [texte]` : Le bot vous répond avec une note vocale générée par l'IA.
- `!transcript` : (Répondez à un vocal) Transcrit le vocal en texte instantanément.
- `!imagine [prompt]` : Génère une image unique à partir de votre texte.

### 🎮 Divertissement & Jeux
- `!guess` : Jeu de devinette de nombre (1 à 10).
- `!motgame` : Trouvez le mot mélangé par le bot.
- `!coinflip` : Pile ou face.

### 👥 Gestion de groupe (Admin uniquement)
- `!tagall` : Identifie tous les membres du groupe.
- `!kick / !add` : Retirer ou ajouter un membre.
- `!promote / !demote` : Donner ou retirer les droits d'admin.
- `!antilink` : Active la suppression auto des liens WhatsApp.
- `!antidelete` : Récupère automatiquement les messages supprimés.

### 🛠️ Utilitaires
- `!sticker` : Transforme une image ou vidéo en sticker.
- `!play [titre]` : Télécharge une musique depuis YouTube.
- `!translate [lang] [texte]` : Traduit votre texte (ex: `!translate en Salut`).

---

## 💡 Astuces pour la persistance
Pour que le bot ne se déconnecte jamais :
1. Tapez `!session` dans votre chat WhatsApp avec le bot.
2. Copiez la longue chaîne de caractères reçue.
3. Retournez sur Render > Environment > Ajoutez une variable `SESSION_DATA` et collez la chaîne.
4. **Votre bot restera connecté même après un redémarrage !**

---
*Développé avec ❤️ par PSYCHO (XYBERCLAN)*
