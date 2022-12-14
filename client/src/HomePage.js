import { Navigate } from "react-router-dom";
import { useState } from "react";


function HomePage() {
    const [goToGame, createGameRoom] = useState(false);
    const [gameNumber, setGameNumber] = useState(0);
    const [infoText, setInfoText] = useState("Enter game room number!");
    const [goToSpecificGame, verifyGame] = useState(false);

    if (goToGame) {
        const gameId = Math.floor(Math.random() * (8999)) + 1001;
        return (
            <Navigate to={`/game/${gameId}`} />
        );
    }
    if (goToSpecificGame) {
        if (gameNumber === 0 || isNaN(gameNumber)) {
            setInfoText("No number added!");
            verifyGame(false);
        }
        else if (gameNumber <= 9999 && gameNumber >= 1001) {
            return (
               <Navigate to={`/game/${gameNumber}`} />
            );
        }
        else {
            setInfoText("Invalid number!");
            verifyGame(false);
        }
    }


    return (
        <div className="HomePage">
            <div className="title">
                <h1>Hit the Silk!</h1>
                <h2>Online</h2>
            </div>
            <div className="creation">
                <button className="button" onClick={() => {createGameRoom(true)}}>Generate room</button>
            </div>
            <div>
                <h1>{ infoText }</h1>
                <input placeholder="Enter room number..." onChange={(event) => { setGameNumber(parseInt(event.target.value, 10)); }} />
                <button onClick={() => {verifyGame(true)} }>Join room</button>
            </div>
        </div>

    )
}

export default HomePage;