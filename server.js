const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Хранилище данных
const users = new Map();
const rooms = new Map();
const messages = new Map();
let userCount = 0;

// Админ по умолчанию
users.set('admin', {
    password: 'admin',
    role: 'admin',
    socketId: null
});

// Маршруты
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat', 'index.html'));
});

io.on('connection', (socket) => {
    console.log('Новое подключение:', socket.id);
    userCount++;
    io.emit('user count', userCount);

    socket.on('login', (data) => {
        const { username, password } = data;
        
        if (users.has(username)) {
            const user = users.get(username);
            if (user.password === password) {
                handleSuccessfulLogin(socket, username, user.role);
            } else {
                socket.emit('login error', 'Неверный пароль');
            }
        } else {
            users.set(username, {
                password: password,
                role: 'user',
                socketId: socket.id
            });
            handleSuccessfulLogin(socket, username, 'user');
        }
    });

    function handleSuccessfulLogin(socket, username, role) {
        const user = users.get(username);
        user.socketId = socket.id;
        
        socket.user = { username, role };
        
        socket.emit('login success', {
            username: username,
            role: role
        });

        if (role === 'admin') {
            const activeRooms = Array.from(rooms.entries()).filter(([_, room]) => room.active);
            socket.emit('admin rooms', activeRooms);
        } else {
            const roomId = socket.id;
            rooms.set(roomId, {
                username: username,
                active: true,
                adminJoined: false,
                createdAt: new Date()
            });

            messages.set(roomId, [{
                id: Date.now(),
                username: 'Система',
                message: 'Добро пожаловать! Ожидайте подключения администратора.',
                timestamp: new Date().toLocaleTimeString(),
                type: 'system'
            }]);

            socket.join(roomId);
            socket.emit('room created', roomId);
            notifyAdminsAboutNewRoom(roomId, username);
        }
    }

    socket.on('get rooms', () => {
        if (socket.user && socket.user.role === 'admin') {
            const activeRooms = Array.from(rooms.entries()).filter(([_, room]) => room.active);
            socket.emit('admin rooms', activeRooms);
        }
    });

    socket.on('join room', (roomId) => {
        if (socket.user && socket.user.role === 'admin') {
            const room = rooms.get(roomId);
            if (room && room.active) {
                room.adminJoined = true;
                socket.join(roomId);
                
                const roomMessages = messages.get(roomId) || [];
                socket.emit('room history', roomMessages);
                
                const systemMessage = {
                    id: Date.now(),
                    username: 'Система',
                    message: 'Администратор подключился к чату',
                    timestamp: new Date().toLocaleTimeString(),
                    type: 'system'
                };
                
                roomMessages.push(systemMessage);
                io.to(roomId).emit('chat message', systemMessage);
                socket.emit('room joined', { roomId: roomId });
            }
        }
    });

    socket.on('leave room', (roomId) => {
        if (socket.user && socket.user.role === 'admin' && socket.rooms.has(roomId)) {
            socket.leave(roomId);
            socket.emit('room left');
        }
    });

    socket.on('chat message', (data) => {
        const { roomId, message } = data;
        const room = rooms.get(roomId);
        
        if (room && room.active) {
            const username = socket.user ? socket.user.username : 'Неизвестный';
            
            const messageData = {
                id: Date.now(),
                username: username,
                message: message,
                timestamp: new Date().toLocaleTimeString(),
                type: 'user'
            };

            const roomMessages = messages.get(roomId) || [];
            roomMessages.push(messageData);
            io.to(roomId).emit('chat message', messageData);
        }
    });

    socket.on('close room', (roomId) => {
        if (socket.user && socket.user.role === 'admin') {
            const room = rooms.get(roomId);
            if (room) {
                room.active = false;
                
                const systemMessage = {
                    id: Date.now(),
                    username: 'Система',
                    message: 'Чат завершен администратором',
                    timestamp: new Date().toLocaleTimeString(),
                    type: 'system'
                };
                
                const roomMessages = messages.get(roomId) || [];
                roomMessages.push(systemMessage);
                
                io.to(roomId).emit('chat message', systemMessage);
                io.to(roomId).emit('room closed');
                
                if (socket.rooms.has(roomId)) {
                    socket.leave(roomId);
                    socket.emit('room left');
                }
                notifyAdminsAboutRoomUpdate();
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Отключение:', socket.id);
        userCount--;
        io.emit('user count', userCount);
        
        if (rooms.has(socket.id)) {
            const room = rooms.get(socket.id);
            if (room && room.active) {
                rooms.delete(socket.id);
                messages.delete(socket.id);
                notifyAdminsAboutRoomUpdate();
            }
        }
        
        if (socket.user) {
            const user = users.get(socket.user.username);
            if (user) {
                user.socketId = null;
            }
        }
    });

    function notifyAdminsAboutNewRoom(roomId, username) {
        const room = rooms.get(roomId);
        users.forEach((user) => {
            if (user.role === 'admin' && user.socketId) {
                io.to(user.socketId).emit('new room', {
                    roomId: roomId,
                    username: username,
                    createdAt: room.createdAt
                });
            }
        });
    }

    function notifyAdminsAboutRoomUpdate() {
        const activeRooms = Array.from(rooms.entries()).filter(([_, room]) => room.active);
        users.forEach((user) => {
            if (user.role === 'admin' && user.socketId) {
                io.to(user.socketId).emit('admin rooms update', activeRooms);
            }
        });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});