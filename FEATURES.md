# SnapMsg — Complete Features List

> Everything you can do with SnapMsg

---

## 🔐 Authentication & Privacy

### User Accounts
- **Username-only login** — No passwords, no email required
- **Duplicate prevention** — Server prevents username conflicts
- **Auto-login** — Returning users logged in automatically via localStorage
- **Display names** — Optional nickname shown to other users
- **Avatar colors** — 12 color options for profile identification
- **Logout** — Clears session and returns to login screen
- **Privacy lock** — Only friends can send you direct messages

---

## 👥 Friend System

### Friend Requests
- **Send requests** — Click "+ Add" on any user in the People tab
- **Receive requests** — New "Requests" tab shows incoming friend requests
- **Accept/Reject** — One-click accept or reject with notifications
- **Pending status** — See "⏳ Pending" while waiting for response
- **Friends list** — View all accepted friends
- **Mutual friendship** — Both users must accept to become friends
- **Friend-only messaging** — Can only DM users you're friends with

---

## 💬 Direct Messaging

### One-on-One Chats
- **Start DMs** — Click any friend to open a direct message
- **Message history** — All messages persist during session
- **Real-time delivery** — Messages appear instantly
- **Typing indicators** — See "User is typing..." with animated dots
- **Read receipts** — Sent → Delivered → Seen status
- **Message bubbles** — Left-aligned (received) / right-aligned (sent)
- **Timestamps** — Relative time (just now, 2m ago, etc.)
- **Auto-scroll** — Chat window scrolls to newest message automatically

---

## 👫 Group Chats

### Create & Manage Groups
- **Create groups** — Click "New Group" button
- **Add members** — Select multiple friends to add
- **Group names** — Custom names with emoji support
- **Member count** — See how many people in group
- **Leave groups** — Remove yourself from group chat
- **Group history** — See all messages in group

---

## ✍️ Message Features

### Sending Messages
- **Text messages** — Type and press Enter to send
- **Multi-line** — Shift+Enter for new line without sending
- **Emoji support** — Full emoji picker with search
- **Image sharing** — Send images as base64 previews
- **Message reactions** — Add emoji reactions to any message
- **Reply to messages** — Quote specific messages in thread
- **Edit messages** — Modify sent messages (shows "edited" indicator)
- **Delete messages** — Remove messages from chat

### Message Status
- **Sent** — Message left your device
- **Delivered** — Message reached server
- **Seen** — Recipient opened the chat
- **Disappearing messages** — Auto-delete after timer (10s–24h)
- **Screenshot warning** — UI simulation of screenshot detection

---

## 🎨 Customization

### Themes
- **6 built-in themes:**
  - Default (Purple)
  - Midnight (Dark blue)
  - Ocean (Cyan)
  - Forest (Green)
  - Sunset (Orange)
  - Candy (Pink)
- **Theme persistence** — Your choice saved across sessions
- **Real-time switching** — Change themes instantly

### User Profile
- **Avatar color** — 12 colors to choose from
- **Display name** — Customize how others see you
- **Status** — Online / Idle / Offline
- **Streak counter** — 🔥 Shows consecutive chat days

---

## 🔍 Search & Discovery

### Finding Chats & Messages
- **Chat search** — Search by chat name or participant
- **Message search** — Ctrl+F to search within a chat
- **Global search** — Search across all chats
- **People search** — Find users to add as friends
- **Online status** — See who's currently online

---

## 📌 Chat Management

### Organization
- **Pin chats** — Star important conversations to top
- **Unread badges** — Red badge shows unread message count
- **Last message preview** — See snippet of latest message
- **Chat clearing** — Delete all messages in a chat
- **Sidebar sorting** — Pinned chats appear first

---

## 🔔 Notifications

### Alerts
- **Sound notifications** — Plays tone on new message
- **Browser notifications** — Native OS notifications (if allowed)
- **Visual popups** — Toast notifications for new messages
- **Notification settings** — Enable/disable in Settings
- **Unread indicators** — Badge count on sidebar

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Send message |
| `Shift+Enter` | New line in message |
| `Ctrl+E` | Open emoji picker |
| `Ctrl+F` | Search messages in chat |
| `Ctrl+G` | New group chat |
| `Escape` | Close modals / cancel |

---

## 📱 Responsive Design

### Device Support
- **Desktop** — Full-featured experience
- **Tablet** — Optimized layout
- **Mobile** — Touch-friendly interface
- **Chromebook** — Tested and optimized
- **All browsers** — Chrome, Firefox, Safari, Edge

### Mobile Features
- **Sidebar toggle** — Swipe or click to show/hide
- **Full-screen chat** — Maximized message area
- **Touch optimized** — Large buttons, easy tapping
- **Landscape support** — Works in both orientations

---

## 🎭 UI/UX Features

### Visual Design
- **Animated splash screen** — Loading animation on first visit
- **Smooth transitions** — All interactions animated
- **Message slide-in** — Messages animate into view
- **Fade effects** — Modals and overlays fade in/out
- **Hover effects** — Interactive feedback on buttons
- **Status indicators** — Green dot = online, yellow = idle, grey = offline
- **Typing animation** — Bouncing dots while typing

### Modals & Dialogs
- **Settings modal** — Customize app appearance
- **New group modal** — Create group chats
- **Image preview** — View images before sending
- **Search results** — Dedicated search panel
- **Emoji picker** — Full emoji library with categories

---

## 🚀 Performance

### Optimization
- **Real-time Socket.IO** — Instant message delivery
- **In-memory storage** — Fast access to messages
- **Lazy loading** — Only load visible content
- **Debounced typing** — Efficient typing indicators
- **Optimized rendering** — Smooth animations

### Reliability
- **Auto-reconnect** — Reconnects if connection drops
- **Fake reconnect UI** — Shows "reconnecting..." animation
- **Error handling** — Graceful error messages
- **Session persistence** — Auto-login on return

---

## 🔒 Privacy & Security

### Data Protection
- **No database** — Data lives in server memory only
- **No tracking** — No analytics or cookies
- **No external APIs** — Fully self-contained
- **School safe** — No adult content or external data
- **Clear all data** — Button in Settings to wipe session
- **Friend-only access** — Privacy lock on DMs
- **No passwords** — No password database to hack

### Data Lifecycle
- **Session-based** — Data resets on server restart
- **Local storage only** — Session info saved on your device
- **No cloud sync** — Your data stays on your device
- **No backups** — Messages not backed up (by design)

---

## 🎯 Use Cases

### Perfect For
- **School projects** — Collaborate with classmates
- **Group study** — Chat with study group
- **Quick messaging** — No account setup needed
- **Private conversations** — Friend-only access
- **Temporary chats** — Messages reset on restart
- **Learning Node.js** — Great code example
- **Customization** — Easy to modify and extend

### Not Ideal For
- **Permanent storage** — Messages reset on restart
- **Large files** — Only text and small images
- **Video calls** — Messaging only
- **Production apps** — No database persistence
- **Sensitive data** — Not encrypted

---

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js + Express.js |
| **Real-time** | Socket.IO |
| **Storage** | In-memory (no database) |
| **Emoji** | emoji-picker-element (CDN) |
| **Fonts** | Google Fonts (Inter) |
| **Deployment** | Render, Railway, Glitch, VPS |

---

## 📊 Limitations

- **No database** — Messages lost on restart
- **In-memory only** — Limited by server RAM
- **No file uploads** — Images as base64 only
- **No video/audio** — Messaging only
- **No encryption** — Messages not encrypted
- **Single server** — No clustering
- **No backup** — No message history saved

---

## 🚀 Future Enhancements

Possible additions:
- MongoDB integration for persistence
- End-to-end encryption
- Voice/video calls
- File upload to cloud storage
- Message reactions with custom emojis
- User profiles with bio
- Blocking/muting users
- Message scheduling
- Dark mode toggle
- Internationalization (i18n)

---

*Last updated: March 2026*
