// src/App.tsx
import { Chess, Square } from 'chess.js';
import { Circle } from 'lucide-react';
import { useEffect, useState } from 'react';
import ChessBoardPanel from './components/ChessBoardPanel';
import SidePanel from './components/SidePanel';
import { getBestMoveOnline } from './stockfishAPI';

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
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [gameEndMessage, setGameEndMessage] = useState<string | null>(null);
  const [positions, setPositions] = useState<string[]>([]);

  // autoColor: side played automatically by the API.
  // manualColor: the opponent’s side (moves entered manually).
  const autoColor = playerColor;
  const manualColor = playerColor ? (playerColor === 'w' ? 'b' : 'w') : null;

  // Effect: When it's the auto side's turn, automatically calculate and play a move.
  useEffect(() => {
    const makeAutoMove = async () => {
      if (
        autoColor &&
        game.turn() === autoColor &&
        !game.isGameOver() &&
        !isAnalyzing
      ) {
        await calculateAndPlayBestMove();
      }
    };
    makeAutoMove();

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
  }, [game, moveHistory, autoColor, isAnalyzing]);

  // Function to calculate and play the best move using the online API
  const calculateAndPlayBestMove = async () => {
    if (game.isGameOver()) return;
    setIsAnalyzing(true);
    try {
      const bestMove = await getBestMoveOnline(game.fen(), 15);
      console.log('Online API best move:', bestMove);
      if (!bestMove) {
        setErrorMessage("Failed to get AI move suggestion");
        return;
      }
      const newGame = new Chess(game.fen());
      const moveResult = newGame.move(bestMove);
      if (!moveResult) {
        setErrorMessage("Invalid AI move");
        return;
      }
      setGame(newGame);
      setCurrentPosition(newGame.fen());
      setMoveHistory(prev => [...prev, moveResult.san]);
      setPositions(prev => [...prev, newGame.fen()]);
      setCurrentMoveIndex(prev => prev + 1);
      setLastMove(moveResult.san);
    } catch (error) {
      console.error("Error calculating move:", error);
      setErrorMessage("Error calculating move");
    } finally {
      setIsAnalyzing(false);
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  };

  // --- Manual (Opponent) Move Functions ---

  const isValidManualMove = (): boolean => {
    if (!playerColor) {
      setErrorMessage("Please select a color first");
      return false;
    }
    if (isAnalyzing) {
      setErrorMessage("Please wait, calculating move...");
      return false;
    }
    if (game.isGameOver()) {
      setErrorMessage("Game is over");
      return false;
    }
    if (manualColor && game.turn() !== manualColor) {
      setErrorMessage("It is not the opponent’s turn to move");
      return false;
    }
    return true;
  };

  const validateManualMove = (from: Square, to: Square): boolean => {
    try {
      if (!from || !to) {
        setErrorMessage("Invalid move: Missing source or destination");
        return false;
      }
      if (!manualColor) return false;
      const piece = game.get(from);
      if (!piece) {
        setErrorMessage("No piece at selected position");
        return false;
      }
      if (piece.color !== manualColor) {
        setErrorMessage("You can only move the opponent’s pieces manually");
        return false;
      }
      const legalMoves = game.moves({ square: from, verbose: true });
      if (!legalMoves.some(move => move.to === to)) {
        setErrorMessage("Illegal move for this piece");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Manual move validation error:", error);
      setErrorMessage("Error validating manual move");
      return false;
    }
  };

  const makeManualMove = (from: Square, to: Square): boolean => {
    if (!isValidManualMove()) return false;
    try {
      if (!validateManualMove(from, to)) return false;
      const newGame = new Chess(game.fen());
      const move = newGame.move({ from, to, promotion: "q" });
      if (!move) {
        setErrorMessage("Invalid manual move");
        return false;
      }
      setGame(newGame);
      setCurrentPosition(newGame.fen());
      setMoveHistory(prev => [...prev, move.san]);
      setPositions(prev => [...prev, newGame.fen()]);
      setCurrentMoveIndex(prev => prev + 1);
      setSelectedSquare(null);
      setPossibleMoves([]);
      setErrorMessage(null);
      return true;
    } catch (error) {
      console.error("Manual move error:", error);
      setErrorMessage("Error making manual move");
      setSelectedSquare(null);
      setPossibleMoves([]);
      return false;
    }
  };

  const onSquareClick = (square: Square) => {
    if (!isValidManualMove()) {
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }
    try {
      if (selectedSquare !== null) {
        const moveSuccessful = makeManualMove(selectedSquare, square);
        if (!moveSuccessful) {
          const piece = game.get(square);
          if (piece && piece.color === manualColor) {
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
        if (piece && piece.color === manualColor) {
          setSelectedSquare(square);
          setPossibleMoves(getMoveOptions(square));
          setErrorMessage(null);
        }
      }
    } catch (error) {
      console.error("Square click error:", error);
      setErrorMessage("Error handling square click");
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  };

  const onDrop = (sourceSquare: Square, targetSquare: Square) => {
    return makeManualMove(sourceSquare, targetSquare);
  };

  const getMoveOptions = (square: Square): Square[] => {
    if (!isValidManualMove()) return [];
    try {
      const moves = game.moves({ square, verbose: true });
      return moves.map(move => move.to as Square);
    } catch (error) {
      console.error("Error getting move options:", error);
      return [];
    }
  };

  const startNewGame = (color: "w" | "b") => {
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
      console.error("Error starting new game:", error);
    }
  };

  const changeColor = () => {
    setPlayerColor(null);
  };

  const getGameStatus = () => {
    if (gameEndMessage) return gameEndMessage;
    if (game.isCheck()) return "Check!";
    return game.turn() === "w" ? "White to move" : "Black to move";
  };

  const navigateMove = (direction: "forward" | "back") => {
    const newIndex =
      direction === "forward"
        ? Math.min(currentMoveIndex + 1, positions.length - 1)
        : Math.max(currentMoveIndex - 1, 0);
    if (newIndex !== currentMoveIndex) {
      setCurrentMoveIndex(newIndex);
      setCurrentPosition(positions[newIndex]);
    }
  };

  const boardOrientation = playerColor === "b" ? "black" : "white";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-800 gap-8 flex items-center max-lg:flex-col justify-center p-4 scale-80 origin-top">
      {playerColor === null ? (
        <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-800 gap-8  flex items-center max-lg:flex-col justify-center p-4 scale-80 origin-top">
          <div className="bg-blue-50 p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-blue-900 mb-6">Chess Companion</h1>
            <p className="text-blue-800 mb-6">
              Select the color you will play (the auto moves will be made for this side)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => startNewGame("w")}
                className="bg-white hover:bg-gray-50 text-blue-900 font-bold py-4 px-6 rounded-lg shadow flex items-center justify-center gap-2 transition-colors"
              >
                <Circle className="w-6 h-6" />
                I'm White (auto)
              </button>
              <button
                onClick={() => startNewGame("b")}
                className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-6 rounded-lg shadow flex items-center justify-center gap-2 transition-colors"
              >
                <Circle className="w-6 h-6 fill-current" />
                I'm Black (auto)
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <ChessBoardPanel
            currentPosition={currentPosition}
            onPieceDrop={onDrop}
            onSquareClick={onSquareClick}
            boardOrientation={boardOrientation}
            selectedSquare={selectedSquare}
            possibleMoves={possibleMoves}
            isAnalyzing={isAnalyzing}
            lastMove={lastMove}
            errorMessage={errorMessage}
            gameEndMessage={gameEndMessage}
          />
          <SidePanel
            playerColor={playerColor}
            manualColor={manualColor}
            showApiInput={false}
            setShowApiInput={() => { }}
            setApiKey={() => { }}
            gameStatus={getGameStatus()}
            moveHistory={moveHistory}
            positions={positions}
            currentMoveIndex={currentMoveIndex}
            navigateMove={navigateMove}
            startNewGame={startNewGame}
            changeColor={changeColor}
          />
        </>
      )}
    </div>
  );
}

export default App;
