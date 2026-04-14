/**
 * SnapChat-style Messaging App — Server
 * Stack: Node.js + Express + Socket.IO
 * Storage: In-memory only (no database required)
 * Author: Manus AI
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 60000,
  pingInterval: 25000
});

// ─── Serve static files ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ─── In-Memory Data Stores ────────────────────────────────────────────────────

/** Map<username, UserObject> */
const users = new Map();

/** Map<socketId, username> */
const socketToUser = new Map();

/** Map<username, socketId> */
const userToSocket = new Map();

/**
 * UserObject shape:
 * {
 *   username: string,
 *   nickname: string,
 *   avatarColor: string,
 *   status: 'online' | 'idle' | 'offline',
 *   lastSeen: Date,
 *   streak: number,
 *   lastStreakDate: string (YYYY-MM-DD),
 *   pinnedChats: string[],
 *   theme: string,
 *   friends: Set<string>,           // usernames of accepted friends
 *   friendRequests: Map<string, {from: string, timestamp: Date}> // pending requests
 * }
 */

/** Map<username, Set<string>> - friend relationships */
const friendships = new Map();

/** Map<username, Map<fromUser, timestamp>> - pending friend requests */
const friendRequests = new Map();

/** Map<roomId, RoomObject> */
const rooms = new Map();

/**
 * RoomObject shape:
 * {
 *   id: string,
 *   type: 'dm' | 'group',
 *   name: string,         // group name or null for DMs
 *   members: Set<string>, // usernames
 *   messages: Message[],
 *   createdAt: Date,
 *   createdBy: string
 * }
 */

/**
 * Message shape:
 * {
 *   id: string,
 *   roomId: string,
 *   sender: string,
 *   content: string,
 *   type: 'text' | 'image' | 'emoji' | 'file',
 *   timestamp: Date,
 *   edited: boolean,
 *   deleted: boolean,
 *   reactions: { [emoji]: string[] },  // emoji -> array of usernames
 *   replyTo: { id, sender, content } | null,
 *   disappearAfter: number | null,     // seconds
 *   readBy: string[],                  // usernames who have read
 *   deliveredTo: string[]              // usernames it was delivered to
 * }
 */

// ─── Helper Functions ─────────────────────────────────────────────────────────

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

function generateAvatarColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#82E0AA', '#F8C471',
    '#F1948A', '#73C6B6', '#7FB3D3', '#A9CCE3'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getDMRoomId(user1, user2) {
  // Consistent room ID regardless of order
  return [user1, user2].sort().join('__dm__');
}

function serializeUser(username) {
  const u = users.get(username);
  if (!u) return null;
  return {
    username: u.username,
    nickname: u.nickname,
    avatarColor: u.avatarColor,
    status: u.status,
    lastSeen: u.lastSeen,
    streak: u.streak,
    isFriend: false // will be set by caller if needed
  };
}

function areFriends(user1, user2) {
  const friends1 = friendships.get(user1) || new Set();
  return friends1.has(user2);
}

function getPendingRequests(username) {
  const requests = friendRequests.get(username) || new Map();
  return Array.from(requests.entries()).map(([from, data]) => ({
    from,
    timestamp: data.timestamp
  }));
}

function serializeRoom(room, forUser) {
  const messages = room.messages.filter(m => !m.deleted || m.reactions);
  const unread = messages.filter(
    m => m.sender !== forUser && !m.readBy.includes(forUser)
  ).length;
  const lastMsg = messages[messages.length - 1] || null;

  return {
    id: room.id,
    type: room.type,
    name: room.type === 'dm'
      ? [...room.members].find(m => m !== forUser)
      : room.name,
    members: [...room.members],
    lastMessage: lastMsg ? {
      content: lastMsg.deleted ? '🚫 Message deleted' : lastMsg.content,
      sender: lastMsg.sender,
      timestamp: lastMsg.timestamp,
      type: lastMsg.type
    } : null,
    unreadCount: unread,
    createdAt: room.createdAt,
    createdBy: room.createdBy
  };
}

function broadcastUserList() {
  const onlineUsers = [...users.values()]
    .filter(u => u.status !== 'offline')
    .map(u => serializeUser(u.username));
  io.emit('users:list', onlineUsers);
}

function updateStreak(username) {
  const user = users.get(username);
  if (!user) return;
  const today = new Date().toISOString().split('T')[0];
  if (user.lastStreakDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (user.lastStreakDate === yesterday) {
    user.streak += 1;
  } else if (user.lastStreakDate !== today) {
    user.streak = 1;
  }
  user.lastStreakDate = today;
}

// ─── Socket.IO Event Handlers ─────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  // ── Auth: Register / Login ──────────────────────────────────────────────────
  socket.on('auth:login', ({ username, nickname, avatarColor }) => {
    if (!username || typeof username !== 'string') {
      socket.emit('auth:error', { message: 'Invalid username.' });
      return;
    }
    username = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (!username || username.length < 2 || username.length > 24) {
      socket.emit('auth:error', { message: 'Username must be 2–24 alphanumeric characters.' });
      return;
    }

    // If username is already connected on another socket, kick old one
    if (userToSocket.has(username)) {
      const oldSocketId = userToSocket.get(username);
      const oldSocket = io.sockets.sockets.get(oldSocketId);
      if (oldSocket && oldSocketId !== socket.id) {
        oldSocket.emit('auth:kicked', { message: 'You logged in from another tab.' });
        oldSocket.disconnect(true);
      }
    }

    // Create or update user
    if (!users.has(username)) {
      users.set(username, {
        username,
        nickname: nickname || username,
        avatarColor: avatarColor || generateAvatarColor(),
        status: 'online',
        lastSeen: new Date(),
        streak: 0,
        lastStreakDate: null,
        pinnedChats: [],
        theme: 'default',
        friends: new Set(),
        friendRequests: new Map()
      });
      friendships.set(username, new Set());
      friendRequests.set(username, new Map());
    } else {
      const u = users.get(username);
      u.status = 'online';
      u.lastSeen = new Date();
      if (nickname) u.nickname = nickname;
      if (avatarColor) u.avatarColor = avatarColor;
    }

    socketToUser.set(socket.id, username);
    userToSocket.set(username, socket.id);

    updateStreak(username);

    const user = users.get(username);
    socket.emit('auth:success', {
      user: serializeUser(username),
      theme: user.theme,
      pinnedChats: user.pinnedChats,
      pendingRequests: getPendingRequests(username)
    });

    broadcastUserList();
    console.log(`[auth] ${username} logged in`);
  });

  // ── Profile Update ──────────────────────────────────────────────────────────
  socket.on('profile:update', ({ nickname, avatarColor, theme }) => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    const user = users.get(username);
    if (nickname) user.nickname = nickname.trim().slice(0, 32);
    if (avatarColor) user.avatarColor = avatarColor;
    if (theme) user.theme = theme;
    socket.emit('profile:updated', serializeUser(username));
    broadcastUserList();
  });

  // ── Get All Users ───────────────────────────────────────────────────────────
  socket.on('users:get', () => {
    const currentUser = socketToUser.get(socket.id);
    const allUsers = [...users.values()].map(u => {
      const serialized = serializeUser(u.username);
      if (currentUser && u.username !== currentUser) {
        serialized.isFriend = areFriends(currentUser, u.username);
      }
      return serialized;
    });
    socket.emit('users:list', allUsers);
  });

  // ── Friend Requests ────────────────────────────────────────────────────────
  socket.on('friend:request', ({ targetUsername }) => {
    const fromUser = socketToUser.get(socket.id);
    if (!fromUser || !targetUsername) return;
    
    targetUsername = targetUsername.trim().toLowerCase();
    
    // Validation
    if (fromUser === targetUsername) {
      socket.emit('friend:error', { message: 'Cannot add yourself.' });
      return;
    }
    if (!users.has(targetUsername)) {
      socket.emit('friend:error', { message: 'User not found.' });
      return;
    }
    if (areFriends(fromUser, targetUsername)) {
      socket.emit('friend:error', { message: 'Already friends.' });
      return;
    }
    
    // Check if request already pending
    const existingReqs = friendRequests.get(targetUsername) || new Map();
    if (existingReqs.has(fromUser)) {
      socket.emit('friend:error', { message: 'Request already sent.' });
      return;
    }
    
    // Send request
    if (!friendRequests.has(targetUsername)) {
      friendRequests.set(targetUsername, new Map());
    }
    friendRequests.get(targetUsername).set(fromUser, { timestamp: new Date() });
    
    // Notify target user
    const targetSocket = userToSocket.get(targetUsername);
    if (targetSocket) {
      const targetIo = io.sockets.sockets.get(targetSocket);
      if (targetIo) {
        targetIo.emit('friend:request-received', {
          from: fromUser,
          fromNickname: users.get(fromUser).nickname,
          fromColor: users.get(fromUser).avatarColor,
          timestamp: new Date()
        });
      }
    }
    
    socket.emit('friend:request-sent', { to: targetUsername });
    console.log(`[friend] ${fromUser} sent request to ${targetUsername}`);
  });

  socket.on('friend:accept', ({ fromUser }) => {
    const toUser = socketToUser.get(socket.id);
    if (!toUser || !fromUser) return;
    
    fromUser = fromUser.trim().toLowerCase();
    
    // Remove from pending
    const reqs = friendRequests.get(toUser);
    if (!reqs || !reqs.has(fromUser)) {
      socket.emit('friend:error', { message: 'Request not found.' });
      return;
    }
    reqs.delete(fromUser);
    
    // Add friendship (bidirectional)
    if (!friendships.has(fromUser)) friendships.set(fromUser, new Set());
    if (!friendships.has(toUser)) friendships.set(toUser, new Set());
    friendships.get(fromUser).add(toUser);
    friendships.get(toUser).add(fromUser);
    
    // Notify both users
    socket.emit('friend:accepted', { user: fromUser });
    const fromSocket = userToSocket.get(fromUser);
    if (fromSocket) {
      const fromIo = io.sockets.sockets.get(fromSocket);
      if (fromIo) {
        fromIo.emit('friend:request-accepted', { user: toUser });
      }
    }
    
    broadcastUserList();
    console.log(`[friend] ${toUser} accepted request from ${fromUser}`);
  });

  socket.on('friend:reject', ({ fromUser }) => {
    const toUser = socketToUser.get(socket.id);
    if (!toUser || !fromUser) return;
    
    fromUser = fromUser.trim().toLowerCase();
    
    // Remove from pending
    const reqs = friendRequests.get(toUser);
    if (reqs) reqs.delete(fromUser);
    
    socket.emit('friend:rejected', { user: fromUser });
    const fromSocket = userToSocket.get(fromUser);
    if (fromSocket) {
      const fromIo = io.sockets.sockets.get(fromSocket);
      if (fromIo) {
        fromIo.emit('friend:request-rejected', { user: toUser });
      }
    }
    
    console.log(`[friend] ${toUser} rejected request from ${fromUser}`);
  });

  socket.on('friend:list', () => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    const friends = friendships.get(username) || new Set();
    const friendList = Array.from(friends).map(f => serializeUser(f));
    socket.emit('friend:list', friendList);
  });

  // ── Get Rooms for User ──────────────────────────────────────────────────────
  socket.on('rooms:get', () => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    const userRooms = [...rooms.values()]
      .filter(r => r.members.has(username))
      .map(r => serializeRoom(r, username));
    socket.emit('rooms:list', userRooms);
  });

  // ── Open / Create DM ───────────────────────────────────────────────────
  socket.on('dm:open', ({ targetUsername }) => {
    const fromUser = socketToUser.get(socket.id);
    if (!fromUser || !targetUsername) return;
    
    targetUsername = targetUsername.trim().toLowerCase();
    
    // Check if friends (unless it's a group chat context)
    if (!areFriends(fromUser, targetUsername)) {
      socket.emit('dm:error', { message: 'You must be friends to message this user.' });
      return;
    }
    if (fromUser === targetUsername) return;

    const roomId = getDMRoomId(fromUser, targetUsername);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        type: 'dm',
        name: null,
        members: new Set([fromUser, targetUsername]),
        messages: [],
        createdAt: new Date(),
        createdBy: fromUser
      });
    }

    const room = rooms.get(roomId);
    // Join both sockets to the room
    socket.join(roomId);
    const targetSocketId = userToSocket.get(targetUsername);
    if (targetSocketId) {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) targetSocket.join(roomId);
    }

    socket.emit('room:opened', {
      room: serializeRoom(room, fromUser),
      messages: room.messages.map(m => ({
        ...m,
        reactions: m.reactions || {},
        replyTo: m.replyTo || null
      }))
    });
  });

  // ── Create Group ────────────────────────────────────────────────────────────
  socket.on('group:create', ({ name, members }) => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    if (!name || !Array.isArray(members)) return;

    const allMembers = new Set([username, ...members]);
    const roomId = generateId();

    rooms.set(roomId, {
      id: roomId,
      type: 'group',
      name: name.trim().slice(0, 40),
      members: allMembers,
      messages: [],
      createdAt: new Date(),
      createdBy: username
    });

    const room = rooms.get(roomId);

    // Join all online members to the room
    for (const member of allMembers) {
      const sid = userToSocket.get(member);
      if (sid) {
        const s = io.sockets.sockets.get(sid);
        if (s) {
          s.join(roomId);
          s.emit('group:joined', { room: serializeRoom(room, member) });
        }
      }
    }

    console.log(`[group] ${username} created group "${name}" with ${allMembers.size} members`);
  });

  // ── Join Room (reconnect) ───────────────────────────────────────────────────
  socket.on('room:join', ({ roomId }) => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    const room = rooms.get(roomId);
    if (!room || !room.members.has(username)) return;
    socket.join(roomId);
    socket.emit('room:opened', {
      room: serializeRoom(room, username),
      messages: room.messages.map(m => ({
        ...m,
        reactions: m.reactions || {},
        replyTo: m.replyTo || null
      }))
    });
  });

  // ── Leave Group ─────────────────────────────────────────────────────────────
  socket.on('group:leave', ({ roomId }) => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    const room = rooms.get(roomId);
    if (!room || room.type !== 'group') return;
    room.members.delete(username);
    socket.leave(roomId);
    socket.emit('group:left', { roomId });
    io.to(roomId).emit('group:memberLeft', {
      roomId,
      username,
      memberCount: room.members.size
    });
    if (room.members.size === 0) rooms.delete(roomId);
  });

  // ── Send Message ────────────────────────────────────────────────────────────
  socket.on('message:send', ({ roomId, content, type, replyTo, disappearAfter }) => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    const room = rooms.get(roomId);
    if (!room || !room.members.has(username)) return;
    if (!content || typeof content !== 'string') return;

    const msgId = generateId();
    const message = {
      id: msgId,
      roomId,
      sender: username,
      content: content.slice(0, 4000),
      type: type || 'text',
      timestamp: new Date(),
      edited: false,
      deleted: false,
      reactions: {},
      replyTo: replyTo || null,
      disappearAfter: disappearAfter || null,
      readBy: [username],
      deliveredTo: [username]
    };

    room.messages.push(message);

    // Mark as delivered to all online members
    for (const member of room.members) {
      if (userToSocket.has(member)) {
        message.deliveredTo.push(member);
      }
    }

    io.to(roomId).emit('message:new', message);

    // Handle disappearing messages
    if (disappearAfter && disappearAfter > 0) {
      setTimeout(() => {
        const idx = room.messages.findIndex(m => m.id === msgId);
        if (idx !== -1) {
          room.messages[idx].deleted = true;
          room.messages[idx].content = '';
        }
        io.to(roomId).emit('message:deleted', { messageId: msgId, roomId });
      }, disappearAfter * 1000);
    }

    updateStreak(username);
    console.log(`[msg] ${username} -> room ${roomId}: ${content.slice(0, 40)}`);
  });

  // ── Edit Message ────────────────────────────────────────────────────────────
  socket.on('message:edit', ({ roomId, messageId, newContent }) => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const msg = room.messages.find(m => m.id === messageId);
    if (!msg || msg.sender !== username || msg.deleted) return;
    msg.content = newContent.slice(0, 4000);
    msg.edited = true;
    io.to(roomId).emit('message:edited', { messageId, newContent: msg.content, roomId });
  });

  // ── Delete Message ──────────────────────────────────────────────────────────
  socket.on('message:delete', ({ roomId, messageId }) => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const msg = room.messages.find(m => m.id === messageId);
    if (!msg || msg.sender !== username) return;
    msg.deleted = true;
    msg.content = '';
    io.to(roomId).emit('message:deleted', { messageId, roomId });
  });

  // ── React to Message ────────────────────────────────────────────────────────
  socket.on('message:react', ({ roomId, messageId, emoji }) => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const msg = room.messages.find(m => m.id === messageId);
    if (!msg) return;
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
    const idx = msg.reactions[emoji].indexOf(username);
    if (idx === -1) {
      msg.reactions[emoji].push(username);
    } else {
      msg.reactions[emoji].splice(idx, 1);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    }
    io.to(roomId).emit('message:reacted', { messageId, reactions: msg.reactions, roomId });
  });

  // ── Mark Messages as Read ───────────────────────────────────────────────────
  socket.on('messages:read', ({ roomId }) => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    const room = rooms.get(roomId);
    if (!room) return;
    let updated = false;
    for (const msg of room.messages) {
      if (!msg.readBy.includes(username)) {
        msg.readBy.push(username);
        updated = true;
      }
    }
    if (updated) {
      io.to(roomId).emit('messages:readUpdate', { roomId, username });
    }
  });

  // ── Typing Indicators ───────────────────────────────────────────────────────
  socket.on('typing:start', ({ roomId }) => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    socket.to(roomId).emit('typing:update', { roomId, username, isTyping: true });
  });

  socket.on('typing:stop', ({ roomId }) => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    socket.to(roomId).emit('typing:update', { roomId, username, isTyping: false });
  });

  // ── User Status ─────────────────────────────────────────────────────────────
  socket.on('status:set', ({ status }) => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    const validStatuses = ['online', 'idle', 'offline'];
    if (!validStatuses.includes(status)) return;
    const user = users.get(username);
    user.status = status;
    user.lastSeen = new Date();
    broadcastUserList();
  });

  // ── Pin / Unpin Chat ────────────────────────────────────────────────────────
  socket.on('chat:pin', ({ roomId }) => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    const user = users.get(username);
    const idx = user.pinnedChats.indexOf(roomId);
    if (idx === -1) {
      user.pinnedChats.push(roomId);
    } else {
      user.pinnedChats.splice(idx, 1);
    }
    socket.emit('chat:pinned', { pinnedChats: user.pinnedChats });
  });

  // ── Clear Chat ──────────────────────────────────────────────────────────────
  socket.on('chat:clear', ({ roomId }) => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    const room = rooms.get(roomId);
    if (!room || !room.members.has(username)) return;
    room.messages = [];
    io.to(roomId).emit('chat:cleared', { roomId });
  });

  // ── Search Messages ─────────────────────────────────────────────────────────
  socket.on('messages:search', ({ roomId, query }) => {
    const username = socketToUser.get(socket.id);
    if (!username) return;
    const room = rooms.get(roomId);
    if (!room || !room.members.has(username)) return;
    const q = query.toLowerCase();
    const results = room.messages.filter(
      m => !m.deleted && m.content.toLowerCase().includes(q)
    );
    socket.emit('messages:searchResults', { results, query });
  });

  // ── Disconnect ──────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const username = socketToUser.get(socket.id);
    if (username) {
      const user = users.get(username);
      if (user) {
        user.status = 'offline';
        user.lastSeen = new Date();
      }
      socketToUser.delete(socket.id);
      userToSocket.delete(username);
      broadcastUserList();
      console.log(`[-] ${username} disconnected`);
    }
  });
});

// ─── REST Endpoints ───────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    users: users.size,
    rooms: rooms.size,
    uptime: process.uptime()
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 SnapChat-style App running at http://localhost:${PORT}\n`);
});
