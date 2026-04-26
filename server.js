<script src="/socket.io/socket.io.js"></script>
<script>
  const socket = io();

  let chatCode = '';
  let joined = false;

  const createBtn = document.getElementById('createChatBtn');
  const joinBtn = document.getElementById('joinChatBtn');
  const chatContainer = document.getElementById('chatContainer');
  const chatBox = document.getElementById('chatBox');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const leaveBtn = document.getElementById('leaveBtn');

  createBtn.onclick = () => {
    chatCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    alert('Your chat code: ' + chatCode);
    joinChat();
  };

  joinBtn.onclick = () => {
    chatCode = prompt('Enter chat code:');
    if (chatCode) {
      joinChat();
    }
  };

  function joinChat() {
    socket.emit('joinRoom', chatCode);
    joined = true;
    document.querySelector('.chat-options').classList.add('hidden');
    chatContainer.classList.remove('hidden');
  }

  sendBtn.onclick = () => {
    const message = messageInput.value.trim();
    if (message && joined) {
      socket.emit('message', { chatCode, message });
      const messageElem = document.createElement('div');
      messageElem.className = 'message sent';
      messageElem.innerText = message;
      chatBox.appendChild(messageElem);
      messageInput.value = '';
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  };

  socket.on('message', (message) => {
    const reply = document.createElement('div');
    reply.className = 'message received';
    reply.innerText = message;
    chatBox.appendChild(reply);
    chatBox.scrollTop = chatBox.scrollHeight;
  });

  leaveBtn.onclick = () => {
    if (joined) {
      socket.emit('leaveRoom', chatCode);
      joined = false;
    }
    document.querySelector('.chat-options').classList.remove('hidden');
    chatContainer.classList.add('hidden');
    chatBox.innerHTML = '';
  };
</script>
