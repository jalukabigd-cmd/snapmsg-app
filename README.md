# SnapMsg — Private Messaging App

> A full-featured, production-quality private messaging web application inspired by Snapchat, iMessage, and WhatsApp. Runs smoothly on school Chromebooks and desktop browsers. No database, no accounts, no tracking.

---

## Live Preview

Once running, open: **http://localhost:3000**

---

## Quick Start

### Requirements
- [Node.js](https://nodejs.org/) v16 or higher (free download)
- A modern browser (Chrome, Firefox, Edge, Safari)

### Installation & Running

```bash
# 1. Navigate to the project folder
cd snapchat-app

# 2. Install dependencies (only needed once)
npm install

# 3. Start the server
npm start

# 4. Open your browser
# Go to: http://localhost:3000
```

That's it! Share the URL with classmates on the same network:
- Find your local IP: run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Others connect via: `http://YOUR_IP:3000`

---

## Features

### Authentication
| Feature | Details |
|---|---|
| Username login | No password required — just pick a username |
| Duplicate prevention | Server rejects usernames already in use |
| Auto-login | Returning users are logged in automatically via localStorage |
| Display name | Optional nickname shown to others |
| Avatar color | 12 color options for your profile bubble |
| Logout | Clears session and returns to login screen |

### Real-Time Messaging
| Feature | Details |
|---|---|
| Direct messages | One-on-one private chats |
| Group chats | Create groups, add members, see member count |
| Instant delivery | Socket.IO ensures messages arrive in milliseconds |
| Message bubbles | Left-aligned (received) / right-aligned (sent) |
| Timestamps | Relative time (just now, 2m ago, etc.) |
| Auto-scroll | Chat window scrolls to newest message automatically |
| Enter to send | Press Enter; Shift+Enter for new line |
| Typing indicators | "User is typing..." with animated dots |
| Read receipts | Sent → Delivered → Seen status |
| Message reactions | Hover a message and click emoji reactions |
| Reply to messages | Hover → Reply button → quoted reply thread |
| Edit messages | Hover → Edit → modify and save |
| Delete messages | Hover → Delete → removes from chat |

### User Interface
| Feature | Details |
|---|---|
| Splash screen | Animated loading screen on first visit |
| Sidebar | Shows all chats with unread badges and last message preview |
| People tab | Browse online users, click to start a DM |
| Chat themes | 6 themes: Default, Midnight, Ocean, Forest, Sunset, Candy |
| Responsive design | Works on Chromebooks, laptops, tablets, and phones |
| Smooth animations | Message slide-in, fade effects, modal transitions |
| Unread badges | Red badge on sidebar chats with unread messages |
| Online indicators | Green dot = online, yellow = idle, grey = offline |
| User streaks | 🔥 streak counter for consecutive chat days |

### Advanced Features
| Feature | Details |
|---|---|
| Emoji picker | Full emoji picker with search and categories |
| Image sharing | Send images (base64 preview, no upload needed) |
| Message search | Ctrl+F to search within a chat |
| Global search | Search across all chats |
| Pin chats | Star/pin important conversations to the top |
| Disappearing messages | Set a timer (10s–24h) for auto-deleting messages |
| Chat clearing | Clear all messages in a chat |
| Sound notifications | Plays a tone when a new message arrives |
| Browser notifications | Native OS notifications (if permission granted) |
| Visual popups | Toast notification for new messages |
| Screenshot warning | UI simulation of screenshot detection |
| Fake reconnect | Realistic "reconnecting..." animation on disconnect |

### Keyboard Shortcuts
| Shortcut | Action |
|---|---|
| `Enter` | Send message |
| `Shift+Enter` | New line in message |
| `Ctrl+E` | Open emoji picker |
| `Ctrl+F` | Search messages |
| `Ctrl+G` | New group chat |
| `Escape` | Close modals / cancel |

---

## File Structure

```
snapchat-app/
├── server.js          # Node.js + Express + Socket.IO backend
├── package.json       # Dependencies and scripts
├── README.md          # This file
└── public/
    ├── index.html     # App shell, modals, and layout
    ├── style.css      # All styles, themes, and animations
    └── script.js      # All client-side logic and Socket.IO events
```

### server.js — What it does
- Serves static files from `/public`
- Manages connected users (in-memory, no database)
- Handles Socket.IO events: login, DMs, group chats, typing, reactions, etc.
- Provides a `/api/health` endpoint for status checks
- Automatically cleans up disconnected users

### index.html — What it contains
- Splash screen overlay
- Authentication screen (username + nickname + color picker)
- Main app layout: sidebar + chat window
- All modals: settings, new group, image preview, search
- Emoji picker integration (via `emoji-picker-element`)
- Notification toast container

### style.css — What it contains
- CSS custom properties for all 6 themes
- Responsive layout (flexbox-based)
- Message bubble styles with slide-in animations
- Typing indicator with bouncing dots
- Sidebar, header, and input bar styles
- Modal and overlay animations
- Mobile-first media queries

### script.js — What it contains
- `State` object: single source of truth for app state
- Socket.IO event handlers (auth, messages, rooms, reactions, etc.)
- UI rendering functions (messages, sidebar, users list)
- Emoji picker integration
- Image upload and preview
- Notification system (sound + browser + toast)
- Keyboard shortcut handlers
- Auto-login and session persistence
- Typing indicator debounce
- Message reply, edit, delete logic

---

## Privacy & Safety

- **No database** — all data lives in server memory and resets on restart
- **No passwords** — username-only login
- **No tracking** — no analytics, no cookies beyond session
- **No external APIs** — fully self-contained
- **School safe** — no adult content APIs or external data collection
- **Clear all data** — button in Settings to wipe your local session

---

## Hosting (Optional)

### Run on a school network
```bash
# Find your IP address
# Windows:
ipconfig

# Mac/Linux:
ifconfig

# Start the server (it listens on all interfaces by default)
npm start

# Share with classmates: http://YOUR_LOCAL_IP:3000
```

### Deploy to the internet (free options)
- **[Railway](https://railway.app)** — drag and drop, free tier
- **[Render](https://render.com)** — connect GitHub repo, free tier
- **[Glitch](https://glitch.com)** — paste code directly, free tier

For any of these, just upload the project folder. The `npm start` command is already configured.

---

## Customization

### Change the default port
Edit `server.js`, line near the bottom:
```js
const PORT = process.env.PORT || 3000; // Change 3000 to any port
```

### Add a new theme
In `style.css`, find the `[data-theme="candy"]` block and add a new one:
```css
[data-theme="yourtheme"] {
  --bg-primary: #your-color;
  --bg-secondary: #your-color;
  /* ... etc */
}
```
Then add the theme option in `index.html` inside `#theme-grid`.

### Change disappearing message timer options
In `script.js`, find `DISAPPEAR_OPTIONS` and edit the array.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Port already in use | Change port in `server.js` or kill the process using the port |
| Can't connect from another device | Make sure both devices are on the same Wi-Fi network |
| Messages not appearing | Refresh the page; check browser console for errors |
| Emoji picker not loading | Check internet connection (loads from CDN on first use) |
| Notifications not working | Click "Allow" when browser asks for notification permission |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Server | Express.js |
| Real-time | Socket.IO |
| Frontend | Vanilla HTML/CSS/JavaScript |
| Emoji Picker | `emoji-picker-element` (CDN) |
| Fonts | Google Fonts — Inter |
| Icons | Unicode emoji + CSS |
| Storage | In-memory (server) + localStorage (client) |

---

*Built with ❤️ — No accounts. No tracking. Just chat.*
