const socket = io();
let currentUser = null;
let currentRoom = null;
let userRole = null;


const loginForm = document.getElementById("loginForm");
const appInterface = document.getElementById("appInterface");
const roomsList = document.getElementById("roomsList");
const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const status = document.getElementById("status");
const errorMessage = document.getElementById("errorMessage");
const backButton = document.getElementById("backButton");
const chatTitle = document.getElementById("chatTitle");

function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (username && password) {
    socket.emit("login", { username, password });
  } else {
    showError("Заполните все поля");
  }
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
  setTimeout(() => {
    errorMessage.style.display = "none";
  }, 3000);
}

function sendMessage() {
  const message = messageInput.value.trim();
  if (message && currentRoom) {
    socket.emit("chat message", {
      roomId: currentRoom,
      message: message,
    });
    messageInput.value = "";
    sendButton.disabled = true;
  }
}

function addMessage(data) {
  const messageElement = document.createElement("div");
  messageElement.className = `message ${
    data.type === "system" ? "system" : ""
  }`;
  messageElement.innerHTML = `
    <div class="message-header">
      <span class="username">${data.username}</span>
      <span class="time">${data.timestamp}</span>
    </div>
    <div class="message-text">${data.message}</div>
  `;
  messages.appendChild(messageElement);
  messages.scrollTop = messages.scrollHeight;
}

function joinRoom(roomId, roomData) {
  console.log("Клиент: попытка войти в комнату", roomId);

  if (currentRoom && currentRoom !== roomId) {
    socket.emit("leave room", currentRoom);
  }

  socket.emit("join room", roomId);


  if (userRole === "admin" && roomData) {
    chatTitle.textContent = `Чат с ${roomData.username}`;
  }
}

function leaveCurrentRoom() {
  if (currentRoom) {
    socket.emit("leave room", currentRoom);


    messages.innerHTML = "";
    messageInput.value = "";
    messageInput.disabled = false;
    sendButton.disabled = true;
    currentRoom = null;

    document.querySelectorAll(".room-item").forEach((item) => {
      item.classList.remove("active");
    });


    chatTitle.textContent = "Чат поддержки";
  }
}

function closeRoom(roomId) {
  if (confirm("Вы уверены, что хотите закрыть этот чат?")) {
    console.log("Клиент: попытка закрыть комнату", roomId);
    socket.emit("close room", roomId);
  }
}

function updateRoomsList(rooms) {
  console.log("Обновление списка комнат:", rooms);

  if (rooms.length === 0) {
    roomsList.innerHTML =
      '<div class="waiting-message">Активных чатов нет</div>';
    return;
  }

  roomsList.innerHTML = "";
  rooms.forEach(([roomId, room]) => {
    const roomElement = document.createElement("div");
    roomElement.className = "room-item";
    roomElement.dataset.roomId = roomId;
    if (roomId === currentRoom) {
      roomElement.classList.add("active");
    }

    roomElement.innerHTML = `
      <div class="room-info">
        <div>
          <strong>${room.username}</strong>
          <div>
            Создан: ${new Date(room.createdAt).toLocaleTimeString()}
            ${room.adminJoined ? " · Админ подключен" : " · Ожидание"}
          </div>
        </div>
        <div class="room-actions">
          <button class="action-btn join-btn" onclick="joinRoom('${roomId}', ${JSON.stringify(
      room
    ).replace(/"/g, "&quot;")})">Войти</button>
          <button class="action-btn close-btn" onclick="closeRoom('${roomId}')">Закрыть</button>
        </div>
      </div>
    `;
    roomsList.appendChild(roomElement);
  });
}


messageInput.addEventListener("input", () => {
  sendButton.disabled = !messageInput.value.trim();
});

messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

sendButton.addEventListener("click", sendMessage);

backButton.addEventListener("click", leaveCurrentRoom);


socket.on("login success", (data) => {
  currentUser = data.username;
  userRole = data.role;

  loginForm.style.display = "none";
  errorMessage.style.display = "none";
  appInterface.style.display = "flex";

  if (userRole === "admin") {
    appInterface.classList.add("admin-view");
    appInterface.classList.remove("user-view");

    socket.emit("get rooms");
  } else {
    appInterface.classList.add("user-view");
    appInterface.classList.remove("admin-view");

    socket.emit("create room");
  }

  messageInput.focus();
  console.log("Вход выполнен:", currentUser, "Роль:", userRole);
});

socket.on("login error", (message) => {
  showError(message || "Ошибка входа");
});

socket.on("room created", (roomId) => {
  currentRoom = roomId;
  console.log("Комната создана:", roomId);


  if (userRole === "user") {
    messageInput.disabled = false;
    sendButton.disabled = true;
    chatTitle.textContent = "Чат с поддержкой";
    
    // Добавляем системное сообщение
    addMessage({
      username: "Система",
      message: "Вы подключились к чату поддержки. Ожидайте ответа администратора.",
      timestamp: new Date().toLocaleTimeString(),
      type: "system"
    });
  }
});

socket.on("admin rooms", (rooms) => {
  updateRoomsList(rooms);
});

socket.on("admin rooms update", (rooms) => {
  updateRoomsList(rooms);
});

socket.on("new room", (roomData) => {
  console.log("Новая комната:", roomData);

  if (userRole === "admin") {
    socket.emit("get rooms");
  }
});

socket.on("room joined", (data) => {
  console.log("Успешно вошли в комнату:", data.roomId);
  currentRoom = data.roomId;


  messageInput.disabled = false;
  sendButton.disabled = !messageInput.value.trim();

  document.querySelectorAll(".room-item").forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.roomId === data.roomId) {
      item.classList.add("active");
    }
  });

  messageInput.focus();
});

socket.on("room history", (history) => {
  messages.innerHTML = "";
  history.forEach(addMessage);
  messages.scrollTop = messages.scrollHeight;
});

socket.on("chat message", addMessage);

socket.on("room closed", (roomId) => {

  if (roomId === currentRoom) {
    addMessage({
      username: "Система",
      message: "Чат завершен администратором. Вы можете закрыть окно.",
      timestamp: new Date().toLocaleTimeString(),
      type: "system",
    });
    messageInput.disabled = true;
    sendButton.disabled = true;
  }


  if (userRole === "admin") {
    socket.emit("get rooms");
  }
});

socket.on("room left", () => {

  messages.innerHTML = "";
  messageInput.value = "";
  messageInput.disabled = false;
  sendButton.disabled = true;
  currentRoom = null;
  chatTitle.textContent = "Чат поддержки";

  if (userRole === "admin") {
    socket.emit("get rooms");
  }
});

socket.on("connect", () => {
  status.textContent = "Подключено";
  status.style.color = "#00ff00";
  console.log("Подключено к серверу");
});

socket.on("disconnect", () => {
  status.textContent = "Отключено";
  status.style.color = "#ff4444";
  console.log("Отключено от сервера");
});


document.getElementById("username").addEventListener("keypress", (e) => {
  if (e.key === "Enter") login();
});

document.getElementById("password").addEventListener("keypress", (e) => {
  if (e.key === "Enter") login();
});


window.joinRoom = joinRoom;
window.closeRoom = closeRoom;
window.login = login;