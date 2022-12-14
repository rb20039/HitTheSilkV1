const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET","POST"],
    },
});

let data = new Array(9999);

io.on("connection", (socket) => {

    socket.on("join_room", (gameId) => {
        data[gameId] = 0;
        socket.join(gameId);
        // console.log(`Greetings ${socket.id} to room ${gameId}`);
        const clients = io.sockets.adapter.rooms.get(gameId);
        const numClients = clients ? clients.size : 0;
        io.in(gameId).emit("user_log", numClients);
        io.in(gameId).emit("user_list", [...clients]);
    });

    socket.on("send_message", (data) => {
        socket.to(data.gameId).emit("receive_message", data);
    });

    socket.on("disconnecting", () => {
        for (const room of socket.rooms) {
            if (room !== socket.id) {
                const clients = io.sockets.adapter.rooms.get(room);
                const clientArr = [...clients];
                const index = clientArr.indexOf(socket.id);
                clientArr.splice(index, 1);
                io.in(room).emit("user_list", clientArr);
                const numClients = clients ? clients.size : 0;
                io.in(room).emit("user_log", numClients-1);
            }
        }
    });
});

server.listen(3001, () => {
    console.log("hello frinend");
});

