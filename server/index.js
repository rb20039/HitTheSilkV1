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

const cards = ["10k", "20k", "30k", "40k", "pchute", "2pchute", "kungfu", "knife", "spy", "revolver", "bullet", "poison", "antidote", "key", "plicence", "handcuffs", "steal"];
let gameStatus = new Array(9999);

const shuffleCards = (cardDeck) => {
    let currentIndex = cardDeck.length;
    let randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex--);
        [cardDeck[currentIndex], cardDeck[randomIndex]] = [cardDeck[randomIndex], cardDeck[currentIndex]];
    }
    return cardDeck;
}

const defineCards = (cardDeck) => {
    const definedDeck = cardDeck.map((c) => {
        return cards[c];
    });
    return definedDeck;
}

io.on("connection", (socket) => {

    socket.on("join_room", async (data) => {
        socket.data.username = data.tempUserName;
        socket.data.room = data.gameId;
        socket.join(data.gameId);
        const sockets = await io.in(data.gameId).fetchSockets();
        const clients = io.sockets.adapter.rooms.get(data.gameId);
        const numClients = clients ? clients.size : 0;
        io.in(data.gameId).emit("user_log", numClients);
        const clientsArr = [...clients];
        const clientNames = clientsArr.map((id, i) => {
            return { id: id, name: sockets[i].data.username }
        });
        io.in(data.gameId).emit("user_list", clientNames);
    });

    socket.on("leave_room", async (gameId) => {
        socket.leave(gameId);
        const sockets = await io.in(gameId).fetchSockets();
        const clients = io.sockets.adapter.rooms.get(gameId);
        const numClients = clients ? clients.size : 0;
        io.in(gameId).emit("user_log", numClients);
        if (numClients > 0) {
            const clientsArr = [...clients];
            const clientNames = clientsArr.map((id, i) => {
                return { id: id, name: sockets[i].data.username }
            });
            io.in(gameId).emit("user_list", clientNames);
        }
    });

    socket.on("card_kungfu", (selectedPlayer) => {
        io.to(selectedPlayer).emit("kungfu_request", socket.id);
    });

    socket.on("kungfu_reply", (data) => {
        const shuffledHand = shuffleCards(data.playerHand);
        const weaponIndex = shuffledHand.indexOf("revolver") > shuffledHand.indexOf("knife") ? shuffledHand.indexOf("revolver") : shuffledHand.indexOf("knife");
        if (weaponIndex !== -1) {
            if (shuffledHand.indexOf("kungfu") !== -1) {
                io.to(data.requestee).emit("kungfu_miss");
            }
            else {
                io.to(data.requestee).emit("kungfu_hit");
            }
        }
        else {
            io.to(data.requestee).emit("kungfu_miss");
        }
    });

    socket.on("card_spy", (selectedPlayer) => {
        io.to(selectedPlayer).emit("spy_request", socket.id);
    });

    socket.on("reveal_hand", (data) => {
        console.log(data);
    });

    socket.on("card_steal", (selectedPlayer) => {
        io.to(selectedPlayer).emit("request_hand", socket.id);
    });

    //socket.on("register_user", (data) => {
    //    const userData = { id: socket.id, name: data.tempUserName };
    //    users.push(userData);
    //});

    socket.on("send_message", (data) => {
        socket.to(data.gameId).emit("receive_message", data);    
    });

    socket.on("get_username", () => {

        if (socket.data.username !== undefined) {
            io.to(socket.id).emit("set_username", socket.data.username);
        }
        else {
            io.to(socket.id).emit("set_username", 0);
        }
    });

    //socket.on("shuffle", () => { // Fisher Yates aka Knuth shuffle
    //    let deck = [0, 0, 0, 1, 1, 1, 2, 4, 4, 7, 9, 10, 10, 11, 12, 13, 14, 15];
    //    deck = shuffleCards(deck);
    //    const lockBoxHand = deck.splice(0, 6);
    //    deck = deck.concat([6, 6, 8, 13, 13, 13, 16, 16, 16]);
    //    deck = shuffleCards(deck);
    //    const player1 = deck.splice(0, 6);
    //    const player2 = deck.splice(0, 6);
    //    const player3 = deck.splice(0, 6);
    //    const newNewDeck = lockBoxHand.map((c) => {
    //        return cards[c];
    //    });
    //    const newPlayer1 = player1.map((c) => {
    //        return cards[c];
    //    });
    //    const newPlayer2 = player2.map((c) => {
    //        return cards[c];
    //    });
    //    const newPlayer3 = player3.map((c) => {
    //        return cards[c];
    //    });
    //    const newoDeck = deck.map((c) => {
    //        return cards[c];
    //    });
    //});
    socket.on("discard", (card) => {
        gameStatus[socket.data.room].discarded.push(card);
        console.log(gameStatus[socket.data.room].discarded);
    });

    socket.on("setup_completed", (gameId) => {
        const clients = io.sockets.adapter.rooms.get(gameId);
        const numClients = clients ? clients.size : 0;
        gameStatus[gameId].setup++;
        if (gameStatus[gameId].setup === numClients) {
            io.in(gameId).emit("done_discarding");
        }
    });

    socket.on("start_game", (gameId) => {
        let deck = [0, 0, 0, 1, 1, 1, 2, 4, 4, 7, 9, 10, 10, 11, 12, 13, 14, 15];
        const clients = io.sockets.adapter.rooms.get(gameId);
        const clientsArr = [...clients];
        const numClients = clients ? clients.size : 0;
        if (numClients >= 6) {
            deck = deck.concat([0, 0, 0, 0, 0, 1, 2, 2, 3, 5, 7, 9, 9, 10, 11, 12, 15, 15]);
            deck = shuffleCards(deck);
            const lockboxHand = deck.splice(0, 6);
            deck = deck.concat([6, 6, 6, 8, 8, 13, 13, 13, 13, 13, 13, 16, 16, 16, 16, 16]);
            deck = shuffleCards(deck);
            const firstPlayer = Math.floor(Math.random() * 6)
            const player1Hand = deck.splice(0, 6);
            io.to(clientsArr[0]).emit("update_hand", defineCards(player1Hand));
            const player2Hand = deck.splice(0, 6);
            io.to(clientsArr[1]).emit("update_hand", defineCards(player2Hand));
            const player3Hand = deck.splice(0, 6);
            io.to(clientsArr[2]).emit("update_hand", defineCards(player3Hand));
            const player4Hand = deck.splice(0, 6);
            io.to(clientsArr[3]).emit("update_hand", defineCards(player4Hand));
            const player5Hand = deck.splice(0, 6);
            io.to(clientsArr[4]).emit("update_hand", defineCards(player5Hand));
            const player6Hand = deck.splice(0, 6);
            io.to(clientsArr[5]).emit("update_hand", defineCards(player6Hand));
            gameStatus[gameId] = { setup: 0, lockbox: defineCards(lockboxHand), deck: defineCards(deck), discarded: [] };
            io.in(gameId).emit("setup_game", { numClients, firstPlayer });
        }
        else if (numClients === 5) {
            deck = deck.concat([0, 0, 0, 0, 2, 2, 5, 7, 9, 10, 15]);
            deck = shuffleCards(deck);
            const lockboxHand = deck.splice(0, 6);
            deck = deck.concat([6, 6, 6, 8, 8, 13, 13, 13, 13, 13, 16, 16, 16, 16, 16]);
            deck = shuffleCards(deck);
            const firstPlayer = Math.floor(Math.random() * 5)
            const player1Hand = deck.splice(0, 6);
            io.to(clientsArr[0]).emit("update_hand", defineCards(player1Hand));
            const player2Hand = deck.splice(0, 6);
            io.to(clientsArr[1]).emit("update_hand", defineCards(player2Hand));
            const player3Hand = deck.splice(0, 6);
            io.to(clientsArr[2]).emit("update_hand", defineCards(player3Hand));
            const player4Hand = deck.splice(0, 6);
            io.to(clientsArr[3]).emit("update_hand", defineCards(player4Hand));
            const player5Hand = deck.splice(0, 6);
            io.to(clientsArr[4]).emit("update_hand", defineCards(player5Hand));
            gameStatus[gameId] = { setup: 0, lockbox: defineCards(lockboxHand), deck: defineCards(deck), discarded: [] };
            io.in(gameId).emit("setup_game", { numClients, firstPlayer });
        }
        else if (numClients === 4) {
            deck = deck.concat([0, 0, 2, 4, 7, 9, 15]);
            deck = shuffleCards(deck);
            const lockboxHand = deck.splice(0, 6);
            deck = deck.concat([6, 6, 8, 13, 13, 13, 13, 16, 16, 16, 16]);
            deck = shuffleCards(deck);
            const firstPlayer = Math.floor(Math.random() * 4)
            const player1Hand = deck.splice(0, 6);
            io.to(clientsArr[0]).emit("update_hand", defineCards(player1Hand));
            const player2Hand = deck.splice(0, 6);
            io.to(clientsArr[1]).emit("update_hand", defineCards(player2Hand));
            const player3Hand = deck.splice(0, 6);
            io.to(clientsArr[2]).emit("update_hand", defineCards(player3Hand));
            const player4Hand = deck.splice(0, 6);
            io.to(clientsArr[3]).emit("update_hand", defineCards(player4Hand));
            gameStatus[gameId] = { setup: 0, lockbox: defineCards(lockboxHand), deck: defineCards(deck), discarded: [] };
            io.in(gameId).emit("setup_game", { numClients, firstPlayer });
        }
        else if (numClients === 3) {
            deck = shuffleCards(deck);
            const lockboxHand = deck.splice(0, 6);
            deck = deck.concat([6, 6, 8, 13, 13, 13, 16, 16, 16]);
            deck = shuffleCards(deck);
            const firstPlayer = Math.floor(Math.random() * 3)
            const player1Hand = deck.splice(0, 6);
            io.to(clientsArr[0]).emit("update_hand", defineCards(player1Hand));
            const player2Hand = deck.splice(0, 6);
            io.to(clientsArr[1]).emit("update_hand", defineCards(player2Hand));
            const player3Hand = deck.splice(0, 6);
            io.to(clientsArr[2]).emit("update_hand", defineCards(player3Hand));
            gameStatus[gameId] = { setup: 0, lockbox: defineCards(lockboxHand), deck: defineCards(deck), discarded: [] };
            io.in(gameId).emit("setup_game", { numClients, firstPlayer });
        }
        else {
            io.in(gameId).emit("setup_game", { numClients: 0 });
        }
    });

    socket.on("disconnecting", async () => {
        for (const room of socket.rooms) {
            if (room !== socket.id) {
                const clients = io.sockets.adapter.rooms.get(room);
                const sockets = await io.in(room).fetchSockets();
                const clientsArr = [...clients];
                const index = clientsArr.indexOf(socket.id);
                clientsArr.splice(index, 1);
                const clientNames = clientsArr.map((id, i) => {
                    return { id: id, name: sockets[i].data.username }
                });
                io.in(room).emit("user_list", clientNames);
                const numClients = clients ? clients.size : 0;
                io.in(room).emit("user_log", numClients-1);
            }
        }
    });
});

server.listen(3001, () => {
    console.log("hello frinend");
});

