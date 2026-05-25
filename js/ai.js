/**
 * Quoridor AI Engine
 * Provides Easy, Medium, and Hard AI levels.
 * Uses an optimized Minimax algorithm with Alpha-Beta pruning and candidate move reduction.
 */

class QuoridorAI {
    constructor(game) {
        this.game = game;
    }

    /**
     * Entry point: Computes and returns the best move for the active AI player (Player 2).
     * Returns: { type: 'move', x, y } OR { type: 'wall', x, y, wallType }
     */
    computeBestAction(difficulty) {
        if (this.game.winner) return null;

        // Ensure we are operating as Player 2
        const pNum = this.game.turn;

        if (difficulty === 'easy') {
            return this.getEasyAction(pNum);
        } else if (difficulty === 'medium') {
            return this.getMediumAction(pNum);
        } else {
            return this.getHardAction(pNum);
        }
    }

    /**
     * Easy AI:
     * - 80% chance of making a move towards the goal (shortest path step).
     * - 20% chance of placing a valid wall near the opponent's path (if walls are available).
     */
    getEasyAction(pNum) {
        const active = pNum === 1 ? this.game.p1 : this.game.p2;
        const opponent = pNum === 1 ? this.game.p2 : this.game.p1;

        // If no walls, must move pawn
        const canPlaceWall = active.walls > 0 && Math.random() < 0.25;

        if (canPlaceWall) {
            const walls = this.getCandidateWalls(opponent);
            if (walls.length > 0) {
                // Return a random candidate wall
                const wall = walls[Math.floor(Math.random() * walls.length)];
                return { type: 'wall', x: wall.x, y: wall.y, wallType: wall.type };
            }
        }

        // Default: move pawn along the shortest path
        const path = this.getShortestPath(active.x, active.y, active.goalY);
        if (path && path.length > 1) {
            const nextStep = path[1];
            // Check if this step is a valid pawn move (in case of jumps or blockages)
            const validMoves = this.game.getValidMoves(pNum);
            const canMoveToStep = validMoves.some(m => m.x === nextStep.x && m.y === nextStep.y);
            if (canMoveToStep) {
                return { type: 'move', x: nextStep.x, y: nextStep.y };
            }
        }

        // Fallback: random valid move
        const validMoves = this.game.getValidMoves(pNum);
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        return { type: 'move', x: randomMove.x, y: randomMove.y };
    }

    /**
     * Medium AI:
     * Minimax depth 2 with Alpha-Beta pruning.
     * Evaluates path length difference and simple wall count.
     */
    getMediumAction(pNum) {
        const result = this.minimax(this.game, 2, -Infinity, Infinity, true, pNum);
        return result.action;
    }

    /**
     * Hard AI:
     * Minimax depth 3 with Alpha-Beta pruning, move sorting, and highly refined evaluation.
     */
    getHardAction(pNum) {
        // Run minimax search at depth 3
        const result = this.minimax(this.game, 3, -Infinity, Infinity, true, pNum);
        return result.action;
    }

    /**
     * Generates a list of coordinates forming the shortest path from (sx, sy) to goalY.
     * Returns array of {x, y} including the start square, or null if blocked.
     */
    getShortestPath(sx, sy, targetY) {
        const queue = [[{ x: sx, y: sy }]];
        const visited = Array(9).fill(null).map(() => Array(9).fill(false));
        visited[sx][sy] = true;

        let head = 0;
        const directions = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 }
        ];

        while (head < queue.length) {
            const path = queue[head++];
            const curr = path[path.length - 1];

            if (curr.y === targetY) {
                return path;
            }

            for (let i = 0; i < directions.length; i++) {
                const nx = curr.x + directions[i].dx;
                const ny = curr.y + directions[i].dy;

                if (nx >= 0 && nx < 9 && ny >= 0 && ny < 9 && !visited[nx][ny]) {
                    if (!this.game.isBlockedByWall(curr.x, curr.y, nx, ny)) {
                        visited[nx][ny] = true;
                        queue.push([...path, { x: nx, y: ny }]);
                    }
                }
            }
        }

        return null;
    }

    /**
     * Obtains candidate wall placements that actively block the player's path.
     * Rather than evaluating all 128 possibilities, we only evaluate walls
     * that cross the player's current shortest path.
     */
    getCandidateWalls(player) {
        const path = this.getShortestPath(player.x, player.y, player.goalY);
        if (!path) return [];

        const candidates = [];
        const added = new Set();

        const addCandidate = (x, y, type) => {
            const key = `${x},${y},${type}`;
            if (!added.has(key) && this.game.canPlaceWallSyntax(x, y, type) && !this.game.wouldBlockPath(x, y, type)) {
                added.add(key);
                candidates.push({ x, y, type });
            }
        };

        // For each segment in the player's shortest path, generate blocking walls
        for (let i = 0; i < path.length - 1; i++) {
            const current = path[i];
            const next = path[i + 1];

            // Horizontal segment (X changes)
            if (current.y === next.y) {
                const leftX = Math.min(current.x, next.x);
                // Vertical wall at intersection (leftX, y) or (leftX, y-1) blocks this segment
                const y = current.y;
                addCandidate(leftX, y, 'V');
                addCandidate(leftX, y - 1, 'V');
                // Also add horizontal support walls to prevent jumping around easily
                addCandidate(leftX, y, 'H');
                addCandidate(leftX - 1, y, 'H');
            }
            // Vertical segment (Y changes)
            else if (current.x === next.x) {
                const topY = Math.min(current.y, next.y);
                // Horizontal wall at intersection (x, topY) or (x-1, topY) blocks this segment
                const x = current.x;
                addCandidate(x, topY, 'H');
                addCandidate(x - 1, topY, 'H');
                // Also add vertical support walls
                addCandidate(x, topY, 'V');
                addCandidate(x, topY - 1, 'V');
            }
        }

        return candidates;
    }

    /**
     * Generates and sorts all valid AI actions to optimize Alpha-Beta pruning.
     * Moves that advance AI position or block opponent are evaluated first.
     */
    getSortedActions(game, playerNum) {
        const actions = [];
        const active = playerNum === 1 ? game.p1 : game.p2;
        const opponent = playerNum === 1 ? game.p2 : game.p1;

        // 1. Get pawn moves
        const validMoves = game.getValidMoves(playerNum);
        validMoves.forEach(m => {
            actions.push({
                type: 'move',
                x: m.x,
                y: m.y,
                score: 0 // Will rank based on shortest path reduction
            });
        });

        // 2. Get wall placements (if player has walls left)
        if (active.walls > 0) {
            const walls = this.getCandidateWalls(opponent);
            walls.forEach(w => {
                actions.push({
                    type: 'wall',
                    x: w.x,
                    y: w.y,
                    wallType: w.type,
                    score: 0
                });
            });
        }

        // Rank actions to maximize pruning efficiency
        actions.forEach(action => {
            if (action.type === 'move') {
                // Score based on distance reduction to the goal
                const distBefore = game.getShortestPathLength(active.x, active.y, active.goalY);
                const distAfter = game.getShortestPathLength(action.x, action.y, active.goalY);
                action.score = (distBefore - distAfter) * 10;
                
                // Bonus for center column affinity
                if (action.x === 4) action.score += 2;
            } else {
                // Wall action: evaluate temporary delay on the opponent
                // Place wall temporarily
                if (action.wallType === 'H') game.horizontalWalls[action.x][action.y] = true;
                else game.verticalWalls[action.x][action.y] = true;

                const opponentDistBefore = game.getShortestPathLength(opponent.x, opponent.y, opponent.goalY);
                const opponentDistAfter = game.getShortestPathLength(opponent.x, opponent.y, opponent.goalY);
                
                const selfDistBefore = game.getShortestPathLength(active.x, active.y, active.goalY);
                const selfDistAfter = game.getShortestPathLength(active.x, active.y, active.goalY);

                // Remove wall
                if (action.wallType === 'H') game.horizontalWalls[action.x][action.y] = false;
                else game.verticalWalls[action.x][action.y] = false;

                // Wall is high quality if it increases opponent path AND does not increase our path
                const opponentDelay = opponentDistAfter - opponentDistBefore;
                const selfDelay = selfDistAfter - selfDistBefore;
                
                if (opponentDelay === Infinity || selfDelay === Infinity) {
                    action.score = -9999; // Illegal path blocking
                } else {
                    action.score = (opponentDelay * 15) - (selfDelay * 20);
                }
            }
        });

        // Sort descending by heuristic score
        return actions.sort((a, b) => b.score - a.score);
    }

    /**
     * Evaluation function for Quoridor board state.
     * Evaluates from P2's perspective (maximizing).
     */
    evaluateState(game) {
        // Quick win/loss detection
        if (game.winner === 2) return 10000;
        if (game.winner === 1) return -10000;

        const p1 = game.p1;
        const p2 = game.p2;

        const p1Path = game.getShortestPathLength(p1.x, p1.y, p1.goalY);
        const p2Path = game.getShortestPathLength(p2.x, p2.y, p2.goalY);

        // Treat blocked players (should be impossible due to path checks) as extremely low score
        if (p1Path === Infinity) return 10000; 
        if (p2Path === Infinity) return -10000;

        // Path difference represents main evaluation element
        // Since AI is Player 2, a lower p2Path and higher p1Path is best.
        let score = (p1Path - p2Path) * 12;

        // Remaining wall counts - walls are premium resources
        score += (p2.walls - p1.walls) * 3;

        // Grid positioning: favor columns close to the center to keep paths flexible
        const p2CenterDist = Math.abs(p2.x - 4);
        const p1CenterDist = Math.abs(p1.x - 4);
        score -= p2CenterDist * 2;
        score += p1CenterDist * 2;

        return score;
    }

    /**
     * Minimax Algorithm with Alpha-Beta Pruning.
     * isMaximizing is true when active player is Player 2 (AI).
     */
    minimax(game, depth, alpha, beta, isMaximizing, activePlayer) {
        if (depth === 0 || game.winner) {
            const score = this.evaluateState(game);
            return { score };
        }

        const currentTurn = game.turn;
        const actions = this.getSortedActions(game, currentTurn);

        if (actions.length === 0) {
            const score = this.evaluateState(game);
            return { score };
        }

        let bestAction = null;

        if (isMaximizing) {
            let maxEval = -Infinity;
            
            for (let i = 0; i < actions.length; i++) {
                const action = actions[i];
                if (action.score === -9999) continue; // Skip known invalid blocks

                // Apply action
                const gameCopy = this.cloneGame(game);
                let success = false;
                
                if (action.type === 'move') {
                    success = gameCopy.movePawn(action.x, action.y);
                } else {
                    success = gameCopy.placeWall(action.x, action.y, action.wallType);
                }

                if (!success) continue;

                // Recursive search
                const result = this.minimax(gameCopy, depth - 1, alpha, beta, false, activePlayer);
                
                if (result.score > maxEval) {
                    maxEval = result.score;
                    bestAction = action;
                }
                
                alpha = Math.max(alpha, result.score);
                if (beta <= alpha) {
                    break; // Pruning
                }
            }

            // Fallback action if search space was entirely pruned or empty
            if (!bestAction && actions.length > 0) {
                bestAction = actions[0];
            }

            return { score: maxEval, action: bestAction };
        } else {
            let minEval = Infinity;
            
            for (let i = 0; i < actions.length; i++) {
                const action = actions[i];
                if (action.score === -9999) continue;

                const gameCopy = this.cloneGame(game);
                let success = false;
                
                if (action.type === 'move') {
                    success = gameCopy.movePawn(action.x, action.y);
                } else {
                    success = gameCopy.placeWall(action.x, action.y, action.wallType);
                }

                if (!success) continue;

                const result = this.minimax(gameCopy, depth - 1, alpha, beta, true, activePlayer);
                
                if (result.score < minEval) {
                    minEval = result.score;
                    bestAction = action;
                }
                
                beta = Math.min(beta, result.score);
                if (beta <= alpha) {
                    break; // Pruning
                }
            }

            if (!bestAction && actions.length > 0) {
                bestAction = actions[0];
            }

            return { score: minEval, action: bestAction };
        }
    }

    /**
     * Fast deep copy of game instance for Minimax evaluation trees.
     */
    cloneGame(game) {
        const copy = new QuoridorGame();
        copy.loadState(game.cloneState());
        return copy;
    }
}
