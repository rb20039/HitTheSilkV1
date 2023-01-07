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
        socket.data.status = 0; // 0 - healthy, 1 - injured, 2 - poisoned, 3 - injured and poisoned, 4 - out of game
        socket.join(data.gameId);
        const sockets = await io.in(data.gameId).fetchSockets();
        const clients = io.sockets.adapter.rooms.get(data.gameId);
        const numClients = clients ? clients.size : 0;
        io.in(data.gameId).emit("user_log", numClients);
        const clientsArr = [...clients];
        const clientNames = clientsArr.map((id, i) => {
            return { id: id, name: sockets[i].data.username, status: sockets[i].data.status }
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
                return { id: id, name: sockets[i].data.username, status: sockets[i].data.status }
            });
            io.in(gameId).emit("user_list", clientNames);
        }
    });

    socket.on("card_kungfu", (selectedPlayer) => {
        io.to(selectedPlayer).emit("kungfu_request", socket.id);
    });

    socket.on("kungfu_reply", (data) => {
        const shuffledHand = shuffleCards(data.currentHand);
        const weaponIndex = shuffledHand.indexOf("revolver") > shuffledHand.indexOf("knife") ? shuffledHand.indexOf("revolver") : shuffledHand.indexOf("knife");
        if (weaponIndex !== -1) {
            const kungfuIndex = data.currentHand.indexOf("kungfu");
            if (kungfuIndex !== -1) {
                io.to(data.requestee).emit("draw_flannel");
                const newCard = gameStatus[socket.data.room].deck.pop();
                io.to(socket.id).emit("replace_indexed_card", { oldCard:"kungfu", discard:true, newCard:newCard });
            }
            else {
                const newCard = gameStatus[socket.data.room].deck.pop();
                io.to(data.requestee).emit("replace_card", newCard);
                io.to(socket.id).emit("draw_indexed_flannel", { oldCard:shuffledHand[weaponIndex], discard: true });
            }
        }
        else {
            io.to(data.requestee).emit("draw_flannel");
        }
    });

    socket.on("card_spy", (selectedPlayer) => {
        io.to(selectedPlayer).emit("spy_request", socket.id);
    });

    socket.on("spy_reply", (data) => {
        console.log(data);
    });

    socket.on("card_revolver", (selectedPlayer) => {
        io.to(selectedPlayer).emit("revolver_request", socket.id);
    });

    socket.on("revolver_reply", (data) => {
        if (data.playerStatus !== 1 || data.playerStatus !== 3) {
            io.to(data.requestee).emit("revolver_select", { requestee: socket.id, options: data.currentHand });
        }
        else {
            io.to(socket.id).emit("revolver_removed");
        }
    }); 

    socket.on("revolver_complete", async (data) => {
        const sockets = await io.in(socket.data.room).fetchSockets();
        const clients = io.sockets.adapter.rooms.get(socket.data.room);
        const clientsArr = [...clients];
        const shotPlayer = clientsArr.indexOf(data.selectedPlayer);
        sockets[shotPlayer].data.status = 1;
        const clientNames = clientsArr.map((c, i) => {
            return { id: sockets[i].id, name: sockets[i].data.username, status: sockets[i].data.status }
        })
        io.in(socket.data.room).emit("user_list", clientNames);
        io.to(data.selectedPlayer).emit("revolver_injured", data.stolenCard)
    });

    socket.on("card_steal", (selectedPlayer) => {
        io.to(selectedPlayer).emit("steal_request", socket.id);
    });

    socket.on("steal_reply", (data) => {
        const shuffledHand = shuffleCards(data.currentHand);
        const options = shuffledHand.splice(0, 2);
        io.to(data.requestee).emit("steal_select", { requestee:socket.id, options }) 
    });

    socket.on("steal_complete", (data) => {
        io.to(data.selectedPlayer).emit("steal_update", data.stolenCard);
    });

    socket.on("card_poison", async (selectedPlayer) => {
        const sockets = await io.in(socket.data.room).fetchSockets();
        const clients = io.sockets.adapter.rooms.get(socket.data.room);
        const clientsArr = [...clients];
        const poisonedPlayer = clientsArr.indexOf(selectedPlayer);
        sockets[poisonedPlayer].data.status = 2;
        const clientNames = clientsArr.map((c, i) => { 
            return { id: sockets[i].id, name: sockets[i].data.username, status: sockets[i].data.status }
        })
        io.in(socket.data.room).emit("user_list", clientNames);
        io.to(socket.id).emit("draw_flannel");
    });

    //socket.on("register_user", (data) => {
    //    const userData = { id: socket.id, name: data.tempUserName };
    //    users.push(userData);
    //});/

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
        //console.log(gameStatus[socket.data.room].discarded);
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
                    return { id: id, name: sockets[i].data.username, status: sockets[i].data.status }
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

