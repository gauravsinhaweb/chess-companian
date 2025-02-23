import React, { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Square } from 'chess.js';
import { ChevronLeft, ChevronRight, CopyCheck } from 'lucide-react';

interface ChessBoardPanelProps {
    currentPosition: string;
    onPieceDrop: (source: Square, target: Square) => boolean;
    onSquareClick: (square: Square) => void;
    boardOrientation: 'white' | 'black';
    selectedSquare: Square | null;
    possibleMoves: Square[];
    isAnalyzing: boolean;
    lastMove: string | null;
    errorMessage: string | null;
    gameEndMessage: string | null;
    undoLastManualMove: () => void;
    navigateMove: (direction: 'forward' | 'back') => void;
    positions: string[];
    currentMoveIndex: number;
}

const ChessBoardPanel: React.FC<ChessBoardPanelProps> = ({
    currentPosition,
    onPieceDrop,
    onSquareClick,
    boardOrientation,
    selectedSquare,
    possibleMoves,
    errorMessage,
    gameEndMessage,
    undoLastManualMove,
    navigateMove,
    positions,
    currentMoveIndex
}) => {
    const [boardWidth, setBoardWidth] = useState(Math.min(Math.max(window.innerWidth * 0.8, 400), 800));

    useEffect(() => {
        const handleResize = () => {
            const newWidth = Math.min(Math.max(window.innerWidth * 0.8, 350), 800);
            setBoardWidth(newWidth);
        };

        handleResize();

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div className="lg:col-span-3">
            <div className="relative">
                <div className='hidden max-md:flex justify-end mb-4'>
                    <button
                        onClick={undoLastManualMove}
                        className="text-sm bg-pink-700 hover:bg-pink-600 text-white font-bold py-2 px-3 rounded-xl shadow transition-colors flex items-center justify-center gap-2"
                    >
                        <span>Undo</span>
                    </button>
                </div>
                <div className="hidden max-md:flex justify-between items-center my-4">
                    <button
                        onClick={() => navigateMove('back')}
                        disabled={currentMoveIndex <= 0}
                        className={`p-2 rounded-full ${currentMoveIndex <= 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-amber-700 hover:bg-amber-600'} text-white transition`}
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <span className="text-white font-semibold">
                        Move {currentMoveIndex} of {positions.length - 1}
                    </span>
                    <button
                        onClick={() => navigateMove('forward')}
                        disabled={currentMoveIndex >= positions.length - 1}
                        className={`p-2 rounded-full ${currentMoveIndex >= positions.length - 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-amber-700 hover:bg-amber-600'} text-white transition`}
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
                <div className="w-full aspect-square max-w-[800px] mx-auto">
                    <Chessboard
                        position={currentPosition}
                        onPieceDrop={onPieceDrop}
                        onSquareClick={onSquareClick}
                        boardWidth={boardWidth}
                        boardOrientation={boardOrientation}
                        customBoardStyle={{
                            borderRadius: "4px",
                            boxShadow:
                                "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                        }}
                        customDarkSquareStyle={{ backgroundColor: "#945E3D" }}
                        customLightSquareStyle={{ backgroundColor: "#DEB887" }}
                        customSquareStyles={{
                            ...(selectedSquare && {
                                [selectedSquare]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
                            }),
                            ...Object.fromEntries(
                                possibleMoves.map((square) => [
                                    square,
                                    {
                                        background:
                                            'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
                                        borderRadius: '50%',
                                    },
                                ])
                            ),
                        }}
                    />
                </div>

                {/* {isAnalyzing && (
                    <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Calculating best move...</span>
                    </div>
                )} */}

                {/* {lastMove && (
                    <div className="absolute top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                        <span>Auto move: </span>
                        <span className="font-bold">{lastMove}</span>
                        <CopyCheck className="w-5 h-5" />
                    </div>
                )} */}

                {errorMessage && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
                        {errorMessage}
                    </div>
                )}

                {gameEndMessage && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-8 py-4 rounded-lg shadow-lg flex items-center gap-3 text-xl font-bold">
                        {gameEndMessage}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChessBoardPanel;
