import './App.css';
import io from 'socket.io-client';


import { useEffect, useState, useRef } from "react";
import { useParams, Navigate } from "react-router-dom";

const socket = io.connect('http://localhost:3001');

function Game() {
    const [userName, setUserName] = useState(""); // the current users set username
    const [tempUserName, setTempUserName] = useState(""); // temporary username used before joining the game room
    const [message, setMessage] = useState(""); // message before getting sent to other users
    const [userCount, setUserCount] = useState(""); // the current users connected to the game room
    const [tradee, setTradee] = useState(""); // the player with whom the user is trading with
    const [selectedPlayer, setSelectedPlayer] = useState(""); // the selected player to whom the selected card action should happpen to
    const [secondSelectedPlayer, setSecondSelectedPlayer] = useState(""); // the second selected player for actions such as "handcuffs" which requires two players
    const [usedCard, setUsedCard] = useState({ index: 0, card: "" }); // the selected card which is later used to determine and render the necessary action 
    const [altitude, setAltitude] = useState(0); // the current altitude which is used for voting times and determining the drawn card amount
    const [diceResult, setDiceResult] = useState({ die1: "", die2: "" }); // the result of thrown dice during hte Land the Plane! phase
    const [joinMessage, setJoinMessage] = useState("");
    const [keyUsed, setKeyUsed] = useState(false);
    const [playerList, setPlayerList] = useState([{ // list of players in the current active game and different attributes connected to them
        socket: "temp", // the connected socket for the user which is later used to send and receive events from the server
        name: "temp1", // the connected players username for better clarity of players
        status: 0, // the current status of the player, the list of statuses bellow
        /* 0 - healthy, 1 - injured, 2 - poisoned, 3 - handcuffed,
        * 4 - handcuffed x2, 5 - injured and poisoned, 6 - injured and hancuffed, 
        * 7 - injured and handcuffed x2, 8 - poisoned and handcuffed, 9 - poisoned and handcuffed x2,
        * 10 - injured, poisoned, and handcuffed, 11 - injured, poisoned, and handcuffed x2, 12 - out of game */
        firsthand: 0, // the first hand of the player which is used to determine if the player is handcuffed to a different player
        secondhand: 0 // the second hand of the player which is used to determine if the player is handcuffed to a different player
    },
    {
        socket: "temp",
        name: "temp2",
        status: 0,
        firsthand: 0,
        secondhand: 0
    },
    {
        socket: "temp",
        name: "temp3",
        status: 0,
        firsthand: 0,
        secondhand: 0
    },
    {
        socket: "temp",
        name: "temp4",
        status: 0,
        firsthand: 0,
        secondhand: 0
    },
    {
        socket: "temp",
        name: "temp5",
        status: 0,
        firsthand: 0,
        secondhand: 0
    },
    {
        socket: "temp",
        name: "temp6",
        status: 0,
        firsthand: 0,
        secondhand: 0
    }
    ]);
    const [lockBox, setLockBox] = useState(["temp1", "temp2", "temp3", "temp4", "temp5", "temp6"]); // the contents of the lockbox which is later used to render the lockbox and to allow to draw cards from it
    const [playerHand, setPlayerHand] = useState(["temp1", "temp2", "temp3", "temp4", "temp5", "temp6"]); // the users hand of cards used for rendering the current hand
    const [otherPlayerHand, setOtherPlayerHand] = useState(["temp1", "temp2", "temp3", "temp4"]); // a different players hand that is set when using the Spy action
    const [drawnCard, setDrawnCards] = useState(["temp1", "temp2", "temp3", "temp4"]); // drawn cards during replacing a card with a card in the deck
    const [playerParachutes, setPlayerParachutes] = useState([{ // the list of players and the amount of parachutes they have, where tandem parachute counts as 2
            socket: "temp",
            number: 0
        },
        {
            socket: "temp",
            number: 0
        },
        {
            socket: "temp",
            number: 0
        },
        {
            socket: "temp",
            number: 0
        },
        {
            socket: "temp",
            number: 0
        },
        {
            socket: "temp",
            number: 0
        }
    ]);
    const [planeField, setPlaneField] = useState(["1", "2", "3", "4", "5", "6", "7"]) // the plane field which is used to render Land the Plane! phase
    const [revolverOptions, setRevolverOptions] = useState(["", "", "", ""]); // the drawn card options from the player when using the Revolver action
    const [stealOptions, setStealOptions] = useState(["", ""]); // the steal options when the player uses the Steal action
    const [chatLog, updateChatLog] = useState([]); // the chat log of all the messages sent during the game
    const playerStatus = useRef(0); // the current players status
    const altitudeReference = useRef(0); // a reference to the current altitude
    const playerCurrentHand = useRef([]); // the list of current cards in the users hand 
    const replyPlayer = useRef(""); // player to whom an actions is sent
    const poisonedPlayer = useRef(false); // an indicator to show that a player is poisoned which is used to render the Use button for the Antidote action
    const planePosition = useRef({ horizontal: 0, vertical: 0 }); // the current position of the plane in the Land the Plane! phase
    const usedCardReference = useRef({ index: 0, card: "" }); // the reference of the last card that was used
    const actionTaken = useRef(false); // an indicator to show that an action has been taken during the turn, used to lower altitude if player ends turn without taking an action
    const parachuteLevel = useRef(0); // the amount of parachutes the player has where Tandem Parachute is counted as 2
    const handcuffPairs = useRef([]); // the pairs of handcuffed players
    const [newGame, setNewGame] = useState(false); //
    const [playerTurn, setPlayerTurn] = useState(0); 
    const [hasDrawn, setHasDrawn] = useState(false);
    const [landThePlane, setLandThePlane] = useState(false);
    const [initiateVote, setInitiateVote] = useState(false);
    const [voteSelected, setVoteSelected] = useState(false);
    const [changeInitiated, setChangeInitiated] = useState(false);
    const [tradeSelected, setTradeSelected] = useState(false);
    const [gameReady, setGameReady] = useState(false);
    const [returnToHomepage, callHomepage] = useState(false);
    const [activeGame, setActiveGame] = useState(false);
    const [finalStretch, setFinalStretch] = useState(false);
    const [planeCrash, setPlaneCrash] = useState(false);
    const [results, setResults] = useState(false);
    const { gameId } = useParams();
    const sendMessage = () => {
        socket.emit("send_message", { userName, message, gameId });
        updateChatLog((chatLog) => [...chatLog, { name: userName, msg: message }]);
    };

    // function endTurn ends the current players action and sends an event to change the players turn
    const endTurn = () => {
        socket.emit("end_turn", { order: playerTurn, action: actionTaken.current });
    }

    // function updateUserName sets the current players username and registers it in the server
    const updateUserName = () => {
        setUserName(tempUserName);
        socket.emit("join_room", { tempUserName, gameId });
    }

    // function startGames sends a request to the server, which checks if all of the conditions are met to start a game
    const startGame = () => {
        socket.emit("start_game", gameId);
    }

    // function takeFromLockBox takes a card from the lockbox and adds it to the hand, discarding the used key
    const takeFromLockBox = (card) => {
        socket.emit("key_complete", card);
        setLockBox(["temp1", "temp2", "temp3", "temp4", "temp5", "temp6"]);
        removeCard(usedCard.index, true, card);
        setUsedCard({ index: 0, card: "" });
        setKeyUsed(true);
        setSelectedPlayer("");
    }

    // function executeRevolver takes a card from the stolen players hand and discards a bullet, sending the rest of the hand back to the server
    const executeRevolver = (stolenCard) => {
        socket.emit("revolver_complete", { stolenCard, selectedPlayer });
        setRevolverOptions(["", "", "", ""]);
        removeCard(playerCurrentHand.current.indexOf("bullet"), true, stolenCard);
        setUsedCard({ index: 0, card: "" });
        setSelectedPlayer("");
    }

    // function stealCard completes the Steal action taking one card and returning the one to the selected player
    const stealCard = (stolenCard) => {
        socket.emit("steal_complete", { stolenCard, stealOptions, selectedPlayer });
        setStealOptions(["", ""]);
        removeCard(usedCard.index, true, stolenCard);
        setUsedCard({ index: 0, card: "" });
        setSelectedPlayer("");
    }

    // function rollDice send a request to the server for dice rolls
    const rollDice = () => {
        socket.emit("update_field", planePosition.current);
    }

    // function drawCard replaces a card with a card drawn from the deck
    const drawCard = (card) => {
        setChangeInitiated(true);
        setUsedCard(card);
        socket.emit("initiate_draw", altitude);
    }

    // function removeCuffs removes a specific link of handcuffs
    const removeCuffs = (link) => {
        setKeyUsed(true);
        setSelectedPlayer(link.firsthand);
        setSecondSelectedPlayer(link.secondhand);
    }

    // function initateTrade set the status of the tradee and set up the trading view
    const initiateTrade = (player) => {
        socket.emit("initiate_trade", player);
        setTradee(player);
    }

    // function completeDraw takes the drawn card and sets in the hand, discarding the rest of the draw cards
    const completeDraw = (card) => {
        setHasDrawn(true);
        drawnCard.splice(drawnCard.indexOf(card), 1);
        if (usedCard.index === "flannel") {
            removeCard(usedCard.index, false, card);
        }
        else {
            removeCard(usedCard.index, true, card);
        }
        drawnCard.forEach((c) => {
            if (c !== 0) {
                socket.emit("discard", c);
            }
        });
        setUsedCard({ index: 0, card: "" });
        setChangeInitiated(false);
        setDrawnCards(["temp1", "temp2", "temp3", "temp4"]);
    }

    // function setupTrade send the requested card and player to the server, which later is used to finalize the trade action
    const setupTrade = (card, index) => {
        setTradeSelected(true);
        usedCardReference.current = ({ index: index, card: card });
        socket.emit("setup_trade", card);
    }

    // function cancelTrade closes the trading view and stop the trading action
    const cancelTrade = () => {
        socket.emit("cancel_trade", tradee);
        setTradee("");
        setTradeSelected(false);
    }

    // function vote sends the players vote to the server which later determines the vote results
    const vote = (vote) => {
        setVoteSelected(true);
        socket.emit("jump_vote", vote);
    }

    // function shareParachute updates a different player status to have an active parachute if a player has more than one parachute
    const shareParachute = (player) => {
        socket.emit("parachute_share", { player, playerParachutes });
    }

    // function hitBreak changes the horizontal movement of the plane and determines if the planes has crashed or successfully landed
    const hitBreaks = (die) => {
        const movement = planePosition.current;
        if (die === "1d") {
            movement.horizontal += 5;
        }
        else if (die === "1r") {
            movement.horizontal++;
        }
        else {
            movement.horizontal += parseInt(die);
        }
        setDiceResult({ die1: "", die2: "" });
        socket.emit("hit_breaks", movement.horizontal)
        planePosition.current = movement;
    }

    // funciton movePlane takes the dice rolls and updates the current position of the plane, then sends it to the server to update position for all players
    const movePlane = (die1, die2) => {
        const movement = planePosition.current;
        if (die1 === "1d") {
            movement.vertical++;
            if (die2 === "1d") {
                movement.vertical++;
            }
            else if (die2 === "1r") {
                movement.horizontal++
            }
            else {
                movement.horizontal += parseInt(die2);
            }
        }
        else if (die1 === "1r") {
            movement.horizontal++;
            if (die2 === "1d") {
                movement.vertical++;
            }
            else if (die2 === "1r") {
                movement.horizontal++
            }
            else {
                movement.vertical += parseInt(die2);
            }
        }
        else if (die2 === "1d") {
            movement.vertical++;
            if (die1 === "1d") {
                movement.vertical++;
            }
            else if (die1 === "1r") {
                movement.horizontal++;
            }
            else {
                movement.horizontal += parseInt(die1);
            }
        }
        else if (die2 === "1r") {
            movement.horizontal++;
            if (die1 === "1d") {
                movement.vertical++;
            }
            else if (die1 === "1r") {
                movement.horizontal++;
            }
            else {
                movement.vertical += parseInt(die1);
            }
        }
        else {
            movement.horizontal += parseInt(die1);
            movement.vertical += parseInt(die2);
        }
        setDiceResult({ die1: "", die2: "" });
        socket.emit("move_plane", movement)
        planePosition.current = movement;
    }

    // function removeCard updates the current hand by either replacing a card with a specific card or a flannel, and either discards or removes the used card from play
    function removeCard(index, discardIndicator = true, card) {
        
        actionTaken.current = true;
        if (discardIndicator) {
            socket.emit("discard", playerCurrentHand.current[index]);
        }
        playerCurrentHand.current.splice(index, 1);
        if (playerCurrentHand.current.length === 4) {
            setNewGame(true);
            actionTaken.current = false;
            socket.emit("setup_completed", gameId);
        }
        else if (playerCurrentHand.current.length < 4 && playerStatus.current !== 1) {
            if (card !== undefined) {
                playerCurrentHand.current.push(card);
            }
            else {
                playerCurrentHand.current.push("flannel");
            }
        }
        else if (playerCurrentHand.current.length < 3) {
            if (card !== undefined) {
                playerCurrentHand.current.push(card);
            }
            else {
                playerCurrentHand.current.push("flannel");
            }
        }
        const newHand = playerHand.map((c, i) => {
            if (playerCurrentHand.current[i] !== undefined) {
                return playerCurrentHand.current[i];
            }
        });
        setPlayerHand(newHand);
    }

    useEffect(() => {
        if (usedCard.card !== "") {
            usedCardReference.current = usedCard;
            if (usedCard.card === "kungfu") {
                if (selectedPlayer !== "") {
                    socket.emit("card_kungfu", selectedPlayer); // send to server if the played card is KungFu
                }
            }
            else if (usedCard.card === "spy") {
                if (selectedPlayer !== "") {
                    socket.emit("card_spy", selectedPlayer); // send to server if the played card is Spy
                }
            }
            else if (usedCard.card === "revolver") {
                if (selectedPlayer !== "") {
                    socket.emit("card_revolver", selectedPlayer); // send to server if the played card is Revolver
                }
            }
            else if (usedCard.card === "poison") {
                if (selectedPlayer !== "") {
                    socket.emit("card_poison", selectedPlayer); // send to server if the played card is Poison
                }
            }
            else if (usedCard.card === "antidote") {
                if (selectedPlayer !== "") {
                    socket.emit("card_antidote", selectedPlayer); // send to server if the played card is Antidote
                }
            }
            else if (usedCard.card === "key") {
                if (selectedPlayer === "lockbox") {
                    socket.emit("card_key", { selectedPlayer, secondSelectedPlayer }); // send to server if the played card is Key to open lockbox
                }
                else if (secondSelectedPlayer !== "") {
                    socket.emit("card_key", { selectedPlayer, secondSelectedPlayer }); // send to server if the played card is Key to open cuffs
                    setSecondSelectedPlayer("");
                }
            }
            else if (usedCard.card === "handcuffs") {
                if (selectedPlayer !== "") {
                    if (secondSelectedPlayer !== "") {
                        socket.emit("card_handcuffs", { selectedPlayer, secondSelectedPlayer }); // send to server if the played card is Handcuffs
                        setSecondSelectedPlayer("");
                    }
                }
            }
            else if (usedCard.card === "steal") {
                if (selectedPlayer !== "") {
                    socket.emit("card_steal", selectedPlayer); // send to server if the played card is Steal
                } 
            }
        }
    }, [usedCard, selectedPlayer, secondSelectedPlayer]);

    useEffect(() => {
        // event User_list updates the current connected user list and their statuses

        socket.on("user_list", (clients) => {
            const newClients = playerList.map((c, i) => {
                if (clients[i] !== undefined) {
                    return { socket: clients[i].id, name: clients[i].name, status: clients[i].status, firsthand: clients[i].firsthand, secondhand: clients[i].secondhand };
                }
                else {
                    return {
                        socket: 0, name: "temp", status: 0, firsthand: 0, secondhand: 0
                    };
                }
            });
            if (newClients.findIndex(c => c.status === 2) !== -1) {
                poisonedPlayer.current = true;
            }
            else {
                poisonedPlayer.current = false;
            }
            setJoinMessage("");
            setPlayerList(newClients);
        });

        socket.on("draw_flannel", () => {
            removeCard(usedCardReference.current.index);
            setUsedCard({ index: 0, card: "" });
            setSelectedPlayer("");
        });

        socket.on("replace_card", (card) => {
            removeCard(usedCardReference.current.index, true, card);
            setUsedCard({ index: 0, card: "" });
            setSelectedPlayer("");
        });

        socket.on("draw_indexed_flannel", (data) => {
            removeCard(playerCurrentHand.current.indexOf(data.oldCard), data.discard);
        });

        socket.on("replace_indexed_card", (data) => {
            removeCard(playerCurrentHand.current.indexOf(data.oldCard), data.discard, data.newCard);
        });

        socket.on("kungfu_request", (requestee) => {
            const currentHand = playerCurrentHand.current;
            socket.emit("kungfu_reply", { requestee, currentHand });
        });

        socket.on("spy_request", (requestee) => {
            const currentHand = playerCurrentHand.current;
            socket.emit("spy_reply", { requestee, currentHand });
        });

        socket.on("spy_reveal", (otherCurrentHand) => {
            const newOtherHand = otherPlayerHand.map((c, i) => {
                if (otherCurrentHand[i] === undefined) {
                    return 0;
                }
                else {
                    return otherCurrentHand[i];
                }
            });
            setOtherPlayerHand(newOtherHand);
        });

        socket.on("revolver_request", (requestee) => {
            const currentHand = playerCurrentHand.current;
            socket.emit("revolver_reply", { requestee, currentHand });
        });

        socket.on("revolver_select", (data) => {
            const newOptions = revolverOptions.map((c, i) => {
                return data.options[i];
            });
            setRevolverOptions(newOptions);
            replyPlayer.current = data.requestee;
        });

        socket.on("revolver_injured", (card) => {
            playerStatus.current = 1;
            removeCard(playerCurrentHand.current.indexOf(card), false);
        });

        socket.on("key_lockbox", (lockbox) => {
            const newLockBox = lockBox.map((c, i) => {
                if (lockbox[i] === undefined) {
                    return 0;
                }
                else {
                    return lockbox[i];
                }
            });
            setLockBox(newLockBox);
        });

        socket.on("key_release", (data) => {
            handcuffPairs.current = handcuffPairs.current.filter((c) => {
                return c.firsthand !== data.firsthand && c.secondhand !== data.secondhand
            });
        });

        socket.on("handcuffs_list", (data) => {
            handcuffPairs.current.push({ firsthand: data.firsthand, secondhand: data.secondhand });
        });

        socket.on("steal_request", (requestee) => {
            const currentHand = playerCurrentHand.current;
            socket.emit("steal_reply", { requestee, currentHand });
        });

        socket.on("steal_select", (data) => {
            const newOptions = stealOptions.map((c, i) => {
                return data.options[i];
            });
            setStealOptions(newOptions);
            replyPlayer.current = data.requestee;
        });

        socket.on("steal_update", (card) => {
            removeCard(playerCurrentHand.current.indexOf(card), false);
        });

        socket.on("complete_trade", (card) => {
            removeCard(usedCardReference.current.index, false, card);
            setTradee("");
            setTradeSelected(false);
            actionTaken.current = true;
        });

        socket.on("decline_trade", () => {
            setTradee("");
            setTradeSelected(false);
        });

        socket.on("lose_altitude", () => {
            altitudeReference.current = altitudeReference.current - 500;
            setAltitude(altitudeReference.current);
            if (altitudeReference.current === 21000 || altitudeReference.current === 17000 || altitudeReference.current === 13000 || altitudeReference.current === 9000 || altitudeReference.current === 5000) {
                setVoteSelected(false);
                setInitiateVote(true);
            }
        });

        socket.on("final_stretch", (data) => {
            const newField = planeField.map((c, i) => {
                return data.newField[i].toString().replaceAll(",", " ");
            });
            planePosition.current.horizontal = data.position.horizontal;
            planePosition.current.vertical = data.position.vertical;
            setPlaneField(newField);
            setFinalStretch(true);
        });

    }, [socket]);

    useEffect(() => {
        socket.emit("get_username");
    }, []);

    useEffect(() => {
        socket.on("set_username", (username) => {
            if (username !== 0) {
                setUserName(username);
            }
        })

        socket.on("receive_message", (data) => {
            updateChatLog((chatLog) => [...chatLog, { name: data.userName, msg: data.message }]);
        });

        socket.on("user_log", (nr) => {
            setUserCount(nr);
        });

        socket.on("setup_game", (data) => {
            if (data.numClients !== 0) {
                setPlayerTurn(data.firstPlayer);
                setActiveGame(true);
                if (data.numClients === 3) {
                    altitudeReference.current = 16000;
                    setAltitude(16000);
                }
                else {
                    altitudeReference.current = 16000 + ((data.numClients - 3) * 3000);
                    setAltitude(16000 + ((data.numClients - 3) * 3000));
                }
            }
            else {
                setJoinMessage("Cannot start the game as there is not enough players!");
                setActiveGame(false);
            }
        });

        socket.on("draw_deck", (sendCards) => {
            const drawn = drawnCard.map((c, i) => {
                if (sendCards[i] !== undefined) {
                    return sendCards[i];
                }
                return 0;
            });
            setDrawnCards(drawn);
        });

        socket.on("trade_offer", (offerer) => {
            setTradee(offerer);
        });

        socket.on("next_turn", (order) => {
            setPlayerTurn(order);
            setHasDrawn(false);
            actionTaken.current = false;
        });

        socket.on("done_discarding", () => {
            setGameReady(true);
        });

        socket.on("update_hand", (data) => {
            playerCurrentHand.current = playerHand.map((c, i) => {
                return data[i];
            });
            setPlayerHand(playerCurrentHand.current);
        });

        socket.on("vote_negative", () => {
            altitudeReference.current = altitudeReference.current - 1000;
            setAltitude(altitudeReference.current);
            setInitiateVote(false);
        });

        socket.on("vote_positive", () => {
            const parachuteCount = {count: 0};
            playerCurrentHand.current.forEach((c) => {
                if (c === "pchute") {
                    parachuteCount.count++;
                }
                else if (c === "2pchute") {
                    parachuteCount += 2;
                }
            });
            socket.emit("parachute_number", parachuteCount.count);
        });

        socket.on("ready_landing", (data) => {
            const newField = planeField.map((c, i) => {
                return data.newField[i].toString().replaceAll(",", " ");
            })
            socket.emit("have_licence");
            setPlayerTurn(data.randomIndex);
            setPlaneField(newField);
            setLandThePlane(true);
        });

        socket.on("set_dice", (data) => {
            setDiceResult(data);
        });

        socket.on("update_plane", (data) => {
            const newField = planeField.map((c, i) => {
                return data.newField[i].toString().replaceAll(",", " ");
            });
            planePosition.current.horizontal = data.position.horizontal;
            planePosition.current.vertical = data.position.vertical;
            setPlaneField(newField);
        });

        socket.on("set_parachutes", (data) => {
            const newInfo = playerParachutes.map((c, i) => {
                if (data[i] !== undefined) {
                    if (data[i].socket === socket.id) {
                        parachuteLevel.current = data[i].number;
                    }
                    return data[i];
                }
                return c;
            });
            setPlayerParachutes(newInfo);
        });
        
    }, [socket]);

    if (returnToHomepage) {
        socket.emit("leave_room", gameId);
        setUserName("");
        return (
            <Navigate to={`/`} />
        );
    }

    if (userName !== "") {
        if (playerList[0].name !== "temp1") {
            if (!activeGame) {
                return (
                    <div className="Game">
                        <div className="Player">
                            {playerList.map((player, i) => {
                                if (player.socket === socket.id) {
                                    if (i === 0) {
                                        return (
                                            <div className="YourInfo" key={i}>
                                                <button onClick={startGame}>Start game</button>
                                                <h1>{userName}</h1>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="YourInfo" key={i}>
                                            <h1>{userName}</h1>
                                        </div>
                                    );
                                }
                                else if (player.socket === 0) {
                                    return null;
                                }
                                return (
                                    <div className="PlayerInfo" key={i}>
                                        <h1>{player.name}</h1>
                                    </div>
                                );
                            })}
                        </div>
                        <h1>Game room - {gameId}</h1>
                        {joinMessage !== "" ? <h1>{joinMessage}</h1> : null}
                        <button onClick={() => { callHomepage(true) }}>Leave room</button>
                        <input placeholder="Message..." onChange={(event) => { setMessage(event.target.value); }} />
                        <button onClick={sendMessage}>Send message</button>
                        <h2>Currently logged in users - {userCount}</h2>
                        <div className="Chat">
                            <h1>Message:</h1>
                            <ul>
                                {chatLog.map((data, i) => {
                                    return (
                                        <li key={i}>{data.name} said {data.msg}</li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                );
            }
            if (!landThePlane) {
                if (playerParachutes[0].socket === "temp") {
                    if (newGame) {
                        return (
                            <div className="ActiveGame">
                                {tradee !== ""
                                    ?
                                    <>                            
                                        <div className="Trade">
                                            <h1>Trading with {playerList.filter(player => player.socket === tradee)[0].name}</h1>
                                            <button onClick={() => { cancelTrade() }}>Cancel</button>
                                            {!tradeSelected
                                                ?
                                                <>
                                                    {playerHand.map((card, i) => {
                                                        if (card === -1 || card === undefined) {
                                                            return null;
                                                        }
                                                        else {
                                                            return (
                                                                <div className="TradeOffer">
                                                                    <h1>{card}</h1>
                                                                    <button onClick={() => { setupTrade(card, i) }}>Select</button>
                                                                </div>
                                                            );
                                                        }
                                                    })}
                                                </>
                                                : <>
                                                    <div className="TradeOffer">
                                                        <h1>Waiting for other players response...</h1>
                                                    </div>
                                                  </>
                                            }
                                        </div>
                                    </>
                                    : null
                                }
                                <div className="Turn">
                                {playerList[playerTurn].name === userName
                                    ?
                                    <>
                                        <h1>It is your turn!</h1>
                                        {usedCard.card === "" && gameReady ? <button onClick={() => { endTurn() }}>End turn</button> : null}
                                    </>
                                    : <h1>It is {playerList[playerTurn].name} turn!</h1>
                                }
                                </div>
                                {otherPlayerHand[0] !== "temp1"
                                    ?
                                    <>
                                        <div className="OtherPlayerHand">
                                            <button onClick={() => { setOtherPlayerHand(["temp1", "temp2", "temp3", "temp4"]) }}>Hide</button>
                                            {otherPlayerHand.map((card, i) => {
                                                return (
                                                    <h3 key={i}>{card}</h3>
                                                );
                                            })}
                                        </div>
                                    </>
                                    : null
                                }
                                {initiateVote
                                    ?
                                    <>
                                        {!voteSelected
                                            ?
                                            <>
                                                <div className="Vote">
                                                    <h1>It's time to vote!</h1>
                                                    <button onClick={() => { vote(true) }}>Yes</button>
                                                    <button onClick={() => { vote(false) }}>No</button>
                                                </div>
                                            </>
                                            :
                                            <>
                                                <div className="Vote">
                                                    <h1>Waiting for others to vote...</h1>
                                                </div>
                                            </>
                                        }
                                    </>
                                    : null
                                }
                                {lockBox[0] !== "temp1"
                                    ?
                                    <>
                                        <div className="LockBox">
                                            {lockBox.map((card, i) => {
                                                if (card !== 0) {
                                                    return (
                                                        <div className="LockBox-Card" key={i}>
                                                            <h3>{card}</h3>
                                                            <button onClick={() => { takeFromLockBox(card) }}>Take</button>
                                                        </div>
                                                    );
                                                }
                                                else {
                                                    return null;
                                                }
                                            })}
                                        </div>
                                    </>
                                    : null
                                }
                                {stealOptions[0] !== ""
                                    ?
                                    <>
                                        <div className="StealBox">
                                        {stealOptions.map((card, i) => {
                                            return (
                                                <div className="StealOption" key={i}>
                                                    <h2>{card}</h2>
                                                    <button onClick={() => { stealCard(card) }}>Steal</button>
                                                </div>
                                            );
                                        })}
                                        </div>
                                    </>
                                    : null
                                }
                                {revolverOptions[0] !== ""
                                    ?
                                    <>
                                        <div className="RevolverBox">
                                        {revolverOptions.map((card, i) => {
                                            return (
                                                <div className="RevolverOption" key={i}>
                                                    <h2>{card}</h2>
                                                    <button onClick={() => { executeRevolver(card) }}>Take</button>
                                                </div>
                                            );
                                        })}
                                        </div>
                                    </>
                                    : null
                                }
                                {changeInitiated === true && drawnCard[0] !== "temp1"
                                    ?
                                    <>
                                        <div className="DrawnAll">
                                        {drawnCard.map((card, i) => {
                                            if (card === 0) {
                                                return null;
                                            }
                                            return (
                                                <div className="DrawnCard" key={i}>
                                                    <h2>{card}</h2>
                                                    <button onClick={() => { completeDraw(card) }}>Take</button>
                                                </div>
                                            );
                                        })}
                                        </div>
                                    </>
                                    : null
                                }
                                {usedCard.card === "antidote" && changeInitiated === false
                                    ?
                                    <>
                                        <button onClick={() => { setUsedCard({ index: 0, card: "" }) }}>Cancel</button>
                                        {playerList.map((player) => {
                                            if (player.socket === 0 || player.status !== 2) {
                                                return null;
                                            }
                                            return (
                                                <div className="PlayerSelection" key={player.name}>
                                                    <h2>{player.name}</h2>
                                                    <button onClick={() => { setSelectedPlayer(player.socket) }}>Select</button>
                                                </div>
                                            );
                                        })}
                                    </>
                                    : null
                                }
                                {usedCard.card === "poison" && changeInitiated === false
                                    ?
                                    <>
                                        <button onClick={() => { setUsedCard({ index: 0, card: "" }) }}>Cancel</button>
                                        {playerList.map((player) => {
                                            if (player.socket === 0 || player.status !== 0) {
                                                return null;
                                            }
                                            return (
                                                <div className="PlayerSelection" key={player.name}>
                                                    <h2>{player.name}</h2>
                                                    <button onClick={() => { setSelectedPlayer(player.socket) }}>Select</button>
                                                </div>
                                            );
                                        })}
                                    </>
                                    : null
                                }
                                {usedCard.card === "key" && changeInitiated === false
                                    ?
                                    <>
                                        <button onClick={() => { setUsedCard({ index: 0, card: "" }) }}>Cancel</button>
                                        <div className="Lockbox-select">
                                            <h2>Lockbox</h2>
                                            <button onClick={() => { setSelectedPlayer("lockbox") }}>Select</button>
                                        </div>
                                        {handcuffPairs.current.map((c, i) => {
                                            return (
                                                <div className="HandcuffLink" key={i}>
                                                    <h1>{playerList[playerList.findIndex(i => i.socket === c.firsthand)].name}-{playerList[playerList.findIndex(i => i.socket === c.secondhand)].name}</h1>
                                                    <button onClick={() => { removeCuffs(c) }}>Release</button>
                                                </div>
                                            );
                                        })}
                                    </>
                                    : null
                                }
                                {usedCard.card === "handcuffs" && selectedPlayer === "" && changeInitiated === false
                                    ?
                                    <>

                                        {playerList.map((player) => {
                                            if ((player.firsthand !== 0 && player.secondhand !== 0) || player.socket === 0) {
                                                return null;
                                            }
                                            return (
                                                <div className="PlayerSelection" key={player.name}>
                                                    <h2>{player.name}</h2>
                                                    <button onClick={() => { setSelectedPlayer(player.socket) }}>Select</button>
                                                </div>
                                            );
                                        })}
                                    </>
                                    : null
                                }
                                {usedCard.card === "handcuffs" && selectedPlayer !== "" && changeInitiated === false
                                    ?
                                    <>
                                        <button onClick={() => { setUsedCard({ index: 0, card: "" }) }}>Cancel</button>
                                        {playerList.map((player) => {
                                            if (player.socket === 0 || player.socket === selectedPlayer || (player.firsthand !== 0 && player.secondhand !== 0)) {
                                                return null;
                                            }
                                            return (
                                                <div className="PlayerSelection" key={player.name}>
                                                    <h2>{player.name}</h2>
                                                    <button onClick={() => { setSecondSelectedPlayer(player.socket) }}>Select</button>
                                                </div>
                                            );
                                        })}
                                    </>
                                    : null
                                }
                                {usedCard.card !== "" && usedCard.card !== "poison" && usedCard.card !== "handcuffs" && usedCard.card !== "antidote" && selectedPlayer === "" && usedCard.card !== "key" && changeInitiated === false
                                    ?
                                    <>
                                        <button onClick={() => { setUsedCard({ index: 0, card: "" }) }}>Cancel</button>
                                        {playerList.map((player) => {
                                            if (player.socket === 0 || player.name === userName) {
                                                return null;
                                            }
                                            return (
                                                <div className="PlayerSelection" key={player.name}>
                                                    <h2>{player.name}</h2>
                                                    <button onClick={() => { setSelectedPlayer(player.socket) }}>Select</button>
                                                </div>
                                            );
                                        })}
                                    </>
                                    : null
                                }
                                {gameReady
                                    ? null
                                    : <h1>Others are still discarding!</h1>
                                }
                                {playerList.map((player, i) => {
                                    if (player.name === userName) {
                                        return (
                                            <div className="YourInfo Block" key={i}>
                                                <h1>{userName}</h1>
                                                <h1>Status: {player.status}</h1>
                                                {playerHand.map((card, i2) => {
                                                    if (card === -1 || card === undefined) {
                                                        return null;
                                                    }
                                                    else if (card === "pchute") {
                                                        return (
                                                            <div className="Card Parachute" key={i2}>
                                                                <h2>Parachute</h2>
                                                                {playerList[playerTurn].name === userName && !hasDrawn && gameReady
                                                                    ? <button onClick={() => { drawCard({ index: i2, card: card }) }}>Change</button>
                                                                    : null
                                                                }
                                                            </div>
                                                        );
                                                    }
                                                    else if (card === "2pchute") {
                                                        return (
                                                            <div className="Card TandemParachute" key={i2}>
                                                                <h2>Tandem Parachute</h2>
                                                                {playerList[playerTurn].name === userName && !hasDrawn && gameReady
                                                                    ? <button onClick={() => { drawCard({ index: i2, card: card }) }}>Change</button>
                                                                    : null
                                                                }
                                                            </div>
                                                        );
                                                    }
                                                    else if (card === "kungfu") {
                                                        return (
                                                            <div className="Card KungFu" key={i2}>
                                                                <h2>Kung Fu</h2>
                                                                {playerList[playerTurn].name === userName && gameReady
                                                                    ? <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                                    : null
                                                                }
                                                                {playerList[playerTurn].name === userName && !hasDrawn && gameReady
                                                                    ? <button onClick={() => { drawCard({ index: i2, card: card }) }}>Change</button>
                                                                    : null
                                                                }
                                                            </div>
                                                        );
                                                    }
                                                    else if (card === "knife") {
                                                        return (
                                                            <div className="Card Knife" key={i2}>
                                                                <h2>Knife</h2>
                                                                {playerList[playerTurn].name === userName && !hasDrawn && gameReady
                                                                    ? <button onClick={() => { drawCard({ index: i2, card: card }) }}>Change</button>
                                                                    : null
                                                                }
                                                            </div>
                                                        );
                                                    }
                                                    else if (card === "spy") {
                                                        return (
                                                            <div className="Card Spy" key={i2}>
                                                                <h2>Spy</h2>
                                                                {playerList[playerTurn].name === userName && gameReady
                                                                    ? <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                                    : null
                                                                }
                                                                {playerList[playerTurn].name === userName && !hasDrawn && gameReady
                                                                    ? <button onClick={() => { drawCard({ index: i2, card: card }) }}>Change</button>
                                                                    : null
                                                                }
                                                            </div>
                                                        );
                                                    }
                                                    else if (card === "revolver") {
                                                        return (
                                                            <div className="Card Revolver" key={i2}>
                                                                <h2>Revolver</h2>
                                                                {playerCurrentHand.current.indexOf("bullet") !== -1 && playerList[playerTurn].name === userName && gameReady
                                                                    ? <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                                    : null
                                                                }
                                                                {playerList[playerTurn].name === userName && !hasDrawn && gameReady
                                                                    ? <button onClick={() => { drawCard({ index: i2, card: card }) }}>Change</button>
                                                                    : null
                                                                }
                                                            </div>
                                                        );
                                                    }
                                                    else if (card === "bullet") {
                                                        return (
                                                            <div className="Card Bullet" key={i2}>
                                                                <h2>Bullet</h2>
                                                                {playerList[playerTurn].name === userName && !hasDrawn && gameReady
                                                                    ? <button onClick={() => { drawCard({ index: i2, card: card }) }}>Change</button>
                                                                    : null
                                                                }
                                                            </div>
                                                        );
                                                    }
                                                    else if (card === "poison") {
                                                        return (
                                                            <div className="Card Poison" key={i2}>
                                                                <h2>Poison</h2>
                                                                {playerList[playerTurn].name === userName && gameReady
                                                                    ? <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                                    : null
                                                                }
                                                                {playerList[playerTurn].name === userName && !hasDrawn && gameReady
                                                                    ? <button onClick={() => { drawCard({ index: i2, card: card }) }}>Change</button>
                                                                    : null
                                                                }
                                                            </div>
                                                        );
                                                    }
                                                    else if (card === "antidote") {
                                                        return (
                                                            <div className="Card Antidote" key={i2}>
                                                                <h2>Antidote</h2>
                                                                {poisonedPlayer.current && playerList[playerTurn].name === userName && gameReady
                                                                    ? <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                                    : null
                                                                }
                                                                {playerList[playerTurn].name === userName && !hasDrawn && gameReady
                                                                    ? <button onClick={() => { drawCard({ index: i2, card: card }) }}>Change</button>
                                                                    : null
                                                                }
                                                            </div>
                                                        );
                                                    }
                                                    else if (card === "key") {
                                                        return (
                                                            <div className="Card Key" key={i2}>
                                                                <h2>Key</h2>
                                                                {playerList[playerTurn].name === userName && !keyUsed && gameReady
                                                                    ? <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                                    : null
                                                                }
                                                                {playerList[playerTurn].name === userName && !hasDrawn && gameReady
                                                                    ? <button onClick={() => { drawCard({ index: i2, card: card }) }}>Change</button>
                                                                    : null
                                                                }
                                                            </div>
                                                        );
                                                    }
                                                    else if (card === "plicence") {
                                                        return (
                                                            <div className="Card PilotsLicence" key={i2}>
                                                                <h2>Pilot's Licence</h2>
                                                                {playerList[playerTurn].name === userName && !hasDrawn && gameReady
                                                                    ? <button onClick={() => { drawCard({ index: i2, card: card }) }}>Change</button>
                                                                    : null
                                                                }
                                                            </div>
                                                        );
                                                    }
                                                    else if (card === "handcuffs") {
                                                        return (
                                                            <div className="Card Handcuffs" key={i2}>
                                                                <h2>Handcuffs</h2>
                                                                {playerList[playerTurn].name === userName && gameReady
                                                                    ? <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                                    : null
                                                                }
                                                                {playerList[playerTurn].name === userName && !hasDrawn && gameReady
                                                                    ? <button onClick={() => { drawCard({ index: i2, card: card }) }}>Change</button>
                                                                    : null
                                                                }
                                                            </div>
                                                        );
                                                    }
                                                    else if (card === "steal") {
                                                        return (
                                                            <div className="Card Steal" key={i2}>
                                                                <h2>Steal</h2>
                                                                {playerList[playerTurn].name === userName && gameReady
                                                                    ? <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                                    : null
                                                                }
                                                                {playerList[playerTurn].name === userName && !hasDrawn && gameReady
                                                                    ? <button onClick={() => { drawCard({ index: i2, card: card }) }}>Change</button>
                                                                    : null
                                                                }
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div className="Card" key={i2}>
                                                            <h2>{card}</h2>
                                                            {playerList[playerTurn].name === userName && !hasDrawn && gameReady
                                                                ? <button onClick={() => { drawCard({ index: i2, card: card }) }}>Change</button>
                                                                : null
                                                            }
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    }
                                    else if (player.socket === 0) {
                                        return;
                                    }
                                    return (
                                        <div className="PlayerInfo Block" key={i}>
                                            <h1>{player.name}</h1>
                                            {playerList[playerTurn].name === userName && gameReady
                                                ? <button onClick={() => { initiateTrade(player.socket) }}>Trade</button>
                                                : null
                                            }
                                            <h1>Status: {player.status}</h1>
                                            {player.status === 3
                                                ? <h1>Player is linked to {player.firsthand !== 0 ? playerList[playerList.findIndex(i => i.socket === player.firsthand)].name : playerList[playerList.findIndex(i => i.socket === player.secondhand)].name}</h1>
                                                : null
                                            }
                                        </div>
                                    );
                                })}
                                <h1>Altitude: {altitude}ft</h1>
                            </div>
                        );
                    }
                    return (
                        <div className="GameSetup">
                            <h1>Discard cards until you have 4 cards left!</h1>
                            {playerHand.map((card, i) => {
                                return (
                                    <div className="Card" key={i}>
                                        <h2>{card}</h2>
                                        <button onClick={() => { removeCard(i) }}>Discard</button>
                                    </div>
                                );
                            })}
                        </div>
                    );
                }
                return (
                    <div className="ParachuteSplit">
                        {playerList.map((c, i) => {
                            if (c.socket === 0) {
                                return null;
                            }
                            const parachuteInfo = playerParachutes.filter(info => info.socket === c.socket);
                            return (
                                <div className="ParachuteShare" key={ i }>
                                    <h1>{c.name}</h1>
                                    <h2>{parachuteInfo[0].number}</h2>
                                    {parachuteLevel.current > 1 && c.socket !== socket.id
                                        ? <button onClick={() => { shareParachute(c.socket) }}>Share</button>
                                        : null
                                    } 
                                </div>
                            )
                        })}
                    </div>
                );
            }
            if (results) {
                if (planeCrash) {
                    return (
                        <div className="NoPlane">
                            <h1>Good job landers!</h1>
                        </div>
                    );
                }
                return (
                    <div className="WithPlane">
                        <h1>Well done everyone!</h1>
                    </div>
                );
            }
            return (
                <div className="LandThePlane">
                    {finalStretch
                        ?
                        <>
                            {parachuteLevel.current === 0 && playerList[playerTurn].name === userName && diceResult.die1 === ""
                                ? <button onClick={() => { rollDice() }}>Roll die</button>
                                : null
                            }
                            {diceResult.die1 !== ""
                                ?
                                <>
                                    <h1>{diceResult.die1}</h1>
                                    {parachuteLevel.current === 0 && playerList[playerTurn].name === userName
                                        ?
                                        <>
                                             <button onClick={() => { hitBreaks(diceResult.die1) }}>Land plane?</button>
                                        </>
                                        : null
                                    }
                                </>
                                : null
                            }
                        </>
                        :
                        <>
                            {parachuteLevel.current === 0 && playerList[playerTurn].name === userName && diceResult.die1 === ""
                                ? <button onClick={() => { rollDice() }}>Roll dice</button>
                                : null
                            }
                            {diceResult.die1 !== ""
                                ?
                                <>
                                    <h1>{diceResult.die1}</h1>
                                    <h1>{diceResult.die2}</h1>
                                    {parachuteLevel.current === 0 && playerList[playerTurn].name === userName 
                                        ?
                                        <>
                                            {diceResult.die1 === "1r" || diceResult.die1 === "1d" || diceResult.die2 === "1r" || diceResult.die2 === "1d" || diceResult.die1 === diceResult.die2
                                                ? <button onClick={() => { movePlane(diceResult.die1, diceResult.die2) }}>Move plane</button>
                                                :
                                                <>
                                                    <button onClick={() => { movePlane(diceResult.die1, diceResult.die2) }}>Go {diceResult.die1} right and {diceResult.die2} down</button>
                                                    <button onClick={() => { movePlane(diceResult.die2, diceResult.die1) }}>Go {diceResult.die2} right and {diceResult.die1} down</button>
                                                </>
                                            }
                                        </>
                                        : null
                                    }
                                </>
                                : null
                            }
                        </>
                    }
                    <ul className="PlaneField">
                    {planeField.map((c, i) => {
                        return (
                            <li key={i}>{ c }</li>
                        );
                    })}
                    </ul>
                </div>
            );
        }
        return (
            <h1>Something went wrong, please refresh the page!</h1>
        );
    }

    return (
        <div className="UserName">
            <h1>Set your username</h1>
            <input placeholder="Username..." onChange={(event) => {setTempUserName(event.target.value);}}></input>
            <button onClick={updateUserName}>Set username</button>
        </div>
    );
}

export default Game;