import './App.css';
import io from 'socket.io-client';
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const socket = io.connect('http://localhost:3001');

function Game() {
    const [message, setMessage] = useState("");
    const [messageReceived, setMessageReceived] = useState("");
    const [userCount, setUserCount] = useState("");
    const [playerList, setPlayerList] = useState(["temp1", "temp2", "temp3", "temp4", "temp5", "temp6"]);
    const { gameId } = useParams();
    const sendMessage = () => {
        socket.emit("send_message", { message, gameId });
    };

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
;       });
    }, [socket]);

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
                {playerList.map((player, i) => {
                    if (player === socket.id) {
                        return (
                            <div className="YourInfo" key={i}>
                                <h1>{player}</h1>
                            </div>
                        )
                    }
                    return (
                        <div className="PlayerInfo" key={i}>
                            <h1>{player}</h1>
                        </div>
                    )
                })}
               
            </div>
            <h1>Game room - {gameId}</h1>
            <h2>{ socket.id }</h2>
            <input placeholder="Message..." onChange={(event) => { setMessage(event.target.value); }} />
            <button onClick={sendMessage}>Send message</button>
            <h2>Currently logged in users - {userCount}</h2>
            <h1>Message:</h1>
            {messageReceived}
        </div>
    );
}

export default Game;