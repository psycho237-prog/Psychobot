# ⏰ Keep-Alive Setup Guide for Render

## Why Keep-Alive?

Render's **free tier** puts services to sleep after **15 minutes of inactivity**. This causes your bot to disconnect from WhatsApp. The keep-alive feature automatically pings your bot every 14 minutes to prevent this.

---

## 🚀 How It Works

The bot now includes an **automatic self-ping service** that:
- ✅ Pings itself every **5 minutes**
- ✅ Checks health status via `/ping` endpoint
- ✅ Logs uptime and status
- ✅ Only runs when deployed (not in local development)

---

## 📝 Setup on Render

### Option 1: Using RENDER_URL (Recommended)

1. **Deploy your bot to Render first**

2. **Get your Render URL**
   - After deployment, copy your service URL
   - Example: `https://psychobot-v2.onrender.com`

3. **Add Environment Variable**
   - Go to your Render dashboard
   - Select your service
   - Click **"Environment"** tab
   - Click **"Add Environment Variable"**
   - Add:
     ```
     Key: RENDER_URL
     Value: https://your-bot-name.onrender.com
     ```
   - Click **"Save Changes"**

4. **Redeploy** (if needed)
   - Render will auto-redeploy with the new variable

### Option 2: Using KEEP_ALIVE Flag

If you don't want to specify the URL:

1. Add this environment variable:
   ```
   Key: KEEP_ALIVE
   Value: true
   ```

2. The bot will use `http://localhost:PORT` for pinging

---

## ✅ Verify It's Working

### Check Logs on Render

1. Go to Render Dashboard → Your Service → **Logs**

2. Look for these messages:
   ```
   🔄 Keep-Alive enabled. Pinging https://your-bot.onrender.com/ping every 5 minutes
   ✅ Keep-Alive service started
   ```

3. Every 5 minutes, you should see:
   ```
   ✅ Keep-Alive ping successful: alive | Uptime: 300s
   ```

### Test the Health Endpoint

Visit in your browser:
```
https://your-bot-name.onrender.com/ping
```

You should see:
```json
{
  "status": "alive",
  "uptime": 123.456,
  "timestamp": "2026-01-23T16:33:20.000Z",
  "service": "Psycho Bot V2"
}
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `RENDER_URL` | Your Render service URL | `https://psychobot-v2.onrender.com` |
| `KEEP_ALIVE` | Enable keep-alive (if no URL set) | `true` |
| `PORT` | Server port (auto-set by Render) | `3000` |

### Timing

- **Ping Interval**: 5 minutes (300,000ms)
- **Render Sleep Time**: 15 minutes of inactivity
- **Safety Margin**: 10 minute buffer before sleep

---

## 🌐 Alternative: External Monitoring

If you prefer external monitoring instead of self-ping:

### Option A: UptimeRobot (Free)

1. Go to [UptimeRobot.com](https://uptimerobot.com)
2. Sign up for free
3. Add a new monitor:
   - **Monitor Type**: HTTP(s)
   - **URL**: `https://your-bot.onrender.com/ping`
   - **Monitoring Interval**: 5 minutes
4. Save and activate

**Benefits:**
- ✅ External monitoring
- ✅ Email alerts if bot goes down
- ✅ Uptime statistics
- ✅ Works independently of your code

### Option B: Cron-Job.org (Free)

1. Go to [Cron-Job.org](https://cron-job.org)
2. Create account
3. Add new cron job:
   - **URL**: `https://your-bot.onrender.com/ping`
   - **Schedule**: Every 10 minutes
4. Enable and save

---

## 🐛 Troubleshooting

### Keep-Alive Not Showing in Logs

**Check:**
1. Is `RENDER_URL` or `KEEP_ALIVE` set in environment variables?
2. Did you redeploy after adding the variable?
3. Check Render logs for startup messages

### Ping Failures

If you see `❌ Keep-Alive ping failed`:

1. **Check URL**: Make sure `RENDER_URL` is correct
2. **Check Service**: Verify service is running on Render
3. **Network Issues**: Temporary - will retry in 5 minutes

### Bot Still Sleeping

If bot sleeps despite keep-alive:

1. **Verify logs**: Confirm pings are happening every 5 minutes
2. **Check URL**: Must be YOUR actual Render URL
3. **Consider upgrading**: Free tier has limitations
4. **Use external monitor**: UptimeRobot as backup

---

## 💡 Pro Tips

### 1. Combine Internal + External
Use both self-ping AND UptimeRobot for maximum reliability:
- Self-ping: Primary keep-alive
- UptimeRobot: Backup + monitoring + alerts

### 2. Monitor Your Logs
Regularly check Render logs to ensure:
- ✅ Pings are successful
- ✅ No errors in bot logic
- ✅ WhatsApp connection is stable

### 3. Upgrade for 24/7 Uptime
For production use, consider:
- **Render Starter Plan**: $7/month - No sleep, better resources
- **Railway Pro**: $5/month - 500 hours execution
- **VPS Hosting**: DigitalOcean, Linode for full control

---

## 📊 Performance Impact

**Resource Usage:**
- ✅ Minimal CPU: One fetch every 14 minutes
- ✅ Minor Memory: ~1KB per ping
- ✅ Network: ~500 bytes per request
- ✅ No impact on bot performance

**Uptime Improvement:**
- ❌ Without keep-alive: Bot sleeps after 15 min → Frequent reconnections
- ✅ With keep-alive: Bot stays active → Continuous WhatsApp connection

---

## 🔒 Security Notes

- The `/ping` endpoint is **public** and read-only
- It only returns basic health status
- No sensitive data is exposed
- Safe to be called by external services

---

## 📌 Quick Reference

### Check if Keep-Alive is Active:
```bash
curl https://your-bot.onrender.com/ping
```

### Environment Variable Setup:
```
RENDER_URL=https://your-bot-name.onrender.com
```

### Expected Log Output:
```
🔄 Keep-Alive enabled. Pinging https://psychobot-v2.onrender.com/ping every 5 minutes
✅ Keep-Alive service started
✅ Keep-Alive ping successful: alive | Uptime: 300s
```

---

**✅ With keep-alive configured, your bot will remain active 24/7 on Render's free tier!**

For best results, combine with [UptimeRobot](https://uptimerobot.com) for external monitoring and alerts.
