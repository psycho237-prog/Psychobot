# 🚀 Quick Start Guide - Psycho Bot V2

## Local Development

### Prerequisites Check
```bash
# Check Node.js version (must be >= 20)
node --version

# Check if Python is installed
python --version || python3 --version

# Check if Git is installed
git --version
```

### Installation Steps

1. **Clone the repository**
```bash
git clone https://github.com/psycho237-prog/psychobot-v2.git
cd psychobot-v2
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the bot**
```bash
npm start
```

4. **Connect to WhatsApp**
   - Open browser: `http://localhost:3000`
   - Click "Get Started"
   - Choose pairing method:
     - **Pairing Code**: Enter your phone number
     - **QR Code**: Scan with WhatsApp

---

## 🌐 Deploy to Render (Free Hosting)

### Method 1: Using Render Dashboard

1. **Fork the repository** to your GitHub account

2. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

3. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your forked repository
   - Configure:
     - Name: `psychobot-v2`
     - Environment: `Node`
     - Build Command: `npm install`
     - Start Command: `npm start`
     - Instance Type: `Free`

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (2-5 minutes)

5. **Get Your Bot URL**
   - Example: `https://psychobot-v2.onrender.com`

6. **Pair Your Bot**
   - Visit: `https://your-bot-url.onrender.com`
   - Click "Get Started"
   - Enter pairing code or scan QR

### Method 2: Using render.yaml (Included)

The project includes a `render.yaml` file for automated deployment:

```bash
# Just connect your GitHub repo to Render
# It will auto-configure using render.yaml
```

---

## 🚂 Deploy to Railway

1. **Install Railway CLI**
```bash
npm install -g @railway/cli
```

2. **Login to Railway**
```bash
railway login
```

3. **Initialize Project**
```bash
cd psychobot-v2
railway init
```

4. **Deploy**
```bash
railway up
```

5. **Get Your URL**
```bash
railway domain
```

---

## 🔧 First Time Setup

After deployment, you MUST pair the bot:

1. Visit your bot URL (e.g., `https://your-bot.onrender.com`)
2. Click "Get Started" button
3. Choose your pairing method:
   
   **Option A: Pairing Code**
   - Enter your phone number (with country code)
   - Example: `237650000000`
   - You'll receive a code on WhatsApp
   - Enter the code to link
   
   **Option B: QR Code**
   - Scan the QR code with WhatsApp
   - Go to WhatsApp → Settings → Linked Devices
   - Click "Link a Device"
   - Scan the QR code shown

---

## ✅ Verify Bot is Working

### Test Commands in WhatsApp

1. **Ping Test**
   ```
   !ping
   ```
   Expected: Bot should respond with latency

2. **Help Menu**
   ```
   !help
   ```
   Expected: Full command list

3. **About Info**
   ```
   !about
   ```
   Expected: Bot information

---

## 🛡️ Important Security Notes

### ⚠️ Never Share These Files:
- `session/` folder (contains your WhatsApp session)
- `creds.json` (authentication credentials)
- `.env` file (if you create one)

### 🔒 Recommended:
- Add `session/` to `.gitignore` ✅ (Already done)
- Don't commit to public GitHub with active session
- Use environment variables for sensitive data

---

## 🐛 Common Issues

### Issue: "Failed to load command"
**Solution**: Make sure all dependencies are installed
```bash
npm install
```

### Issue: "Python not found" (for !play command)
**Solution**: Install Python
```bash
# Ubuntu/Debian
sudo apt install python3

# Windows
# Download from python.org
```

### Issue: Bot disconnects frequently
**Solution**: 
- Free hosting (Render/Railway) may sleep after inactivity
- Upgrade to paid tier for 24/7 uptime
- Or use services like UptimeRobot to ping your bot every 5 minutes

### Issue: "Connection closed"
**Solution**: Delete session and re-pair
```bash
rm -rf session/
# Restart bot and pair again
```

---

## 📊 Monitoring Your Bot

### Check if bot is online:
```bash
curl https://your-bot-url.onrender.com
```

Expected response:
```json
{
  "status": "online",
  "uptime": "...",
  "connected": true
}
```

---

## 🔄 Updating Your Bot

### Pull Latest Changes
```bash
cd psychobot-v2
git pull origin master
npm install
npm start
```

### On Render/Railway
- Changes auto-deploy when you push to GitHub
- Manual redeploy: Click "Deploy" button in dashboard

---

## 💡 Pro Tips

1. **Keep Bot Alive (Free Hosting)**
   - Use [UptimeRobot](https://uptimerobot.com) to ping every 5 min
   - Prevents bot from sleeping

2. **Monitor Logs**
   - Render: Click "Logs" in dashboard
   - Railway: `railway logs`
   - Local: Check terminal output

3. **Database Backup**
   - Export `bot.db` regularly
   - Contains user stats and data

4. **Update Commands**
   - Add new `.js` files to `commands/` folder
   - Bot auto-loads on restart

---

## 📞 Need Help?

- 📖 Read the [full README](README.md)
- 🐛 Report bugs on [GitHub Issues](https://github.com/psycho237-prog/psychobot-v2/issues)
- 💬 Test locally first before deploying

---

**🎉 Congratulations! Your Psycho Bot V2 is ready to use!**

Test it with `!help` in WhatsApp to see all available commands.
