# Phase 3: Frontend - React & TypeScript Interface - Beginner's Guide

## Welcome to Phase 3!

Congratulations on completing the backend! Now we'll build a beautiful, real-time frontend that users will actually interact with.

---

## 📊 Overall Project Phases

Here's where we are in the complete project:

```
✅ Phase 1: Foundation (COMPLETED)
   ├─ PostgreSQL database setup
   ├─ Django models (Episode, Category, Clue, Game, Player)
   ├─ Data import (150+ episodes)
   ├─ Admin panel
   └─ Basic WebSocket test

✅ Phase 2: Backend Core (MOSTLY COMPLETED)
   ├─ ✅ Part A: REST API (Episodes, Games, Players)
   ├─ ✅ Part B: Game State Manager (Redis + atomic buzzer)
   ├─ ⏸️  Part C: Enhanced WebSocket Consumer (optional for now)
   └─ ⏸️  Part D: Comprehensive testing (optional for now)

🚀 Phase 3: Frontend (CURRENT - What We're Building Now!)
   ├─ Part A: React/TypeScript setup
   ├─ Part B: Shared components & utilities
   ├─ Part C: Board interface (display view)
   ├─ Part D: Player interface (buzzer + answer)
   ├─ Part E: Host interface (game control)
   └─ Part F: Integration & styling

⏭️  Phase 4: Polish & Deployment (FUTURE)
   ├─ Audio/visual effects
   ├─ Mobile responsiveness
   ├─ Production deployment
   └─ Performance optimization
```

---

## What You've Built So Far

```
Current Stack (Backend):
┌─────────────────────────────────────────┐
│   PostgreSQL Database                   │
│   ├─ 150+ Episodes                     │
│   ├─ 1,950+ Categories                 │
│   ├─ 9,150+ Clues                      │
│   └─ Game/Player tables                │
└─────────────────────────────────────────┘
            ▲
            │ (Database queries)
            │
┌───────────┴─────────────────────────────┐
│   Django Backend (Port 8000)            │
│   ├─ REST API (/api/episodes/, etc.)   │
│   ├─ Game State Manager (Redis)        │
│   ├─ Buzzer logic (atomic)             │
│   └─ WebSocket support (Channels)      │
└─────────────────────────────────────────┘
            ▲
            │ (HTTP + WebSocket)
            │
┌───────────┴─────────────────────────────┐
│   ??? Frontend (We're building this!)  │
│   ├─ ???                                │
│   ├─ ???                                │
│   └─ ???                                │
└─────────────────────────────────────────┘
```

---

## Phase 3 Goal: Build the Frontend

```
What We're Building:
┌─────────────────────────────────────────┐
│   React Application (Port 3000)         │
│   ├─ TypeScript (type safety)          │
│   ├─ Three interfaces (Board/Host/Play)│
│   ├─ WebSocket client                  │
│   ├─ State management                  │
│   └─ Styled UI                          │
└─────────────────────────────────────────┘
```

**After Phase 3, you'll have:**
- Beautiful game board interface for audience
- Host control panel for managing the game
- Player interface with buzzer
- Real-time synchronization across all clients
- Complete, playable Jeopardy game!

---

## Technology Explanations (for Beginners)

Let me explain each technology we'll use and WHY we need it:

### 1. React - The UI Framework

**What is it?**
React is a JavaScript library for building user interfaces. Think of it like LEGO blocks for web pages - you build small, reusable components and combine them into a full application.

**Why not just HTML/CSS/JavaScript?**
- **Reusability**: Write a button component once, use it everywhere
- **State management**: React automatically updates the UI when data changes
- **Component thinking**: Break complex UI into manageable pieces
- **Huge ecosystem**: Thousands of pre-built components and tools

**Real-world analogy:**
Imagine building a house:
- **Plain HTML/CSS/JS**: Building every wall, door, and window from scratch each time
- **React**: Having pre-fab components (doors, windows) you can customize and reuse

**Example:**
```javascript
// Without React (manual DOM manipulation)
document.getElementById('score').innerHTML = newScore;
document.getElementById('player-name').innerHTML = playerName;
// ... repeat for every element

// With React (declarative)
function PlayerCard({ name, score }) {
  return <div>{name}: {score}</div>;
}
// React automatically updates when name/score change!
```

---

### 2. TypeScript - JavaScript with Types

**What is it?**
TypeScript is JavaScript + type checking. It catches bugs BEFORE you run your code.

**Why not just JavaScript?**
- **Catch bugs early**: Know if you're passing wrong data types
- **Better autocomplete**: Your editor knows what properties exist
- **Self-documenting**: Code shows what data shape it expects
- **Refactoring safety**: Change a type, see everywhere that breaks

**Real-world analogy:**
- **JavaScript**: A car without speedometer - you find out you're speeding when cop pulls you over
- **TypeScript**: A car with speedometer - you know your speed in real-time

**Example:**
```typescript
// JavaScript - This runs but crashes at runtime!
function getScore(player) {
  return player.score * 2;  // What if player is null? What if score is undefined?
}
getScore(null);  // CRASH! Runtime error

// TypeScript - Catches this BEFORE running!
interface Player {
  name: string;
  score: number;
}

function getScore(player: Player): number {
  return player.score * 2;
}
getScore(null);  // ERROR at compile time! TypeScript won't let this run
```

---

### 3. NPM - The Package Manager

**What is it?**
NPM (Node Package Manager) is like an app store for JavaScript code. Instead of writing everything yourself, you can install libraries other people have written.

**Why do we need it?**
- **Avoid reinventing the wheel**: Use tested, mature libraries
- **Dependency management**: Automatically installs code your project needs
- **Version control**: Ensures everyone uses same library versions

**Real-world analogy:**
- **Without NPM**: Growing your own wheat, milling flour, baking bread
- **With NPM**: Buying bread from the store (someone else did the work)

**Example:**
```bash
# Without NPM
# Download library, copy files, manually include in HTML, update manually...

# With NPM
npm install react  # Done! React is installed and ready to use
```

---

### 4. Vite - The Development Server

**What is it?**
Vite is a tool that:
1. Runs a local web server for development
2. Hot-reloads your app when you save files (no manual refresh!)
3. Bundles your code for production

**Why not open HTML files directly?**
- **Module system**: Modern JavaScript uses imports, which don't work in plain HTML
- **TypeScript compilation**: Converts .tsx files to .js files browsers understand
- **Development speed**: Hot reload means instant feedback
- **Optimization**: Minifies and bundles code for production

**Real-world analogy:**
- **Plain HTML files**: Handwriting every copy of a book
- **Vite**: A printing press that automatically reprints when you edit

---

### 5. WebSocket - Real-Time Communication

**What is it?**
WebSocket is a persistent, two-way connection between browser and server. Unlike normal HTTP (request → response → done), WebSocket stays open.

**Why not just REST API?**
- **Real-time updates**: Server can push data to clients instantly
- **Lower latency**: No need to repeatedly ask "any updates?"
- **Perfect for games**: Buzzer presses, score updates happen instantly

**Communication pattern comparison:**

```
REST API (HTTP):
Client: "Hey server, any new messages?"
Server: "Nope."
[5 seconds later]
Client: "Hey server, any new messages?"
Server: "Nope."
[5 seconds later]
Client: "Hey server, any new messages?"
Server: "Yes! Here's a new message."

WebSocket:
Client ←→ Server (persistent connection)
[New message arrives]
Server: "Hey client, here's a new message!"
[Instant delivery, no polling]
```

**For our Jeopardy game:**
- Player clicks buzzer → WebSocket sends to server → Server sends to all clients
- ALL clients see who buzzed INSTANTLY (no delay, no polling)

---

### 6. Component-Based Architecture

**What is it?**
Breaking your UI into small, independent, reusable pieces called "components."

**Why?**
- **Maintainability**: Fix a bug in one place, fixes everywhere
- **Reusability**: Write once, use many times
- **Testability**: Test components in isolation
- **Team collaboration**: Different people can work on different components

**Our Jeopardy component tree:**
```
App
├─ Router
│  ├─ BoardView
│  │  ├─ Header
│  │  ├─ Board
│  │  │  └─ ClueCard (x30 - one per clue)
│  │  └─ ScoreDisplay
│  ├─ HostView
│  │  ├─ Header
│  │  ├─ Board (same component!)
│  │  ├─ ControlPanel
│  │  │  ├─ BuzzerStatus
│  │  │  ├─ ScoreControls
│  │  │  └─ RoundControls
│  │  └─ ClueDetail
│  └─ PlayerView
│     ├─ Header
│     ├─ BuzzerButton
│     ├─ AnswerInput
│     └─ PlayerScore
```

**Example:**
```typescript
// ClueCard component - used 30 times (once per clue)
function ClueCard({ value, isRevealed, onClick }) {
  return (
    <div className="clue-card" onClick={onClick}>
      {isRevealed ? '' : `$${value}`}
    </div>
  );
}

// Use it in Board
function Board() {
  return (
    <div>
      <ClueCard value={200} isRevealed={false} onClick={...} />
      <ClueCard value={400} isRevealed={true} onClick={...} />
      {/* ... 28 more */}
    </div>
  );
}
```

---

### 7. State Management - Keeping Track of Data

**What is it?**
"State" is data that can change over time. State management is HOW you store and update that data.

**Types of state in React:**
1. **Local state** (`useState`): Data specific to one component
2. **Shared state** (Context/Redux): Data multiple components need
3. **Server state**: Data from your backend API

**Our Jeopardy state:**
- **Game state**: Current round, revealed clues, Daily Double locations
- **Player state**: Names, scores, who buzzed in
- **UI state**: Which clue is showing, buzzer locked status

**Example:**
```typescript
// Local state - only this component cares
function BuzzerButton() {
  const [isPressing, setIsPressing] = useState(false);

  return (
    <button
      onMouseDown={() => setIsPressing(true)}
      onMouseUp={() => setIsPressing(false)}
      className={isPressing ? 'pressing' : ''}
    >
      BUZZ!
    </button>
  );
}

// Shared state - multiple components need this
// We'll use React Context for this
const GameContext = createContext();

function App() {
  const [scores, setScores] = useState({ 1: 0, 2: 0, 3: 0 });

  return (
    <GameContext.Provider value={{ scores, setScores }}>
      <Board />  {/* Can access scores */}
      <ScoreDisplay />  {/* Can access scores */}
    </GameContext.Provider>
  );
}
```

---

### 8. CSS Modules & Styling

**What is it?**
CSS Modules let you write CSS that's scoped to a specific component (doesn't leak to other components).

**Why not just regular CSS?**
- **No naming conflicts**: `.button` in one component won't affect `.button` in another
- **Easier to maintain**: CSS lives next to the component that uses it
- **Automatic cleanup**: Delete a component, its CSS goes too

**Example:**
```typescript
// ClueCard.module.css
.card {
  background: blue;
  width: 200px;
}

.revealed {
  background: gray;
}

// ClueCard.tsx
import styles from './ClueCard.module.css';

function ClueCard({ revealed }) {
  return (
    <div className={revealed ? styles.revealed : styles.card}>
      Content
    </div>
  );
}
// The class names are actually: .ClueCard_card_a3j2k (unique!)
// So even if another component has a .card class, no conflict!
```

---

## Phase 3 Architecture Overview

Here's how all pieces fit together:

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (http://localhost:3000)                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  React Application                                         │ │
│  │  ├─ React Router (handles /board, /host, /player)        │ │
│  │  ├─ Components (Board, Host, Player views)               │ │
│  │  ├─ State Management (Context API)                       │ │
│  │  └─ WebSocket Client (connects to backend)              │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
            │                           ▲
            │ HTTP (REST API)           │ WebSocket
            │ /api/episodes/            │ ws://localhost:8000
            ▼                           │
┌─────────────────────────────────────────────────────────────────┐
│  Django Backend (http://localhost:8000)                         │
│  ├─ REST API (Django REST Framework)                           │
│  ├─ WebSocket (Django Channels)                                │
│  ├─ Game State Manager (Redis)                                 │
│  └─ PostgreSQL Database                                        │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow:**

1. **Initial load:**
   - React app makes HTTP request to `/api/episodes/` to get episode list
   - User selects episode
   - React app makes HTTP request to `/api/episodes/{id}/` to get clues

2. **Game creation:**
   - Host clicks "Create Game"
   - React makes HTTP POST to `/api/games/` with episode ID
   - Backend creates game in PostgreSQL + Redis
   - Returns game_id

3. **Real-time gameplay:**
   - All clients connect WebSocket to `ws://localhost:8000/ws/game/{game_id}/`
   - Player clicks buzzer → WebSocket message to server
   - Server processes in Redis (atomic operation)
   - Server broadcasts result to ALL connected clients via WebSocket
   - All clients update their UI instantly

---

## Phase 3 File Structure

Here's what we'll create:

```
jeopardy_v2/
├─ backend/                 # Django (already exists)
│  ├─ games/
│  ├─ users/
│  └─ api/
│
└─ frontend/                # NEW! We're building this
   ├─ public/              # Static files
   │  ├─ index.html
   │  └─ assets/           # Images, fonts, audio
   │
   ├─ src/
   │  ├─ main.tsx          # Entry point
   │  ├─ App.tsx           # Root component
   │  │
   │  ├─ components/       # Reusable components
   │  │  ├─ Board/
   │  │  │  ├─ Board.tsx
   │  │  │  ├─ Board.module.css
   │  │  │  ├─ ClueCard.tsx
   │  │  │  └─ ClueCard.module.css
   │  │  ├─ ScoreDisplay/
   │  │  └─ Header/
   │  │
   │  ├─ views/            # Page-level components
   │  │  ├─ BoardView/     # /board/:gameId
   │  │  │  └─ BoardView.tsx
   │  │  ├─ HostView/      # /host/:gameId
   │  │  │  ├─ HostView.tsx
   │  │  │  └─ ControlPanel.tsx
   │  │  ├─ PlayerView/    # /player/:gameId/:playerNum
   │  │  │  └─ PlayerView.tsx
   │  │  └─ HomePage/      # /
   │  │     └─ HomePage.tsx
   │  │
   │  ├─ hooks/            # Custom React hooks
   │  │  ├─ useWebSocket.ts
   │  │  └─ useGameState.ts
   │  │
   │  ├─ context/          # Global state
   │  │  └─ GameContext.tsx
   │  │
   │  ├─ services/         # API communication
   │  │  ├─ api.ts         # REST API calls
   │  │  └─ websocket.ts   # WebSocket client
   │  │
   │  ├─ types/            # TypeScript interfaces
   │  │  ├─ Game.ts
   │  │  ├─ Episode.ts
   │  │  └─ WebSocket.ts
   │  │
   │  └─ utils/            # Helper functions
   │     └─ formatters.ts
   │
   ├─ package.json         # Dependencies
   ├─ tsconfig.json        # TypeScript config
   └─ vite.config.ts       # Vite config
```

---

## Phase 3 Breakdown

### Part A: Project Setup (Steps 1-3)
- Install Node.js and create React project
- Configure TypeScript
- Set up routing

**Time:** 30 minutes

---

### Part B: Shared Components & Utilities (Steps 4-7)
- TypeScript interfaces for our data
- API service for REST calls
- WebSocket service
- Reusable components (Header, ScoreDisplay)

**Time:** 2-3 hours

---

### Part C: Board Interface (Steps 8-10)
- Board component (6x5 grid of clues)
- ClueCard component (clickable clue tiles)
- Category display
- Clue modal (full-screen clue display)

**Time:** 3-4 hours

---

### Part D: Player Interface (Steps 11-13)
- Buzzer button (large, responsive)
- Player info display
- Answer input
- Connection status indicator

**Time:** 2-3 hours

---

### Part E: Host Interface (Steps 14-17)
- Control panel (reveal clue, judge answer, etc.)
- Buzzer queue display
- Score adjustment controls
- Game flow controls (start round, etc.)

**Time:** 3-4 hours

---

### Part F: Integration & Polish (Steps 18-20)
- Connect all views via WebSocket
- Add styling and animations
- Test full game flow
- Bug fixes

**Time:** 3-4 hours

---

**Total estimated time:** 14-18 hours of focused work (2-3 days)

---

## Prerequisites

Before starting Phase 3, make sure:

### Backend is Running
```bash
# Terminal 1 - Redis
redis-server

# Terminal 2 - Django
cd jeopardy_v2
source venv/bin/activate
python manage.py runserver
```

### Backend Tests Pass
```bash
python manage.py test games
# Should see: Ran 8 tests ... OK
```

### API Endpoints Work
```bash
# Test in browser or curl
curl http://127.0.0.1:8000/api/episodes/
# Should return episode list
```

---

## What You'll Learn in Phase 3

By the end of Phase 3, you'll understand:

✅ **React fundamentals**
- Component creation and composition
- Props and state
- Hooks (useState, useEffect, useContext)
- Event handling

✅ **TypeScript**
- Type annotations
- Interfaces
- Type safety benefits

✅ **Modern web development**
- NPM and package management
- Module bundling (Vite)
- Development workflow

✅ **Real-time communication**
- WebSocket client implementation
- Event-driven architecture
- State synchronization

✅ **CSS and styling**
- CSS Modules
- Flexbox/Grid layouts
- Responsive design basics

---

## Common Questions

### Q: Do I need to learn React before starting?
**A:** No! This guide assumes zero React knowledge. We'll explain concepts as we use them.

### Q: Why React instead of Vue/Angular/Svelte?
**A:** React has:
- Largest community (most tutorials/help available)
- Most job opportunities
- Great documentation
- Huge ecosystem
- TypeScript support is excellent

### Q: Can I use JavaScript instead of TypeScript?
**A:** You could, but TypeScript will save you hours of debugging. For a beginner, the type safety is incredibly helpful for catching mistakes early.

### Q: Will this work on mobile?
**A:** We'll build it for desktop first (Phase 3), then add mobile support in Phase 4 (Polish).

### Q: Do I need to know CSS?
**A:** Basic CSS knowledge helps, but we'll provide all the styling code. You can customize it later.

---

## Let's Begin!

Ready to build your frontend? Let's start with Part A: Project Setup!

---

# Part A: Project Setup

## Step 1: Install Node.js and NPM

Node.js is a JavaScript runtime that lets you run JavaScript outside the browser. NPM comes with it.

### Check if Already Installed

```bash
node --version
npm --version
```

If you see version numbers (like `v18.17.0` and `9.6.7`), you're good! Skip to Step 2.

### Install Node.js (if needed)

**On Ubuntu/WSL:**
```bash
# Install Node Version Manager (recommended way)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

# Close and reopen terminal, then:
nvm install 18
nvm use 18

# Verify
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x
```

**Why NVM?**
- Lets you install multiple Node versions
- Easy to update
- No sudo needed
- Industry standard

---

## Step 2: Create React Project with Vite

Navigate to your project directory:

```bash
cd /mnt/c/Users/patri/Documents/jeopardyv2_research/Jeopardy-Web/Main_Code/jeopardy_v2
```

Create the React project:

```bash
npm create vite@latest frontend -- --template react-ts
```

**What this does:**
- Creates a new folder called `frontend`
- Sets up React with TypeScript template
- Installs Vite as the build tool
- Creates basic project structure

**You'll see output like:**
```
Scaffolding project in /path/to/frontend...
Done. Now run:

  cd frontend
  npm install
  npm run dev
```

Follow those instructions:

```bash
cd frontend
npm install
```

**What `npm install` does:**
- Reads `package.json` (list of dependencies)
- Downloads all required packages
- Creates `node_modules/` folder (thousands of files)
- Creates `package-lock.json` (exact versions used)

This will take 1-2 minutes.

---

## Step 3: Test the Development Server

```bash
npm run dev
```

**You should see:**
```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

**Open in browser:** http://localhost:5173/

You should see a default Vite + React page with a counter button!

**How this works:**
- Vite starts a dev server on port 5173
- Watches your files for changes
- When you save a file, Vite automatically:
  1. Recompiles that file
  2. Hot-reloads the browser (no manual refresh!)
  3. Preserves component state (amazing for development)

**Press `Ctrl+C` in terminal to stop server** (we'll restart it later)

---

## Step 4: Understand the Project Structure

Let's look at what was created:

```bash
ls -la
```

```
frontend/
├─ node_modules/       # 📦 Installed packages (1000s of files)
├─ public/             # 🌐 Static files (served as-is)
├─ src/                # 💻 Your source code (where we work)
│  ├─ App.css          # Styles for App component
│  ├─ App.tsx          # Main App component
│  ├─ main.tsx         # Entry point
│  └─ ...other files
├─ .gitignore          # Files git should ignore
├─ index.html          # HTML template
├─ package.json        # Project config + dependencies
├─ tsconfig.json       # TypeScript config
└─ vite.config.ts      # Vite config
```

**Important files:**

1. **`package.json`** - Project manifest
   ```json
   {
     "name": "frontend",
     "version": "0.0.0",
     "dependencies": {
       "react": "^18.2.0",
       "react-dom": "^18.2.0"
     },
     "scripts": {
       "dev": "vite",           // npm run dev
       "build": "vite build",   // npm run build (for production)
     }
   }
   ```

2. **`src/main.tsx`** - Entry point (first file that runs)
   ```typescript
   import React from 'react'
   import ReactDOM from 'react-dom/client'
   import App from './App.tsx'
   import './index.css'

   ReactDOM.createRoot(document.getElementById('root')!).render(
     <React.StrictMode>
       <App />
     </React.StrictMode>,
   )
   ```
   **Translation:** "Find the element with id='root' in HTML, and render the <App> component there"

3. **`src/App.tsx`** - Root component
   ```typescript
   function App() {
     return (
       <div className="App">
         <h1>Hello World</h1>
       </div>
     )
   }

   export default App
   ```

4. **`index.html`** - HTML template
   ```html
   <!DOCTYPE html>
   <html>
     <body>
       <div id="root"></div>  <!-- React renders here -->
       <script type="module" src="/src/main.tsx"></script>
     </body>
   </html>
   ```

---

## Step 5: Clean Up Default Files

The template includes example code we don't need. Let's clean it up:

**Delete these files:**
```bash
cd src
rm App.css index.css
rm assets/react.svg  # (if exists)
cd ..
rm -rf public/vite.svg
```

**Replace `src/App.tsx` with a clean version:**

We'll do this in the next step when we start building our actual app.

---

## Checkpoint: Part A Complete! ✅

You now have:
- ✅ Node.js and NPM installed
- ✅ React + TypeScript project created
- ✅ Vite dev server working
- ✅ Understanding of project structure

**Next:** Part B - We'll create TypeScript types, API services, and utilities.

---

# Part B: Foundation - Types, Services & Utilities

## Step 6: Create TypeScript Type Definitions

TypeScript types help us catch errors and make our code self-documenting. Let's define the data structures we'll use.

### Create Types Directory

```bash
mkdir src/types
```

### Create Episode Types

Create `src/types/Episode.ts`:

```typescript
/**
 * Episode types - matches our Django models
 */

export interface Clue {
  id: number;
  question: string;
  answer: string;
  value: number;
  position: number;  // 0-29 (6 categories x 5 clues each)
  is_daily_double: boolean;
}

export interface Category {
  id: number;
  name: string;
  round_type: 'single' | 'double' | 'final';
  position: number;  // 0-5 (column number)
  clues: Clue[];
}

export interface Episode {
  id: number;
  season_number: number;
  episode_number: number;
  air_date: string;
  total_clues: number;
  categories: Category[];
}

// Lightweight version for episode lists
export interface EpisodeListItem {
  id: number;
  season_number: number;
  episode_number: number;
  air_date: string;
  total_clues: number;
}
```

**What this does:**
- Defines the exact shape of data from our API
- Editor autocomplete will now work
- TypeScript will error if we access wrong properties

---

### Create Game Types

Create `src/types/Game.ts`:

```typescript
/**
 * Game types - matches Django models + Redis state
 */

export interface Player {
  id: number;
  display_name: string;
  total_games: number;
  total_score: number;
  average_score: number;
}

export interface GameParticipant {
  id: number;
  player: number;  // player ID
  player_name: string;
  player_number: number;  // 1, 2, or 3
  score: number;
  final_wager: number | null;
  joined_at: string;
}

export interface Game {
  game_id: string;  // UUID
  episode: number;  // episode ID
  episode_display: string;  // e.g., "S1E5"
  host: number;  // player ID
  host_name: string;
  status: 'waiting' | 'active' | 'completed';
  current_round: 'single' | 'double' | 'final';
  settings: Record<string, any>;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  participants: GameParticipant[];
}

// For creating a game (only needs these fields)
export interface CreateGameRequest {
  episode: number;
  host: number;
  settings?: Record<string, any>;
}

// For joining a game
export interface JoinGameRequest {
  player_id?: number;
  display_name?: string;
}

// Game state from Redis
export interface GameState {
  episode_id: string;
  status: string;
  current_round: 'single' | 'double' | 'final';
  current_clue: string | null;  // clue ID
  revealed_clues: number[];  // list of revealed clue IDs
  daily_doubles: number[];  // list of daily double clue IDs
}

// Player scores from Redis
export interface Scores {
  [playerNumber: number]: number;  // { 1: 100, 2: -200, 3: 0 }
}
```

---

### Create WebSocket Types

Create `src/types/WebSocket.ts`:

```typescript
/**
 * WebSocket message types
 */

// Base message type
export interface BaseMessage {
  type: string;
  timestamp?: number;
}

// Outgoing messages (client → server)

export interface BuzzMessage extends BaseMessage {
  type: 'buzz';
  player_number: number;
  timestamp: number;  // client timestamp in milliseconds
}

export interface RevealClueMessage extends BaseMessage {
  type: 'reveal_clue';
  clue_id: number;
}

export interface JudgeAnswerMessage extends BaseMessage {
  type: 'judge_answer';
  player_number: number;
  correct: boolean;
  value: number;
}

export interface NextClueMessage extends BaseMessage {
  type: 'next_clue';
}

// Incoming messages (server → client)

export interface ConnectionEstablishedMessage extends BaseMessage {
  type: 'connection_established';
  game_id: string;
  state: any;  // GameState
  scores: { [key: number]: number };
}

export interface BuzzResultMessage extends BaseMessage {
  type: 'buzz_result';
  player_number: number;
  accepted: boolean;
  winner: number | null;
  position: number;
  server_timestamp: number;
}

export interface ClueRevealedMessage extends BaseMessage {
  type: 'clue_revealed';
  clue: {
    id: number;
    question: string;
    answer: string;
    value: number;
    is_daily_double: boolean;
  };
}

export interface AnswerJudgedMessage extends BaseMessage {
  type: 'answer_judged';
  player_number: number;
  correct: boolean;
  value: number;
  new_score: number;
}

export interface ReturnToBoardMessage extends BaseMessage {
  type: 'return_to_board';
  scores: { [key: number]: number };
  revealed_clues: number[];
}

export interface ErrorMessage extends BaseMessage {
  type: 'error';
  message: string;
}

// Union type of all possible messages
export type IncomingMessage =
  | ConnectionEstablishedMessage
  | BuzzResultMessage
  | ClueRevealedMessage
  | AnswerJudgedMessage
  | ReturnToBoardMessage
  | ErrorMessage;

export type OutgoingMessage =
  | BuzzMessage
  | RevealClueMessage
  | JudgeAnswerMessage
  | NextClueMessage;
```

**Why all these types?**
- TypeScript will autocomplete message properties
- Can't accidentally send wrong message structure
- Serves as documentation of our protocol

---

## Step 7: Create API Service

This service handles all REST API calls to our Django backend.

Create `src/services/api.ts`:

```typescript
/**
 * API Service
 * Handles all HTTP requests to Django backend
 */

import type {
  Episode,
  EpisodeListItem,
  Game,
  CreateGameRequest,
  JoinGameRequest,
  GameParticipant,
  Player
} from '../types/Game';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.detail || error.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Episode endpoints
 */
export const episodeAPI = {
  /**
   * List all episodes
   */
  list: async (): Promise<EpisodeListItem[]> => {
    return apiFetch<EpisodeListItem[]>('/episodes/');
  },

  /**
   * Get a specific episode with all clues
   */
  get: async (id: number): Promise<Episode> => {
    return apiFetch<Episode>(`/episodes/${id}/`);
  },

  /**
   * Get a random episode
   */
  random: async (): Promise<Episode> => {
    return apiFetch<Episode>('/episodes/random/');
  },

  /**
   * Search episodes by season/episode number
   */
  search: async (season?: number, episode?: number): Promise<Episode[]> => {
    const params = new URLSearchParams();
    if (season) params.append('season', season.toString());
    if (episode) params.append('episode', episode.toString());

    return apiFetch<Episode[]>(`/episodes/search/?${params}`);
  },
};

/**
 * Game endpoints
 */
export const gameAPI = {
  /**
   * List all games
   */
  list: async (): Promise<Game[]> => {
    return apiFetch<Game[]>('/games/');
  },

  /**
   * Get specific game
   */
  get: async (gameId: string): Promise<Game> => {
    return apiFetch<Game>(`/games/${gameId}/`);
  },

  /**
   * Create a new game
   */
  create: async (data: CreateGameRequest): Promise<Game> => {
    return apiFetch<Game>('/games/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Join a game
   */
  join: async (gameId: string, data: JoinGameRequest): Promise<GameParticipant> => {
    return apiFetch<GameParticipant>(`/games/${gameId}/join/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Start a game
   */
  start: async (gameId: string): Promise<Game> => {
    return apiFetch<Game>(`/games/${gameId}/start/`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  /**
   * Get game state (from Redis)
   */
  getState: async (gameId: string): Promise<any> => {
    return apiFetch<any>(`/games/${gameId}/state/`);
  },
};

/**
 * Player endpoints
 */
export const playerAPI = {
  /**
   * List all players
   */
  list: async (): Promise<Player[]> => {
    return apiFetch<Player[]>('/players/');
  },

  /**
   * Get specific player
   */
  get: async (id: number): Promise<Player> => {
    return apiFetch<Player>(`/players/${id}/`);
  },

  /**
   * Create guest player
   */
  createGuest: async (displayName: string): Promise<Player> => {
    return apiFetch<Player>('/players/create_guest/', {
      method: 'POST',
      body: JSON.stringify({ display_name: displayName }),
    });
  },
};
```

**How to use this:**
```typescript
// In a component:
import { episodeAPI } from '../services/api';

// Get random episode
const episode = await episodeAPI.random();
console.log(episode.categories);  // TypeScript knows this exists!
```

---

## Step 8: Create WebSocket Service

This service manages the WebSocket connection to our Django Channels backend.

Create `src/services/websocket.ts`:

```typescript
/**
 * WebSocket Service
 * Manages WebSocket connection to Django Channels
 */

import type { IncomingMessage, OutgoingMessage } from '../types/WebSocket';

export type MessageHandler = (message: IncomingMessage) => void;

export class GameWebSocket {
  private ws: WebSocket | null = null;
  private gameId: string;
  private messageHandlers: Set<MessageHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  constructor(gameId: string) {
    this.gameId = gameId;
  }

  /**
   * Connect to WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://127.0.0.1:8000/ws/game/${this.gameId}/`;

      console.log('Connecting to WebSocket:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.handleClose();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: IncomingMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', message);

          // Call all registered message handlers
          this.messageHandlers.forEach(handler => handler(message));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    });
  }

  /**
   * Handle WebSocket close - attempt reconnection
   */
  private handleClose() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );

      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay);

      // Exponential backoff
      this.reconnectDelay *= 2;
    } else {
      console.error('Max reconnection attempts reached');
      // Could emit a "connection_lost" event here
    }
  }

  /**
   * Send a message to the server
   */
  send(message: OutgoingMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }

    console.log('Sending WebSocket message:', message);
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Register a message handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * Close the connection
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
```

**How to use this:**
```typescript
// In a component:
const ws = new GameWebSocket('some-game-id');

// Connect
await ws.connect();

// Listen for messages
ws.onMessage((message) => {
  if (message.type === 'buzz_result') {
    console.log('Someone buzzed!', message.player_number);
  }
});

// Send a buzz
ws.send({
  type: 'buzz',
  player_number: 1,
  timestamp: Date.now()
});

// Clean up
ws.close();
```

---

## Step 9: Create Utility Functions

Create `src/utils/formatters.ts`:

```typescript
/**
 * Utility functions for formatting data
 */

/**
 * Format currency value
 * Example: 200 → "$200"
 */
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

/**
 * Format episode display
 * Example: season=1, episode=5 → "S1E5"
 */
export function formatEpisodeDisplay(season: number, episode: number): string {
  return `S${season}E${episode}`;
}

/**
 * Format date
 * Example: "2024-01-15" → "January 15, 2024"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Calculate position from category/clue indices
 * Example: category=2, clue=3 → 13 (third clue in third category)
 */
export function calculateCluePosition(categoryIndex: number, clueIndex: number): number {
  return categoryIndex * 5 + clueIndex;
}

/**
 * Get category index from clue position
 * Example: position=13 → category=2
 */
export function getCategoryFromPosition(position: number): number {
  return Math.floor(position / 5);
}

/**
 * Get clue value from position
 * Example: position=0 → $200 (first row)
 *          position=4 → $1000 (last row of single jeopardy)
 */
export function getClueValue(position: number, round: 'single' | 'double'): number {
  const row = position % 5;
  const baseValue = round === 'single' ? 200 : 400;
  return baseValue * (row + 1);
}

/**
 * Get player color for UI
 */
export function getPlayerColor(playerNumber: number): string {
  const colors = {
    1: '#3498db',  // Blue
    2: '#e74c3c',  // Red
    3: '#f39c12',  // Orange
  };
  return colors[playerNumber as keyof typeof colors] || '#95a5a6';
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
```

---

## Checkpoint: Part B Complete! ✅

You now have:
- ✅ TypeScript type definitions for all data structures
- ✅ API service for REST calls
- ✅ WebSocket service for real-time communication
- ✅ Utility functions for formatting

**File structure so far:**
```
frontend/
└─ src/
   ├─ types/
   │  ├─ Episode.ts
   │  ├─ Game.ts
   │  └─ WebSocket.ts
   ├─ services/
   │  ├─ api.ts
   │  └─ websocket.ts
   └─ utils/
      └─ formatters.ts
```

**Next:** Part C - We'll build the Board interface (the coolest part!).

---

# Part C: Board Interface - The Game Display

The Board is what the audience sees - a 6x5 grid of clues that get revealed throughout the game.

## Step 10: Install React Router

We need routing to handle different URLs (/board, /host, /player):

```bash
npm install react-router-dom
```

---

## Step 11: Create Basic Layout Components

### Header Component

Create `src/components/Header/Header.tsx`:

```typescript
import './Header.css';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="header">
      <h1 className="header-title">{title}</h1>
      {subtitle && <p className="header-subtitle">{subtitle}</p>}
    </header>
  );
}
```

Create `src/components/Header/Header.css`:

```css
.header {
  background: linear-gradient(135deg, #0066cc, #004999);
  color: white;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.header-title {
  margin: 0;
  font-size: 3rem;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.header-subtitle {
  margin: 0.5rem 0 0 0;
  font-size: 1.2rem;
  opacity: 0.9;
}
```

---

### ScoreDisplay Component

Create `src/components/ScoreDisplay/ScoreDisplay.tsx`:

```typescript
import { getPlayerColor } from '../../utils/formatters';
import './ScoreDisplay.css';

interface ScoreDisplayProps {
  scores: { [playerNumber: number]: number };
  playerNames?: { [playerNumber: number]: string };
}

export function ScoreDisplay({ scores, playerNames = {} }: ScoreDisplayProps) {
  const playerNumbers = Object.keys(scores).map(Number).sort();

  return (
    <div className="score-display">
      {playerNumbers.map(playerNum => (
        <div
          key={playerNum}
          className="score-item"
          style={{ borderLeftColor: getPlayerColor(playerNum) }}
        >
          <div className="player-name">
            {playerNames[playerNum] || `Player ${playerNum}`}
          </div>
          <div className="player-score">
            ${scores[playerNum].toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
```

Create `src/components/ScoreDisplay/ScoreDisplay.css`:

```css
.score-display {
  display: flex;
  justify-content: center;
  gap: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 1rem 0;
}

.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 2rem;
  background: white;
  border-radius: 8px;
  border-left: 4px solid;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 150px;
}

.player-name {
  font-size: 1rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.player-score {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
}
```

---

## Step 12: Build the Board Component

This is the heart of the interface - the 6x5 grid of clues!

### ClueCard Component

Create `src/components/Board/ClueCard.tsx`:

```typescript
import { formatCurrency } from '../../utils/formatters';
import './ClueCard.css';

interface ClueCardProps {
  value: number;
  isRevealed: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function ClueCard({ value, isRevealed, onClick, disabled = false }: ClueCardProps) {
  return (
    <button
      className={`clue-card ${isRevealed ? 'revealed' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled || isRevealed}
    >
      {!isRevealed && (
        <span className="clue-value">{formatCurrency(value)}</span>
      )}
    </button>
  );
}
```

Create `src/components/Board/ClueCard.css`:

```css
.clue-card {
  aspect-ratio: 1.5 / 1;
  background: linear-gradient(135deg, #0066cc, #0052a3);
  border: 3px solid #003d7a;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  font-family: 'Arial Black', sans-serif;
  color: #ffd700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.clue-card:not(.revealed):not(.disabled):hover {
  transform: scale(1.05);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  border-color: #ffd700;
}

.clue-card:not(.revealed):not(.disabled):active {
  transform: scale(0.98);
}

.clue-card.revealed {
  background: #1a1a1a;
  border-color: #333;
  cursor: default;
}

.clue-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clue-value {
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

/* Responsive font size */
@media (max-width: 1200px) {
  .clue-value {
    font-size: 1.5rem;
  }
}

@media (max-width: 768px) {
  .clue-value {
    font-size: 1.2rem;
  }
}
```

---

### Board Component

Create `src/components/Board/Board.tsx`:

```typescript
import { Category, Clue } from '../../types/Episode';
import { ClueCard } from './ClueCard';
import { getClueValue } from '../../utils/formatters';
import './Board.css';

interface BoardProps {
  categories: Category[];
  revealedClues: number[];
  onClueClick: (clue: Clue) => void;
  round: 'single' | 'double';
  disabled?: boolean;
}

export function Board({
  categories,
  revealedClues,
  onClueClick,
  round,
  disabled = false
}: BoardProps) {
  // Sort categories by position
  const sortedCategories = [...categories].sort((a, b) => a.position - b.position);

  return (
    <div className="board-container">
      {/* Category headers */}
      <div className="category-row">
        {sortedCategories.map(category => (
          <div key={category.id} className="category-header">
            {category.name}
          </div>
        ))}
      </div>

      {/* Clue grid - 5 rows */}
      {[0, 1, 2, 3, 4].map(row => (
        <div key={row} className="clue-row">
          {sortedCategories.map(category => {
            // Find the clue at this position
            const clue = category.clues.find(c => c.position === row);

            if (!clue) {
              // No clue at this position (shouldn't happen)
              return <div key={`${category.id}-${row}`} className="clue-card empty" />;
            }

            const isRevealed = revealedClues.includes(clue.id);
            const value = getClueValue(row, round);

            return (
              <ClueCard
                key={clue.id}
                value={value}
                isRevealed={isRevealed}
                onClick={() => onClueClick(clue)}
                disabled={disabled}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

Create `src/components/Board/Board.css`:

```css
.board-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.category-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.category-header {
  background: linear-gradient(135deg, #0066cc, #004999);
  color: white;
  padding: 1.5rem 0.5rem;
  text-align: center;
  font-weight: bold;
  font-size: 1rem;
  border-radius: 8px;
  text-transform: uppercase;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clue-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.clue-card.empty {
  background: #e0e0e0;
  cursor: default;
}

/* Responsive design */
@media (max-width: 1200px) {
  .board-container {
    padding: 1rem;
  }

  .category-header {
    font-size: 0.9rem;
    padding: 1rem 0.5rem;
    min-height: 60px;
  }
}

@media (max-width: 768px) {
  .board-container {
    padding: 0.5rem;
  }

  .category-row,
  .clue-row {
    gap: 0.25rem;
  }

  .category-header {
    font-size: 0.7rem;
    padding: 0.5rem 0.25rem;
    min-height: 50px;
  }
}
```

---

## Step 13: Create Clue Modal

When a clue is clicked, show it full-screen.

Create `src/components/Board/ClueModal.tsx`:

```typescript
import { Clue } from '../../types/Episode';
import { formatCurrency } from '../../utils/formatters';
import './ClueModal.css';

interface ClueModalProps {
  clue: Clue | null;
  onClose: () => void;
  showAnswer?: boolean;
}

export function ClueModal({ clue, onClose, showAnswer = false }: ClueModalProps) {
  if (!clue) return null;

  return (
    <div className="clue-modal-overlay" onClick={onClose}>
      <div className="clue-modal" onClick={(e) => e.stopPropagation()}>
        <div className="clue-value-header">
          {formatCurrency(clue.value)}
        </div>

        <div className="clue-content">
          <div className="clue-question">
            {clue.question}
          </div>

          {showAnswer && (
            <div className="clue-answer">
              <div className="answer-label">Answer:</div>
              <div className="answer-text">{clue.answer}</div>
            </div>
          )}
        </div>

        {clue.is_daily_double && (
          <div className="daily-double-indicator">
            DAILY DOUBLE
          </div>
        )}

        <button className="close-button" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}
```

Create `src/components/Board/ClueModal.css`:

```css
.clue-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.clue-modal {
  background: #0066cc;
  border: 8px solid #ffd700;
  border-radius: 12px;
  width: 90%;
  max-width: 1000px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: scale(0.9);
  }
  to {
    transform: scale(1);
  }
}

.clue-value-header {
  background: #ffd700;
  color: #000;
  font-size: 3rem;
  font-weight: bold;
  text-align: center;
  padding: 1rem;
  border-radius: 4px 4px 0 0;
}

.clue-content {
  flex: 1;
  padding: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
}

.clue-question {
  color: white;
  font-size: 2.5rem;
  text-align: center;
  font-family: 'Arial', sans-serif;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  line-height: 1.4;
  margin-bottom: 2rem;
}

.clue-answer {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid rgba(255, 255, 255, 0.3);
  text-align: center;
  width: 100%;
}

.answer-label {
  color: #ffd700;
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.answer-text {
  color: white;
  font-size: 2rem;
  font-style: italic;
}

.daily-double-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #e74c3c;
  color: white;
  font-size: 4rem;
  font-weight: bold;
  padding: 2rem 4rem;
  border-radius: 12px;
  border: 4px solid white;
  box-shadow: 0 0 30px rgba(231, 76, 60, 0.8);
  animation: pulse 1s infinite;
  pointer-events: none;
}

@keyframes pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.05);
  }
}

.close-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid white;
  color: white;
  font-size: 2rem;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

/* Responsive */
@media (max-width: 768px) {
  .clue-value-header {
    font-size: 2rem;
    padding: 0.75rem;
  }

  .clue-question {
    font-size: 1.5rem;
    padding: 1.5rem;
  }

  .answer-label {
    font-size: 1.2rem;
  }

  .answer-text {
    font-size: 1.5rem;
  }

  .daily-double-indicator {
    font-size: 2rem;
    padding: 1rem 2rem;
  }
}
```

---

## Checkpoint: Part C Progress ✅

We've built the core Board components:
- ✅ Header component
- ✅ ScoreDisplay component
- ✅ ClueCard component (individual clue tile)
- ✅ Board component (6x5 grid)
- ✅ ClueModal component (full-screen clue display)

**Next section:** We'll create the BoardView page that puts all these together and connects to WebSocket!

---

*This guide continues in the next message - we still need to cover:*
- Part D: Player Interface
- Part E: Host Interface
- Part F: Integration & Routing

Would you like me to continue with the rest of Phase 3? This is a LOT of content, so I'm checking in!
