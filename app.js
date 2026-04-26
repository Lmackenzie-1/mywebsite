let peer;
let conn;
let username;

function enterApp() {
  username = document.getElementById('username').value;
  if (!username) return;

  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('userDisplay').textContent = username;

  peer = new Peer();
}

function createChat() {
  peer.on('open', id => {
    document.getElementById('codeDisplay').textContent = "Your Code: " + id;
  });

  peer.on('connection', connection => {
    conn = connection;
    setupConnection();
  });
}

function joinChat() {
  const code = prompt("Enter chat code:");
  conn = peer.connect(code);
  setupConnection();
}

function setupConnection() {
  conn.on('data', data => {
    addMessage(data, 'received');
  });
}

function sendMessage() {
  const input = document.getElementById('messageInput');
  if (!input.value || !conn) return;

  const msg = username + ": " + input.value;
  addMessage(msg, 'sent');
  conn.send(msg);
  input.value = '';
}

function addMessage(text, type) {
  const div = document.createElement('div');
  div.className = 'message ' + type;
  div.textContent = text;

  const chatBox = document.getElementById('chatBox');
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
