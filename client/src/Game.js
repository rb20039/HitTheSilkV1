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
    const [selectedPlayer, setSelectedPlayer] = useState("");
    const [usedCard, setUsedCard] = useState({ index: 0, card: "" });
    const [altitude, setAltitude] = useState(0);
    const [playerList, setPlayerList] = useState([{
            socket: "temp",
            name: "temp1"
        },
        {
            socket: "temp",
            name: "temp2"
        },
        {
            socket: "temp",
            name: "temp3"
        },
        {
            socket: "temp",
            name: "temp4"
        },
        {
            socket: "temp",
            name: "temp5"
        },
        {
            socket: "temp",
            name: "temp6"
        }
    ]);
    const [playerHand, setPlayerHand] = useState(["temp1", "temp2", "temp3", "temp4", "temp5", "temp6"]);
    // let currentHand = ["temp1", "temp2", "temp3", "temp4", "temp5", "temp6"];
    const [stealOptions, setStealOptions] = useState(["", ""]);
    const [chatLog, updateChatLog] = useState([]);
    const playerCurrentHand = useRef([]);
    const replyPlayer = useRef("");
    const [newGame, setNewGame] = useState(false);
    const [gameReady, setGameReady] = useState(false);
    const [returnToHomepage, callHomepage] = useState(false);
    const [activeGame, setActiveGame] = useState(false);
    const { gameId } = useParams();
    const sendMessage = () => {
        socket.emit("send_message", { userName, message, gameId });
        updateChatLog((chatLog) => [...chatLog, { name:userName, msg:message }]);
    };

    const updateUserName = () => {
        setUserName(tempUserName);
    //  socket.emit("register_user", { tempUserName, gameId });
        socket.emit("join_room", { tempUserName, gameId });
    }

    const startGame = () => {
        socket.emit("start_game", gameId);
        // socket.emit("shuffle");
    }

    const stealCard = (stolenCard) => {
        socket.emit("steal_complete", { stolenCard, stealOptions, selectedPlayer });
        setStealOptions(["", ""]);
        removeCard(usedCard.index, stolenCard);
        setUsedCard({ index: 0, card: "" });
        setSelectedPlayer("");
    }

    function removeCard(index, card) {
        // if a card gets stolen, it should not be discarded
        socket.emit("discard", playerCurrentHand.current[index]);
        playerCurrentHand.current.splice(index, 1);
        if (playerCurrentHand.current.length === 4) {
            setNewGame(true);
            socket.emit("setup_completed", gameId);
        }
        else if (playerCurrentHand.current.length < 4) {
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
            let loseAltitude = false;
            if (usedCard.card === "kungfu") {
                if (selectedPlayer !== "") {
                    socket.emit("card_kungfu", selectedPlayer);
                    loseAltitude = true;
                }
            }
            else if (usedCard.card === "spy") {
                if (selectedPlayer !== "") {
                    socket.emit("card_spy", selectedPlayer);
                    loseAltitude = true;
                }
            }
            else if (usedCard.card === "revolver") {
                console.log(usedCard);
                loseAltitude = true;
            }
            else if (usedCard.card === "poison") {
                if (selectedPlayer !== "") {
                    socket.emit("card_poison", selectedPlayer);
                    loseAltitude = true;
                }
            }
            else if (usedCard.card === "antidote") {
                console.log(usedCard);
                loseAltitude = true;
            }
            else if (usedCard.card === "key") {
                console.log(usedCard);
                loseAltitude = true;
            }
            else if (usedCard.card === "handcuffs") {
                console.log(usedCard);
                loseAltitude = true;
            }
            else if (usedCard.card === "steal") {
                if (selectedPlayer !== "") {
                    socket.emit("card_steal", selectedPlayer);
                    loseAltitude = true;
                }
                console.log(usedCard);  
            }
            if (loseAltitude) {
                setAltitude(altitude - 500);
            }
        }
    }, [usedCard, selectedPlayer]);

    useEffect(() => {
        socket.on("user_list", (clients) => {
            const newClients = playerList.map((c , i) => {
                if (clients[i] !== undefined) {
                   return { socket: clients[i].id, name: clients[i].name };
                }
                else {
                    return { socket: 0, name: "temp" };
                }
            });
            setPlayerList(newClients);
        });

        socket.on("draw_indexed_flannel", () => {
            removeCard(usedCard.index);
            setUsedCard({ index: 0, card: "" });
            setSelectedPlayer("");
        });

        socket.on("draw_flannel", () => {
            removeCard(usedCard.index);
            setUsedCard({ index: 0, card: "" });
            setSelectedPlayer("");
        });

        socket.on("replace_indexed_card", (data) => {
            removeCard(data.index, data.card);
        });

        socket.on("replace_card", (card) => {
            removeCard(usedCard.index, card);
            setUsedCard({ index: 0, card: "" });
            setSelectedPlayer("");
        });

        socket.on("kungfu_request", (requestee) => {
            const currentHand = playerCurrentHand.current;
            socket.emit("kungfu_reply", { requestee, currentHand });
        });

        socket.on("spy_request", (requestee) => {
            const currentHand = playerCurrentHand.current;
            socket.emit("spy_reply", { requestee, currentHand });
        });

        socket.on("steal_request", (requestee) => {
            const currentHand = playerCurrentHand.current;
            socket.emit("steal_reply", { requestee, currentHand });
        });

        socket.on("steal_select", (data) => {
            console.log(data);
            const newOptions = stealOptions.map((c, i) => {
                return data.options[i];
            });
            setStealOptions(newOptions);
            replyPlayer.current = data.requestee;
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
                setActiveGame(true);
                if (data.numClients === 3) {
                    setAltitude(16000);
                }
                else {
                    setAltitude(16000 + ((data.numClients - 3) * 3000));
                }
            }
            else {
                setActiveGame(false);
            }
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

    }, [socket]);

    if (returnToHomepage) {
        socket.emit("leave_room", gameId);
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
                                    return;
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
            if (newGame) {
                return (
                    <div className="ActiveGame">
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
                        {usedCard.card !== ""
                            ?
                            <>
                                {playerList.map((player) => {
                                    if (player.socket === 0 || player.name === userName) {
                                        return;
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
                                        {playerHand.map((card, i2) => {
                                            if (card === -1) {
                                                return;
                                            }
                                            else if (card === "pchute") {
                                                return (
                                                    <div className="Card Parachute" key={i2}>
                                                        <h2>Parachute</h2>
                                                    </div>
                                                );
                                            }
                                            else if (card === "2pchute") {
                                                return (
                                                    <div className="Card TandemParachute" key={i2}>
                                                        <h2>Tandem Parachute</h2>
                                                    </div>
                                                );
                                            }
                                            else if (card === "kungfu") {
                                                return (
                                                    <div className="Card KungFu" key={i2}>
                                                        <h2>Kung Fu</h2>
                                                        <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                    </div>
                                                );
                                            }
                                            else if (card === "knife") {
                                                return (
                                                    <div className="Card Knife" key={i2}>
                                                        <h2>Knife</h2>
                                                    </div>
                                                );
                                            }
                                            else if (card === "spy") {
                                                return (
                                                    <div className="Card Spy" key={i2}>
                                                        <h2>Spy</h2>
                                                        <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                    </div>
                                                );
                                            }
                                            else if (card === "revolver") {
                                                return (
                                                    <div className="Card Revolver" key={i2}>
                                                        <h2>Revolver</h2>
                                                        <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                    </div>
                                                );
                                            }
                                            else if (card === "bullet") {
                                                return (
                                                    <div className="Card Bullet" key={i2}>
                                                        <h2>Bullet</h2>
                                                    </div>
                                                );
                                            }
                                            else if (card === "poison") {
                                                return (
                                                    <div className="Card Poison" key={i2}>
                                                        <h2>Poison</h2>
                                                        <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                    </div>
                                                );
                                            }
                                            else if (card === "antidote") {
                                                return (
                                                    <div className="Card Antidote" key={i2}>
                                                        <h2>Antidote</h2>
                                                        <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                    </div>
                                                );
                                            }
                                            else if (card === "key") {
                                                return (
                                                    <div className="Card Key" key={i2}>
                                                        <h2>Key</h2>
                                                        <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                    </div>
                                                );
                                            }
                                            else if (card === "plicence") {
                                                return (
                                                    <div className="Card PilotsLicence" key={i2}>
                                                        <h2>Pilot's Licence</h2>
                                                    </div>
                                                );
                                            }
                                            else if (card === "handcuffs") {
                                                return (
                                                    <div className="Card Handcuffs" key={i2}>
                                                        <h2>Handcuffs</h2>
                                                        <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                    </div>
                                                );
                                            }
                                            else if (card === "steal") {
                                                return (
                                                    <div className="Card Steal" key={i2}>
                                                        <h2>Steal</h2>
                                                        <button onClick={() => { setUsedCard({ index: i2, card: card }) }}>Use</button>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div className="Card" key={i2}>
                                                    <h2>{card}</h2>
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
                                <h2>{ card }</h2>
                                <button onClick={() => { removeCard(i) } }>Discard</button>
                            </div>
                        );
                    })}
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