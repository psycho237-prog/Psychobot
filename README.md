# 🤖 Psychobot - SaaS Bot Hosting Platform

Welcome to **Psychobot**, a professional SaaS platform designed to make WhatsApp bot hosting accessible to everyone. No more complex coding or server management—just pair and host!

## 🚀 Key Features

- **SaaS Architecture**: Centralized hosting on your server. Users simply pair their WhatsApp via pairing code, and the bot starts running automatically.
- **Bot Dashboard**: Real-time status monitoring. Users can see if their bot is `ONLINE` or `OFFLINE` directly from the web interface.
- **Anti-View-Once (Anonymous)**: 
  - Extract disappearing media effortlessly.
  - React to a "View Once" message to have the bot extract and send it to your **private DM** anonymously.
- **Admin Protection**: Built-in logic to allow only the bot owner to execute sensitive commands like `!promote`, `!demote`, and `!tagall`.
- **Persistent Sessions**: Sessions are saved and automatically restored even after server restarts.
- **Trial System**: Automated lifespans for non-admin bots (currently set to 2 hours) to manage server resources.

## 🛠️ Commands

| Command | Description | Access |
|---------|-------------|--------|
| `!help` | Show command menu | Everyone |
| `!about` | Creator information | Everyone |
| `!extract` | Extract view-once media (Reply to msg) | Everyone |
| `!pp` | Get profile picture | Everyone |
| `!tagall` | Mention everyone in group | Admin |
| `!promote` | Nominate group admin | Owner |
| `!demote` | Remove group admin | Owner |
| `!delete` | Delete a message | Owner |

## 📦 Deployment

This project is optimized for cloud deployment using **Docker**.

### Fast Deploy (Koyeb/Render)
1. Fork/Clone this repository.
2. Create a new service and link this repo.
3. Set the `ADMIN_NUMBER` environment variable to your WhatsApp number (e.g., `237696814391`).
4. Set the internal port to `8000`.
5. Deploy!

## 👨‍💻 About the Creator

**ONANA GREGOIRE LEGRAND (Psycho)**
- 💻 Cybersecurity Enthusiast & IT Student (UY1)
- 🚀 Founder of **XYBERCLAN**
- 🛠️ Full-Stack Developer (JS, Python, Linux)

[Portfolio](https://psycho237-prog.github.io/Portfolio-/) | [YouTube](https://www.youtube.com/@psychogreg) | [LinkedIn](https://www.linkedin.com/in/onana-gregoire-legrand)

---
*Powered by XYBERCLAN | 2025*
