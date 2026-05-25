/**
 * Quoridor Canvas & User Interface Controller
 * Renders the HTML5 Canvas, manages player mouse/keyboard interactions,
 * handles particle effects, and ties UI events into game logic and synth sounds.
 */

class QuoridorUI {
    constructor(game, ai, sound) {
        this.game = game;
        this.ai = ai;
        this.sound = sound;

        // UI Config
        this.gameMode = 'human_vs_ai'; // 'human_vs_human' or 'human_vs_ai'
        this.aiDifficulty = 'hard';   // 'easy', 'medium', 'hard'
        
        // Interactive state
        this.selectedPawn = false;
        this.hoveredWall = null; // { x, y, type: 'H'|'V', valid: bool }
        this.wallTypeToggle = 'H'; // 'H' or 'V' - flipped by spacebar or right-click
        this.isAiThinking = false;

        // Canvas sizing
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.squareSize = 54;
        this.gapSize = 14;
        this.margin = 15;
        
        // Board dimensions
        this.boardWidth = 9 * this.squareSize + 8 * this.gapSize;
        this.canvas.width = this.boardWidth + 2 * this.margin;
        this.canvas.height = this.boardWidth + 2 * this.margin;

        // Particles for victory/jumps
        this.particles = [];
        
        this.initDOM();
        this.initEvents();
        this.animate();
        this.syncUI();
    }

    initDOM() {
        this.turnIndicator = document.getElementById('current-turn');
        this.p1Walls = document.getElementById('p1-walls');
        this.p2Walls = document.getElementById('p2-walls');
        this.logsContainer = document.getElementById('log-feed');
        this.winnerModal = document.getElementById('winner-modal');
        this.winnerMessage = document.getElementById('winner-message');

        // Stats track
        this.stats = { humanWins: 0, aiWins: 0, totalGames: 0 };
        this.loadStats();
    }

    initEvents() {
        // Handle Canvas mouse movements
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredWall = null;
        });
        
        // Handle Canvas clicks
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        
        // Prevent right-click context menu on canvas to allow wall rotation
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.toggleWallOrientation();
        });

        // Key press rotation for walls
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.toggleWallOrientation();
            }
        });

        // Game mode selector
        document.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.sound.playClick();
                document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.gameMode = btn.getAttribute('data-mode');
                
                // Show/hide difficulty selector based on mode
                const aiSettings = document.getElementById('ai-settings-panel');
                if (this.gameMode === 'human_vs_ai') {
                    aiSettings.classList.remove('hidden');
                } else {
                    aiSettings.classList.add('hidden');
                }
                
                this.resetGame();
            });
        });

        // Difficulty selector
        document.querySelectorAll('[data-diff]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.sound.playClick();
                document.querySelectorAll('[data-diff]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.aiDifficulty = btn.getAttribute('data-diff');
                this.game.logs.push(`Difficulty changed to ${this.aiDifficulty.toUpperCase()}`);
                this.syncUI();
            });
        });

        // Control Buttons
        document.getElementById('btn-reset').addEventListener('click', () => {
            this.sound.playClick();
            this.resetGame();
        });

        document.getElementById('btn-undo').addEventListener('click', () => {
            this.sound.playClick();
            if (this.game.undo()) {
                // In H vs AI mode, undo twice to revert AI move as well
                if (this.gameMode === 'human_vs_ai' && this.game.turn === 2) {
                    this.game.undo();
                }
                this.selectedPawn = false;
                this.syncUI();
            } else {
                this.sound.playInvalid();
            }
        });

        document.getElementById('btn-redo').addEventListener('click', () => {
            this.sound.playClick();
            if (this.game.redo()) {
                if (this.gameMode === 'human_vs_ai') {
                    this.game.redo();
                }
                this.selectedPawn = false;
                this.syncUI();
            } else {
                this.sound.playInvalid();
            }
        });

        document.getElementById('btn-save').addEventListener('click', () => {
            this.sound.playClick();
            this.game.saveToLocalStorage();
            this.syncUI();
        });

        document.getElementById('btn-load').addEventListener('click', () => {
            this.sound.playClick();
            if (this.game.loadFromLocalStorage()) {
                this.selectedPawn = false;
                this.syncUI();
            } else {
                this.sound.playInvalid();
            }
        });

        document.getElementById('btn-modal-close').addEventListener('click', () => {
            this.sound.playClick();
            this.winnerModal.classList.add('hidden');
        });

        // Sound volume slider
        const volSlider = document.getElementById('volume-slider');
        const muteBtn = document.getElementById('mute-button');
        
        volSlider.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            this.sound.setVolume(vol);
            if (vol === 0) {
                muteBtn.innerHTML = '🔇';
            } else {
                muteBtn.innerHTML = '🔊';
            }
        });

        muteBtn.addEventListener('click', () => {
            this.sound.muted = !this.sound.muted;
            if (this.sound.muted) {
                muteBtn.innerHTML = '🔇';
                muteBtn.classList.add('muted-btn');
            } else {
                muteBtn.innerHTML = '🔊';
                muteBtn.classList.remove('muted-btn');
                this.sound.playClick();
            }
        });
    }

    toggleWallOrientation() {
        this.sound.playClick();
        this.wallTypeToggle = this.wallTypeToggle === 'H' ? 'V' : 'H';
        
        // Force hover update if mouse is on canvas
        if (this.lastMousePos) {
            this.updateHoveredWall(this.lastMousePos.x, this.lastMousePos.y);
        }
    }

    resetGame() {
        this.game.reset();
        this.selectedPawn = false;
        this.hoveredWall = null;
        this.isAiThinking = false;
        this.particles = [];
        this.syncUI();
    }

    getMouseGridCoords(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        // Scale mouse positions back to canvas width/height
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const mx = (clientX - rect.left) * scaleX - this.margin;
        const my = (clientY - rect.top) * scaleY - this.margin;

        return { x: mx, y: my };
    }

    handleMouseMove(e) {
        const coords = this.getMouseGridCoords(e.clientX, e.clientY);
        this.lastMousePos = coords;
        this.updateHoveredWall(coords.x, coords.y);
    }

    /**
     * Determines if user is hovering over a wall slot (intersection)
     * and snaps the hover feedback to standard horizontal/vertical spaces.
     */
    updateHoveredWall(mx, my) {
        // If AI is thinking or game over, no hover
        if (this.isAiThinking || this.game.winner) {
            this.hoveredWall = null;
            return;
        }

        // Only active player can place wall if they have any left
        const active = this.game.turn === 1 ? this.game.p1 : this.game.p2;
        if (active.walls <= 0) {
            this.hoveredWall = null;
            return;
        }

        const step = this.squareSize + this.gapSize;

        // Check if cursor is directly inside a square (not in the gaps)
        const col = Math.floor(mx / step);
        const row = Math.floor(my / step);
        const inSquareX = col >= 0 && col < 9 && (mx - col * step) < this.squareSize;
        const inSquareY = row >= 0 && row < 9 && (my - row * step) < this.squareSize;
        const insideSquare = inSquareX && inSquareY;

        if (insideSquare) {
            // Prioritize clicking/hovering active pawn
            if (col === active.x && row === active.y) {
                this.hoveredWall = null;
                return;
            }
            // Prioritize clicking/hovering valid moves
            if (this.selectedPawn) {
                const validMoves = this.game.getValidMoves();
                if (validMoves.some(m => m.x === col && m.y === row)) {
                    this.hoveredWall = null;
                    return;
                }
            }
        }

        // We only place walls in the gap corridors
        // Let's find which intersection (0 to 7) the cursor is closest to.
        // The center of intersection (ix, iy) in pixel space is at:
        // cx = (ix + 1) * squareSize + (ix + 0.5) * gapSize
        // Let's reverse-calculate:
        const ix = Math.floor((mx - this.squareSize) / step + 0.5);
        const iy = Math.floor((my - this.squareSize) / step + 0.5);

        if (ix >= 0 && ix < 8 && iy >= 0 && iy < 8) {
            // Distance from mouse to center of intersection
            const cx = (ix + 1) * this.squareSize + ix * this.gapSize + this.gapSize / 2;
            const cy = (iy + 1) * this.squareSize + iy * this.gapSize + this.gapSize / 2;
            
            const dx = mx - cx;
            const dy = my - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Snapping radius of interaction (about 0.5 squares wide)
            if (dist < step * 0.5) {
                // Select wall placement syntax check
                const type = this.wallTypeToggle;
                const canPlace = this.game.canPlaceWallSyntax(ix, iy, type) && !this.game.wouldBlockPath(ix, iy, type);
                
                this.hoveredWall = { x: ix, y: iy, type, valid: canPlace };
                return;
            }
        }
        
        this.hoveredWall = null;
    }

    handleCanvasClick(e) {
        if (this.isAiThinking || this.game.winner) return;

        const coords = this.getMouseGridCoords(e.clientX, e.clientY);
        const step = this.squareSize + this.gapSize;

        // Check if click is inside a square
        const col = Math.floor(coords.x / step);
        const row = Math.floor(coords.y / step);
        const inSquareX = col >= 0 && col < 9 && (coords.x - col * step) < this.squareSize;
        const inSquareY = row >= 0 && row < 9 && (coords.y - row * step) < this.squareSize;
        const insideSquare = inSquareX && inSquareY;

        const active = this.game.turn === 1 ? this.game.p1 : this.game.p2;

        // If inside a square, prioritize selecting active pawn or moving to valid square
        if (insideSquare) {
            // Click active pawn: toggle selection
            if (col === active.x && row === active.y) {
                this.sound.playClick();
                this.selectedPawn = !this.selectedPawn;
                this.hoveredWall = null;
                this.syncUI();
                return;
            }

            // Click valid move: move the pawn
            if (this.selectedPawn) {
                const validMoves = this.game.getValidMoves();
                const isTargetValid = validMoves.some(m => m.x === col && m.y === row);

                if (isTargetValid) {
                    const isJump = Math.abs(col - active.x) > 1 || Math.abs(row - active.y) > 1;
                    const success = this.game.movePawn(col, row);
                    if (success) {
                        this.sound.playMove();
                        if (isJump) {
                            this.createExplosion((col + 0.5) * step, (row + 0.5) * step, '#00f2fe', 20);
                        }
                        this.selectedPawn = false;
                        this.hoveredWall = null;
                        this.syncUI();
                        this.triggerAiTurnIfNeeded();
                    }
                    return;
                }
            }
        }

        // If click is not inside the active pawn or a valid move, handle wall placement
        if (this.hoveredWall && this.hoveredWall.valid) {
            const success = this.game.placeWall(this.hoveredWall.x, this.hoveredWall.y, this.hoveredWall.type);
            if (success) {
                this.sound.playWall();
                this.hoveredWall = null;
                this.selectedPawn = false;
                this.syncUI();
                this.triggerAiTurnIfNeeded();
            } else {
                this.sound.playInvalid();
            }
            return;
        }

        // Otherwise, if click inside some other square, play invalid click sound and deselect
        if (insideSquare && this.selectedPawn) {
            this.sound.playInvalid();
            this.selectedPawn = false;
            this.syncUI();
        }
    }

    triggerAiTurnIfNeeded() {
        if (this.gameMode === 'human_vs_ai' && this.game.turn === 2 && !this.game.winner) {
            this.isAiThinking = true;
            this.syncUI();

            // Run AI on a minor setTimeout to keep UI responsive and allow thinking spinner
            setTimeout(() => {
                const start = performance.now();
                const bestAction = this.ai.computeBestAction(this.aiDifficulty);
                const duration = performance.now() - start;
                
                if (bestAction) {
                    if (bestAction.type === 'move') {
                        const active = this.game.p2;
                        const isJump = Math.abs(bestAction.x - active.x) > 1 || Math.abs(bestAction.y - active.y) > 1;
                        
                        this.game.movePawn(bestAction.x, bestAction.y);
                        this.sound.playMove();
                        
                        if (isJump) {
                            const step = this.squareSize + this.gapSize;
                            this.createExplosion((bestAction.x + 0.5) * step, (bestAction.y + 0.5) * step, '#ff007f', 20);
                        }
                    } else if (bestAction.type === 'wall') {
                        this.game.placeWall(bestAction.x, bestAction.y, bestAction.wallType);
                        this.sound.playWall();
                    }
                    this.game.logs.push(`[AI thought for ${Math.round(duration)}ms]`);
                }

                this.isAiThinking = false;
                this.syncUI();
            }, 600); // 600ms delays gives a nice natural flow
        }
    }

    syncUI() {
        // Active turn feedback
        if (this.game.winner) {
            this.turnIndicator.innerText = `🏆 Winner: Player ${this.game.winner}!`;
            this.turnIndicator.style.animation = 'pulse-gold 1s infinite alternate';
            this.sound.playWin();
            
            // Stats updates
            if (this.gameMode === 'human_vs_ai') {
                if (this.game.winner === 1) {
                    this.stats.humanWins++;
                    this.winnerMessage.innerHTML = "🎉 Congratulations!<br>You defeated the AI Opponent.";
                } else {
                    this.stats.aiWins++;
                    this.winnerMessage.innerHTML = "🤖 Game Over!<br>The AI Opponent has won this round.";
                }
            } else {
                this.winnerMessage.innerHTML = `🏁 Player ${this.game.winner} reaches the baseline and wins!`;
            }
            this.stats.totalGames++;
            this.saveStats();
            
            // Trigger beautiful particle explosion
            const step = this.squareSize + this.gapSize;
            const targetPawn = this.game.winner === 1 ? this.game.p1 : this.game.p2;
            this.createExplosion(
                (targetPawn.x + 0.5) * step + this.margin,
                (targetPawn.y + 0.5) * step + this.margin,
                this.game.winner === 1 ? '#00f2fe' : '#ff007f',
                60
            );

            // Open popup modal after brief delay
            setTimeout(() => {
                this.winnerModal.classList.remove('hidden');
            }, 1200);

        } else {
            this.turnIndicator.style.animation = '';
            if (this.isAiThinking) {
                this.turnIndicator.innerHTML = `🤖 AI is thinking... <span class="spinner"></span>`;
            } else {
                this.turnIndicator.innerText = `Player ${this.game.turn}'s Turn ${this.gameMode === 'human_vs_ai' && this.game.turn === 2 ? '(AI)' : ''}`;
            }
        }

        // Walls counter display
        this.p1Walls.innerText = this.game.p1.walls;
        this.p2Walls.innerText = this.game.p2.walls;

        // Render Logs
        this.logsContainer.innerHTML = '';
        const recentLogs = this.game.logs.slice(-20).reverse(); // last 20 operations
        recentLogs.forEach(log => {
            const li = document.createElement('div');
            li.className = 'log-item';
            if (log.includes('Player 1')) li.classList.add('log-p1');
            else if (log.includes('Player 2')) li.classList.add('log-p2');
            else if (log.includes('Undo') || log.includes('Redo')) li.classList.add('log-sys');
            li.innerText = log;
            this.logsContainer.appendChild(li);
        });

        // Disable/enable action buttons
        document.getElementById('btn-undo').disabled = this.game.history.length === 0;
        document.getElementById('btn-redo').disabled = this.game.redoStack.length === 0;

        // Redraw board
        this.draw();
    }

    /**
     * Particles animation loops
     */
    createExplosion(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                decay: Math.random() * 0.03 + 0.01,
                size: Math.random() * 3 + 2,
                color
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 8;
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    /**
     * Core draw dispatch.
     */
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Translate to support margins
        this.ctx.save();
        this.ctx.translate(this.margin, this.margin);

        // 1. Draw base board structure
        this.drawBaseBoard();

        // 2. Highlight selected pawn's valid movements
        if (this.selectedPawn) {
            this.drawValidMovesHighlight();
        }

        // 3. Draw horizontal and vertical placed walls
        this.drawPlacedWalls();

        // 4. Draw player pieces
        this.drawPawns();

        // 5. Draw transparent glowing wall preview on hover
        if (this.hoveredWall) {
            this.drawWallPreviewHighlight();
        }

        this.ctx.restore();
        this.drawParticles();
    }

    drawBaseBoard() {
        const step = this.squareSize + this.gapSize;
        
        // Drawn dark glass grid background
        this.ctx.fillStyle = 'rgba(20, 24, 38, 0.7)';
        this.ctx.fillRect(0, 0, this.boardWidth, this.boardWidth);

        // Drawing all 9x9 board squares
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const sx = c * step;
                const sy = r * step;

                // Subtle neon border and rounded square boxes
                this.ctx.fillStyle = 'rgba(30, 38, 64, 0.8)';
                this.ctx.shadowBlur = 0;
                this.ctx.fillRect(sx, sy, this.squareSize, this.squareSize);

                // Highlight goal corridors lightly
                if (r === 0) { // P1 Goal Line (top from engine perspective, y=0)
                    this.ctx.fillStyle = 'rgba(0, 242, 254, 0.03)';
                    this.ctx.fillRect(sx, sy, this.squareSize, this.squareSize);
                } else if (r === 8) { // P2 Goal Line
                    this.ctx.fillStyle = 'rgba(255, 0, 127, 0.03)';
                    this.ctx.fillRect(sx, sy, this.squareSize, this.squareSize);
                }
            }
        }
    }

    drawPawns() {
        const step = this.squareSize + this.gapSize;

        const drawPlayer = (pawn, isP1) => {
            const px = pawn.x * step + this.squareSize / 2;
            const py = pawn.y * step + this.squareSize / 2;
            const radius = this.squareSize * 0.36;

            this.ctx.save();
            
            // Dynamic pulse ring if it's their turn
            const isTurn = (this.game.turn === (isP1 ? 1 : 2));
            if (isTurn && !this.game.winner) {
                const pulse = 1 + Math.sin(Date.now() / 150) * 0.1;
                this.ctx.beginPath();
                this.ctx.arc(px, py, radius * pulse * 1.3, 0, Math.PI * 2);
                this.ctx.strokeStyle = isP1 ? 'rgba(0, 242, 254, 0.25)' : 'rgba(255, 0, 127, 0.25)';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            }

            // Glow aura
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = isP1 ? '#00f2fe' : '#ff007f';
            
            // Radial gradient body
            const grad = this.ctx.createRadialGradient(px - 3, py - 3, 2, px, py, radius);
            if (isP1) {
                grad.addColorStop(0, '#a6f9ff');
                grad.addColorStop(0.3, '#00f2fe');
                grad.addColorStop(1, '#004f7c');
            } else {
                grad.addColorStop(0, '#ffb8df');
                grad.addColorStop(0.3, '#ff007f');
                grad.addColorStop(1, '#7c003a');
            }

            this.ctx.beginPath();
            this.ctx.arc(px, py, radius, 0, Math.PI * 2);
            this.ctx.fillStyle = grad;
            this.ctx.fill();

            // Inner styling border
            this.ctx.shadowBlur = 0;
            this.ctx.beginPath();
            this.ctx.arc(px, py, radius - 4, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();

            // Highlight core selection
            if (isP1 && this.selectedPawn && !this.game.winner) {
                this.ctx.beginPath();
                this.ctx.arc(px, py, radius * 0.5, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                this.ctx.fill();
            }

            this.ctx.restore();
        };

        // Draw Player 2 first (so P1 drawing overlay takes priority on collision layers)
        drawPlayer(this.game.p2, false);
        drawPlayer(this.game.p1, true);
    }

    drawValidMovesHighlight() {
        const step = this.squareSize + this.gapSize;
        const validMoves = this.game.getValidMoves();

        this.ctx.save();
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#00f2fe';

        validMoves.forEach(m => {
            const mx = m.x * step + this.squareSize / 2;
            const my = m.y * step + this.squareSize / 2;

            // Translucent glowing indicator circles
            this.ctx.beginPath();
            this.ctx.arc(mx, my, 8, 0, Math.PI * 2);
            this.ctx.fillStyle = '#00f2fe';
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(mx, my, 18, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });

        this.ctx.restore();
    }

    drawPlacedWalls() {
        const step = this.squareSize + this.gapSize;

        // Custom wall drawing routine
        const drawWallRect = (x, y, isHorizontal) => {
            this.ctx.save();

            let wx, wy, ww, wh;
            
            if (isHorizontal) {
                // Horizontal walls span across 2 squares and 1 gap
                wx = x * step;
                wy = (y + 1) * this.squareSize + y * this.gapSize;
                ww = 2 * this.squareSize + this.gapSize;
                wh = this.gapSize;
            } else {
                // Vertical walls span across 2 squares and 1 gap
                wx = (x + 1) * this.squareSize + x * this.gapSize;
                wy = y * step;
                ww = this.gapSize;
                wh = 2 * this.squareSize + this.gapSize;
            }

            // Glow outline
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = '#f5af19';

            // Grad Fill
            const wGrad = this.ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
            wGrad.addColorStop(0, '#f12711');
            wGrad.addColorStop(1, '#f5af19');

            this.ctx.fillStyle = wGrad;
            // Border-radius representation in Canvas
            this.ctx.beginPath();
            this.ctx.roundRect(wx, wy, ww, wh, 4);
            this.ctx.fill();

            // Inner shine highlight
            this.ctx.shadowBlur = 0;
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            this.ctx.restore();
        };

        // Draw horizontal wall elements
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                if (this.game.horizontalWalls[x][y]) {
                    drawWallRect(x, y, true);
                }
                if (this.game.verticalWalls[x][y]) {
                    drawWallRect(x, y, false);
                }
            }
        }
    }

    drawWallPreviewHighlight() {
        const { x, y, type, valid } = this.hoveredWall;
        const step = this.squareSize + this.gapSize;
        
        let wx, wy, ww, wh;

        if (type === 'H') {
            wx = x * step;
            wy = (y + 1) * this.squareSize + y * this.gapSize;
            ww = 2 * this.squareSize + this.gapSize;
            wh = this.gapSize;
        } else {
            wx = (x + 1) * this.squareSize + x * this.gapSize;
            wy = y * step;
            ww = this.gapSize;
            wh = 2 * this.squareSize + this.gapSize;
        }

        this.ctx.save();
        this.ctx.globalAlpha = 0.5;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = valid ? '#00ff87' : '#ff007f';

        this.ctx.fillStyle = valid ? 'rgba(0, 255, 135, 0.7)' : 'rgba(255, 0, 127, 0.7)';
        this.ctx.beginPath();
        this.ctx.roundRect(wx, wy, ww, wh, 4);
        this.ctx.fill();

        this.ctx.restore();
    }

    animate() {
        // Redraw canvas on animation frame to handle smooth particles & pulse loops
        this.updateParticles();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    loadStats() {
        const stored = localStorage.getItem('quoridor_stats');
        if (stored) {
            try {
                this.stats = JSON.parse(stored);
            } catch (e) {
                console.error(e);
            }
        }
        this.syncStatsDOM();
    }

    saveStats() {
        localStorage.setItem('quoridor_stats', JSON.stringify(this.stats));
        this.syncStatsDOM();
    }

    syncStatsDOM() {
        document.getElementById('stat-total-games').innerText = this.stats.totalGames;
        document.getElementById('stat-human-wins').innerText = this.stats.humanWins;
        document.getElementById('stat-ai-wins').innerText = this.stats.aiWins;
    }
}
