import './App.css';
import io from 'socket.io-client';


import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";

const socket = io.connect('http://localhost:3001');

function Game() {
    const [userName, setUserName] = useState("");
    const [tempUserName, setTempUserName] = useState("");
    const [message, setMessage] = useState("");
    const [userCount, setUserCount] = useState("");
    const [usedCard, setUsedCard] = useState("");
    const [altitude, setAltitude] = useState(0);
    const [playerList, setPlayerList] = useState(["temp1", "temp2", "temp3", "temp4", "temp5", "temp6"]);
    const [playerHand, setPlayerHand] = useState(["temp1", "temp2", "temp3", "temp4"]);
    const [chatLog, updateChatLog] = useState([]);
    const [returnToHomepage, callHomepage] = useState(false);
    const [activeGame, setActiveGame] = useState(false);
    const { gameId } = useParams();
    const sendMessage = () => {
        socket.emit("send_message", { userName, message, gameId });
        updateChatLog((chatLog) => [...chatLog, { name:userName, msg:message }]);
    };

    const updateUserName = () => {
        setUserName(tempUserName);
        socket.emit("register_user", tempUserName);
        socket.emit("join_room", gameId);
    }

    const startGame = () => {
        socket.emit("start_game", gameId);
        // socket.emit("shuffle");
    }

    useEffect(() => {
        if (usedCard !== "") {
            console.log(usedCard);
        }
        setUsedCard("");
    }, [usedCard]);

    useEffect(() => {
        // set up so it shows currently connected users
        socket.on("user_list", (clients) => {
            const newClients = playerList.map((c, i) => {
                if (clients[i] !== undefined) {
                    return clients[i];
                }
                else {
                    return 0;
                }
            });
            setPlayerList(newClients);
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

        socket.on("setup_game", (nr) => {
            if (nr !== 0) {
                setActiveGame(true);
                if (nr === 3) {
                    setAltitude(16000);
                }
                else {
                    setAltitude(16000 + ((nr - 3) * 3000));
                }
            }
            else {
                setActiveGame(false);
            }
        });

        socket.on("update_hand", (data) => {
            const newHand = playerHand.map((c, i) => {
                return data[i];
            });
            setPlayerHand(newHand);
        });

    }, [socket]);

    if (returnToHomepage) {
        socket.emit("leave_room", gameId);
        return (
            <Navigate to={`/`} />
        );
    }

    if (userName !== "") {
        if (playerList[0] !== "temp1") {
            if (!activeGame) {
                return (
                    <div className="Game">
                        <div className="Player">
                            {playerList.map((player, i) => {
                                if (player === userName) {
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
                                else if (player === 0) {
                                    return;
                                }
                                return (
                                    <div className="PlayerInfo" key={i}>
                                        <h1>{player}</h1>
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
            return (
                <div className="ActiveGame">
                    {playerList.map((player, i) => {
                        if (player === userName) {
                            return (
                                <div className="YourInfo Block" key={i}>
                                    <h1>{userName}</h1>
                                    {playerHand.map((card, i2) => { 
                                        if (card === -1) {
                                            return;
                                        }
                                        return (
                                            <div className="Card" key={i2}>
                                                <h2>{card}</h2>
                                                <button onClick={() => { setUsedCard(card) }}>Use</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        }
                        else if (player === 0) {
                            return;
                        }
                        return (
                            <div className="PlayerInfo Block" key={i}>
                                <h1>{player}</h1>
                            </div>
                        );
                    })}
                    <h1>Altitude: {altitude}ft</h1>
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