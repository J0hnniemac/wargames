/**
 * TicTacToe - Animated tic-tac-toe game for one screen
 */

export class TicTacToeGame {
    constructor() {
        this.board = Array(9).fill(null); // null, 'X', or 'O'
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.winner = null;
        this.winLine = null; // [a, b, c] indices of winning cells
        this.thinkingTime = 0;
        this.moveDelay = 1.5; // seconds between moves
        this.lastMoveTime = 0;
    }

    update(deltaTime, currentTime) {
        if (this.gameOver) {
            // Reset game after 3 seconds
            if (currentTime - this.lastMoveTime > 3.0) {
                this.reset();
            }
            return;
        }

        this.thinkingTime += deltaTime;

        if (this.thinkingTime >= this.moveDelay) {
            this.makeAIMove();
            this.thinkingTime = 0;
            this.lastMoveTime = currentTime;
        }
    }

    makeAIMove() {
        // Find available moves
        const available = [];
        for (let i = 0; i < 9; i++) {
            if (this.board[i] === null) {
                available.push(i);
            }
        }

        if (available.length === 0) {
            this.gameOver = true;
            return;
        }

        // Make random move
        const move = available[Math.floor(Math.random() * available.length)];
        this.board[move] = this.currentPlayer;

        // Check for winner
        if (this.checkWinner()) {
            this.winner = this.currentPlayer;
            this.gameOver = true;
        } else if (available.length === 1) {
            // Board full, draw
            this.gameOver = true;
            this.winner = 'DRAW';
        } else {
            // Switch player
            this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        }
    }

    checkWinner() {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
            [0, 4, 8], [2, 4, 6]  // diagonals
        ];

        for (const line of lines) {
            const [a, b, c] = line;
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                this.winLine = line;
                return true;
            }
        }

        return false;
    }

    reset() {
        this.board = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.winner = null;
        this.winLine = null;
        this.thinkingTime = 0;
    }

    renderToCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const w = canvas.width;
        const h = canvas.height;
        
        ctx.fillStyle = '#001a00';
        ctx.fillRect(0, 0, w, h);
        
        // Layout: title at top, board centered, status at bottom
        const titleHeight = 30;
        const statusHeight = 70;
        const padX = 20;
        const padY = 10;
        
        // Board area sits between title and status
        const availH = h - titleHeight - statusHeight - padY * 2;
        const availW = w - padX * 2;
        const boardSize = Math.min(availW, availH) * 0.9;
        const cellSize = boardSize / 3;
        const boardX = (w - boardSize) / 2;
        const boardY = titleHeight + padY + (availH - boardSize) / 2;
        
        // Scale font size relative to cell size
        const pieceFontSize = Math.max(16, Math.floor(cellSize * 0.6));
        
        // --- Title ---
        ctx.font = `bold ${Math.max(11, Math.floor(w / 25))}px monospace`;
        ctx.fillStyle = '#00ff00';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TIC-TAC-TOE WARGAMES', w / 2, titleHeight / 2 + 4);
        
        // --- Grid lines ---
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        
        for (let i = 1; i < 3; i++) {
            // Vertical
            ctx.beginPath();
            ctx.moveTo(boardX + i * cellSize, boardY);
            ctx.lineTo(boardX + i * cellSize, boardY + boardSize);
            ctx.stroke();
            // Horizontal
            ctx.beginPath();
            ctx.moveTo(boardX, boardY + i * cellSize);
            ctx.lineTo(boardX + boardSize, boardY + i * cellSize);
            ctx.stroke();
        }
        
        // --- X's and O's ---
        ctx.font = `bold ${pieceFontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i < 9; i++) {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const cx = boardX + col * cellSize + cellSize / 2;
            const cy = boardY + row * cellSize + cellSize / 2;
            
            if (this.board[i] === 'X') {
                ctx.fillStyle = '#ff3333';
                ctx.fillText('X', cx, cy);
            } else if (this.board[i] === 'O') {
                ctx.fillStyle = '#00ffff';
                ctx.fillText('O', cx, cy);
            }
        }
        
        // --- Draw winning line through cells ---
        if (this.winLine && this.winner && this.winner !== 'DRAW') {
            const [a, , c] = this.winLine;
            const rowA = Math.floor(a / 3), colA = a % 3;
            const rowC = Math.floor(c / 3), colC = c % 3;
            
            const x1 = boardX + colA * cellSize + cellSize / 2;
            const y1 = boardY + rowA * cellSize + cellSize / 2;
            const x2 = boardX + colC * cellSize + cellSize / 2;
            const y2 = boardY + rowC * cellSize + cellSize / 2;
            
            // Extend line slightly past cells
            const dx = x2 - x1, dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            const ext = cellSize * 0.3;
            const ex = (dx / len) * ext, ey = (dy / len) * ext;
            
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(x1 - ex, y1 - ey);
            ctx.lineTo(x2 + ex, y2 + ey);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        
        // --- Status text below board ---
        const statusY = boardY + boardSize + 15;
        const statusFontSize = Math.max(10, Math.floor(w / 35));
        ctx.font = `${statusFontSize}px monospace`;
        ctx.textAlign = 'center';
        
        if (this.gameOver) {
            if (this.winner === 'DRAW') {
                ctx.fillStyle = '#ffff00';
                ctx.fillText('A STRANGE GAME.', w / 2, statusY);
                ctx.fillText('THE ONLY WINNING MOVE IS NOT TO PLAY.', w / 2, statusY + statusFontSize + 4);
            } else {
                ctx.fillStyle = '#ffff00';
                ctx.fillText(`WINNER: ${this.winner}`, w / 2, statusY);
            }
        } else {
            ctx.fillStyle = '#00ffff';
            ctx.fillText(`PLAYER: ${this.currentPlayer}  ·  ANALYZING STRATEGY...`, w / 2, statusY);
        }
    }

    render(statusDiv) {
        // This method is deprecated - use renderToCanvas instead
        // Keep for backward compatibility
        statusDiv.style.display = 'none';
    }
}
