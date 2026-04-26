// app.js - FINAL WORKING VERSION for Chromebook

// STATE
let currentScreen = 'username';
let currentUsername = '';
let activeRoomCode = null;
let activeRoomListener = null;
let messagePollInterval = null;

// Helper functions
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRoomMessages(roomCode) {
    try {
        const key = `chatroom_${roomCode}_messages`;
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch(e) {
        console.error('Error loading messages:', e);
        return [];
    }
}

function saveRoomMessages(roomCode, messages) {
    try {
        const key = `chatroom_${roomCode}_messages`;
        localStorage.setItem(key, JSON.stringify(messages));
        window.dispatchEvent(new StorageEvent('storage', {
            key: key,
            newValue: JSON.stringify(messages),
            storageArea: localStorage
        }));
    } catch(e) {
        console.error('Error saving messages:', e);
    }
}

function addMessageToRoom(roomCode, messageObj) {
    const msgs = getRoomMessages(roomCode);
    msgs.push(messageObj);
    saveRoomMessages(roomCode, msgs);
}

function startRoomSync(roomCode, onMessageUpdate) {
    if (activeRoomListener) {
        window.removeEventListener('storage', activeRoomListener);
        if (messagePollInterval) clearInterval(messagePollInterval);
    }
    
    const storageKey = `chatroom_${roomCode}_messages`;
    const handler = (e) => {
        if (e.key === storageKey && e.newValue) {
            try {
                const updatedMessages = JSON.parse(e.newValue);
                onMessageUpdate(updatedMessages);
            } catch(err) { console.warn(err); }
        }
    };
    
    window.addEventListener('storage', handler);
    activeRoomListener = handler;
    
    if (messagePollInterval) clearInterval(messagePollInterval);
    messagePollInterval = setInterval(() => {
        const fresh = getRoomMessages(roomCode);
        onMessageUpdate(fresh);
    }, 1000);
}

function stopRoomSync() {
    if (activeRoomListener) {
        window.removeEventListener('storage', activeRoomListener);
        activeRoomListener = null;
    }
    if (messagePollInterval) {
        clearInterval(messagePollInterval);
        messagePollInterval = null;
    }
}

// RENDER FUNCTIONS
function renderUsernameScreen() {
    const root = document.getElementById('app-root');
    root.innerHTML = `
        <div class="screen">
            <div class="username-card">
                <label>✨ ENTER USERNAME</label>
                <input type="text" id="username-input" class="grey-textbox" placeholder="username" autocomplete="off" maxlength="24">
                <button id="join-username-btn" class="primary">START CHATTING →</button>
                <small>pick any name to begin</small>
            </div>
        </div>
    `;
    
    const input = document.getElementById('username-input');
    const btn = document.getElementById('join-username-btn');
    
    const handleJoin = () => {
        let name = input.value.trim();
        if (name === "") name = "guest_" + Math.floor(Math.random() * 1000);
        currentUsername = name;
        currentScreen = 'action';
        render();
    };
    
    btn.onclick = handleJoin;
    input.onkeypress = (e) => { if(e.key === 'Enter') handleJoin(); };
    setTimeout(() => input.focus(), 100);
}

function renderActionScreen() {
    const root = document.getElementById('app-root');
    root.innerHTML = `
        <div class="screen">
            <div class="action-container">
                <button id="create-chat-btn" class="big-button primary">✨ CREATE CHAT</button>
                <button id="enter-code-btn" class="big-button secondary">🔑 ENTER CODE</button>
            </div>
            <small>create a room → share code → friend joins</small>
        </div>
    `;
    
    document.getElementById('create-chat-btn').onclick = () => {
        const newCode = generateRoomCode();
        const key = `chatroom_${newCode}_messages`;
        if (!localStorage.getItem(key)) {
            saveRoomMessages(newCode, []);
        }
        activeRoomCode = newCode;
        currentScreen = 'chat';
        render();
    };
    
    document.getElementById('enter-code-btn').onclick = () => {
        currentScreen = 'joinCodeInput';
        render();
    };
}

function renderJoinCodeScreen() {
    const root = document.getElementById('app-root');
    root.innerHTML = `
        <div class="screen">
            <div class="code-panel">
                <h3>🔐 JOIN ROOM</h3>
                <input type="text" id="room-code-input" class="grey-textbox" placeholder="Enter room code" autocomplete="off" maxlength="10" style="text-transform:uppercase">
                <button id="submit-join-btn" class="primary">JOIN →</button>
                <button id="back-action-btn" class="secondary" style="margin-top:12px">← BACK</button>
            </div>
        </div>
    `;
    
    const codeInput = document.getElementById('room-code-input');
    
    const attemptJoin = () => {
        let rawCode = codeInput.value.trim().toUpperCase();
        if (!rawCode) {
            alert("Please enter a room code");
            return;
        }
        const roomKey = `chatroom_${rawCode}_messages`;
        const roomExists = localStorage.getItem(roomKey) !== null;
        if (!roomExists) {
            alert(`❌ Room "${rawCode}" doesn't exist. Check the code.`);
            return;
        }
        activeRoomCode = rawCode;
        currentScreen = 'chat';
        render();
    };
    
    document.getElementById('submit-join-btn').onclick = attemptJoin;
    document.getElementById('back-action-btn').onclick = () => {
        currentScreen = 'action';
        render();
    };
    codeInput.onkeypress = (e) => { if(e.key === 'Enter') attemptJoin(); };
    setTimeout(() => codeInput.focus(), 100);
}

function renderChatScreen() {
    if (!activeRoomCode) {
        currentScreen = 'action';
        render();
        return;
    }
    
    const root = document.getElementById('app-root');
    let messages = getRoomMessages(activeRoomCode);
    
    root.innerHTML = `
        <div class="screen">
            <div class="chat-header">
                <div><strong>💬 ROOM: ${activeRoomCode}</strong> <span class="room-info">${currentUsername}</span></div>
                <button id="leave-chat-btn" class="leave-btn">🚪 LEAVE</button>
            </div>
            <div id="messages-container" class="messages-area"></div>
            <div class="chat-input-area">
                <input type="text" id="chat-message-input" placeholder="Type a message..." autocomplete="off">
                <button id="send-msg-btn">SEND</button>
            </div>
        </div>
    `;
    
    const messagesDiv = document.getElementById('messages-container');
    const messageInput = document.getElementById('chat-message-input');
    const sendBtn = document.getElementById('send-msg-btn');
    const leaveBtn = document.getElementById('leave-chat-btn');
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function renderMessages(msgsArray) {
        if (!messagesDiv) return;
        messagesDiv.innerHTML = '';
        (msgsArray || []).forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = `message ${msg.senderName === currentUsername ? 'my-message' : ''}`;
            msgDiv.innerHTML = `
                <div class="sender">${msg.senderName === currentUsername ? 'you' : escapeHtml(msg.senderName)}</div>
                <div class="text">${escapeHtml(msg.text)}</div>
            `;
            messagesDiv.appendChild(msgDiv);
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    renderMessages(messages);
    
    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;
        const messageObj = {
            id: Date.now() + '-' + Math.random(),
            senderName: currentUsername,
            text: text,
            timestamp: Date.now()
        };
        addMessageToRoom(activeRoomCode, messageObj);
        messageInput.value = '';
        const fresh = getRoomMessages(activeRoomCode);
        renderMessages(fresh);
    }
    
    sendBtn.onclick = sendMessage;
    messageInput.onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };
    
    const syncUpdate = (updatedMessages) => {
        renderMessages(updatedMessages);
    };
    
    startRoomSync(activeRoomCode, syncUpdate);
    
    leaveBtn.onclick = () => {
        stopRoomSync();
        activeRoomCode = null;
        currentScreen = 'action';
        render();
    };
    
    setTimeout(() => messageInput.focus(), 100);
}

// MAIN RENDER FUNCTION
function render() {
    const root = document.getElementById('app-root');
    if (!root) {
        console.error('Root element not found!');
        return;
    }
    
    if (currentScreen === 'username') {
        renderUsernameScreen();
    } else if (currentScreen === 'action') {
        renderActionScreen();
    } else if (currentScreen === 'joinCodeInput') {
        renderJoinCodeScreen();
    } else if (currentScreen === 'chat') {
        renderChatScreen();
    }
}

// START THE APP
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        render();
    });
} else {
    render();
}

// Reset on page load
window.addEventListener('load', () => {
    if (activeRoomCode && currentScreen !== 'chat') {
        activeRoomCode = null;
        if (activeRoomListener) stopRoomSync();
    }
    currentScreen = 'username';
    currentUsername = '';
    activeRoomCode = null;
    render();
});
