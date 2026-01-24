# 🤖 PSYCHO BOT V2

[![Node.js](https://img.shields.io/badge/Node.js-%3E=20.0.0-green?logo=node.js&logoColor=white)](https://nodejs.org/) 
[![Status](https://img.shields.io/badge/Status-Online-brightgreen)]()
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Bot-25D366?logo=whatsapp&logoColor=white)]()

**Psycho Bot V2** is a powerful, multi-functional WhatsApp bot built on the [wa-bat](https://github.com/lemboupharel/wa-bat/) framework and enhanced with custom commands from the original Psycho Bot. It combines automated reactions, view-once media extraction, AI responses, and a comprehensive command system for group management, entertainment, and utilities.

---

## ✨ Key Features

### 🎯 Core Functionality
- **Pairing Code & QR Support**: Easy connection via web interface or QR code
- **Auto Reactions**: Automatically react to messages in all chats
- **Auto Response**: AI-powered greeting detection and responses
- **View-Once Extraction**: Automatically extract and save view-once media when reacted to
- **Command System**: 20+ built-in commands for various tasks

### 🎮 Custom Commands
- **Group Management**: Promote/demote admins, kick users, tag all members
- **Media Tools**: Download profile pictures, create stickers, extract media
- **Entertainment**: Games (coin flip, guess number, action/truth, word game)
- **Music**: YouTube search and download with `!play`
- **Audio Effects**: Chipmunk voice filter
- **Status Tools**: Download all statuses, download specific status

### 🤖 Automated Features
- **Smart Greetings**: Detects and responds to greetings in DMs
- **Emoji Reactions**: Auto-react with random emojis to incoming messages
- **Media Preservation**: Keep view-once media by reacting with ❤️, 😂, 😍, or 👍
- **Anti-Delete**: Track deleted messages (when enabled)

---

## 📋 Prerequisites

- **Node.js** >= 20.0.0
- **Python** >= 2.0 (for yt-dlp)
- **FFmpeg** (for audio/video processing)
- **Git** (for cloning and deployment)

---

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/psycho237-prog/psychobot-v2.git
cd psychobot-v2
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Bot
```bash
npm start
# or for development
npm run dev
```

### 4. Connect via Web Interface
Open your browser and navigate to:
- **Home**: `http://localhost:3000`
- **Pairing**: `http://localhost:3000/pair`

You can connect using:
- **Pairing Code**: Enter your phone number
- **QR Code**: Scan with WhatsApp

---

## 🎮 Available Commands

| Command | Description |
|---------|-------------|
| `!help` | Display the complete command menu |
| `!about` | Bot information and author details |
| `!ping` | Check bot response time |

### 👥 Group Management
| Command | Description |
|---------|-------------|
| `!promote` | Promote a user to admin (reply to message) |
| `!demote` | Demote an admin to member (reply to message) |
| `!kick` | Remove a user from the group (reply to message) |
| `!tagall` | Mention all group members |
| `!delete` | Delete a message (reply to message) |

### 🎨 Media & Utilities
| Command | Description |
|---------|-------------|
| `!pp` | Download user's profile picture (reply to message) |
| `!sticker` | Convert image/video to sticker (reply to media) |
| `!extract` | Extract and send media to your DM (reply to media) |
| `!statusall` | Download all available statuses |
| `!statusdown` | Download specific status |

### 🎵 Entertainment
| Command | Description |
|---------|-------------|
| `!play [song name]` | Search and download music from YouTube |
| `!chipmunks` | Apply chipmunk voice filter to audio |
| `!audio` | Audio manipulation tools |

### 🎲 Games
| Command | Description |
|---------|-------------|
| `!coinflip` | Flip a coin (heads or tails) |
| `!guess` | Number guessing game |
| `!actionverite` | Truth or dare game |
| `!motgame` | Word guessing game |
| `!listgame` | List all active games |

### 🛡️ Advanced
| Command | Description |
|---------|-------------|
| `!antidelete` | Toggle anti-delete feature |

---

## ⚙️ Configuration

### Environment Variables
Create a `.env` file in the root directory (optional):
```env
PORT=3000
```

### Bot Customization
Edit `bot.js` to customize:
- **Browser Name**: Change `browser: ["Psycho bot", "Chrome", "1.0.0"]`
- **Command Prefix**: Modify `PREFIX = '!'` in `bot.js`
- **Session Directory**: Change `SESSION_DIR = './session'`

---

## 📂 Project Structure

```
psychobot-v2/
├── bot.js                 # Main bot logic
├── index.js              # Express server setup
├── pair.js               # Pairing code handler
├── commands/             # All command modules
│   ├── help.js
│   ├── about.js
│   ├── ping.js
│   ├── promote.js
│   ├── play.js
│   └── ... (20+ commands)
├── src/
│   ├── handlers/         # Event handlers
│   │   ├── autoReaction.js
│   │   ├── autoResponse.js
│   │   └── onceView.js
│   └── services/
│       └── ai.js         # AI service (greeting detection)
├── database.js           # SQLite database for user stats
├── logger.js             # Custom logging utility
├── index.html            # Landing page
├── pair.html             # Pairing interface
└── package.json
```

---

## 🔐 Session Management

The bot uses **multi-file auth** for WhatsApp sessions:
- Sessions are stored in `./session/` directory
- `creds.json` contains authentication credentials
- **Important**: Add `session/` to `.gitignore` for security

To reset the session:
```bash
rm -rf session/
# Restart the bot and re-pair
```

---

## 🌐 Deployment

### Deploy to Render
1. Fork this repository
2. Create a new **Web Service** on [Render](https://render.com)
3. Connect your GitHub repository
4. Set build command: `npm install`
5. Set start command: `npm start`
6. **Add environment variable** (Important for free tier):
   - Key: `RENDER_URL`
   - Value: `https://your-bot-name.onrender.com` (your actual Render URL)
7. Deploy!

> **💡 Keep-Alive Feature**: The bot includes automatic self-ping to prevent Render's free tier from sleeping. See [KEEP_ALIVE.md](KEEP_ALIVE.md) for detailed setup instructions.

### Deploy to Railway
```bash
railway init
railway up
```

### Keep Your Bot Alive 24/7 (Free Tier)

The bot includes **built-in keep-alive** functionality:
- ✅ Automatically pings itself every 5 minutes
- ✅ Prevents Render/Railway from sleeping
- ✅ No external services needed

**Setup:**
1. Set `RENDER_URL` environment variable to your bot's URL
2. The keep-alive service starts automatically
3. Monitor logs to confirm it's working

**Alternative:** Use [UptimeRobot](https://uptimerobot.com) for external monitoring.

📖 **Full Guide**: See [KEEP_ALIVE.md](KEEP_ALIVE.md) for complete instructions.

---

## 🛠️ Development

### Run in Development Mode
```bash
npm run dev
```

### Testing Commands
Use the `test.rest` file with REST client extensions in VS Code.

### Adding New Commands
1. Create a new file in `commands/` folder:
```javascript
module.exports = {
    name: 'mycommand',
    description: 'What this command does',
    run: async ({ sock, msg, commands, replyWithTag, args }) => {
        const from = msg.key.remoteJid;
        await sock.sendMessage(from, { text: 'Hello!' });
    }
};
```
2. Restart the bot - commands are auto-loaded!

---

## 📊 Database

The bot uses **SQLite** to track:
- User statistics
- Command usage count
- First interaction timestamps

Database file: `bot.db`

---

## ⚠️ Important Notes

- **Unofficial**: This bot uses WhatsApp Web and is unofficial
- **Rate Limits**: Respect WhatsApp's rate limits to avoid bans
- **Privacy**: Never share your `session/` folder or `creds.json`
- **No Spam**: Use responsibly and don't spam users
- **Python Required**: Some commands (like `!play`) need Python and yt-dlp installed

---

## 🐛 Troubleshooting

### Bot Won't Connect
- Delete `session/` folder and re-pair
- Check Node.js version (must be >= 20)
- Ensure no firewall is blocking connections

### Commands Not Working
- Verify command prefix is `!`
- Check bot has necessary group permissions
- Review console logs for errors

### Python/yt-dlp Errors
```bash
# Install Python 2 or 3
sudo apt install python3
# Install yt-dlp
pip install yt-dlp
```

---

## 📜 License

MIT License - feel free to use and modify!

---

## 👨‍💻 Author

**PSYCHO (Onana Grégoire Legrand)**

- 🌐 GitHub: [@psycho237-prog](https://github.com/psycho237-prog)
- 📱 TikTok: [@gregoire_legrand](https://www.tiktok.com/@gregoire_legrand)
- 💼 LinkedIn: [Onana Grégoire Legrand](https://www.linkedin.com/in/onana-gregoire-legrand-a18529282)

---

## 🙏 Credits

- Original framework: [wa-bat](https://github.com/lemboupharel/wa-bat/) by lemboupharel
- WhatsApp library: [Baileys](https://github.com/WhiskeySockets/Baileys)
- Original Psycho Bot commands and features

---

## 🔥 XYBERCLAN

**Built with 💜 by XYBERCLAN**

---

## 📞 Support

If you encounter issues or have questions:
1. Check the troubleshooting section above
2. Review the [Issues](https://github.com/psycho237-prog/psychobot-v2/issues) page
3. Create a new issue with detailed information

---

**⭐ If you find this bot useful, please give it a star on GitHub!**
