# SnapMsg — Deployment Guide

> Deploy your messaging app to the internet for free with permanent hosting

---

## Quick Deploy (Recommended)

### Option 1: Render (Easiest)

1. **Create a Render account** at https://render.com (free)
2. **Connect your GitHub** (or create a GitHub repo with this code)
3. **Create a new Web Service**:
   - Repository: Select your snapmsg-app repo
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node
   - Plan: Free tier
4. **Deploy** — Render will give you a live URL like `https://snapmsg-app.onrender.com`

**Cost:** Free (with some limitations on free tier)  
**Uptime:** 24/7 as long as app gets traffic every 15 minutes

---

### Option 2: Railway (Very Easy)

1. **Go to** https://railway.app
2. **Sign in with GitHub**
3. **Click "New Project"** → **"Deploy from GitHub"**
4. **Select this repository**
5. **Railway auto-detects Node.js** and deploys automatically
6. **Get your live URL** from the Railway dashboard

**Cost:** Free $5/month credit (more than enough)  
**Uptime:** 24/7

---

### Option 3: Glitch (Fastest)

1. **Go to** https://glitch.com
2. **Click "New Project"** → **"Import from GitHub"**
3. **Paste the GitHub repo URL**
4. **Done!** Glitch auto-deploys and gives you a live URL

**Cost:** Free  
**Uptime:** 24/7 (sleeps after 5 minutes of inactivity, wakes on request)

---

## Manual Deployment (VPS/Server)

If you have your own server (AWS, DigitalOcean, Linode, etc.):

```bash
# 1. SSH into your server
ssh user@your-server-ip

# 2. Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Clone the repo
git clone https://github.com/yourusername/snapmsg-app.git
cd snapmsg-app

# 4. Install dependencies
npm install

# 5. Start the app
npm start

# 6. (Optional) Use PM2 to keep app running
sudo npm install -g pm2
pm2 start server.js --name "snapmsg"
pm2 startup
pm2 save
```

---

## Environment Variables

If you need to customize the port or other settings:

```bash
# Create a .env file
echo "PORT=3000" > .env
echo "NODE_ENV=production" >> .env

# Start the app
npm start
```

---

## Custom Domain

Once deployed, you can add a custom domain:

### Render
- Go to Settings → Custom Domains
- Add your domain (e.g., `chat.yoursite.com`)
- Follow DNS instructions

### Railway
- Go to Settings → Custom Domain
- Add your domain

### Glitch
- Click "Share" → "Show Live Site"
- Add custom domain in settings

---

## Monitoring & Logs

### Render
- Logs visible in dashboard
- Email alerts for crashes

### Railway
- Real-time logs in dashboard
- Deployment history

### Glitch
- Logs in console
- Auto-restart on errors

---

## Troubleshooting

| Issue | Solution |
|---|---|
| App won't start | Check `npm install` completed, check logs for errors |
| Port already in use | Change `PORT` env var or kill process using port |
| Can't connect from browser | Check firewall, ensure app is running, check logs |
| Messages disappearing | Data is in-memory, resets on restart (expected) |
| Slow performance | Free tier may have limited resources, upgrade plan |

---

## Making It Permanent (Database)

To keep messages after restarts, add a database:

### Option: MongoDB Atlas (Free)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string
4. Update `server.js` to use MongoDB instead of in-memory storage

This requires code changes — ask for help if needed!

---

## Sharing Your App

Once live, share the URL with friends:

```
Hey! Chat with me on SnapMsg: https://your-app-url.com
No account needed, just pick a username!
```

---

## Cost Summary

| Platform | Free Tier | Paid Tier | Best For |
|---|---|---|---|
| **Render** | $0/month | $7+/month | Production apps |
| **Railway** | $5/month credit | $5+/month | Small projects |
| **Glitch** | $0/month | $0/month | Quick testing |
| **Your VPS** | $5-20/month | $5-20/month | Full control |

---

## Need Help?

- **Render Support:** https://render.com/docs
- **Railway Support:** https://docs.railway.app
- **Glitch Help:** https://glitch.com/help
- **Node.js Docs:** https://nodejs.org/docs

Good luck! 🚀
