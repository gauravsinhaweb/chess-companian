import {
    Brain,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    X
} from 'lucide-react';
import React from 'react';

interface SidePanelProps {
    playerColor: 'w' | 'b';
    manualColor: 'w' | 'b' | null;
    showApiInput: boolean;
    setShowApiInput: (value: boolean) => void;
    setApiKey: (key: string) => void;
    gameStatus: string;
    moveHistory: string[];
    positions: string[];
    currentMoveIndex: number;
    navigateMove: (direction: 'forward' | 'back') => void;
    startNewGame: (color: 'w' | 'b') => void;
    changeColor: () => void;
    toggleBoardView: () => void;
    undoLastManualMove: () => void;
}

const SidePanel: React.FC<SidePanelProps> = ({
    playerColor,
    manualColor,
    gameStatus,
    moveHistory,
    positions,
    currentMoveIndex,
    navigateMove,
    startNewGame,
    changeColor,
    toggleBoardView,
    undoLastManualMove
}) => {

    return (
        <div className="bg-blue-900 p-6 pt-0 rounded-xl shadow-2xl flex flex-col space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white mb-2">Move History</h2>
                <div className="bg-white rounded-lg p-4 h-64 overflow-y-auto text-blue-900">
                    <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
                        <div className="col-span-3 grid grid-cols-3 gap-x-4 font-bold border-b pb-2">
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
            <div>
                <h2 className="text-2xl font-bold text-white">Game Status</h2>
                <p className="text-blue-300 mt-2">
                    Auto side: {playerColor === 'w' ? 'White' : 'Black'} (played by Stockfish)
                </p>
                <p className="text-blue-200 mt-1 whitespace-pre-line">
                    {manualColor === 'w'
                        ? "• Manually play White moves\n• Stockfish will play Black moves for a rapid win"
                        : "• Manually play Black moves\n• Stockfish will play White moves for a rapid win"}
                </p>
                <p className="mt-2 font-semibold text-white">{gameStatus}</p>
            </div>

            <div>
                <h2 className="text-xl font-bold text-white">Chess Engine</h2>
                <div className="mt-2 bg-green-200 text-green-800 px-3 py-2 rounded-lg flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    <span className="text-sm font-semibold">Stockfish is ready</span>
                </div>
            </div>
            <div className="flex flex-col space-y-4">
                <button
                    onClick={() => startNewGame(playerColor)}
                    className="w-full bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl shadow transition-colors flex items-center justify-center gap-2"
                >
                    <RotateCcw className="w-6 h-6" />
                    New Game
                </button>

            </div>

            <div className="flex flex-col space-y-4 mt-4">
                <button
                    onClick={toggleBoardView}
                    className="w-full bg-purple-700 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-xl shadow transition-colors flex items-center justify-center gap-2"
                >
                    <span>Flip Board</span>
                </button>
            </div>


            <div className="flex justify-between items-center mt-4">
                <button
                    onClick={() => navigateMove('back')}
                    disabled={currentMoveIndex <= 0}
                    className={`p-2 rounded-full ${currentMoveIndex <= 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-600'} text-white transition`}
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <span className="text-white font-semibold">
                    Move {currentMoveIndex} of {positions.length - 1}
                </span>
                <button
                    onClick={() => navigateMove('forward')}
                    disabled={currentMoveIndex >= positions.length - 1}
                    className={`p-2 rounded-full ${currentMoveIndex >= positions.length - 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-600'} text-white transition`}
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            <div className='flex flex-row items-center justify-between gap-2'>
                <button
                    onClick={changeColor}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl shadow transition-colors flex items-center justify-center gap-2"
                >
                    Change Color
                </button>
                <button
                    onClick={undoLastManualMove}
                    className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl shadow transition-colors flex items-center justify-center gap-2"
                >
                    <span>Undo Move</span>
                </button>
            </div>
        </div>
    );
};

export default SidePanel;
