import './App.css';
import io from 'socket.io-client';
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const socket = io.connect('http://localhost:3001');

function Game() {
    const [message, setMessage] = useState("");
    const [messageReceived, setMessageReceived] = useState("");
    const [userCount, setUserCount] = useState("");
    const [playerList, setPlayerList] = useState([0]);
    const { gameId } = useParams();
    const sendMessage = () => {
        socket.emit("send_message", { message, gameId });
    };

    useEffect(() => {
        // set up so it shows currently connected users
        socket.on("user_list", (clients) => {
            setPlayerList(clients);
            console.log(playerList);
;        });
    }, [socket]);

    const getList = () => {
        socket.emit("get_user_list", gameId);
    };

    useEffect(() => {
        socket.emit("join_room", gameId);
    }, []);

    useEffect(() => {
        socket.on("receive_message", (data) => {
            setMessageReceived(data.message);
        });
    }, [socket]);

    useEffect(() => {
        socket.on("user_log", (nr) => {
            setUserCount(nr);
        });
    }, [socket]);

    return (
        <div className="Game">
            <div className="Player">
                <div className="PlayerInfo">
                    <h1>Player 1: { }</h1>
                </div>
            </div>
            <button onClick={getList}>yes bitch</button>
            <h1>Game room - { gameId }</h1>
            <input placeholder="Message..." onChange={(event) => { setMessage(event.target.value); }} />
            <button onClick={sendMessage}>Send message</button>
            <h2>Currently logged in users - {userCount}</h2>
            <h1>Message:</h1>
            {messageReceived}
        </div>
    );
}

export default Game;