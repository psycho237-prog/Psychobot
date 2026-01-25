# 🤖 PSYCHO BOT V2

[![Node.js](https://img.shields.io/badge/Node.js-%3E=20.0.0-green?logo=node.js&logoColor=white)](https://nodejs.org/) 
[![Status](https://img.shields.io/badge/Status-Online-brightgreen)]()
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Bot-25D366?logo=whatsapp&logoColor=white)]()

**Psycho Bot V2** is a high-performance, multi-functional WhatsApp bot built for speed, utility, and elite group management. Powered by **Meta Llama 3** and **Groq**, it features professional-grade AI responses, audio transcriptions, and robust media tools.

---

## ✨ Key Features

### 🧠 Advanced AI & Intelligence
- **Llama 3 Powered**: Deep, intelligent conversations and greeting detection.
- **Whisper VIP Transcription**: Ultra-fast, high-accuracy audio-to-text via Groq Whisper v3.
- **Smart Call Assistant**: Automated AI-generated voice excuses for missed/rejected calls.
- **Imagine AI**: Generate high-quality, watermarked images via Flux (Pollinations AI).
- **Dynamic Translation**: Auto-detecting Google Translate system (supports 50+ languages).

### 🎯 Core Functionality
- **Dual Connection**: Pairing Code (Web) or QR Code support.
- **Anti-Delete (Snitch Mode)**: Real-time recovery of deleted messages and media in groups.
- **View-Once Stealth**: Extract view-once photos/videos by reacting to them.
- **Auto Reactions**: Intelligent emoji interactions in all chats.
- **Anti-Link**: Automated group protection against unwanted external links.

### 🎮 Elite Command System
- **Group Management**: Pro-level tools for admins (Promote, Demote, Kick, TagAll).
- **YouTube Media**: High-speed song search and MP3 download with `!play`.
- **Entertainment Hub**: Versatile Action or Vérité, specialized games, and audio filters.
- **Status Pro**: Bulk download and specific status extraction tools.

---

## 📋 Prerequisites

- **Node.js** >= 20.0.0
- **Docker** (Recommended for Render deployment to handle FFmpeg/Python)
- **Groq API Key**: Essential for Llama 3 and Whisper features.

---

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/psycho237-prog/psychobot-v2.git
cd psychobot-v2
```

### 2. Configure Environment
Create a `.env` file:
```env
GROQ_API_KEY=your_groq_key_here
PORT=10000
```

### 3. Start the Bot
```bash
npm install
npm start
```

---

## 🌐 Deployment (Render)

For a 100% stable experience on Render, this bot uses **Docker**.

1. Fork this repo.
2. In Render, create a **Web Service**.
3. Render will auto-detect the `render.yaml` and `Dockerfile`.
4. **Important**: Add `GROQ_API_KEY` in the Render Environment settings.
5. Deploy.

---

## 🎨 Professional Commands

| Command | Description |
|---------|-------------|
| `!ai` | Ask anything to the AI |
| `!imagine` | Generate images with "PSYCHO-BOT" watermark |
| `!transcript` | Transcribe voice notes (Reply to audio) |
| `!translate` | Universal translator (Ex: `!translate en Bonjour`) |
| `!play` | Search and download music directly from YouTube |
| `!antidelete` | Enable real-time recovery of deleted group messages |
| `!av` | Dynamic Action or Vérité game (Funny/Culture/Adult) |

---

## 👨‍💻 Author

**PSYCHO (Onana Grégoire Legrand)**

- 🌐 GitHub: [@psycho237-prog](https://github.com/psycho237-prog)
- 📱 TikTok: [@gregoire_legrand](https://www.tiktok.com/@gregoire_legrand)
- 💼 LinkedIn: [Onana Grégoire Legrand](https://www.linkedin.com/in/onana-gregoire-legrand-a18529282)

---

## 🔥 XYBERCLAN
**Built with 💜 by XYBERCLAN**

⭐ **Star this repository if you enjoy using Psycho Bot V2!**
