import './App.css';
import io from 'socket.io-client';
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const socket = io.connect('http://localhost:3001');

function Game() {
    const [message, setMessage] = useState("");
    const [messageReceived, setMessageReceived] = useState("");
    const { gameId } = useParams();
    const sendMessage = () => {
        socket.emit("send_message", { message, gameId });
    };

    useEffect(() => {
        socket.emit("join_room", gameId);
    });

    useEffect(() => {
        socket.on("receive_message", (data) => {
            setMessageReceived(data.message);
        });
    }, [socket]);

    return (
        <div className="Game">
            <h1>Game room - { gameId }</h1>
            <input placeholder="Message..." onChange={(event) => { setMessage(event.target.value); }} />
            <button onClick={sendMessage}>Send message</button>
            <h1>Message:</h1>
            {messageReceived}
        </div>
    );
}

export default Game;