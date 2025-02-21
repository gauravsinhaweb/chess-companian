import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, Square } from 'chess.js';
import { RotateCcw, Circle, X, CopyCheck, Key, Brain, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

function App() {
  const [game, setGame] = useState(new Chess());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentPosition, setCurrentPosition] = useState(game.fen());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [playerColor, setPlayerColor] = useState<'w' | 'b' | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('geminiApiKey') || 'AIzaSyCinxRjUcZvovmhECIhNm9hDIyYTuq1qzc' || '';
  });
  const [showApiInput, setShowApiInput] = useState(false);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [gameEndMessage, setGameEndMessage] = useState<string | null>(null);
  const [positions, setPositions] = useState<string[]>([]);

  useEffect(() => {
    if (!apiKey) {
      setShowApiInput(true);
    }
  }, []);

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('geminiApiKey', apiKey);
    }
  }, [apiKey]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    const makeInitialMove = async () => {
      if (playerColor === 'b' && moveHistory.length === 0 && apiKey) {
        await calculateAndPlayBestMove();
      }
    };
    makeInitialMove();
  }, [playerColor, apiKey]);

  useEffect(() => {
    const isOpponentsTurn =
      (playerColor === 'w' && game.turn() === 'w') ||
      (playerColor === 'b' && game.turn() === 'b');

    const makeOpponentMove = async () => {
      if (moveHistory.length > 0 && isOpponentsTurn && !isAnalyzing && !game.isGameOver() && apiKey) {
        await calculateAndPlayBestMove();
      }
    };
    makeOpponentMove();

    if (game.isGameOver()) {
      let message = '';
      if (game.isCheckmate()) {
        const winner = game.turn() === 'w' ? 'Black' : 'White';
        message = `Checkmate! ${winner} wins! 🏆`;
      } else if (game.isDraw()) {
        message = "It's a draw! 🤝";
      } else if (game.isStalemate()) {
        message = "Stalemate! Game is drawn! 🤝";
      } else if (game.isThreefoldRepetition()) {
        message = "Draw by repetition! 🔄";
      } else if (game.isInsufficientMaterial()) {
        message = "Draw by insufficient material! ⚖️";
      }
      setGameEndMessage(message);
    } else {
      setGameEndMessage(null);
    }
  }, [game, moveHistory, playerColor, isAnalyzing, apiKey]);

  const getGeminiSuggestion = async (fen: string): Promise<string | null> => {
    try {
      if (!apiKey) {
        setShowApiInput(true);
        return null;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `As a chess grandmaster, analyze this position (FEN: ${fen}) and provide the single best move to win quickly.
        Current turn: ${game.turn() === 'w' ? 'White' : 'Black'}
        Game phase: ${moveHistory.length < 10 ? 'Opening' : moveHistory.length < 30 ? 'Middlegame' : 'Endgame'}
        Consider:
        1. Material advantage and piece activity
        2. King safety and pawn structure
        3. Tactical opportunities and threats
        4. Control of key squares and center
        5. Development and piece coordination
        Respond ONLY with the move in standard algebraic notation (e.g., "e4", "Nf3", "O-O").`;

      const result = await model.generateContent(prompt);
      const response = result.response.text().trim();

      const moves = game.moves();
      if (moves.includes(response)) {
        return response;
      }

      // If the suggested move is not valid, try to get a random legal move
      if (moves.length > 0) {
        return moves[Math.floor(Math.random() * moves.length)];
      }

      return null;
    } catch (error) {
      console.error('Error getting Gemini suggestion:', error);
      return null;
    }
  };

  const calculateAndPlayBestMove = async () => {
    if (game.isGameOver()) return;

    setIsAnalyzing(true);

    try {
      const geminiSuggestion = await getGeminiSuggestion(game.fen());

      if (!geminiSuggestion) {
        setErrorMessage('Failed to get AI move suggestion');
        return;
      }

      const newGame = new Chess(game.fen());
      const result = newGame.move(geminiSuggestion);

      if (!result) {
        setErrorMessage('Invalid AI move');
        return;
      }

      setGame(newGame);
      setCurrentPosition(newGame.fen());
      setMoveHistory(prev => [...prev, result.san]);
      setPositions(prev => [...prev, newGame.fen()]);
      setCurrentMoveIndex(prev => prev + 1);
      setLastMove(result.san);
    } catch (error) {
      console.error('Error calculating move:', error);
      setErrorMessage('Error calculating move');
    } finally {
      setIsAnalyzing(false);
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  };

  const validateMove = (from: Square, to: Square): boolean => {
    try {
      if (!from || !to) {
        setErrorMessage('Invalid move: Missing source or destination');
        return false;
      }

      const piece = game.get(from);
      if (!piece) {
        setErrorMessage('No piece at selected position');
        return false;
      }

      if (piece.color !== game.turn()) {
        setErrorMessage(`It's ${game.turn() === 'w' ? 'White' : 'Black'}'s turn`);
        return false;
      }

      const legalMoves = game.moves({ square: from, verbose: true });
      if (!legalMoves.some(move => move.to === to)) {
        setErrorMessage('Illegal move for this piece');
        return false;
      }

      return true;
    } catch (error) {
      setErrorMessage('Error validating move');
      console.error('Move validation error:', error);
      return false;
    }
  };

  const isValidToMove = () => {
    if (!apiKey) {
      setErrorMessage('Please enter Gemini API key first');
      return false;
    }
    if (!playerColor) {
      setErrorMessage('Please select a color first');
      return false;
    }
    if (isAnalyzing) {
      setErrorMessage('Please wait, calculating move...');
      return false;
    }
    if (game.isGameOver()) {
      setErrorMessage('Game is over');
      return false;
    }
    const isCorrectTurn = (playerColor === 'w' && game.turn() === 'b') ||
      (playerColor === 'b' && game.turn() === 'w');
    if (!isCorrectTurn) {
      setErrorMessage('Not your turn');
      return false;
    }
    return true;
  };

  const makeMove = (from: Square, to: Square): boolean => {
    if (!isValidToMove()) return false;

    try {
      if (!validateMove(from, to)) return false;

      const newGame = new Chess(game.fen());
      const move = newGame.move({
        from,
        to,
        promotion: 'q',
      });

      if (!move) {
        setErrorMessage('Invalid move');
        return false;
      }

      setGame(newGame);
      setCurrentPosition(newGame.fen());
      setMoveHistory(prev => [...prev, move.san]);
      setPositions(prev => [...prev, newGame.fen()]);
      setCurrentMoveIndex(prev => prev + 1);
      setSelectedSquare(null);
      setPossibleMoves([]);
      setLastMove(null);
      setErrorMessage(null);

      return true;
    } catch (error) {
      setErrorMessage('Error making move');
      console.error('Move error:', error);
      setSelectedSquare(null);
      setPossibleMoves([]);
      return false;
    }
  };

  const getMoveOptions = (square: Square): Square[] => {
    if (!isValidToMove()) return [];
    try {
      const moves = game.moves({ square, verbose: true });
      return moves.map(move => move.to as Square);
    } catch (error) {
      console.error('Error getting move options:', error);
      return [];
    }
  };

  const onSquareClick = (square: Square) => {
    if (!isValidToMove()) {
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    try {
      if (selectedSquare !== null) {
        const moveSuccessful = makeMove(selectedSquare, square);

        if (!moveSuccessful) {
          const piece = game.get(square);
          if (piece && piece.color === game.turn()) {
            setSelectedSquare(square);
            setPossibleMoves(getMoveOptions(square));
            setErrorMessage(null);
          } else {
            setSelectedSquare(null);
            setPossibleMoves([]);
          }
        }
      } else {
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
          setSelectedSquare(square);
          setPossibleMoves(getMoveOptions(square));
          setErrorMessage(null);
        }
      }
    } catch (error) {
      setErrorMessage('Error handling square click');
      console.error('Square click error:', error);
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  };

  const onDrop = (sourceSquare: Square, targetSquare: Square) => {
    return makeMove(sourceSquare, targetSquare);
  };

  const startNewGame = (color: 'w' | 'b') => {
    try {
      const newGame = new Chess();
      setGame(newGame);
      setCurrentPosition(newGame.fen());
      setMoveHistory([]);
      setPositions([newGame.fen()]);
      setPlayerColor(color);
      setSelectedSquare(null);
      setPossibleMoves([]);
      setIsAnalyzing(false);
      setLastMove(null);
      setCurrentMoveIndex(-1);
      setGameEndMessage(null);
    } catch (error) {
      console.error('Error starting new game:', error);
    }
  };

  const getGameStatus = () => {
    if (gameEndMessage) return gameEndMessage;
    if (game.isCheck()) return "Check!";
    return game.turn() === 'w' ? "White to move" : "Black to move";
  };

  const navigateMove = (direction: 'forward' | 'back') => {
    const newIndex = direction === 'forward'
      ? Math.min(currentMoveIndex + 1, positions.length - 1)
      : Math.max(currentMoveIndex - 1, 0);

    if (newIndex !== currentMoveIndex) {
      setCurrentMoveIndex(newIndex);
      setCurrentPosition(positions[newIndex]);
    }
  };

  if (!apiKey) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 to-amber-800 flex items-center justify-center p-4 origin-top scale-75">
        <div className="bg-amber-50 p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-amber-900 mb-6">Chess.com Companion</h1>
          <p className="text-amber-800 mb-6">Please enter your Gemini API key to continue</p>
          <div className="space-y-4">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter Gemini API Key"
              className="w-full px-4 py-2 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-sm text-amber-700">
              Your API key will be saved locally for future sessions
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (playerColor === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 to-amber-800 flex items-center justify-center p-4 scale-80 origin-top">
        <div className="bg-amber-50 p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-amber-900 mb-6">Chess.com Companion</h1>
          <p className="text-amber-800 mb-6">Select the color you're playing as on chess.com</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => startNewGame('w')}
              className="bg-white hover:bg-gray-50 text-amber-900 font-bold py-4 px-6 rounded-lg shadow flex items-center justify-center gap-2 transition-colors"
            >
              <Circle className="w-6 h-6" />
              I'm White on chess.com
            </button>
            <button
              onClick={() => startNewGame('b')}
              className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-6 rounded-lg shadow flex items-center justify-center gap-2 transition-colors"
            >
              <Circle className="w-6 h-6 fill-current" />
              I'm Black on chess.com
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-900 to-amber-800 flex items-center justify-center p-4 scale-80 origin-top">
      <div className="bg-amber-50 p-6 rounded-xl shadow-2xl max-w-7xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chess Board */}
          <div className="lg:col-span-3">
            <div className="relative">
              <div className="w-full aspect-square max-w-[800px] mx-auto">
                <Chessboard
                  position={currentPosition}
                  onPieceDrop={onDrop}
                  onSquareClick={onSquareClick}
                  boardWidth={800}
                  boardOrientation={playerColor === 'b' ? 'black' : 'white'}
                  customBoardStyle={{
                    borderRadius: "4px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
                  }}
                  customDarkSquareStyle={{ backgroundColor: "#945E3D" }}
                  customLightSquareStyle={{ backgroundColor: "#DEB887" }}
                  customSquareStyles={{
                    ...(selectedSquare && {
                      [selectedSquare]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
                    }),
                    ...Object.fromEntries(
                      possibleMoves.map(square => [
                        square,
                        {
                          background: 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
                          borderRadius: '50%'
                        }
                      ])
                    )
                  }}
                />
              </div>

              {isAnalyzing && (
                <div className="absolute top-4 left-4 bg-amber-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Calculating best move...</span>
                </div>
              )}

              {lastMove && (
                <div className="absolute top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                  <span>Copy this move to chess.com: </span>
                  <span className="font-bold">{lastMove}</span>
                  <CopyCheck className="w-5 h-5" />
                </div>
              )}

              {errorMessage && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
                  {errorMessage}
                </div>
              )}

              {gameEndMessage && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-amber-600 text-white px-8 py-4 rounded-lg shadow-lg flex items-center gap-3 text-xl font-bold">
                  <Trophy className="w-6 h-6" />
                  {gameEndMessage}
                </div>
              )}
            </div>

            {/* Move Navigation */}
            <div className="flex justify-center items-center gap-4 mt-4">
              <button
                onClick={() => navigateMove('back')}
                disabled={currentMoveIndex <= 0}
                className={`p-2 rounded-lg ${currentMoveIndex <= 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'} text-white`}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <span className="text-amber-900 font-medium">
                Move {currentMoveIndex + 1} of {positions.length}
              </span>
              <button
                onClick={() => navigateMove('forward')}
                disabled={currentMoveIndex >= positions.length - 1}
                className={`p-2 rounded-lg ${currentMoveIndex >= positions.length - 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'} text-white`}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Side Panel */}
          <div className="bg-amber-100 p-4 rounded-lg">
            {/* Game Status */}
            <div className="mb-4">
              <h2 className="text-xl font-bold text-amber-900 mb-2">Chess.com Companion</h2>
              <p className="text-amber-800">
                You're playing as {playerColor === 'w' ? 'White' : 'Black'} on chess.com
              </p>
              <p className="text-amber-700 mt-1">
                {playerColor === 'w'
                  ? "• Copy the suggested White moves to chess.com\n• Input your opponent's Black moves here"
                  : "• Copy the suggested Black moves to chess.com\n• Input your opponent's White moves here"}
              </p>
              <p className="text-amber-900 font-medium mt-2">{getGameStatus()}</p>
            </div>

            {/* Gemini API Configuration */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-amber-900">Gemini AI</h2>
                <button
                  onClick={() => setShowApiInput(!showApiInput)}
                  className="text-amber-600 hover:text-amber-700"
                >
                  <Key className="w-5 h-5" />
                </button>
              </div>

              {showApiInput && (
                <div className="mt-2 space-y-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter Gemini API Key"
                    className="w-full px-3 py-2 rounded border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              {apiKey && (
                <div className="mt-2 bg-green-100 text-green-800 px-3 py-2 rounded-lg flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  <span className="text-sm">Gemini AI is ready</span>
                </div>
              )}
            </div>

            {/* Move History */}
            <div className="mb-4">
              <h2 className="text-xl font-bold text-amber-900 mb-2">Move History</h2>
              <div className="bg-white rounded-lg p-3 h-[400px] overflow-y-auto">
                <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-2 text-sm">
                  <div className="col-span-3 grid grid-cols-[auto_1fr_1fr] gap-x-4 mb-2 font-semibold border-b pb-2">
                    <div>#</div>
                    <div>White</div>
                    <div>Black</div>
                  </div>
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                    <React.Fragment key={i}>
                      <div className="text-gray-500">{i + 1}.</div>
                      <div className="font-medium">{moveHistory[i * 2] || ''}</div>
                      <div className="font-medium">{moveHistory[i * 2 + 1] || ''}</div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div>
              <h2 className="text-xl font-bold text-amber-900 mb-2">Controls</h2>
              <button
                onClick={() => startNewGame(playerColor)}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-lg shadow flex items-center justify-center gap-2 transition-colors mb-2"
              >
                <RotateCcw className="w-5 h-5" />
                New Game
              </button>
              <button
                onClick={() => setPlayerColor(null)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow flex items-center justify-center gap-2 transition-colors"
              >
                <X className="w-5 h-5" />
                Change Color
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;