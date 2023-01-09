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

const field = [
    ["x", "x", "x", "x", "x", "x", "x", "x", "x", "c", "c", "c"],
    ["x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "c", "c"],
    ["x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "c"],
    ["x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x"],
    ["x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x"],
    ["c", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x"],
    ["c", "c", "x", "x", "x", "x", "x", "n", "n", "n", "n", "n"],
]
const die = ["1d", "2", "1r", "1", "3", "4"]
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

const remakeDeck = (gameId) => {
    const discardedDeck = gameStatus[gameId].discarded.splice(0, gameStatus[gameId].discarded.length);
    const existingDeck = gameStatus[gameId].deck.splice(0, gameStatus[gameId].deck.length);
    const shuffledDeck = shuffleCards([...discardedDeck]);
    gameStatus[gameId].deck = [...shuffledDeck, ...existingDeck];
}

io.on("connection", (socket) => {

    /* Event join_room is called whenver a user sets their username and joins a room. The event updates the users socket
     by setting its username, connected room, current player status, and first and second hand statuses. After succesfully joining
     the currently logged in users get the updated list of connected users in the room. */
    socket.on("join_room", async (data) => {
        socket.data.username = data.tempUserName;
        socket.data.room = data.gameId;
        socket.data.status = 0;
        /* 0 - healthy, 1 - injured, 2 - poisoned, 3 - handcuffed,
         * 4 - handcuffed x2, 5 - injured and poisoned, 6 - injured and hancuffed, 
         * 7 - injured and handcuffed x2, 8 - poisoned and handcuffed, 9 - poisoned and handcuffed x2,
         * 10 - injured, poisoned, and handcuffed, 11 - injured, poisoned, and handcuffed x2, 12 - out of game */
        socket.data.firsthand = 0;
        socket.data.secondhand = 0;
        socket.join(data.gameId);
        const sockets = await io.in(data.gameId).fetchSockets();
        const clients = io.sockets.adapter.rooms.get(data.gameId);
        const numClients = clients ? clients.size : 0;
        io.in(data.gameId).emit("user_log", numClients); // sends an event to update the number of currently connected players in room
        const clientsArr = [...clients];
        const clientNames = clientsArr.map((id, i) => {
            return {
                id: id, name: sockets[i].data.username, status: sockets[i].data.status,
                firsthand: sockets[i].data.firsthand, secondhand: sockets[i].data.secondhand
            }
        });
        io.in(data.gameId).emit("user_list", clientNames); // sends an event to update the list of connected players and their different attributes
    });

    /* Event leave_room is called whenver a user presses the Leave room button. The event disconnects the current socket from the game room. 
     After leaving the currently logged in users get the updated list of connected users in the room. */
    socket.on("leave_room", async (gameId) => {
        socket.leave(gameId);
        const sockets = await io.in(gameId).fetchSockets();
        const clients = io.sockets.adapter.rooms.get(gameId);
        const numClients = clients ? clients.size : 0;
        io.in(gameId).emit("user_log", numClients); // sends an event to update the number of currently connected players in room
        if (numClients > 0) {
            const clientsArr = [...clients];
            const clientNames = clientsArr.map((id, i) => {
                return {
                    id: id, name: sockets[i].data.username, status: sockets[i].data.status,
                    firsthand: sockets[i].data.firsthand, secondhand: sockets[i].data.secondhand
                }
            });
            io.in(gameId).emit("user_list", clientNames); // sends an event to update the list of connected players and their different attributes
        }
    });

    /* Event card_kungfu is called whenever a user plays the Kung Fu action. The event requests the current hand of the specified player. */
    socket.on("card_kungfu", (selectedPlayer) => {
        io.to(selectedPlayer).emit("kungfu_request", socket.id);
    });

    /* Event kungfu_reply is called when the current of hand of kungfu requested specified player is sent to the server. Based on the specified
     players current hand either a weapon can get discarded and a flannel is drawn, a kungfu is discarded and a flannel is drawn because the 
     specified player does not have a weapon, or both players discard kungfu cards deflecting one another. */
    socket.on("kungfu_reply", async (data) => {
        const shuffledHand = shuffleCards(data.currentHand); // shuffle hand to determine randomly which card to discard
        const weaponIndex = shuffledHand.indexOf("revolver") > shuffledHand.indexOf("knife") 
            ? shuffledHand.indexOf("revolver") : shuffledHand.indexOf("knife"); // in case of multiple weapons, based on shuffle discard either revolver or knife
        if (weaponIndex !== -1) { // if the selected player has a weapon
            const kungfuIndex = data.currentHand.indexOf("kungfu");
            if (kungfuIndex !== -1) { // if the selected player has a kungfu card the selected player draws a card and the player who played the kungfu from the start draws a flannel
                io.to(data.requestee).emit("draw_flannel");
                if (gameStatus[socket.data.room].deck.length < 1) {
                    await remakeDeck(socket.data.room); // if the draw pile is empty, shuffle the discarded cards back in deck
                }
                const newCard = gameStatus[socket.data.room].deck.pop();
                io.to(socket.id).emit("replace_indexed_card", { oldCard: "kungfu", discard: true, newCard: newCard });
            }
            else { // discard one of the selected players weapons and kungfu action player draws a new card from deck
                if (gameStatus[socket.data.room].deck.length < 1) {
                    await remakeDeck(socket.data.room); // if the draw pile is empty, shuffle the discarded cards back in deck
                }
                const newCard = gameStatus[socket.data.room].deck.pop();
                io.to(data.requestee).emit("replace_card", newCard);
                io.to(socket.id).emit("draw_indexed_flannel", { oldCard: shuffledHand[weaponIndex], discard: true });
            }
        }
        else { // if the player misses the kungfu card, they draw a flannel
            io.to(data.requestee).emit("draw_flannel");
        }
        io.to(socket.data.room).emit("lose_altitude"); // after resolving the action, the altitude is dropped
    });

    /* Event card_spy is called whenever a user plays the Spy action. The event request the current hand of the specified player. */
    socket.on("card_spy", (selectedPlayer) => {
        io.to(selectedPlayer).emit("spy_request", socket.id);
    });

    /* Event spy_reply is called whenever a user send an answer from the spy request. The event send the requested card list to the card user. */
    socket.on("spy_reply", async (data) => {
        io.to(data.requestee).emit("spy_reveal", data.currentHand);
        if (gameStatus[socket.data.room].deck.length < 1) {
            await remakeDeck(socket.data.room);
        }
        const newCard = gameStatus[socket.data.room].deck.pop();
        io.to(data.requestee).emit("replace_card", newCard);
        io.to(socket.data.room).emit("lose_altitude"); // after resolving the action, the altitude is dropped
    });

    /* Event card_revolver is called whenever a user plays the Revolver action. The event sends a request to the selected
     * player for their current hand*/
    socket.on("card_revolver", (selectedPlayer) => {
        io.to(selectedPlayer).emit("revolver_request", socket.id);
    });

    /* Event revolver_reply is called whenever the server receives the reply from the revolver request. 
     * The event updates the player status and remove a card from the taken player */
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
            return {
                id: sockets[i].id, name: sockets[i].data.username, status: sockets[i].data.status,
                firsthand: sockets[i].data.firsthand, secondhand: sockets[i].data.secondhand
            }
        })
        io.in(socket.data.room).emit("user_list", clientNames);
        io.to(data.selectedPlayer).emit("revolver_injured", data.stolenCard)
        io.to(socket.data.room).emit("lose_altitude"); // after resolving the action, the altitude is dropped
    });

    /* Event card_poison is called whenever a user plays the Poison action. */
    socket.on("card_poison", async (selectedPlayer) => {
        const sockets = await io.in(socket.data.room).fetchSockets();
        const clients = io.sockets.adapter.rooms.get(socket.data.room);
        const clientsArr = [...clients];
        const poisonedPlayer = clientsArr.indexOf(selectedPlayer);
        sockets[poisonedPlayer].data.status = 2;
        const clientNames = clientsArr.map((c, i) => {
            return {
                id: sockets[i].id, name: sockets[i].data.username, status: sockets[i].data.status,
                firsthand: sockets[i].data.firsthand, secondhand: sockets[i].data.secondhand
            }
        })
        io.in(socket.data.room).emit("user_list", clientNames);
        io.to(socket.id).emit("draw_flannel");
        io.to(socket.data.room).emit("lose_altitude"); // after resolving the action, the altitude is dropped
    });

    /* Event card_antidote is called whenever a user plays the Antidote action. */
    socket.on("card_antidote", async (selectedPlayer) => {
        const sockets = await io.in(socket.data.room).fetchSockets();
        const clients = io.sockets.adapter.rooms.get(socket.data.room);
        const clientsArr = [...clients];
        const curedPlayer = clientsArr.indexOf(selectedPlayer);
        sockets[curedPlayer].data.status = 0;
        const clientNames = clientsArr.map((c, i) => {
            return {
                id: sockets[i].id, name: sockets[i].data.username, status: sockets[i].data.status,
                firsthand: sockets[i].data.firsthand, secondhand: sockets[i].data.secondhand
            }
        });
        io.in(socket.data.room).emit("user_list", clientNames);
        io.to(socket.id).emit("draw_flannel");
        io.to(socket.data.room).emit("lose_altitude"); // after resolving the action, the altitude is dropped
    });

    /* Event card_key is called whenever a user plays the Key action. */
    socket.on("card_key", async (data) => {
        const sockets = await io.in(socket.data.room).fetchSockets();
        if (data.selectedPlayer == "lockbox") {
            const lockbox = gameStatus[socket.data.room].lockbox;
            io.to(socket.id).emit("key_lockbox", lockbox)
        }
        else {
            const clients = io.sockets.adapter.rooms.get(socket.data.room);
            const clientsArr = [...clients];
            const uncuffedPlayer1 = clientsArr.indexOf(data.selectedPlayer);
            const uncuffedPlayer2 = clientsArr.indexOf(data.secondSelectedPlayer);
            sockets[uncuffedPlayer1].data.status = 0;
            sockets[uncuffedPlayer2].data.status = 0;
            const clientNames = clientsArr.map((c, i) => {
                return {
                    id: sockets[i].id, name: sockets[i].data.username, status: sockets[i].data.status,
                    firsthand: sockets[i].data.firsthand, secondhand: sockets[i].data.secondhand
                }
            });
            io.in(socket.data.room).emit("key_release", {firsthand:data.selectedPlayer, secondhand:data.secondSelectedPlayer});
            io.in(socket.data.room).emit("user_list", clientNames);
            io.to(socket.id).emit("draw_flannel");
            io.to(socket.data.room).emit("lose_altitude"); // after resolving the action, the altitude is dropped
        }
    });

    socket.on("key_complete", (card) => {
        const cardIndex = gameStatus[socket.data.room].lockbox.indexOf(card);
        gameStatus[socket.data.room].lockbox.splice(cardIndex, 1);
        io.to(socket.data.room).emit("lose_altitude"); // after resolving the action, the altitude is dropped
    });

    socket.on("card_handcuffs", async (data) => {
        const sockets = await io.in(socket.data.room).fetchSockets();
        const clients = io.sockets.adapter.rooms.get(socket.data.room);
        const clientsArr = [...clients];
        const cuffPlayer1 = clientsArr.indexOf(data.selectedPlayer);
        const cuffPlayer2 = clientsArr.indexOf(data.secondSelectedPlayer);
        if (sockets[cuffPlayer1].data.firsthand === 0) {
            sockets[cuffPlayer1].data.firsthand = data.secondSelectedPlayer;
        }
        else {
            sockets[cuffPlayer1].data.secondhand = data.secondSelectedPlayer;
        }
        if (sockets[cuffPlayer2].data.firsthand === 0) {
            sockets[cuffPlayer2].data.firsthand = data.selectedPlayer;
        }
        else {
            sockets[cuffPlayer2].data.secondhand = data.selectedPlayer;
        }
        sockets[cuffPlayer1].data.status = 3;
        sockets[cuffPlayer2].data.status = 3;
        const clientNames = clientsArr.map((c, i) => {
            return {
                id: sockets[i].id, name: sockets[i].data.username, status: sockets[i].data.status,
                firsthand: sockets[i].data.firsthand, secondhand: sockets[i].data.secondhand
            }
        });
        io.in(socket.data.room).emit("handcuffs_list", { firsthand: data.selectedPlayer, secondhand: data.secondSelectedPlayer });
        io.in(socket.data.room).emit("user_list", clientNames);
        io.to(socket.id).emit("draw_flannel");
        io.to(socket.data.room).emit("lose_altitude"); // after resolving the action, the altitude is dropped
    });

    socket.on("card_steal", (selectedPlayer) => {
        io.to(selectedPlayer).emit("steal_request", socket.id);
    });

    socket.on("steal_reply", (data) => {
        if (data.currentHand.indexOf("knife") !== -1) {
            io.to(data.requestee).emit("draw_flannel");
            io.to(socket.data.room).emit("lose_altitude"); // after resolving the action, the altitude is dropped
        }
        else {
            const shuffledHand = shuffleCards(data.currentHand);
            const options = shuffledHand.splice(0, 2);
            io.to(data.requestee).emit("steal_select", { requestee: socket.id, options });
        }
    });

    socket.on("steal_complete", (data) => {
        io.to(data.selectedPlayer).emit("steal_update", data.stolenCard);
        io.to(socket.data.room).emit("lose_altitude");
    });

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

    socket.on("discard", (card) => {
        gameStatus[socket.data.room].discarded.push(card);
    });

    socket.on("setup_completed", (gameId) => {
        const clients = io.sockets.adapter.rooms.get(gameId);
        const numClients = clients ? clients.size : 0;
        gameStatus[gameId].setup++;
        if (gameStatus[gameId].setup === numClients) {
            io.in(gameId).emit("done_discarding");
            gameStatus[gameId].setup = 0;
        }
    });

    socket.on("initiate_draw", async (altitude) => {
        let cardCount;
        if (altitude > 190000) {
            cardCount = 1;
        }
        else if (altitude > 13000) {
            cardCount = 2;
        }
        else if (altitude > 7000) {
            cardCount = 3;
        }
        else if (altitude > 1000) {
            cardCount = 4;
        }
        if (gameStatus[socket.data.room].deck.length < cardCount) {
            await remakeDeck(socket.data.room);
        }
        const sendCards = gameStatus[socket.data.room].deck.splice(gameStatus[socket.data.room].deck.length - cardCount, cardCount);
        io.to(socket.id).emit("draw_deck", sendCards);
    });

    socket.on("initiate_trade", (player) => {
        io.to(player).emit("trade_offer", (socket.id));
    });

    socket.on("setup_trade", (card) => {
        gameStatus[socket.data.room].temp.push({ socket: socket.id, card: card });
        gameStatus[socket.data.room].setup++;
        if (gameStatus[socket.data.room].setup === 2) {
            const trade1 = gameStatus[socket.data.room].temp.pop();
            const trade2 = gameStatus[socket.data.room].temp.pop();
            gameStatus[socket.data.room].setup = 0;
            io.to(trade1.socket).emit("complete_trade", trade2.card);
            io.to(trade2.socket).emit("complete_trade", trade1.card);
        }
    });

    socket.on("cancel_trade", (player) => {
        socket.to(player).emit("decline_trade");
        if (gameStatus[socket.data.room].setup === 1) {
            gameStatus[socket.data.room].setup = 0;
            gameStatus[socket.data.room].temp.pop();
        }
    });

    socket.on("end_turn", (data) => {
        const clients = io.sockets.adapter.rooms.get(socket.data.room);
        const numClients = clients ? clients.size : 0;
        if (numClients - 1 === data.order) {
            io.in(socket.data.room).emit("next_turn", 0);
        }
        else {
            io.in(socket.data.room).emit("next_turn", data.order+1);
        }
        if (!data.action) {
            io.in(socket.data.room).emit("lose_altitude"); // after resolving the action, the altitude is dropped
        }
    });

    socket.on("jump_vote", (vote) => {
        const clients = io.sockets.adapter.rooms.get(socket.data.room);
        const numClients = clients ? clients.size : 0;
        gameStatus[socket.data.room].setup++;
        if (gameStatus[socket.data.room].temp.length === 0) {
            gameStatus[socket.data.room].temp.push(0);
        }
        if (vote) {
            gameStatus[socket.data.room].temp[0]++;
        }
        if (gameStatus[socket.data.room].setup === numClients) {
            gameStatus[socket.data.room].setup = 0;
            const voteTally = gameStatus[socket.data.room].temp.pop();
            if (voteTally > Math.floor(numClients / 2)) {
                io.in(socket.data.room).emit("vote_positive");
            }
            else {
                io.in(socket.data.room).emit("vote_negative");
            }
        }
    });

    socket.on("parachute_number", (number) => {
        const clients = io.sockets.adapter.rooms.get(socket.data.room);
        const numClients = clients ? clients.size : 0;
        gameStatus[socket.data.room].setup++;
        gameStatus[socket.data.room].temp.push({ socket: socket.id, number: number });
        if (gameStatus[socket.data.room].setup === numClients) {
            gameStatus[socket.data.room].setup = 0;
            const parachuteCount = gameStatus[socket.data.room].temp.splice(0, numClients);
            io.in(socket.data.room).emit("set_parachutes", parachuteCount);
            if (parachuteCount.filter(p => p.number > 1).length === 0) {
                const clients = io.sockets.adapter.rooms.get(socket.data.room);
                const clientsArr = [...clients];
                const parachuteless = parachuteCount.filter(p => p.number === 0);
                parachuteless.forEach((p) => {
                    const parachuteIndex = clientsArr.indexOf(p.socket);
                    gameStatus[socket.data.room].temp.push({ socket: p.socket, number: p.number, index: parachuteIndex });
                    gameStatus[socket.data.room].status++
                })
                const newField = field.map((c, i) => {
                    if (i === 0) {
                        const planePosition = c.map((c2, i2) => {
                            if (i2 === 0) {
                                return "p";
                            }
                            return c2;
                        });
                        return planePosition;
                    }
                    return c;
                });
                const randomIndex = gameStatus[socket.data.room].temp[Math.floor(Math.random() * gameStatus[socket.data.room].temp.length)].index;
                io.in(socket.data.room).emit("ready_landing", { newField, randomIndex });
            }
        }
    });


    socket.on("parachute_share", async (data) => {
        const parachuteData = data.playerParachutes.map((c) => {
            if (data.player == c.socket) {
                c.number++
            }
            else if (c.socket == socket.id) {
                c.number--;
            }
            return c;
        })
        if (parachuteData.filter(p => p.number > 1).length === 0) {
            const clients = io.sockets.adapter.rooms.get(socket.data.room);
            const clientsArr = [...clients];
            const parachuteless = parachuteData.filter(p => p.number === 0);
            parachuteless.forEach((p) => {
                const parachuteIndex = clientsArr.indexOf(p.socket);
                gameStatus[socket.data.room].temp.push({ socket: p.socket, number: p.number, index: parachuteIndex });
                gameStatus[socket.data.room].status++;
            })
            const newField = field.map((c, i) => {
                if (i === 0) {
                    const planePosition = c.map((c2, i2) => {
                        if (i2 === 0) {
                            return "p";
                        }
                        return c2;
                    });
                    return planePosition;
                }
                return c;
            });
            const randomIndex = Math.floor(Math.random() * gameStatus[socket.data.room].status);
            io.in(socket.data.room).emit("ready_landing", { newField, randomIndex});
        }
        io.in(socket.data.room).emit("set_parachutes", parachuteData);
    });

    socket.on("update_field", (data) => {
        const die1 = die[Math.floor(Math.random() * 6)];
        const die2 = die[Math.floor(Math.random() * 6)];
        io.in(socket.data.room).emit("set_dice", { die1, die2 });
    });

    socket.on("move_plane", (position) => {
        const newField = field.map((c, i) => {
            if (position.vertical === i) {
                const planePosition = c.map((c2, i2) => {
                    if (position.horizontal === i2) {
                        return "p"
                    }
                    return c2
                });
                return planePosition;
            }
            return c;
        });
        if (position.vertical === 6 && position.horizontal >= 7 && position.horizontal <= 11) {
            io.in(socket.data.room).emit("final_stretch", { newField, position });
        }
        else if (position.vertical > 6 || position.horizontal > 11) {
            io.in(socket.data.room).emit("plane_crash");
        }
        else {
            io.in(socket.data.room).emit("update_plane", { newField, position });
        }
    })

    socket.on("hit_breaks", (movement) => {
        if (movement > 11) {
            io.in(socket.data.room).emit("plane_crash");
        }
        else {
            io.in(socket.data.room).emit("plane_landed");
        }
    }) 

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
            gameStatus[gameId] = {
                setup: 0, lockbox: defineCards(lockboxHand),
                deck: defineCards(deck), discarded: [], temp: []
            };
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
            gameStatus[gameId] = {
                setup: 0, lockbox: defineCards(lockboxHand),
                deck: defineCards(deck), discarded: [], temp: []
            };
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
            gameStatus[gameId] = {
                setup: 0, lockbox: defineCards(lockboxHand),
                deck: defineCards(deck), discarded: [], temp: []
            };
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
            gameStatus[gameId] = {
                setup: 0, lockbox: defineCards(lockboxHand),
                deck: defineCards(deck), discarded: [], temp: []
            };
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
                    return {
                        id: id, name: sockets[i].data.username, status: sockets[i].data.status,
                        firsthand: sockets[i].data.firsthand, secondhand: sockets[i].data.secondhand
                    }
                });
                io.in(room).emit("user_list", clientNames);
                const numClients = clients ? clients.size : 0;
                io.in(room).emit("user_log", numClients-1);
            }
        }
    });
});

server.listen(3001, () => {
    console.log("Connected");
});

