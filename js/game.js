/**
 * Quoridor Core Game Engine
 * Manages game state, rule enforcement, pathfinding validation, and move history.
 */

class QuoridorGame {
  constructor() {
    this.boardSize = 9;
    this.reset();
  }

  reset() {
    // Player 1 (Human, typically starts bottom)
    this.p1 = { x: 4, y: 8, walls: 10, id: 1, goalY: 0 };
    // Player 2 (Human/AI, typically starts top)
    this.p2 = { x: 4, y: 0, walls: 10, id: 2, goalY: 8 };

    // Wall matrices: 8x8 possible placements
    // horizontalWalls[x][y] = true if a wall is placed horizontally at intersection (x, y)
    this.horizontalWalls = Array(8)
      .fill(null)
      .map(() => Array(8).fill(false));
    // verticalWalls[x][y] = true if a wall is placed vertically at intersection (x, y)
    this.verticalWalls = Array(8)
      .fill(null)
      .map(() => Array(8).fill(false));

    this.turn = 1; // 1 for Player 1, 2 for Player 2
    this.winner = null;

    // Stacks for Undo / Redo
    this.history = [];
    this.redoStack = [];

    // Log of activities
    this.logs = ["Game reset! Player 1 starts."];
  }

  /**
   * Checks if coordinates are within the board bounds.
   */
  isValidSquare(x, y) {
    return x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize;
  }

  /**
   * Deep-clones the current state.
   */
  cloneState() {
    return {
      p1: { ...this.p1 },
      p2: { ...this.p2 },
      horizontalWalls: this.horizontalWalls.map((row) => [...row]),
      verticalWalls: this.verticalWalls.map((row) => [...row]),
      turn: this.turn,
      winner: this.winner,
      logs: [...this.logs],
    };
  }

  /**
   * Loads a state from a cloned state structure.
   */
  loadState(state) {
    this.p1 = { ...state.p1 };
    this.p2 = { ...state.p2 };
    this.horizontalWalls = state.horizontalWalls.map((row) => [...row]);
    this.verticalWalls = state.verticalWalls.map((row) => [...row]);
    this.turn = state.turn;
    this.winner = state.winner;
    this.logs = [...state.logs];
  }

  /**
   * Saves the state to the history stack for Undo.
   */
  saveHistory(moveDescription) {
    this.history.push({
      state: this.cloneState(),
      moveDescription: moveDescription,
    });
    // Clear redo stack on new action
    this.redoStack = [];
  }

  /**
   * Reverts the game state to the previous turn.
   */
  undo() {
    if (this.history.length === 0) return false;

    const last = this.history.pop();
    this.redoStack.push({
      state: this.cloneState(),
      moveDescription: last.moveDescription,
    });

    this.loadState(last.state);
    this.logs.push(`Undo: Reverted "${last.moveDescription}"`);
    return true;
  }

  /**
   * Re-applies a previously undone move.
   */
  redo() {
    if (this.redoStack.length === 0) return false;

    const next = this.redoStack.pop();
    this.history.push({
      state: this.cloneState(),
      moveDescription: next.moveDescription,
    });

    this.loadState(next.state);
    this.logs.push(`Redo: Applied "${next.moveDescription}"`);
    return true;
  }

  /**
   * Saves the current game state to local storage.
   */
  saveToLocalStorage(slot = "quoridor_autosave") {
    const payload = {
      history: this.history,
      redoStack: this.redoStack,
      currentState: this.cloneState(),
    };
    localStorage.setItem(slot, JSON.stringify(payload));
    this.logs.push("Game saved successfully.");
    return true;
  }

  /**
   * Loads a game state from local storage.
   */
  loadFromLocalStorage(slot = "quoridor_autosave") {
    const payloadStr = localStorage.getItem(slot);
    if (!payloadStr) return false;

    try {
      const payload = JSON.parse(payloadStr);
      this.history = payload.history;
      this.redoStack = payload.redoStack;
      this.loadState(payload.currentState);
      this.logs.push("Game loaded successfully!");
      return true;
    } catch (e) {
      console.error("Failed to parse game save.", e);
      return false;
    }
  }

  /**
   * Checks if there is a wall between two adjacent squares.
   * x1, y1 and x2, y2 must be adjacent orthogonally.
   */
  isBlockedByWall(x1, y1, x2, y2) {
    // Horizontal movement: x changes, y stays same
    if (y1 === y2) {
      const leftX = Math.min(x1, x2);
      // Movement blocks if a vertical wall exists at leftX, y1 or leftX, y1-1
      const vWall1 =
        leftX >= 0 &&
        leftX < 8 &&
        y1 >= 0 &&
        y1 < 8 &&
        this.verticalWalls[leftX][y1];
      const vWall2 =
        leftX >= 0 &&
        leftX < 8 &&
        y1 - 1 >= 0 &&
        y1 - 1 < 8 &&
        this.verticalWalls[leftX][y1 - 1];
      return vWall1 || vWall2;
    }
    // Vertical movement: y changes, x stays same
    if (x1 === x2) {
      const topY = Math.min(y1, y2);
      // Movement blocks if a horizontal wall exists at x1, topY or x1-1, topY
      const hWall1 =
        x1 >= 0 &&
        x1 < 8 &&
        topY >= 0 &&
        topY < 8 &&
        this.horizontalWalls[x1][topY];
      const hWall2 =
        x1 - 1 >= 0 &&
        x1 - 1 < 8 &&
        topY >= 0 &&
        topY < 8 &&
        this.horizontalWalls[x1 - 1][topY];
      return hWall1 || hWall2;
    }
    return false; // Not adjacent directly, should not happen in basic block checks
  }

  /**
   * Get valid move squares for the active player's pawn.
   */
  getValidMoves(playerNum = this.turn) {
    const active = playerNum === 1 ? this.p1 : this.p2;
    const opponent = playerNum === 1 ? this.p2 : this.p1;
    const moves = [];

    const directions = [
      { dx: 1, dy: 0 }, // Right
      { dx: -1, dy: 0 }, // Left
      { dx: 0, dy: 1 }, // Down
      { dx: 0, dy: -1 }, // Up
    ];

    directions.forEach((dir) => {
      const nx = active.x + dir.dx;
      const ny = active.y + dir.dy;

      // 1. Must be within board boundaries
      if (!this.isValidSquare(nx, ny)) return;

      // 2. Must not be blocked by wall
      if (this.isBlockedByWall(active.x, active.y, nx, ny)) return;

      // 3. Check if opponent occupies this square
      if (nx === opponent.x && ny === opponent.y) {
        // We have an opponent! Attempt jump.
        const jumpX = nx + dir.dx;
        const jumpY = ny + dir.dy;

        // Check if straight jump is valid
        if (
          this.isValidSquare(jumpX, jumpY) &&
          !this.isBlockedByWall(nx, ny, jumpX, jumpY)
        ) {
          // Straight jump is valid
          moves.push({ x: jumpX, y: jumpY });
        } else {
          // Straight jump is blocked by wall or board edge!
          // Player can move diagonally instead: orthogonal to the direction of jump.
          const diags =
            dir.dx !== 0
              ? [
                  { dx: 0, dy: 1 },
                  { dx: 0, dy: -1 },
                ] // Horizontal jump blocked -> check vertical branches
              : [
                  { dx: 1, dy: 0 },
                  { dx: -1, dy: 0 },
                ]; // Vertical jump blocked -> check horizontal branches

          diags.forEach((diag) => {
            const diagX = nx + diag.dx;
            const diagY = ny + diag.dy;

            if (this.isValidSquare(diagX, diagY)) {
              // Check blockage between opponent square (nx, ny) and diagonal target
              if (!this.isBlockedByWall(nx, ny, diagX, diagY)) {
                moves.push({ x: diagX, y: diagY });
              }
            }
          });
        }
      } else {
        // Simple open square
        moves.push({ x: nx, y: ny });
      }
    });

    return moves;
  }

  /**
   * Move the active pawn to a target square.
   */
  movePawn(tx, ty) {
    if (this.winner) return false;

    // Validate the move
    const validMoves = this.getValidMoves();
    const isMoveValid = validMoves.some((m) => m.x === tx && m.y === ty);

    if (!isMoveValid) {
      this.logs.push(`Pawn move to (${tx + 1}, ${9 - ty}) is invalid.`);
      return false;
    }

    const active = this.turn === 1 ? this.p1 : this.p2;
    const fromStr = `${String.fromCharCode(65 + active.x)}${9 - active.y}`;
    const toStr = `${String.fromCharCode(65 + tx)}${9 - ty}`;

    // Record state for Undo
    this.saveHistory(`P${this.turn} Pawn ${fromStr} -> ${toStr}`);

    // Perform move
    active.x = tx;
    active.y = ty;

    this.logs.push(`Player ${this.turn} moved pawn to ${toStr}`);

    // Check for victory
    if (active.y === active.goalY) {
      this.winner = this.turn;
      this.logs.push(
        `🎉 Player ${this.turn} reached the goal! Winner announced!`,
      );
    } else {
      // Next turn
      this.turn = this.turn === 1 ? 2 : 1;
    }

    return true;
  }

  /**
   * Check if a wall placement is syntactically legal (coordinates, overlaps, crossings).
   * type = 'H' for horizontal, 'V' for vertical.
   */
  canPlaceWallSyntax(x, y, type) {
    // Wall intersections are 0 to 7
    if (x < 0 || x > 7 || y < 0 || y > 7) return false;

    if (type === "H") {
      // Check overlapping horizontal walls
      if (this.horizontalWalls[x][y]) return false;
      if (x > 0 && this.horizontalWalls[x - 1][y]) return false;
      if (x < 7 && this.horizontalWalls[x + 1][y]) return false;
      // Check crossing vertical wall
      if (this.verticalWalls[x][y]) return false;
    } else if (type === "V") {
      // Check overlapping vertical walls
      if (this.verticalWalls[x][y]) return false;
      if (y > 0 && this.verticalWalls[x][y - 1]) return false;
      if (y < 7 && this.verticalWalls[x][y + 1]) return false;
      // Check crossing horizontal wall
      if (this.horizontalWalls[x][y]) return false;
    }

    return true;
  }

  /**
   * Validates if placing a wall would completely trap any player.
   * Uses Breadth-First Search (BFS) for path checking.
   */
  wouldBlockPath(x, y, type) {
    // Temporarily place the wall
    if (type === "H") this.horizontalWalls[x][y] = true;
    else this.verticalWalls[x][y] = true;

    // Run BFS pathfinding for both players
    const p1HasPath = this.hasPathToGoal(this.p1.x, this.p1.y, this.p1.goalY);
    const p2HasPath = this.hasPathToGoal(this.p2.x, this.p2.y, this.p2.goalY);

    // Remove the temporary wall
    if (type === "H") this.horizontalWalls[x][y] = false;
    else this.verticalWalls[x][y] = false;

    // Blocks if either player is cut off
    return !p1HasPath || !p2HasPath;
  }

  /**
   * Uses BFS to check if there is a path from (sx, sy) to any square on targetY.
   */
  hasPathToGoal(sx, sy, targetY) {
    const queue = [{ x: sx, y: sy }];
    const visited = Array(this.boardSize)
      .fill(null)
      .map(() => Array(this.boardSize).fill(false));
    visited[sx][sy] = true;

    let head = 0;
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    while (head < queue.length) {
      const curr = queue[head++];

      if (curr.y === targetY) {
        return true;
      }

      for (let i = 0; i < directions.length; i++) {
        const nx = curr.x + directions[i].dx;
        const ny = curr.y + directions[i].dy;

        if (nx >= 0 && nx < 9 && ny >= 0 && ny < 9 && !visited[nx][ny]) {
          // Check if blocked by wall
          if (!this.isBlockedByWall(curr.x, curr.y, nx, ny)) {
            visited[nx][ny] = true;
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }

    return false;
  }

  /**
   * Uses Breadth-First Search to find the shortest path length from (sx, sy) to goalY.
   * Returns the length (number of moves) or Infinity if blocked.
   */
  getShortestPathLength(sx, sy, targetY) {
    const queue = [{ x: sx, y: sy, dist: 0 }];
    const visited = Array(this.boardSize)
      .fill(null)
      .map(() => Array(this.boardSize).fill(false));
    visited[sx][sy] = true;

    let head = 0;
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    while (head < queue.length) {
      const curr = queue[head++];

      if (curr.y === targetY) {
        return curr.dist;
      }

      for (let i = 0; i < directions.length; i++) {
        const nx = curr.x + directions[i].dx;
        const ny = curr.y + directions[i].dy;

        if (nx >= 0 && nx < 9 && ny >= 0 && ny < 9 && !visited[nx][ny]) {
          if (!this.isBlockedByWall(curr.x, curr.y, nx, ny)) {
            visited[nx][ny] = true;
            queue.push({ x: nx, y: ny, dist: curr.dist + 1 });
          }
        }
      }
    }

    return Infinity;
  }

  /**
   * Places a wall permanently if legal and does not block paths.
   */
  placeWall(x, y, type) {
    if (this.winner) return false;

    const active = this.turn === 1 ? this.p1 : this.p2;

    // 1. Verify player has walls left
    if (active.walls <= 0) {
      this.logs.push(`Player ${this.turn} has no walls remaining!`);
      return false;
    }

    // 2. Verify wall placement is syntactically legal (bounds, no overlaps)
    if (!this.canPlaceWallSyntax(x, y, type)) {
      this.logs.push(
        `Wall placement at (${x + 1}, ${y + 1}) [${type}] overlaps with an existing wall.`,
      );
      return false;
    }

    // 3. Verify wall doesn't trap any player
    if (this.wouldBlockPath(x, y, type)) {
      this.logs.push(
        `Wall placement at (${x + 1}, ${y + 1}) [${type}] blocks a player's only path to the goal.`,
      );
      return false;
    }

    // Action approved! Record state for Undo
    const coordsStr = `${String.fromCharCode(65 + x)}${y + 1}`;
    this.saveHistory(`P${this.turn} Wall ${type} @ ${coordsStr}`);

    // Commit placement
    if (type === "H") this.horizontalWalls[x][y] = true;
    else this.verticalWalls[x][y] = true;

    active.walls--;

    this.logs.push(
      `Player ${this.turn} placed a ${type === "H" ? "Horizontal" : "Vertical"} wall at ${coordsStr}`,
    );

    // Shift turns
    this.turn = this.turn === 1 ? 2 : 1;

    return true;
  }
}
