import axios from 'axios';

/**
 * Fetches the best move from an online Stockfish API.
 *
 * @param fen - The current board position in FEN notation.
 * @param difficulty - The search depth (default 15).
 * @returns A promise that resolves to the best move in UCI format.
 */
export async function getBestMoveOnline(fen: string, difficulty: number = 15): Promise<string> {
    try {
        // Encode the FEN so that special characters are handled correctly.
        const encodedFen = encodeURIComponent(fen);
        const url = `https://stockfish.online/api/s/v2.php?fen=${encodedFen}&depth=${difficulty}`;
        const response = await axios.post(url);
        const { success, bestmove } = response.data;
        if (success && bestmove) {
            return bestmove;
        } else {
            throw new Error('Online API did not return a valid best move.');
        }
    } catch (error) {
        console.error('Error fetching best move from online API:', error);
        throw error;
    }
}
