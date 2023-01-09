import './App.css';
import io from 'socket.io-client';


import { useEffect, useState, useRef } from "react";
import { useParams, Navigate } from "react-router-dom";

const socket = io.connect('http://localhost:3001');

function Game() {
    const [userName, setUserName] = useState("");
    const [tempUserName, setTempUserName] = useState("");
    const [message, setMessage] = useState("");
    const [userCount, setUserCount] = useState("");
    const [tradee, setTradee] = useState("");
    const [selectedPlayer, setSelectedPlayer] = useState("");
    const [secondSelectedPlayer, setSecondSelectedPlayer] = useState("");
    const [usedCard, setUsedCard] = useState({ index: 0, card: "" });
    const [altitude, setAltitude] = useState(0);
    const [diceResult, setDiceResult] = useState({ die1: 0, die2: 0 });
    const [playerList, setPlayerList] = useState([{
        socket: "temp",
        name: "temp1",
        status: 0,
        firsthand: 0,
        secondhand: 0
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
    const [lockBox, setLockBox] = useState(["temp1", "temp2", "temp3", "temp4", "temp5", "temp6"]);
    const [playerHand, setPlayerHand] = useState(["temp1", "temp2", "temp3", "temp4", "temp5", "temp6"]);
    const [otherPlayerHand, setOtherPlayerHand] = useState(["temp1", "temp2", "temp3", "temp4"]);
    const [drawnCard, setDrawnCards] = useState(["temp1", "temp2", "temp3", "temp4"]);
    const [playerParachutes, setPlayerParachutes] = useState([{
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
    const [planeField, setPlaneField] = useState(["1", "2", "3", "4", "5", "6", "7"])
    const [revolverOptions, setRevolverOptions] = useState(["", "", "", ""]);
    const [stealOptions, setStealOptions] = useState(["", ""]);
    const [chatLog, updateChatLog] = useState([]);
    const playerStatus = useRef(0);
    const altitudeReference = useRef(0);
    const playerCurrentHand = useRef([]);
    const replyPlayer = useRef("");
    const poisonedPlayer = useRef(false);
    const planePosition = useRef({ horizontal: 0, vertical: 0 });
    const usedCardReference = useRef({ index: 0, card: "" });
    const actionTaken = useRef(false);
    const parachuteLevel = useRef(0);
    const handcuffPairs = useRef([]);
    const [newGame, setNewGame] = useState(false);
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
    const { gameId } = useParams();
    const sendMessage = () => {
        socket.emit("send_message", { userName, message, gameId });
        updateChatLog((chatLog) => [...chatLog, { name: userName, msg: message }]);
    };

    const endTurn = () => {
        socket.emit("end_turn", { order: playerTurn, action: actionTaken.current });
    }

    const updateUserName = () => {
        setUserName(tempUserName);
        //  socket.emit("register_user", { tempUserName, gameId });
        socket.emit("join_room", { tempUserName, gameId });
    }

    const startGame = () => {
        socket.emit("start_game", gameId);
        // socket.emit("shuffle");
    }

    const takeFromLockBox = (card) => {
        socket.emit("key_complete", card);
        setLockBox(["temp1", "temp2", "temp3", "temp4", "temp5", "temp6"]);
        removeCard(usedCard.index, true, card);
        setUsedCard({ index: 0, card: "" });
        setSelectedPlayer("");
    }

    const executeRevolver = (stolenCard) => {
        socket.emit("revolver_complete", { stolenCard, selectedPlayer });
        setRevolverOptions(["", "", "", ""]);
        removeCard(playerCurrentHand.current.indexOf("bullet"), true, stolenCard);
        setUsedCard({ index: 0, card: "" });
        setSelectedPlayer("");
    }

    const stealCard = (stolenCard) => {
        socket.emit("steal_complete", { stolenCard, stealOptions, selectedPlayer });
        setStealOptions(["", ""]);
        removeCard(usedCard.index, true, stolenCard);
        setUsedCard({ index: 0, card: "" });
        setSelectedPlayer("");
    }

    const rollDice = () => {
        socket.emit("update_field", planePosition.current);
    }

    const drawCard = (card) => {
        setChangeInitiated(true);
        setUsedCard(card);
        socket.emit("initiate_draw", altitude);
    }

    const removeCuffs = (link) => {
        setSelectedPlayer(link.firsthand);
        setSecondSelectedPlayer(link.secondhand);
    }

    const initiateTrade = (player) => {
        socket.emit("initiate_trade", player);
        setTradee(player);
    }

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

    const setupTrade = (card, index) => {
        setTradeSelected(true);
        usedCardReference.current = ({ index: index, card: card });
        socket.emit("setup_trade", card);
    }

    const cancelTrade = () => {
        socket.emit("cancel_trade", tradee);
        setTradee("");
        setTradeSelected(false);
    }

    const vote = (vote) => {
        setVoteSelected(true);
        socket.emit("jump_vote", vote);
    }

    const shareParachute = (player) => {
        socket.emit("parachute_share", { player, playerParachutes });
    }

    /*const getScore = () => {
        let money = 0;
        let parachute = false;
        playerCurrentHand.current.forEach((c) => {
            if (c === "10k") {
                money += 10;
            }
            else if (c === "20k") {
                money += 20;
            }
            else if (c === "30k") {
                money += 30;
            }
            else if (c === "40k") {
                money += 40;
            }
            else if (c === "parachute") {
                parachute = true;
            }
        });
        if (parachute === true) {
            socket.emit("set_score", money);
        }
    }*/

    function removeCard(index, discardIndicator = true, card) {
        // if a card gets stolen, it should not be discarded
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
                    socket.emit("card_kungfu", selectedPlayer);
                }
            }
            else if (usedCard.card === "spy") {
                if (selectedPlayer !== "") {
                    socket.emit("card_spy", selectedPlayer);
                }
            }
            else if (usedCard.card === "revolver") {
                if (selectedPlayer !== "") {
                    socket.emit("card_revolver", selectedPlayer);
                }
            }
            else if (usedCard.card === "poison") {
                if (selectedPlayer !== "") {
                    socket.emit("card_poison", selectedPlayer);
                }
            }
            else if (usedCard.card === "antidote") {
                if (selectedPlayer !== "") {
                    socket.emit("card_antidote", selectedPlayer);
                }
            }
            else if (usedCard.card === "key") {
                if (selectedPlayer === "lockbox") {
                    socket.emit("card_key", { selectedPlayer, secondSelectedPlayer });
                }
                else if (secondSelectedPlayer !== "") {
                    socket.emit("card_key", { selectedPlayer, secondSelectedPlayer });
                    setSecondSelectedPlayer("");
                }
            }
            else if (usedCard.card === "handcuffs") {
                if (selectedPlayer !== "") {
                    if (secondSelectedPlayer !== "") {
                        socket.emit("card_handcuffs", { selectedPlayer, secondSelectedPlayer });
                        setSecondSelectedPlayer("");
                    }
                }
            }
            else if (usedCard.card === "steal") {
                if (selectedPlayer !== "") {
                    socket.emit("card_steal", selectedPlayer);
                } 
            }
        }
    }, [usedCard, selectedPlayer, secondSelectedPlayer]);

    useEffect(() => {
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
            const pairIndex = handcuffPairs.indexOf(data);
            handcuffPairs.splice(pairIndex, 1);
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
            /*const newField = planeField.map((c, i) => {
                return field[i].toString().replaceAll(",", " ");
            })
            setPlaneField(newField);
            setLandThePlane(true);*/
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

        socket.on("ready_landing", (field) => {
            const newField = planeField.map((c, i) => {
                return field[i].toString().replaceAll(",", " ");
            })
            setPlaneField(newField);
            setLandThePlane(true);
        })

        socket.on("update_plane", (data) => {
            const newField = planeField.map((c, i) => {
                return data.newField[i].toString().replaceAll(",", " ");
            });
            planePosition.current.horizontal = data.position.horizontal;
            planePosition.current.vertical = data.position.vertical;
            setPlaneField(newField);
        });

        socket.on("set_parachutes", (data) => {
            let multiple = false;
            const newInfo = playerParachutes.map((c, i) => {
                if (data[i] !== undefined) {
                    if (data[i].socket === socket.id) {
                        parachuteLevel.current = data[i].number;
                    }
                    if (data[i].number > 1) {
                        multiple = true;
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
                        {activeGame
                            ? <h1>yes</h1>
                            : <h1>no</h1>
                        }
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
                                            <h1>Trading with {tradee}</h1>
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
                                                                <div>
                                                                    <h1>{card}</h1>
                                                                    <button onClick={() => { setupTrade(card, i) }}>Select</button>
                                                                </div>
                                                            );
                                                        }
                                                    })}
                                                </>
                                                : <h1>Waiting for other players response...</h1>
                                            }
                                        </div>
                                    </>
                                    : null
                                }
                                {playerList[playerTurn].name === userName
                                    ?
                                    <>
                                        <h1>It is your turn!</h1>
                                        <button onClick={() => { endTurn() }}>End turn</button>
                                    </>
                                    : <h1>It is {playerList[playerTurn].name} turn!</h1>
                                }
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
                                            : <h1>Waiting for others to vote...</h1>
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
                                        {stealOptions.map((card, i) => {
                                            return (
                                                <div className="StealOption" key={i}>
                                                    <h2>{card}</h2>
                                                    <button onClick={() => { stealCard(card) }}>Steal</button>
                                                </div>
                                            );
                                        })}
                                    </>
                                    : null
                                }
                                {revolverOptions[0] !== ""
                                    ?
                                    <>
                                        {revolverOptions.map((card, i) => {
                                            return (
                                                <div className="RevolverOption" key={i}>
                                                    <h2>{card}</h2>
                                                    <button onClick={() => { executeRevolver(card) }}>Take</button>
                                                </div>
                                            );
                                        })}
                                    </>
                                    : null
                                }
                                {changeInitiated === true && drawnCard[0] !== "temp1"
                                    ?
                                    <>
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
                                    </>
                                    : null
                                }
                                {usedCard.card === "antidote" && changeInitiated === false
                                    ?
                                    <>
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
                                        <h2>Lockbox</h2>
                                        <button onClick={() => { setSelectedPlayer("lockbox") }}>Select</button>
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
                                                                {playerList[playerTurn].name === userName && !hasDrawn
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
                                                                {playerList[playerTurn].name === userName && !hasDrawn
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
                                                                {playerList[playerTurn].name === userName
                                                                    ? <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                                    : null
                                                                }
                                                                {playerList[playerTurn].name === userName && !hasDrawn
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
                                                                {playerList[playerTurn].name === userName && !hasDrawn
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
                                                                {playerList[playerTurn].name === userName
                                                                    ? <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                                    : null
                                                                }
                                                                {playerList[playerTurn].name === userName && !hasDrawn
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
                                                                {playerCurrentHand.current.indexOf("bullet") !== -1 && playerList[playerTurn].name === userName
                                                                    ? <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                                    : null
                                                                }
                                                                {playerList[playerTurn].name === userName && !hasDrawn
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
                                                                {playerList[playerTurn].name === userName && !hasDrawn
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
                                                                {playerList[playerTurn].name === userName
                                                                    ? <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                                    : null
                                                                }
                                                                {playerList[playerTurn].name === userName && !hasDrawn
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
                                                                {poisonedPlayer.current && playerList[playerTurn].name === userName
                                                                    ? <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                                    : null
                                                                }
                                                                {playerList[playerTurn].name === userName && !hasDrawn
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
                                                                {playerList[playerTurn].name === userName
                                                                    ? <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                                    : null
                                                                }
                                                                {playerList[playerTurn].name === userName && !hasDrawn
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
                                                                {playerList[playerTurn].name === userName && !hasDrawn
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
                                                                {playerList[playerTurn].name === userName
                                                                    ? <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                                    : null
                                                                }
                                                                {playerList[playerTurn].name === userName && !hasDrawn
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
                                                                {playerList[playerTurn].name === userName
                                                                    ? <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                                    : null
                                                                }
                                                                {playerList[playerTurn].name === userName && !hasDrawn
                                                                    ? <button onClick={() => { drawCard({ index: i2, card: card }) }}>Change</button>
                                                                    : null
                                                                }
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div className="Card" key={i2}>
                                                            <h2>{card}</h2>
                                                            {playerList[playerTurn].name === userName && !hasDrawn
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
                                            {playerList[playerTurn].name === userName
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
            return (
                <div className="LandThePlane">
                    {parachuteLevel.current === 0
                        ? <button onClick={() => { rollDice() }}>Roll dice</button>
                        : null
                    }
                    <ul>
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
            <input placeholder="Username..." onChange={(event) => {setTempUserName(event.target.value);}}></input>
            <button onClick={updateUserName}>Set username</button>
        </div>
    );
}

export default Game;