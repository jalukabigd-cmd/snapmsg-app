/**
 * SnapMsg — Client-Side Application
 * Full-featured real-time messaging app
 * Inspired by Snapchat, iMessage, WhatsApp
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════

const State = {
  socket: null,
  currentUser: null,
  currentRoom: null,
  rooms: new Map(),        // roomId -> room object
  messages: new Map(),     // roomId -> messages[]
  users: new Map(),        // username -> user object
  friends: new Set(),      // Set of friend usernames
  pendingRequests: [],     // Array of pending friend requests
  sentRequests: new Set(), // Set of usernames we sent requests to
  pinnedChats: [],
  typingTimers: new Map(), // roomId -> timeout
  typingUsers: new Map(),  // roomId -> Set<username>
  disappearTimer: 0,       // seconds (0 = off)
  replyingTo: null,        // message object
  contextMenuTarget: null, // { type: 'message'|'chat', data }
  soundEnabled: true,
  notifEnabled: false,
  selectedAvatarColor: null,
  selectedMembers: [],     // for group creation
  searchQuery: '',
  editingMessageId: null,
  reconnectAttempts: 0,
  isReconnecting: false,
};

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#82E0AA', '#F8C471',
  '#F1948A', '#73C6B6', '#7FB3D3', '#A9CCE3'
];

const THEMES = ['default', 'midnight', 'ocean', 'forest', 'sunset', 'candy'];

// ═══════════════════════════════════════════════════════════════════
// DOM REFERENCES
// ═══════════════════════════════════════════════════════════════════

const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const DOM = {
  splashScreen:       $('splash-screen'),
  authScreen:         $('auth-screen'),
  app:                $('app'),
  authForm:           $('auth-form'),
  usernameInput:      $('username-input'),
  nicknameInput:      $('nickname-input'),
  authError:          $('auth-error'),
  colorSwatches:      $('color-swatches'),

  sidebar:            $('sidebar'),
  chatList:           $('chat-list'),
  requestsList:       $('requests-list'),
  peopleList:         $('people-list'),
  peopleSearchInput:  $('people-search-input'),
  chatsEmpty:         $('chats-empty'),
  sidebarSearchInput: $('sidebar-search-input'),
  clearSearchBtn:     $('clear-search-btn'),
  chatsBadge:         $('chats-badge'),
  requestsBadge:      $('requests-badge'),

  myAvatar:           $('my-avatar'),
  myDisplayName:      $('my-display-name'),
  myUsername:         $('my-username'),
  myStreak:           $('my-streak'),
  myStatusDot:        $('my-status-dot'),

  welcomeScreen:      $('welcome-screen'),
  chatWindow:         $('chat-window'),
  chatArea:           $('chat-area'),

  chatTopbarName:     $('chat-topbar-name'),
  chatTopbarStatus:   $('chat-topbar-status'),
  chatAvatar:         $('chat-avatar'),

  messagesList:       $('messages-list'),
  messagesContainer:  $('messages-container'),
  messageInput:       $('message-input'),

  typingIndicator:    $('typing-indicator'),
  typingText:         $('typing-text'),

  replyPreview:       $('reply-preview'),
  replyPreviewSender: $('reply-preview-sender'),
  replyPreviewText:   $('reply-preview-text'),

  emojiPickerContainer: $('emoji-picker-container'),
  emojiPicker:          $('emoji-picker'),

  chatSearchBar:      $('chat-search-bar'),
  chatSearchInput:    $('chat-search-input'),
  searchCount:        $('search-count'),

  newGroupModal:      $('new-group-modal'),
  groupNameInput:     $('group-name-input'),
  memberSearchInput:  $('member-search-input'),
  memberList:         $('member-list'),
  selectedMembers:    $('selected-members'),

  settingsModal:      $('settings-modal'),
  settingsNickname:   $('settings-nickname'),
  settingsColorSwatches: $('settings-color-swatches'),
  themeGrid:          $('theme-grid'),
  soundToggle:        $('sound-toggle'),
  notifToggle:        $('notif-toggle'),

  statusDropdown:     $('status-dropdown'),
  chatContextMenu:    $('chat-context-menu'),
  messageContextMenu: $('message-context-menu'),
  disappearDropdown:  $('disappear-dropdown'),
  reactionPicker:     $('reaction-picker'),

  toastContainer:     $('toast-container'),
  reconnectBanner:    $('reconnect-banner'),
  screenshotWarning:  $('screenshot-warning'),
  notificationSound:  $('notification-sound'),
};

// ═══════════════════════════════════════════════════════════════════
// SPLASH SCREEN
// ═══════════════════════════════════════════════════════════════════

function initSplash() {
  // Create floating particles
  const container = $('splash-particles');
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'splash-particle';
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${2 + Math.random() * 4}px;
      height: ${2 + Math.random() * 4}px;
      animation-duration: ${3 + Math.random() * 4}s;
      animation-delay: ${Math.random() * 3}s;
      opacity: ${0.2 + Math.random() * 0.6};
    `;
    container.appendChild(p);
  }

  // Auto-dismiss after 2.2s
  setTimeout(() => {
    DOM.splashScreen.classList.add('exit');
    setTimeout(() => {
      DOM.splashScreen.classList.add('hidden');
      checkAutoLogin();
    }, 600);
  }, 2200);
}

// ═══════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════

function checkAutoLogin() {
  const saved = localStorage.getItem('snapmsg_user');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.username) {
        showApp();
        initSocket(data);
        return;
      }
    } catch (e) {}
  }
  showAuth();
}

function showAuth() {
  DOM.authScreen.classList.remove('hidden');
  DOM.app.classList.add('hidden');
  buildColorSwatches(DOM.colorSwatches, 'auth');
}

function showApp() {
  DOM.authScreen.classList.add('hidden');
  DOM.app.classList.remove('hidden');
}

function buildColorSwatches(container, prefix) {
  container.innerHTML = '';
  AVATAR_COLORS.forEach((color, i) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.background = color;
    swatch.dataset.color = color;
    if (i === 0 && prefix === 'auth') {
      swatch.classList.add('selected');
      State.selectedAvatarColor = color;
    }
    swatch.addEventListener('click', () => {
      container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      State.selectedAvatarColor = color;
    });
    container.appendChild(swatch);
  });
}

// Auth form submit
DOM.authForm.addEventListener('submit', e => {
  e.preventDefault();
  const username = DOM.usernameInput.value.trim();
  const nickname = DOM.nicknameInput.value.trim();
  if (!username) {
    showAuthError('Please enter a username.');
    return;
  }
  const clean = username.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  if (clean.length < 2) {
    showAuthError('Username must be at least 2 characters.');
    return;
  }
  showApp();
  initSocket({ username: clean, nickname: nickname || clean, avatarColor: State.selectedAvatarColor });
});

function showAuthError(msg) {
  DOM.authError.textContent = msg;
  DOM.authError.classList.remove('hidden');
  setTimeout(() => DOM.authError.classList.add('hidden'), 4000);
}

// ═══════════════════════════════════════════════════════════════════
// SOCKET.IO CONNECTION
// ═══════════════════════════════════════════════════════════════════

function initSocket(userData) {
  if (State.socket) {
    State.socket.disconnect();
  }

  State.socket = io({
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  const socket = State.socket;

  // ── Connection Events ──────────────────────────────────────────
  socket.on('connect', () => {
    console.log('[socket] Connected:', socket.id);
    State.isReconnecting = false;
    State.reconnectAttempts = 0;
    DOM.reconnectBanner.classList.add('hidden');

    // Login
    socket.emit('auth:login', {
      username: userData.username,
      nickname: userData.nickname,
      avatarColor: userData.avatarColor
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('[socket] Disconnected:', reason);
    if (reason !== 'io client disconnect') {
      showReconnecting();
    }
  });

  socket.on('reconnect_attempt', (n) => {
    State.reconnectAttempts = n;
    State.isReconnecting = true;
    DOM.reconnectBanner.classList.remove('hidden');
  });

  socket.on('reconnect', () => {
    DOM.reconnectBanner.classList.add('hidden');
    showToast('✅', 'Reconnected', 'Back online!', 'success');
    // Re-join current room if any
    if (State.currentRoom) {
      socket.emit('room:join', { roomId: State.currentRoom.id });
    }
  });

  // ── Auth Events ────────────────────────────────────────────────
  socket.on('auth:success', ({ user, theme, pinnedChats, pendingRequests }) => {
    State.currentUser = user;
    State.pinnedChats = pinnedChats || [];
    State.pendingRequests = pendingRequests || [];

    // Persist session
    localStorage.setItem('snapmsg_user', JSON.stringify({
      username: user.username,
      nickname: user.nickname,
      avatarColor: user.avatarColor
    }));

    // Apply saved theme
    if (theme) applyTheme(theme);

    // Update UI
    updateMyProfile();

    // Load rooms, users, and friends
    socket.emit('rooms:get');
    socket.emit('users:get');
    socket.emit('friend:list');
    updateRequestsBadge();

    showToast('👋', 'Welcome back!', `Logged in as @${user.username}`, 'success');
  });

  socket.on('auth:error', ({ message }) => {
    showAuth();
    showAuthError(message);
  });

  socket.on('auth:kicked', ({ message }) => {
    showToast('⚠️', 'Session ended', message, 'error');
    setTimeout(() => logout(), 2000);
  });

  // ── User Events ────────────────────────────────────────────────
  socket.on('users:list', (users) => {
    State.users.clear();
    users.forEach(u => State.users.set(u.username, u));
    renderPeopleList();
    updateChatStatuses();
  });

  socket.on('profile:updated', (user) => {
    State.currentUser = user;
    updateMyProfile();
  });

  // ── Room Events ────────────────────────────────────────────────
  socket.on('rooms:list', (rooms) => {
    rooms.forEach(r => State.rooms.set(r.id, r));
    renderChatList();
  });

  socket.on('room:opened', ({ room, messages }) => {
    State.rooms.set(room.id, room);
    State.messages.set(room.id, messages);
    openChatUI(room, messages);
  });

  socket.on('group:joined', ({ room }) => {
    State.rooms.set(room.id, room);
    renderChatList();
    showToast('👥', 'Added to group', `You joined "${room.name}"`, 'info');
  });

  socket.on('group:left', ({ roomId }) => {
    State.rooms.delete(roomId);
    State.messages.delete(roomId);
    if (State.currentRoom?.id === roomId) {
      closeChat();
    }
    renderChatList();
  });

  socket.on('group:memberLeft', ({ roomId, username }) => {
    const room = State.rooms.get(roomId);
    if (room) {
      room.members = room.members.filter(m => m !== username);
    }
    if (State.currentRoom?.id === roomId) {
      updateChatTopbar();
    }
  });

  // ── Message Events ─────────────────────────────────────────────
  socket.on('message:new', (msg) => {
    const msgs = State.messages.get(msg.roomId) || [];
    msgs.push(msg);
    State.messages.set(msg.roomId, msgs);

    // Update room last message
    const room = State.rooms.get(msg.roomId);
    if (room) {
      room.lastMessage = {
        content: msg.content,
        sender: msg.sender,
        timestamp: msg.timestamp,
        type: msg.type
      };
    }

    if (State.currentRoom?.id === msg.roomId) {
      appendMessage(msg);
      scrollToBottom();
      // Mark as read
      socket.emit('messages:read', { roomId: msg.roomId });
    } else {
      // Increment unread
      if (room) room.unreadCount = (room.unreadCount || 0) + 1;
      // Notification
      if (msg.sender !== State.currentUser?.username) {
        notifyNewMessage(msg);
      }
    }

    renderChatList();
  });

  socket.on('message:edited', ({ messageId, newContent, roomId }) => {
    const msgs = State.messages.get(roomId) || [];
    const msg = msgs.find(m => m.id === messageId);
    if (msg) {
      msg.content = newContent;
      msg.edited = true;
    }
    if (State.currentRoom?.id === roomId) {
      const el = document.querySelector(`[data-msg-id="${messageId}"]`);
      if (el) {
        const bubble = el.querySelector('.message-bubble');
        if (bubble && !bubble.classList.contains('deleted')) {
          const textEl = bubble.querySelector('.msg-text');
          if (textEl) textEl.textContent = newContent;
          const editedEl = el.querySelector('.message-edited');
          if (editedEl) editedEl.classList.remove('hidden');
          else {
            const footer = el.querySelector('.message-footer');
            if (footer) {
              const e = document.createElement('span');
              e.className = 'message-edited';
              e.textContent = '(edited)';
              footer.appendChild(e);
            }
          }
        }
      }
    }
  });

  socket.on('message:deleted', ({ messageId, roomId }) => {
    const msgs = State.messages.get(roomId) || [];
    const msg = msgs.find(m => m.id === messageId);
    if (msg) { msg.deleted = true; msg.content = ''; }
    if (State.currentRoom?.id === roomId) {
      const el = document.querySelector(`[data-msg-id="${messageId}"]`);
      if (el) {
        const bubble = el.querySelector('.message-bubble');
        if (bubble) {
          bubble.classList.add('deleted');
          const textEl = bubble.querySelector('.msg-text');
          if (textEl) textEl.textContent = '🚫 Message deleted';
        }
      }
    }
    renderChatList();
  });

  socket.on('message:reacted', ({ messageId, reactions, roomId }) => {
    const msgs = State.messages.get(roomId) || [];
    const msg = msgs.find(m => m.id === messageId);
    if (msg) msg.reactions = reactions;
    if (State.currentRoom?.id === roomId) {
      const el = document.querySelector(`[data-msg-id="${messageId}"]`);
      if (el) updateReactionsUI(el, reactions);
    }
  });

  socket.on('messages:readUpdate', ({ roomId, username }) => {
    if (State.currentRoom?.id === roomId) {
      updateReadReceipts(username);
    }
  });

  socket.on('chat:cleared', ({ roomId }) => {
    State.messages.set(roomId, []);
    if (State.currentRoom?.id === roomId) {
      DOM.messagesList.innerHTML = '';
    }
    renderChatList();
    showToast('🗑️', 'Chat cleared', 'All messages removed', 'info');
  });

  socket.on('messages:searchResults', ({ results, query }) => {
    renderSearchResults(results, query);
  });

  // ── Typing Events ──────────────────────────────────────────────
  socket.on('typing:update', ({ roomId, username, isTyping }) => {
    if (State.currentRoom?.id !== roomId) return;
    if (!State.typingUsers.has(roomId)) State.typingUsers.set(roomId, new Set());
    const set = State.typingUsers.get(roomId);
    if (isTyping) set.add(username); else set.delete(username);
    updateTypingIndicator(roomId);
  });

  // ── Chat Events ────────────────────────────────────────────────
  socket.on('chat:pinned', ({ pinnedChats }) => {
    State.pinnedChats = pinnedChats;
    renderChatList();
  });

  // ── Friend Request Events ──────────────────────────────────────
  socket.on('friend:request-received', ({ from, fromNickname, fromColor, timestamp }) => {
    State.pendingRequests.push({ from, fromNickname, fromColor, timestamp });
    updateRequestsBadge();
    renderRequestsList();
    showToast('👋', 'Friend request', `${fromNickname} wants to chat`, 'info');
  });

  socket.on('friend:request-sent', ({ to }) => {
    State.sentRequests.add(to);
    renderPeopleList();
    showToast('✓', 'Request sent', `Friend request sent to ${to}`, 'success');
  });

  socket.on('friend:request-accepted', ({ user }) => {
    State.friends.add(user);
    State.sentRequests.delete(user);
    renderPeopleList();
    showToast('✓', 'Friends!', `You are now friends with ${user}`, 'success');
  });

  socket.on('friend:request-rejected', ({ user }) => {
    State.sentRequests.delete(user);
    renderPeopleList();
    showToast('✕', 'Request rejected', `${user} rejected your request`, 'info');
  });

  socket.on('friend:accepted', ({ user }) => {
    State.friends.add(user);
    State.pendingRequests = State.pendingRequests.filter(r => r.from !== user);
    updateRequestsBadge();
    renderRequestsList();
    renderPeopleList();
    showToast('✓', 'Friends!', `You are now friends with ${user}`, 'success');
  });

  socket.on('friend:rejected', ({ user }) => {
    State.pendingRequests = State.pendingRequests.filter(r => r.from !== user);
    updateRequestsBadge();
    renderRequestsList();
    showToast('✕', 'Request rejected', 'You rejected the friend request', 'info');
  });

  socket.on('friend:list', (friends) => {
    State.friends.clear();
    friends.forEach(f => State.friends.add(f.username));
    renderPeopleList();
  });

  socket.on('friend:error', ({ message }) => {
    showToast('⚠️', 'Error', message, 'error');
  });
}

// ═══════════════════════════════════════════════════════════════════
// PROFILE & MY USER
// ═══════════════════════════════════════════════════════════════════

function updateMyProfile() {
  const u = State.currentUser;
  if (!u) return;
  DOM.myAvatar.textContent = (u.nickname || u.username)[0].toUpperCase();
  DOM.myAvatar.style.background = u.avatarColor || '#6C63FF';
  DOM.myDisplayName.textContent = u.nickname || u.username;
  DOM.myUsername.textContent = '@' + u.username;
  DOM.myStreak.textContent = `🔥 ${u.streak || 0}`;
  DOM.myStreak.classList.add('streak-updated');
  setTimeout(() => DOM.myStreak.classList.remove('streak-updated'), 500);
}

// ═══════════════════════════════════════════════════════════════════
// CHAT LIST (SIDEBAR)
// ═══════════════════════════════════════════════════════════════════

function renderChatList() {
  const query = DOM.sidebarSearchInput.value.toLowerCase();
  let roomList = [...State.rooms.values()];

  // Filter by search
  if (query) {
    roomList = roomList.filter(r => {
      const name = r.type === 'dm'
        ? r.members.find(m => m !== State.currentUser?.username)
        : r.name;
      return name?.toLowerCase().includes(query);
    });
  }

  // Sort: pinned first, then by last message time
  roomList.sort((a, b) => {
    const aPinned = State.pinnedChats.includes(a.id);
    const bPinned = State.pinnedChats.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    const aTime = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp) : new Date(a.createdAt);
    const bTime = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp) : new Date(b.createdAt);
    return bTime - aTime;
  });

  DOM.chatList.innerHTML = '';

  if (roomList.length === 0) {
    DOM.chatsEmpty.classList.remove('hidden');
    DOM.chatList.appendChild(DOM.chatsEmpty);
  } else {
    DOM.chatsEmpty.classList.add('hidden');
    roomList.forEach((room, i) => {
      const item = buildChatItem(room, i);
      DOM.chatList.appendChild(item);
    });
  }

  // Update total unread badge
  const totalUnread = [...State.rooms.values()].reduce((sum, r) => sum + (r.unreadCount || 0), 0);
  if (totalUnread > 0) {
    DOM.chatsBadge.textContent = totalUnread > 99 ? '99+' : totalUnread;
    DOM.chatsBadge.classList.remove('hidden');
  } else {
    DOM.chatsBadge.classList.add('hidden');
  }
}

function buildChatItem(room, index) {
  const isActive = State.currentRoom?.id === room.id;
  const isPinned = State.pinnedChats.includes(room.id);
  const otherUser = room.type === 'dm'
    ? State.users.get(room.members?.find(m => m !== State.currentUser?.username))
    : null;

  const displayName = room.type === 'dm'
    ? (otherUser?.nickname || room.name || room.members?.find(m => m !== State.currentUser?.username) || 'Unknown')
    : room.name;

  const avatarLetter = displayName?.[0]?.toUpperCase() || '?';
  const avatarColor = otherUser?.avatarColor || (room.type === 'group' ? '#6C63FF' : '#888');
  const status = otherUser?.status || 'offline';

  const lastMsg = room.lastMessage;
  let preview = '';
  if (lastMsg) {
    if (lastMsg.type === 'image') preview = '📷 Photo';
    else preview = lastMsg.content?.slice(0, 40) || '';
    if (lastMsg.sender && room.type === 'group') {
      preview = `${lastMsg.sender}: ${preview}`;
    }
  }

  const timeStr = lastMsg ? formatTime(lastMsg.timestamp) : '';
  const unread = room.unreadCount || 0;

  const item = document.createElement('div');
  item.className = `chat-item${isActive ? ' active' : ''}`;
  item.dataset.roomId = room.id;
  item.style.animationDelay = `${index * 0.04}s`;

  item.innerHTML = `
    <div class="avatar" style="background:${avatarColor}">
      ${room.type === 'group' ? '👥' : avatarLetter}
      <span class="avatar-status ${status}"></span>
    </div>
    <div class="chat-item-content">
      <div class="chat-item-header">
        <span class="chat-item-name">
          ${escapeHtml(displayName)}
          ${room.type === 'group' ? '<span class="group-badge">Group</span>' : ''}
        </span>
        <span class="chat-item-time">${timeStr}</span>
      </div>
      <div class="chat-item-preview">${escapeHtml(preview)}</div>
    </div>
    <div class="chat-item-meta">
      ${unread > 0 ? `<span class="unread-badge">${unread > 99 ? '99+' : unread}</span>` : ''}
      ${isPinned ? '<span class="pin-icon">📌</span>' : ''}
    </div>
  `;

  item.addEventListener('click', () => openChat(room.id));
  item.addEventListener('contextmenu', e => {
    e.preventDefault();
    showChatContextMenu(e, room);
  });

  return item;
}

// ═══════════════════════════════════════════════════════════════════
// PEOPLE LIST
// ═══════════════════════════════════════════════════════════════════

function renderPeopleList() {
  DOM.peopleList.innerHTML = '';
  const users = [...State.users.values()].filter(u => u.username !== State.currentUser?.username);

  if (users.length === 0) {
    DOM.peopleList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <p>No one online yet</p>
        <span>Share the app link with friends!</span>
      </div>
    `;
    return;
  }

  // Sort: online first
  users.sort((a, b) => {
    const order = { online: 0, idle: 1, offline: 2 };
    return (order[a.status] || 2) - (order[b.status] || 2);
  });

  users.forEach((user, i) => {
    const item = document.createElement('div');
    item.className = 'people-item';
    item.style.animationDelay = `${i * 0.04}s`;
    
    const isFriend = State.friends.has(user.username);
    const hasSentRequest = State.sentRequests.has(user.username);
    
    let actionBtn = '';
    if (isFriend) {
      actionBtn = `<button class="btn-small" style="padding:6px 14px;font-size:12px;border-radius:8px;background:var(--bg-surface);color:var(--text-secondary);cursor:pointer">✓ Friends</button>`;
    } else if (hasSentRequest) {
      actionBtn = `<button class="btn-small" style="padding:6px 14px;font-size:12px;border-radius:8px;background:var(--bg-surface);color:var(--text-secondary);cursor:default">⏳ Pending</button>`;
    } else {
      actionBtn = `<button class="btn-small btn-add" style="padding:6px 14px;font-size:12px;border-radius:8px;background:var(--accent);color:white;cursor:pointer">+ Add</button>`;
    }
    
    item.innerHTML = `
      <div class="avatar" style="background:${user.avatarColor || '#6C63FF'}">
        ${(user.nickname || user.username)[0].toUpperCase()}
        <span class="avatar-status ${user.status}"></span>
      </div>
      <div class="people-item-info">
        <div class="people-item-name">${escapeHtml(user.nickname || user.username)}</div>
        <div class="people-item-status">
          <span class="status-dot ${user.status}"></span>
          ${user.status} · @${escapeHtml(user.username)}
        </div>
      </div>
      <div class="people-item-actions">
        ${actionBtn}
      </div>
    `;
    
    const btn = item.querySelector('button');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isFriend) {
        startDM(user.username);
      } else if (!hasSentRequest) {
        sendFriendRequest(user.username);
      }
    });
    
    DOM.peopleList.appendChild(item);
  });
}

// ═══════════════════════════════════════════════════════════════════
// OPEN / CLOSE CHAT
// ═══════════════════════════════════════════════════════════════════

function openChat(roomId) {
  const room = State.rooms.get(roomId);
  if (!room) return;
  State.socket.emit('room:join', { roomId });
  // Mark as read
  State.socket.emit('messages:read', { roomId });
  if (room.unreadCount) room.unreadCount = 0;
  renderChatList();
}

function sendFriendRequest(targetUsername) {
  State.socket.emit('friend:request', { targetUsername });
}

function acceptFriendRequest(fromUser) {
  State.socket.emit('friend:accept', { fromUser });
}

function rejectFriendRequest(fromUser) {
  State.socket.emit('friend:reject', { fromUser });
}

function updateRequestsBadge() {
  const count = State.pendingRequests.length;
  DOM.requestsBadge.textContent = count;
  DOM.requestsBadge.classList.toggle('hidden', count === 0);
}

function renderRequestsList() {
  DOM.requestsList.innerHTML = '';
  
  if (State.pendingRequests.length === 0) {
    DOM.requestsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📬</div>
        <p>No requests</p>
        <span>Friend requests will appear here</span>
      </div>
    `;
    return;
  }
  
  State.pendingRequests.forEach((req, i) => {
    const item = document.createElement('div');
    item.className = 'request-item';
    item.style.animationDelay = `${i * 0.04}s`;
    
    const timestamp = new Date(req.timestamp);
    const timeStr = getRelativeTime(timestamp);
    
    item.innerHTML = `
      <div class="avatar" style="background:${req.fromColor || '#6C63FF'}">
        ${(req.fromNickname || req.from)[0].toUpperCase()}
      </div>
      <div class="request-item-info">
        <div class="request-item-name">${escapeHtml(req.fromNickname || req.from)}</div>
        <div class="request-item-time">@${escapeHtml(req.from)} · ${timeStr}</div>
      </div>
      <div class="request-item-actions">
        <button class="btn-small btn-accept">✓ Accept</button>
        <button class="btn-small btn-reject">✕ Reject</button>
      </div>
    `;
    
    const acceptBtn = item.querySelector('.btn-accept');
    const rejectBtn = item.querySelector('.btn-reject');
    
    acceptBtn.addEventListener('click', () => acceptFriendRequest(req.from));
    rejectBtn.addEventListener('click', () => rejectFriendRequest(req.from));
    
    DOM.requestsList.appendChild(item);
  });
}

function startDM(targetUsername) {
  State.socket.emit('dm:open', { targetUsername });
  // Switch to chats tab on mobile
  switchTab('chats');
}

function openChatUI(room, messages) {
  State.currentRoom = room;
  State.replyingTo = null;
  State.disappearTimer = 0;

  // Update active state in sidebar
  $$('.chat-item').forEach(el => {
    el.classList.toggle('active', el.dataset.roomId === room.id);
  });

  // Show chat window
  DOM.welcomeScreen.classList.add('hidden');
  DOM.chatWindow.classList.remove('hidden');

  // Mobile: show chat area
  DOM.chatArea.classList.add('visible-mobile');
  DOM.sidebar.classList.add('hidden-mobile');

  // Update topbar
  updateChatTopbar();

  // Render messages
  DOM.messagesList.innerHTML = '';
  messages.forEach(msg => appendMessage(msg, false));
  scrollToBottom(false);

  // Focus input
  DOM.messageInput.focus();

  // Hide reply preview
  DOM.replyPreview.classList.add('hidden');
  DOM.emojiPickerContainer.classList.add('hidden');
  DOM.chatSearchBar.classList.add('hidden');
}

function updateChatTopbar() {
  const room = State.currentRoom;
  if (!room) return;

  if (room.type === 'dm') {
    const otherUsername = room.members?.find(m => m !== State.currentUser?.username);
    const otherUser = State.users.get(otherUsername);
    const displayName = otherUser?.nickname || otherUsername || 'Unknown';
    const status = otherUser?.status || 'offline';
    const color = otherUser?.avatarColor || '#6C63FF';

    DOM.chatTopbarName.textContent = displayName;
    DOM.chatTopbarStatus.textContent = status === 'online' ? '● Online' : status === 'idle' ? '● Idle' : '● Offline';
    DOM.chatTopbarStatus.style.color = status === 'online' ? 'var(--status-online)' : status === 'idle' ? 'var(--status-idle)' : 'var(--status-offline)';
    DOM.chatAvatar.textContent = displayName[0].toUpperCase();
    DOM.chatAvatar.style.background = color;
  } else {
    DOM.chatTopbarName.textContent = room.name;
    DOM.chatTopbarStatus.textContent = `${room.members?.length || 0} members`;
    DOM.chatTopbarStatus.style.color = 'var(--text-muted)';
    DOM.chatAvatar.textContent = '👥';
    DOM.chatAvatar.style.background = '#6C63FF';
  }
}

function updateChatStatuses() {
  if (!State.currentRoom) return;
  updateChatTopbar();
  // Update avatars in sidebar
  $$('.chat-item').forEach(el => {
    const roomId = el.dataset.roomId;
    const room = State.rooms.get(roomId);
    if (!room || room.type !== 'dm') return;
    const otherUsername = room.members?.find(m => m !== State.currentUser?.username);
    const user = State.users.get(otherUsername);
    if (!user) return;
    const statusEl = el.querySelector('.avatar-status');
    if (statusEl) {
      statusEl.className = `avatar-status ${user.status}`;
    }
  });
}

function closeChat() {
  State.currentRoom = null;
  DOM.chatWindow.classList.add('hidden');
  DOM.welcomeScreen.classList.remove('hidden');
  DOM.chatArea.classList.remove('visible-mobile');
  DOM.sidebar.classList.remove('hidden-mobile');
  $$('.chat-item').forEach(el => el.classList.remove('active'));
}

// ═══════════════════════════════════════════════════════════════════
// MESSAGE RENDERING
// ═══════════════════════════════════════════════════════════════════

function appendMessage(msg, animate = true) {
  const isSent = msg.sender === State.currentUser?.username;

  // Date divider
  const msgs = State.messages.get(msg.roomId) || [];
  const idx = msgs.findIndex(m => m.id === msg.id);
  if (idx === 0 || (idx > 0 && !sameDay(msgs[idx - 1].timestamp, msg.timestamp))) {
    const divider = document.createElement('div');
    divider.className = 'date-divider';
    divider.textContent = formatDate(msg.timestamp);
    DOM.messagesList.appendChild(divider);
  }

  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${isSent ? 'sent' : 'received'}`;
  wrapper.dataset.msgId = msg.id;
  if (!animate) wrapper.style.animation = 'none';

  // Sender name (group chats, received only)
  if (!isSent && State.currentRoom?.type === 'group') {
    const senderUser = State.users.get(msg.sender);
    const senderName = senderUser?.nickname || msg.sender;
    const nameEl = document.createElement('div');
    nameEl.className = 'message-sender-name';
    nameEl.textContent = senderName;
    nameEl.style.color = senderUser?.avatarColor || 'var(--text-muted)';
    wrapper.appendChild(nameEl);
  }

  // Reply preview
  if (msg.replyTo) {
    const replyEl = document.createElement('div');
    replyEl.className = 'message-reply-preview';
    replyEl.innerHTML = `
      <div class="reply-sender">${escapeHtml(msg.replyTo.sender)}</div>
      <div class="reply-content">${escapeHtml(msg.replyTo.content?.slice(0, 60) || '')}</div>
    `;
    wrapper.appendChild(replyEl);
  }

  // Bubble
  const bubble = document.createElement('div');
  bubble.className = `message-bubble${msg.deleted ? ' deleted' : ''}${msg.replyTo ? ' has-reply' : ''}`;

  if (msg.deleted) {
    bubble.innerHTML = `<span class="msg-text">🚫 Message deleted</span>`;
  } else if (msg.type === 'image') {
    const img = document.createElement('img');
    img.className = 'message-image';
    img.src = msg.content;
    img.alt = 'Image';
    img.loading = 'lazy';
    img.addEventListener('click', () => openLightbox(msg.content));
    bubble.appendChild(img);
  } else {
    bubble.innerHTML = `<span class="msg-text">${escapeHtml(msg.content)}</span>`;
  }

  // Long press / right click for context menu
  bubble.addEventListener('contextmenu', e => {
    e.preventDefault();
    showMessageContextMenu(e, msg);
  });

  // Double tap on mobile
  let tapTimer = null;
  bubble.addEventListener('touchend', e => {
    if (tapTimer) {
      clearTimeout(tapTimer);
      tapTimer = null;
      showMessageContextMenu(e.changedTouches[0], msg);
    } else {
      tapTimer = setTimeout(() => { tapTimer = null; }, 300);
    }
  });

  wrapper.appendChild(bubble);

  // Footer (time, status, edited)
  const footer = document.createElement('div');
  footer.className = 'message-footer';
  footer.innerHTML = `
    <span class="message-time">${formatTime(msg.timestamp)}</span>
    ${msg.edited ? '<span class="message-edited">(edited)</span>' : ''}
    ${isSent ? `<span class="message-status" data-msg-id="${msg.id}">${getReadStatus(msg)}</span>` : ''}
  `;
  wrapper.appendChild(footer);

  // Reactions
  const reactionsEl = document.createElement('div');
  reactionsEl.className = 'message-reactions';
  reactionsEl.dataset.msgId = msg.id;
  updateReactionsUI(wrapper, msg.reactions || {});
  wrapper.appendChild(reactionsEl);

  // Disappear timer display
  if (msg.disappearAfter && !msg.deleted) {
    const timerEl = document.createElement('div');
    timerEl.className = 'disappear-timer';
    timerEl.textContent = `⏱ Disappears in ${msg.disappearAfter}s`;
    wrapper.appendChild(timerEl);
  }

  DOM.messagesList.appendChild(wrapper);
}

function getReadStatus(msg) {
  if (!msg.readBy || msg.readBy.length <= 1) return '✓ Sent';
  const room = State.rooms.get(msg.roomId);
  if (!room) return '✓✓ Delivered';
  const allMembers = room.members || [];
  const allRead = allMembers.every(m => m === msg.sender || msg.readBy.includes(m));
  if (allRead) return '<span class="seen">✓✓ Seen</span>';
  return '✓✓ Delivered';
}

function updateReactionsUI(wrapper, reactions) {
  let reactionsEl = wrapper.querySelector('.message-reactions');
  if (!reactionsEl) return;
  reactionsEl.innerHTML = '';
  Object.entries(reactions).forEach(([emoji, users]) => {
    if (users.length === 0) return;
    const chip = document.createElement('div');
    chip.className = `reaction-chip${users.includes(State.currentUser?.username) ? ' mine' : ''}`;
    chip.innerHTML = `${emoji} <span>${users.length}</span>`;
    chip.title = users.join(', ');
    chip.addEventListener('click', () => {
      const msgId = wrapper.dataset.msgId;
      State.socket.emit('message:react', {
        roomId: State.currentRoom.id,
        messageId: msgId,
        emoji
      });
    });
    reactionsEl.appendChild(chip);
  });
}

function updateReadReceipts(username) {
  $$('.message-status').forEach(el => {
    const msgId = el.dataset.msgId;
    const msgs = State.messages.get(State.currentRoom?.id) || [];
    const msg = msgs.find(m => m.id === msgId);
    if (msg) el.innerHTML = getReadStatus(msg);
  });
}

function scrollToBottom(smooth = true) {
  const container = DOM.messagesContainer;
  if (smooth) {
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  } else {
    container.scrollTop = container.scrollHeight;
  }
}

// ═══════════════════════════════════════════════════════════════════
// SEND MESSAGE
// ═══════════════════════════════════════════════════════════════════

function sendMessage() {
  if (!State.currentRoom || !State.socket) return;
  const content = DOM.messageInput.value.trim();
  if (!content) return;

  State.socket.emit('message:send', {
    roomId: State.currentRoom.id,
    content,
    type: 'text',
    replyTo: State.replyingTo ? {
      id: State.replyingTo.id,
      sender: State.replyingTo.sender,
      content: State.replyingTo.content
    } : null,
    disappearAfter: State.disappearTimer || null
  });

  DOM.messageInput.value = '';
  autoResizeTextarea();
  clearReply();
  stopTyping();
}

function sendImage(dataUrl) {
  if (!State.currentRoom || !State.socket) return;
  State.socket.emit('message:send', {
    roomId: State.currentRoom.id,
    content: dataUrl,
    type: 'image',
    replyTo: null,
    disappearAfter: State.disappearTimer || null
  });
}

// ═══════════════════════════════════════════════════════════════════
// TYPING INDICATOR
// ═══════════════════════════════════════════════════════════════════

let typingTimeout = null;

function startTyping() {
  if (!State.currentRoom) return;
  State.socket.emit('typing:start', { roomId: State.currentRoom.id });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(stopTyping, 3000);
}

function stopTyping() {
  if (!State.currentRoom) return;
  State.socket.emit('typing:stop', { roomId: State.currentRoom.id });
  clearTimeout(typingTimeout);
}

function updateTypingIndicator(roomId) {
  if (State.currentRoom?.id !== roomId) return;
  const set = State.typingUsers.get(roomId) || new Set();
  const others = [...set].filter(u => u !== State.currentUser?.username);
  if (others.length === 0) {
    DOM.typingIndicator.classList.add('hidden');
  } else {
    DOM.typingIndicator.classList.remove('hidden');
    const names = others.map(u => {
      const user = State.users.get(u);
      return user?.nickname || u;
    });
    DOM.typingText.textContent = names.length === 1
      ? `${names[0]} is typing...`
      : `${names.join(', ')} are typing...`;
  }
}

// ═══════════════════════════════════════════════════════════════════
// REPLY SYSTEM
// ═══════════════════════════════════════════════════════════════════

function setReply(msg) {
  State.replyingTo = msg;
  DOM.replyPreviewSender.textContent = msg.sender === State.currentUser?.username ? 'You' : msg.sender;
  DOM.replyPreviewText.textContent = msg.type === 'image' ? '📷 Photo' : msg.content?.slice(0, 80);
  DOM.replyPreview.classList.remove('hidden');
  DOM.messageInput.focus();
}

function clearReply() {
  State.replyingTo = null;
  DOM.replyPreview.classList.add('hidden');
}

// ═══════════════════════════════════════════════════════════════════
// CONTEXT MENUS
// ═══════════════════════════════════════════════════════════════════

function showMessageContextMenu(e, msg) {
  State.contextMenuTarget = { type: 'message', data: msg };
  const menu = DOM.messageContextMenu;
  const isSent = msg.sender === State.currentUser?.username;

  // Show/hide edit & delete for own messages
  menu.querySelector('[data-action="edit"]').style.display = isSent && !msg.deleted ? 'flex' : 'none';
  menu.querySelector('[data-action="delete"]').style.display = isSent && !msg.deleted ? 'flex' : 'none';

  positionMenu(menu, e.clientX || e.pageX, e.clientY || e.pageY);
}

function showChatContextMenu(e, room) {
  State.contextMenuTarget = { type: 'chat', data: room };
  const menu = DOM.chatContextMenu;

  // Show/hide leave for groups
  menu.querySelector('[data-action="leave"]').style.display = room.type === 'group' ? 'flex' : 'none';

  // Update pin label
  const pinBtn = menu.querySelector('[data-action="pin"]');
  pinBtn.textContent = State.pinnedChats.includes(room.id) ? '📌 Unpin Chat' : '📌 Pin Chat';

  positionMenu(menu, e.clientX, e.clientY);
}

function positionMenu(menu, x, y) {
  hideAllMenus();
  menu.classList.remove('hidden');
  const rect = menu.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = x;
  let top = y;
  if (left + 200 > vw) left = vw - 210;
  if (top + rect.height + 20 > vh) top = y - rect.height - 10;
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
}

function hideAllMenus() {
  DOM.messageContextMenu.classList.add('hidden');
  DOM.chatContextMenu.classList.add('hidden');
  DOM.statusDropdown.classList.add('hidden');
  DOM.disappearDropdown.classList.add('hidden');
  DOM.reactionPicker.classList.add('hidden');
}

// Context menu actions
DOM.messageContextMenu.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const msg = State.contextMenuTarget?.data;
  hideAllMenus();
  if (!msg) return;

  switch (action) {
    case 'reply': setReply(msg); break;
    case 'react': showReactionPicker(msg); break;
    case 'edit': startEditMessage(msg); break;
    case 'delete':
      State.socket.emit('message:delete', { roomId: msg.roomId, messageId: msg.id });
      break;
    case 'copy':
      navigator.clipboard?.writeText(msg.content).then(() => showToast('📋', 'Copied', 'Message copied', 'success'));
      break;
  }
});

DOM.chatContextMenu.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const room = State.contextMenuTarget?.data;
  hideAllMenus();
  if (!room) return;

  switch (action) {
    case 'pin':
      State.socket.emit('chat:pin', { roomId: room.id });
      break;
    case 'clear':
      if (confirm('Clear all messages in this chat?')) {
        State.socket.emit('chat:clear', { roomId: room.id });
      }
      break;
    case 'leave':
      if (confirm(`Leave "${room.name}"?`)) {
        State.socket.emit('group:leave', { roomId: room.id });
      }
      break;
  }
});

// ═══════════════════════════════════════════════════════════════════
// REACTION PICKER
// ═══════════════════════════════════════════════════════════════════

function showReactionPicker(msg) {
  const picker = DOM.reactionPicker;
  picker.classList.remove('hidden');

  // Position near the message
  const msgEl = document.querySelector(`[data-msg-id="${msg.id}"]`);
  if (msgEl) {
    const rect = msgEl.getBoundingClientRect();
    picker.style.top = (rect.top - 60) + 'px';
    picker.style.left = Math.min(rect.left, window.innerWidth - 340) + 'px';
  }

  picker.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.onclick = () => {
      State.socket.emit('message:react', {
        roomId: State.currentRoom.id,
        messageId: msg.id,
        emoji: btn.dataset.emoji
      });
      picker.classList.add('hidden');
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// EDIT MESSAGE
// ═══════════════════════════════════════════════════════════════════

function startEditMessage(msg) {
  State.editingMessageId = msg.id;
  const el = document.querySelector(`[data-msg-id="${msg.id}"]`);
  if (!el) return;
  const bubble = el.querySelector('.message-bubble');
  if (!bubble) return;

  const original = msg.content;
  bubble.innerHTML = `
    <textarea class="message-edit-input">${escapeHtml(original)}</textarea>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn-primary" style="padding:6px 14px;font-size:13px;border-radius:8px" id="save-edit-btn">Save</button>
      <button class="btn-secondary" style="padding:6px 14px;font-size:13px;border-radius:8px" id="cancel-edit-btn">Cancel</button>
    </div>
  `;

  const textarea = bubble.querySelector('.message-edit-input');
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);

  bubble.querySelector('#save-edit-btn').addEventListener('click', () => {
    const newContent = textarea.value.trim();
    if (newContent && newContent !== original) {
      State.socket.emit('message:edit', {
        roomId: State.currentRoom.id,
        messageId: msg.id,
        newContent
      });
    } else {
      // Restore
      bubble.innerHTML = `<span class="msg-text">${escapeHtml(original)}</span>`;
    }
    State.editingMessageId = null;
  });

  bubble.querySelector('#cancel-edit-btn').addEventListener('click', () => {
    bubble.innerHTML = `<span class="msg-text">${escapeHtml(original)}</span>`;
    State.editingMessageId = null;
  });
}

// ═══════════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════════

function renderSearchResults(results, query) {
  // Highlight matching messages in the chat
  $$('.message-bubble .msg-text').forEach(el => {
    el.innerHTML = escapeHtml(el.textContent); // reset
  });

  if (!query) {
    DOM.searchCount.textContent = '';
    return;
  }

  DOM.searchCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;

  results.forEach(msg => {
    const el = document.querySelector(`[data-msg-id="${msg.id}"] .msg-text`);
    if (el) {
      el.innerHTML = highlightText(escapeHtml(msg.content), query);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

function highlightText(text, query) {
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════

function notifyNewMessage(msg) {
  const room = State.rooms.get(msg.roomId);
  const senderUser = State.users.get(msg.sender);
  const senderName = senderUser?.nickname || msg.sender;
  const roomName = room?.type === 'group' ? room.name : senderName;

  // Sound
  if (State.soundEnabled) {
    playNotificationSound();
  }

  // Toast
  showToast(
    senderUser?.avatarColor ? null : '💬',
    senderName,
    msg.type === 'image' ? '📷 Sent a photo' : msg.content?.slice(0, 60),
    'info',
    () => openChat(msg.roomId)
  );

  // Browser notification
  if (State.notifEnabled && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(`${senderName} — ${roomName}`, {
      body: msg.type === 'image' ? '📷 Photo' : msg.content?.slice(0, 100),
      icon: '/favicon.ico'
    });
  }
}

function playNotificationSound() {
  try {
    // Generate a simple beep using Web Audio API
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════════
// TOAST SYSTEM
// ═══════════════════════════════════════════════════════════════════

function showToast(icon, title, message, type = 'info', onClick = null) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icon || '💬'}</div>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-message">${escapeHtml(message || '')}</div>
    </div>
  `;

  if (onClick) {
    toast.addEventListener('click', () => {
      onClick();
      removeToast(toast);
    });
  } else {
    toast.addEventListener('click', () => removeToast(toast));
  }

  DOM.toastContainer.appendChild(toast);

  // Auto remove after 4s
  setTimeout(() => removeToast(toast), 4000);
}

function removeToast(toast) {
  if (!toast.parentNode) return;
  toast.classList.add('exit');
  setTimeout(() => toast.remove(), 300);
}

// ═══════════════════════════════════════════════════════════════════
// RECONNECT SIMULATION
// ═══════════════════════════════════════════════════════════════════

function showReconnecting() {
  DOM.reconnectBanner.classList.remove('hidden');
}

// ═══════════════════════════════════════════════════════════════════
// THEMES
// ═══════════════════════════════════════════════════════════════════

function applyTheme(theme) {
  document.body.className = `theme-${theme}`;
  // Update active in settings grid
  $$('.theme-option').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === theme);
  });
  localStorage.setItem('snapmsg_theme', theme);
}

// ═══════════════════════════════════════════════════════════════════
// SETTINGS MODAL
// ═══════════════════════════════════════════════════════════════════

function openSettings() {
  if (!State.currentUser) return;
  DOM.settingsNickname.value = State.currentUser.nickname || '';
  buildColorSwatches(DOM.settingsColorSwatches, 'settings');

  // Pre-select current color
  DOM.settingsColorSwatches.querySelectorAll('.color-swatch').forEach(s => {
    if (s.dataset.color === State.currentUser.avatarColor) {
      s.classList.add('selected');
      State.selectedAvatarColor = s.dataset.color;
    }
  });

  // Apply current theme
  const savedTheme = localStorage.getItem('snapmsg_theme') || 'default';
  $$('.theme-option').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === savedTheme);
  });

  DOM.soundToggle.checked = State.soundEnabled;
  DOM.notifToggle.checked = State.notifEnabled;

  DOM.settingsModal.classList.remove('hidden');
}

$('save-settings-btn').addEventListener('click', () => {
  const nickname = DOM.settingsNickname.value.trim();
  const color = State.selectedAvatarColor || State.currentUser?.avatarColor;
  const theme = document.querySelector('.theme-option.active')?.dataset.theme || 'default';

  State.socket?.emit('profile:update', { nickname, avatarColor: color, theme });
  applyTheme(theme);

  State.soundEnabled = DOM.soundToggle.checked;
  State.notifEnabled = DOM.notifToggle.checked;

  if (State.notifEnabled && 'Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  DOM.settingsModal.classList.add('hidden');
  showToast('✅', 'Settings saved', 'Your profile has been updated', 'success');
});

// Theme selection
DOM.themeGrid.addEventListener('click', e => {
  const option = e.target.closest('.theme-option');
  if (!option) return;
  $$('.theme-option').forEach(el => el.classList.remove('active'));
  option.classList.add('active');
  applyTheme(option.dataset.theme);
});

// Clear all data
$('clear-all-btn').addEventListener('click', () => {
  if (confirm('This will clear all your local data and log you out. Continue?')) {
    localStorage.clear();
    location.reload();
  }
});

// ═══════════════════════════════════════════════════════════════════
// GROUP CREATION
// ═══════════════════════════════════════════════════════════════════

function openNewGroupModal() {
  State.selectedMembers = [];
  DOM.groupNameInput.value = '';
  DOM.memberSearchInput.value = '';
  DOM.selectedMembers.innerHTML = '';
  renderMemberList('');
  DOM.newGroupModal.classList.remove('hidden');
}

function renderMemberList(query) {
  DOM.memberList.innerHTML = '';
  const users = [...State.users.values()]
    .filter(u => u.username !== State.currentUser?.username)
    .filter(u => !query || u.username.includes(query) || (u.nickname || '').toLowerCase().includes(query));

  users.forEach(user => {
    const isSelected = State.selectedMembers.includes(user.username);
    const item = document.createElement('div');
    item.className = `member-list-item${isSelected ? ' selected' : ''}`;
    item.innerHTML = `
      <div class="avatar small" style="background:${user.avatarColor || '#6C63FF'}">${(user.nickname || user.username)[0].toUpperCase()}</div>
      <span>${escapeHtml(user.nickname || user.username)} (@${escapeHtml(user.username)})</span>
      ${isSelected ? '<span style="margin-left:auto;color:var(--accent)">✓</span>' : ''}
    `;
    item.addEventListener('click', () => toggleMember(user.username, user.nickname || user.username));
    DOM.memberList.appendChild(item);
  });

  if (users.length === 0) {
    DOM.memberList.innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:13px">No users found</div>';
  }
}

function toggleMember(username, displayName) {
  const idx = State.selectedMembers.indexOf(username);
  if (idx === -1) {
    State.selectedMembers.push(username);
  } else {
    State.selectedMembers.splice(idx, 1);
  }
  renderMemberList(DOM.memberSearchInput.value.toLowerCase());
  renderSelectedChips();
}

function renderSelectedChips() {
  DOM.selectedMembers.innerHTML = '';
  State.selectedMembers.forEach(username => {
    const user = State.users.get(username);
    const name = user?.nickname || username;
    const chip = document.createElement('div');
    chip.className = 'selected-chip';
    chip.innerHTML = `${escapeHtml(name)} <button data-username="${username}">✕</button>`;
    chip.querySelector('button').addEventListener('click', () => toggleMember(username, name));
    DOM.selectedMembers.appendChild(chip);
  });
}

$('create-group-btn').addEventListener('click', () => {
  const name = DOM.groupNameInput.value.trim();
  if (!name) { showToast('⚠️', 'Error', 'Please enter a group name', 'error'); return; }
  if (State.selectedMembers.length === 0) { showToast('⚠️', 'Error', 'Add at least one member', 'error'); return; }

  State.socket.emit('group:create', { name, members: State.selectedMembers });
  DOM.newGroupModal.classList.add('hidden');
  showToast('👥', 'Group created', `"${name}" is ready!`, 'success');
});

DOM.memberSearchInput.addEventListener('input', () => {
  renderMemberList(DOM.memberSearchInput.value.toLowerCase());
});

// ═══════════════════════════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════════════════════════

function logout() {
  State.socket?.disconnect();
  localStorage.removeItem('snapmsg_user');
  State.currentUser = null;
  State.currentRoom = null;
  State.rooms.clear();
  State.messages.clear();
  State.users.clear();
  DOM.app.classList.add('hidden');
  showAuth();
}

// ═══════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════════

document.addEventListener('keydown', e => {
  // Escape: close menus, close chat
  if (e.key === 'Escape') {
    if (!DOM.messageContextMenu.classList.contains('hidden') ||
        !DOM.chatContextMenu.classList.contains('hidden') ||
        !DOM.statusDropdown.classList.contains('hidden') ||
        !DOM.disappearDropdown.classList.contains('hidden') ||
        !DOM.reactionPicker.classList.contains('hidden')) {
      hideAllMenus();
      return;
    }
    if (!DOM.emojiPickerContainer.classList.contains('hidden')) {
      DOM.emojiPickerContainer.classList.add('hidden');
      return;
    }
    if (!DOM.chatSearchBar.classList.contains('hidden')) {
      DOM.chatSearchBar.classList.add('hidden');
      return;
    }
    if (!DOM.replyPreview.classList.contains('hidden')) {
      clearReply();
      return;
    }
    if (State.currentRoom) {
      closeChat();
      return;
    }
    // Close modals
    $$('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
  }

  // Ctrl+G: new group
  if (e.ctrlKey && e.key === 'g') {
    e.preventDefault();
    openNewGroupModal();
  }

  // Ctrl+F: search
  if (e.ctrlKey && e.key === 'f') {
    e.preventDefault();
    if (State.currentRoom) {
      DOM.chatSearchBar.classList.toggle('hidden');
      if (!DOM.chatSearchBar.classList.contains('hidden')) {
        DOM.chatSearchInput.focus();
      }
    }
  }

  // Ctrl+E: emoji picker
  if (e.ctrlKey && e.key === 'e') {
    e.preventDefault();
    if (State.currentRoom) {
      DOM.emojiPickerContainer.classList.toggle('hidden');
    }
  }

  // Ctrl+L: logout
  if (e.ctrlKey && e.key === 'l') {
    e.preventDefault();
    if (confirm('Log out?')) logout();
  }
});

// ═══════════════════════════════════════════════════════════════════
// EVENT LISTENERS — UI
// ═══════════════════════════════════════════════════════════════════

// Message input
DOM.messageInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

DOM.messageInput.addEventListener('input', () => {
  autoResizeTextarea();
  startTyping();
});

function autoResizeTextarea() {
  const ta = DOM.messageInput;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';
}

// Send button
$('send-btn').addEventListener('click', sendMessage);

// Back button (mobile)
$('back-btn').addEventListener('click', closeChat);

// Emoji button
$('emoji-btn').addEventListener('click', e => {
  e.stopPropagation();
  DOM.emojiPickerContainer.classList.toggle('hidden');
});

// Emoji picker selection
DOM.emojiPicker.addEventListener('emoji-click', e => {
  const emoji = e.detail.unicode;
  const pos = DOM.messageInput.selectionStart;
  const val = DOM.messageInput.value;
  DOM.messageInput.value = val.slice(0, pos) + emoji + val.slice(pos);
  DOM.messageInput.selectionStart = DOM.messageInput.selectionEnd = pos + emoji.length;
  DOM.messageInput.focus();
  DOM.emojiPickerContainer.classList.add('hidden');
});

// Image button
$('image-btn').addEventListener('click', () => $('image-file-input').click());

$('image-file-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('⚠️', 'Error', 'Only image files are supported', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('⚠️', 'Error', 'Image must be under 5MB', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => sendImage(ev.target.result);
  reader.readAsDataURL(file);
  e.target.value = '';
});

// Cancel reply
$('cancel-reply-btn').addEventListener('click', clearReply);

// Sidebar search
DOM.sidebarSearchInput.addEventListener('input', () => {
  const q = DOM.sidebarSearchInput.value;
  DOM.clearSearchBtn.classList.toggle('hidden', !q);
  renderChatList();
});

DOM.clearSearchBtn.addEventListener('click', () => {
  DOM.sidebarSearchInput.value = '';
  DOM.clearSearchBtn.classList.add('hidden');
  renderChatList();
});

// Sidebar tabs
$$('.sidebar-tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

function switchTab(tab) {
  $$('.sidebar-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  $('chats-tab').classList.toggle('hidden', tab !== 'chats');
  $('requests-tab').classList.toggle('hidden', tab !== 'requests');
  $('people-tab').classList.toggle('hidden', tab !== 'people');
  if (tab === 'requests') renderRequestsList();
}

// New group button
$('new-group-btn').addEventListener('click', openNewGroupModal);

// Settings button
$('settings-btn').addEventListener('click', openSettings);

// Logout button
$('logout-btn').addEventListener('click', () => {
  if (confirm('Log out of SnapMsg?')) logout();
});

// Status button
$('status-btn').addEventListener('click', e => {
  e.stopPropagation();
  const dropdown = DOM.statusDropdown;
  dropdown.classList.toggle('hidden');
  if (!dropdown.classList.contains('hidden')) {
    const rect = e.currentTarget.getBoundingClientRect();
    dropdown.style.left = rect.left + 'px';
    dropdown.style.top = (rect.top - 130) + 'px';
  }
});

DOM.statusDropdown.addEventListener('click', e => {
  const btn = e.target.closest('[data-status]');
  if (!btn) return;
  const status = btn.dataset.status;
  State.socket?.emit('status:set', { status });
  DOM.myStatusDot.className = `status-dot ${status}`;
  DOM.statusDropdown.classList.add('hidden');
});

// Chat search
$('search-chat-btn').addEventListener('click', () => {
  DOM.chatSearchBar.classList.toggle('hidden');
  if (!DOM.chatSearchBar.classList.contains('hidden')) {
    DOM.chatSearchInput.focus();
  }
});

$('close-chat-search').addEventListener('click', () => {
  DOM.chatSearchBar.classList.add('hidden');
  DOM.chatSearchInput.value = '';
  DOM.searchCount.textContent = '';
  // Reset highlights
  $$('.message-bubble .msg-text').forEach(el => {
    el.innerHTML = escapeHtml(el.textContent);
  });
});

DOM.chatSearchInput.addEventListener('input', () => {
  const q = DOM.chatSearchInput.value.trim();
  if (q && State.currentRoom) {
    State.socket.emit('messages:search', { roomId: State.currentRoom.id, query: q });
  } else {
    DOM.searchCount.textContent = '';
    $$('.message-bubble .msg-text').forEach(el => {
      el.innerHTML = escapeHtml(el.textContent);
    });
  }
});

// Pin chat button
$('pin-chat-btn').addEventListener('click', () => {
  if (State.currentRoom) {
    State.socket.emit('chat:pin', { roomId: State.currentRoom.id });
  }
});

// Disappear messages
$('disappear-btn').addEventListener('click', e => {
  e.stopPropagation();
  const dropdown = DOM.disappearDropdown;
  dropdown.classList.toggle('hidden');
  if (!dropdown.classList.contains('hidden')) {
    const rect = e.currentTarget.getBoundingClientRect();
    dropdown.style.right = (window.innerWidth - rect.right) + 'px';
    dropdown.style.top = (rect.bottom + 8) + 'px';
    dropdown.style.left = 'auto';
  }
});

DOM.disappearDropdown.addEventListener('click', e => {
  const btn = e.target.closest('[data-timer]');
  if (!btn) return;
  State.disappearTimer = parseInt(btn.dataset.timer);
  DOM.disappearDropdown.classList.add('hidden');
  const label = State.disappearTimer === 0 ? 'Off' : btn.textContent;
  showToast('⏱', 'Disappearing messages', `Set to: ${label}`, 'info');
});

// Chat menu button
$('chat-menu-btn').addEventListener('click', e => {
  e.stopPropagation();
  if (State.currentRoom) {
    showChatContextMenu(e, State.currentRoom);
  }
});

// Modal close buttons
$$('.modal-close, [data-modal]').forEach(btn => {
  btn.addEventListener('click', () => {
    const modalId = btn.dataset.modal;
    if (modalId) $(modalId).classList.add('hidden');
  });
});

// Close menus on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.context-menu') &&
      !e.target.closest('.dropdown') &&
      !e.target.closest('.reaction-picker')) {
    hideAllMenus();
  }
  if (!e.target.closest('#emoji-picker-container') &&
      !e.target.closest('#emoji-btn')) {
    DOM.emojiPickerContainer.classList.add('hidden');
  }
});

// Close modal on overlay click
$$('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
});

// Screenshot warning simulation (Ctrl+S or Print Screen)
document.addEventListener('keydown', e => {
  if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 's' && State.currentRoom)) {
    showScreenshotWarning();
  }
});

function showScreenshotWarning() {
  DOM.screenshotWarning.classList.remove('hidden');
  setTimeout(() => DOM.screenshotWarning.classList.add('hidden'), 1000);
}

// Image lightbox
function openLightbox(src) {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `<img src="${src}" alt="Full size image" />`;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

// ═══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();
  const diff = now - d;

  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (sameDay(d, now)) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();
  if (sameDay(d, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function sameDay(d1, d2) {
  const a = new Date(d1);
  const b = new Date(d2);
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

// ═══════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════

// Apply saved theme immediately
const savedTheme = localStorage.getItem('snapmsg_theme');
if (savedTheme) applyTheme(savedTheme);

// Load saved sound/notif preferences
State.soundEnabled = localStorage.getItem('snapmsg_sound') !== 'false';
State.notifEnabled = localStorage.getItem('snapmsg_notif') === 'true';

// Start the app
initSplash();

console.log('🚀 SnapMsg client initialized');
