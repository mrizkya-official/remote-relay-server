const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const connectedDevices = {};

app.get('/', (req, res) => {
  res.send('Server Relay Remote Control Aktif!');
});

io.on('connection', (socket) => {
  console.log(`[+] Perangkat terhubung, Socket ID: ${socket.id}`);

  socket.on('register_device', (data) => {
    const { deviceId } = data;
    if (deviceId) {
      socket.deviceId = deviceId;
      connectedDevices[deviceId] = socket.id;
      console.log(`[REGISTER] PC Terdaftar: ${deviceId}`);
      io.emit('device_list_updated', Object.keys(connectedDevices));
    }
  });

  socket.on('send_command', (data) => {
    const { targetDeviceId, command } = data;
    const targetSocketId = connectedDevices[targetDeviceId];

    if (targetSocketId) {
      console.log(`[CMD] Meneruskan perintah '${command}' ke ${targetDeviceId}`);
      io.to(targetSocketId).emit('execute_command', { command });
    } else {
      console.log(`[ERROR] Perangkat ${targetDeviceId} tidak ditemukan / offline.`);
      socket.emit('error_msg', `Perangkat ${targetDeviceId} sedang offline.`);
    }
  });

  socket.on('disconnect', () => {
    if (socket.deviceId) {
      console.log(`[-] PC Terputus: ${socket.deviceId}`);
      delete connectedDevices[socket.deviceId];
      io.emit('device_list_updated', Object.keys(connectedDevices));
    } else {
      console.log(`[-] Perangkat terputus, Socket ID: ${socket.id}`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`Relay Server Berjalan di Port: ${PORT}`);
  console.log(`=================================`);
});