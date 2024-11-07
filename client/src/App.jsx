import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

function App() {
  const [roomId, setRoomId] = useState('');
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [hand, setHand] = useState([]);
  const [gameBox, setGameBox] = useState([]);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winnerId, setWinnerId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    socket.on('receiveHand', (hand) => setHand(hand));
    socket.on('yourTurn', (gameBox) => {
      setGameBox(gameBox);
      setIsMyTurn(true);
      setErrorMessage('');
    });
    socket.on('updateGameBox', (newGameBox) => {
      setGameBox(newGameBox);
      setIsMyTurn(false);
      setErrorMessage('');
    });
    socket.on('gameOver', ({ winnerId }) => {
      setGameOver(true);
      setWinnerId(winnerId);
    });
    socket.on('error', (message) => {
      setErrorMessage(message);
    });

    // Clean up the error listener
    return () => {
      socket.off('receiveHand');
      socket.off('yourTurn');
      socket.off('updateGameBox');
      socket.off('gameOver');
      socket.off('error');
    };
  }, []);

  const joinRoom = () => {
    if (roomId.trim()) {
      socket.emit('joinRoom', roomId);
      setJoinedRoom(true);
    }
  };

  const playCard = (card) => {
    if (!isMyTurn) return;
    socket.emit('playCard', roomId, card);
    setHand(hand.filter((c) => c.id !== card.id));
    setIsMyTurn(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Domino Game</h1>

      {!joinedRoom ? (
        <div className="flex flex-col items-center space-y-4">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter Room ID"
            className="px-4 py-2 border rounded-md border-gray-300 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={joinRoom}
            className="px-6 py-2 bg-indigo-500 text-white font-semibold rounded-md hover:bg-indigo-600 transition"
          >
            Join Room
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md">
          {gameOver ? (
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-800">
                {winnerId === socket.id ? '🎉 You won!' : `Player ${winnerId} won the game!`}
              </h2>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="text-red-600 text-lg mb-4">{errorMessage}</div>
              )}

              <h2 className="text-xl font-semibold mb-4 text-gray-800">Your Hand</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {hand.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => playCard(card)}
                    disabled={!isMyTurn}
                    className={`flex items-center justify-center p-4 border rounded-md ${
                      isMyTurn ? 'bg-green-200' : 'bg-gray-200'
                    } hover:bg-green-300 transition cursor-pointer`}
                  >
                    <span className="text-lg font-medium text-gray-700">
                      {card.up} | {card.down}
                    </span>
                  </button>
                ))}
              </div>

              <h2 className="text-xl font-semibold mb-4 text-gray-800">Game Box</h2>
              <div className="flex flex-wrap gap-2 items-center justify-center mb-6">
                {gameBox.map((card, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-center p-2 bg-blue-200 text-blue-800 font-semibold rounded-md"
                  >
                    {card.up} | {card.down}
                  </div>
                ))}
              </div>

              {isMyTurn ? (
                <div>
                  <p className="text-green-600 font-semibold text-lg">Your Turn!</p>
                  <button onClick={() => handelPassCard()} className="px-6 py-2 bg-indigo-500 text-white font-semibold rounded-md hover:bg-indigo-600 transition">Pass</button>
                </div>
              ) : (
                <p className="text-gray-600 font-medium">Waiting for other players...</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
