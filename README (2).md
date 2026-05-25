# 🌐 Quoridor CyberStrategy - Premium Edition

Welcome to **Quoridor CyberStrategy**, a complete, state-of-the-art implementation of the award-winning abstract strategy board game **Quoridor** (invented by Mirko Marchesi). 

This project delivers a responsive Single Page Application (SPA) designed with a **Cyberpunk Glassmorphism Dark Theme**, featuring custom synthesizers, state saving, deep undo-redo cycles, and multiple levels of competitive AI.

---

## 🎨 Game Screenshot & Visual Showcase
The game features a stunning dark canvas with glowing neon-blue (P1) and hot-pink (P2) player tokens, gold-gradient wooden walls, dynamic path-movement indicators, real-time particle-explosion effects for straight jumps/victories, and glassmorphic dashboards.

---

## 🚀 Key Features

### 1. Robust Core Game Engine (`js/game.js`)
* **100% Rules Compliant:** Implements all rules including orthogonal moves, single-step offsets, straight pawn jumps, and diagonal jump variations (when blocked by a back wall/edge).
* **Path-Blocking Guard:** Integrates a robust **Breadth-First Search (BFS) Pathfinding validation** that actively blocks players from placing any wall that would seal off any player's path to their goal.
* **Turn Logs:** Records a granular text feed of each action (e.g., `P1 Pawn E8 -> E7` or `P1 Wall H @ D3`).

### 2. State-of-the-Art AI Opponents (`js/ai.js`)
* **Easy AI:** Heuristic-driven choice prioritizing shortest paths, with a 25% chance of dropping random walls.
* **Medium AI:** Depth-2 Minimax search assessing absolute path-length differences.
* **Hard AI:** Highly optimized Depth-3/4 Minimax with **Alpha-Beta Pruning**. Incorporates pathing delay differentials, wall count preservation bonuses, center-column control, and **Shortest-Path Move Candidate Filtering** (reduces branching factor from 128 down to ~15 candidate walls, running in **sub-15ms**).

### 3. Audio Synthesizer Engine (`js/sound.js`)
* **Zero External Assets:** Built using the native HTML5 **Web Audio API**. Sound effects are dynamically synthesized on the fly using wave oscillators, bandpass filters, and exponential decay curves.
* **Synthesized Sounds:** Soft pop clicks, ascending move chimes, wooden wall-clack effects, warning buzzers, and a beautiful ascending major arpeggio fanfare for victory.

### 4. Advanced Game controls & UX
* **Save/Load:** Implements seamless game preservation using **HTML5 LocalStorage**. Refresh or close the tab, and instantly reload your board, wall counts, turn logs, and undo history.
* **Full Undo/Redo:** Travel back and forth along the complete game timeline using history stacks.
* **Intelligent Wall Hover:** Detects cursor proximity between rows/columns and auto-snaps to wall gaps.
* **Rotation Key/Click:** Quickly toggle vertical/horizontal wall orientation by pressing the **Spacebar** or clicking **Right-Click**.

---

## 🕹️ Controls Guide

| Input | Action |
| :--- | :--- |
| **Left Click (Pawn)** | Select / Deselect your pawn. Legal movements will highlight with blue glowing circles. |
| **Left Click (Glow Circle)** | Move your pawn to the target highlighted square. |
| **Hover (Gaps)** | Visualizes a glowing green (valid) or pink (invalid/blocked) semi-transparent wall preview. |
| **Left Click (Preview)** | Permanently place the wall (deducts 1 wall from your inventory). |
| **Spacebar** or **Right-Click** | Rotates wall orientation between **Horizontal** and **Vertical** snapping modes. |
| **Save / Load Buttons** | Write/load state snapshots directly to your browser's local cache. |
| **Undo / Redo Buttons** | Roll back or re-apply moves step-by-step. |

---

## 🛠️ Quick Start & Installation

No servers, compilers, or standard package installers are required! The game runs completely offline in any modern web browser.

### Option A: Local Run
1. Clone or download this project folder to your local desktop.
2. Locate and double-click `index.html` to launch it immediately in your default browser.

### Option B: Local Dev Server (Optional)
If you prefer running via a local static server:
```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx serve -l 8000
```
Then navigate to [http://localhost:8000](http://localhost:8000).

---

## 📂 Project Architecture

```
aigame/
├── index.html            # Main GUI viewport shell, stats dashboards, rules guide
├── style.css             # Premium styling, ambient orb backdrops, animations
├── js/
│   ├── sound.js          # Web Audio synth oscillator sweeps and wood-click math
│   ├── game.js           # Core state model, pawn-jumps, BFS validations
│   ├── ai.js             # AI heuristics, Minimax + Alpha-Beta tree search
│   └── ui.js             # Canvas render loop, particle controllers, mouse snap trackers
└── README.md             # Standard project description
```

---

## 🎥 Demo Video Details
A comprehensive 3–5 minute demonstration video covers:
1. **System Setup & Interactive Dashboard:** An overview of our cyberpunk visual glass panels, responsive grids, and synth sounds.
2. **Local Duel (Human vs. Human):** Highlighting pawn jump actions, diagonal overrides, wall snaps, and path block preventions.
3. **AI Showdowns (Human vs. AI):** Demonstrating moves against Easy, Medium, and our optimized Hard AI (Minimax + Alpha-Beta).

*Demo Video URL: [https://www.youtube.com/watch?v=demo_placeholder_url](https://www.youtube.com/watch?v=demo_placeholder_url)*
*(Please see the Project Report for the complete PDF writeup and academic discussions)*
