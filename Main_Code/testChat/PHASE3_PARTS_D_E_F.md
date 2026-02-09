# Phase 3 Parts D, E, F - Player & Host Interfaces

This guide continues from Parts A, B, and C which covered project setup, foundation code, and board interface.

---

## Part D: Player Interface

The Player Interface allows players to:
- See their name and score
- Buzz in when a clue is read
- Submit wagers for Daily Doubles and Final Jeopardy
- Submit answers
- See their buzz status and feedback

### Step 1: Create Player Components Directory

```bash
mkdir -p src/components/Player
```

### Step 2: Create BuzzButton Component

Create `src/components/Player/BuzzButton.tsx`:

```typescript
interface BuzzButtonProps {
  onBuzz: () => void;
  disabled: boolean;
  buzzed: boolean;
}

export function BuzzButton({ onBuzz, disabled, buzzed }: BuzzButtonProps) {
  return (
    <button
      className={`buzz-button ${buzzed ? 'buzzed' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={onBuzz}
      disabled={disabled}
    >
      {buzzed ? 'BUZZED!' : 'BUZZ!'}
    </button>
  );
}
```

Create `src/components/Player/BuzzButton.css`:

```css
.buzz-button {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  font-size: 2rem;
  font-weight: bold;
  border: 8px solid #333;
  cursor: pointer;
  transition: all 0.2s;
  background-image: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.buzz-button:not(.disabled):hover {
  transform: scale(1.05);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
}

.buzz-button:not(.disabled):active {
  transform: scale(0.95);
}

.buzz-button.buzzed {
  background-image: linear-gradient(135deg, #27ae60, #229954);
  animation: pulse 0.5s ease;
}

.buzz-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-image: linear-gradient(135deg, #7f8c8d, #95a5a6);
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@media (max-width: 768px) {
  .buzz-button {
    width: 150px;
    height: 150px;
    font-size: 1.5rem;
  }
}
```

### Step 3: Create WagerInput Component

Create `src/components/Player/WagerInput.tsx`:

```typescript
import { useState } from 'react';
import './WagerInput.css';

interface WagerInputProps {
  maxWager: number;
  onSubmit: (wager: number) => void;
  disabled: boolean;
}

export function WagerInput({ maxWager, onSubmit, disabled }: WagerInputProps) {
  const [wager, setWager] = useState<string>('');

  const handleSubmit = () => {
    const wagerNum = parseInt(wager);
    if (wagerNum >= 0 && wagerNum <= maxWager) {
      onSubmit(wagerNum);
      setWager('');
    }
  };

  return (
    <div className="wager-input-container">
      <h2>Enter Your Wager</h2>
      <p className="wager-max">Maximum: ${maxWager.toLocaleString()}</p>
      <input
        type="number"
        className="wager-input"
        value={wager}
        onChange={(e) => setWager(e.target.value)}
        min={0}
        max={maxWager}
        disabled={disabled}
        placeholder="Enter amount"
      />
      <button
        className="wager-submit-button"
        onClick={handleSubmit}
        disabled={disabled || !wager || parseInt(wager) > maxWager}
      >
        Submit Wager
      </button>
    </div>
  );
}
```

Create `src/components/Player/WagerInput.css`:

```css
.wager-input-container {
  background-image: linear-gradient(to right, rgb(1, 27, 172), rgb(0, 19, 150));
  padding: 2rem;
  border-radius: 12px;
  border: 4px solid black;
  text-align: center;
  max-width: 400px;
  margin: 2rem auto;
}

.wager-input-container h2 {
  color: white;
  font-family: 'Impact', sans-serif;
  font-size: 2rem;
  margin-bottom: 1rem;
}

.wager-max {
  color: rgb(245, 173, 63);
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
}

.wager-input {
  width: 100%;
  padding: 1rem;
  font-size: 1.5rem;
  text-align: center;
  border: 3px solid black;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.wager-submit-button {
  width: 100%;
  padding: 1rem;
  font-size: 1.2rem;
  font-weight: bold;
  background-image: linear-gradient(135deg, #27ae60, #229954);
  color: white;
  border: 3px solid black;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.wager-submit-button:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.wager-submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-image: linear-gradient(135deg, #7f8c8d, #95a5a6);
}
```

### Step 4: Create AnswerInput Component

Create `src/components/Player/AnswerInput.tsx`:

```typescript
import { useState } from 'react';
import './AnswerInput.css';

interface AnswerInputProps {
  onSubmit: (answer: string) => void;
  disabled: boolean;
}

export function AnswerInput({ onSubmit, disabled }: AnswerInputProps) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    if (answer.trim()) {
      onSubmit(answer.trim());
      setAnswer('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled) {
      handleSubmit();
    }
  };

  return (
    <div className="answer-input-container">
      <h3>Your Answer:</h3>
      <input
        type="text"
        className="answer-input"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={disabled}
        placeholder="What is...?"
        autoFocus
      />
      <button
        className="answer-submit-button"
        onClick={handleSubmit}
        disabled={disabled || !answer.trim()}
      >
        Submit Answer
      </button>
    </div>
  );
}
```

Create `src/components/Player/AnswerInput.css`:

```css
.answer-input-container {
  background-image: linear-gradient(to right, rgb(1, 27, 172), rgb(0, 19, 150));
  padding: 2rem;
  border-radius: 12px;
  border: 4px solid black;
  max-width: 600px;
  margin: 2rem auto;
}

.answer-input-container h3 {
  color: white;
  font-family: 'Impact', sans-serif;
  font-size: 1.5rem;
  margin-bottom: 1rem;
  text-align: center;
}

.answer-input {
  width: 100%;
  padding: 1rem;
  font-size: 1.3rem;
  border: 3px solid black;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.answer-submit-button {
  width: 100%;
  padding: 1rem;
  font-size: 1.2rem;
  font-weight: bold;
  background-image: linear-gradient(135deg, #27ae60, #229954);
  color: white;
  border: 3px solid black;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.answer-submit-button:hover:not(:disabled) {
  transform: scale(1.02);
}

.answer-submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-image: linear-gradient(135deg, #7f8c8d, #95a5a6);
}
```

### Step 5: Create PlayerView

Create `src/views/PlayerView/PlayerView.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../../components/Header/Header';
import { BuzzButton } from '../../components/Player/BuzzButton';
import { WagerInput } from '../../components/Player/WagerInput';
import { AnswerInput } from '../../components/Player/AnswerInput';
import './PlayerView.css';

export function PlayerView() {
  const { playerName, playerNumber } = useParams<{ playerName: string; playerNumber: string }>();
  const [score, setScore] = useState(0);
  const [canBuzz, setCanBuzz] = useState(false);
  const [buzzed, setBuzzed] = useState(false);
  const [showWagerInput, setShowWagerInput] = useState(false);
  const [showAnswerInput, setShowAnswerInput] = useState(false);
  const [currentClue, setCurrentClue] = useState<string>('');
  const [status, setStatus] = useState('Waiting for game to start...');

  const handleBuzz = () => {
    if (canBuzz && !buzzed) {
      setBuzzed(true);
      setCanBuzz(false);
      // TODO: Send buzz via WebSocket
      console.log('Player buzzed!');
    }
  };

  const handleWagerSubmit = (wager: number) => {
    // TODO: Send wager via WebSocket
    console.log('Wager submitted:', wager);
    setShowWagerInput(false);
    setShowAnswerInput(true);
  };

  const handleAnswerSubmit = (answer: string) => {
    // TODO: Send answer via WebSocket
    console.log('Answer submitted:', answer);
    setShowAnswerInput(false);
  };

  return (
    <div className="player-view">
      <Header title={`Player: ${playerName || 'Unknown'}`} subtitle={`Player ${playerNumber}`} />

      <div className="player-content">
        {/* Player Score */}
        <div className="player-score-display">
          <h2>Your Score</h2>
          <div className="player-score">${score.toLocaleString()}</div>
        </div>

        {/* Game Status */}
        <div className="player-status">
          <p>{status}</p>
        </div>

        {/* Current Clue (if active) */}
        {currentClue && (
          <div className="current-clue-display">
            <p>{currentClue}</p>
          </div>
        )}

        {/* Buzz Button */}
        {!showWagerInput && !showAnswerInput && (
          <div className="buzz-container">
            <BuzzButton
              onBuzz={handleBuzz}
              disabled={!canBuzz}
              buzzed={buzzed}
            />
          </div>
        )}

        {/* Wager Input (Daily Double / Final Jeopardy) */}
        {showWagerInput && (
          <WagerInput
            maxWager={Math.max(1000, score)}
            onSubmit={handleWagerSubmit}
            disabled={false}
          />
        )}

        {/* Answer Input */}
        {showAnswerInput && (
          <AnswerInput
            onSubmit={handleAnswerSubmit}
            disabled={false}
          />
        )}
      </div>
    </div>
  );
}
```

Create `src/views/PlayerView/PlayerView.css`:

```css
.player-view {
  min-height: 100vh;
  background-color: gray;
}

.player-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.player-score-display {
  background-image: linear-gradient(to right, rgb(1, 27, 172), rgb(0, 19, 150));
  border: 4px solid black;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  margin-bottom: 2rem;
}

.player-score-display h2 {
  color: white;
  font-family: 'Impact', sans-serif;
  font-size: 2rem;
  margin-bottom: 1rem;
}

.player-score {
  color: rgb(245, 173, 63);
  font-size: 4rem;
  font-weight: bold;
  font-family: 'Arial Black', sans-serif;
  text-shadow: 2px 4px 4px black;
}

.player-status {
  background: white;
  border: 3px solid black;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  margin-bottom: 2rem;
  font-size: 1.2rem;
  font-weight: bold;
}

.current-clue-display {
  background-image: linear-gradient(to right, rgb(1, 27, 172), rgb(0, 19, 150));
  border: 4px solid black;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  color: white;
  font-size: 1.5rem;
  text-align: center;
  line-height: 1.6;
}

.buzz-container {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
}
```

---

## Part E: Host Interface

The Host Interface allows the host to:
- Select clues
- Read clues to players
- Judge answers as correct/incorrect
- Manage scores
- Control game flow and round transitions

### Step 1: Create Host Components Directory

```bash
mkdir -p src/components/Host
```

### Step 2: Create ControlPanel Component

Create `src/components/Host/ControlPanel.tsx`:

```typescript
import './ControlPanel.css';

interface ControlPanelProps {
  onStartRound: (round: 'single' | 'double' | 'final') => void;
  onReadClue: () => void;
  onNextClue: () => void;
  currentRound: string;
  clueSelected: boolean;
  clueRead: boolean;
}

export function ControlPanel({
  onStartRound,
  onReadClue,
  onNextClue,
  currentRound,
  clueSelected,
  clueRead
}: ControlPanelProps) {
  return (
    <div className="control-panel">
      <h2>Host Controls</h2>

      <div className="control-section">
        <h3>Round Controls</h3>
        <div className="button-row">
          <button
            className="control-button round-button"
            onClick={() => onStartRound('single')}
            disabled={currentRound === 'single'}
          >
            Single Jeopardy
          </button>
          <button
            className="control-button round-button"
            onClick={() => onStartRound('double')}
            disabled={currentRound === 'double' || currentRound === ''}
          >
            Double Jeopardy
          </button>
          <button
            className="control-button round-button"
            onClick={() => onStartRound('final')}
            disabled={currentRound === 'final' || currentRound === ''}
          >
            Final Jeopardy
          </button>
        </div>
      </div>

      <div className="control-section">
        <h3>Clue Controls</h3>
        <div className="button-column">
          <button
            className="control-button clue-button"
            onClick={onReadClue}
            disabled={!clueSelected || clueRead}
          >
            Read Clue (Enable Buzzing)
          </button>
          <button
            className="control-button next-button"
            onClick={onNextClue}
            disabled={!clueSelected}
          >
            Next Clue (Return to Board)
          </button>
        </div>
      </div>
    </div>
  );
}
```

Create `src/components/Host/ControlPanel.css`:

```css
.control-panel {
  background-image: linear-gradient(to right, rgb(1, 27, 172), rgb(0, 19, 150));
  border: 4px solid black;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.control-panel h2 {
  color: white;
  font-family: 'Impact', sans-serif;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  text-align: center;
}

.control-section {
  margin-bottom: 1.5rem;
}

.control-section h3 {
  color: rgb(245, 173, 63);
  font-size: 1.2rem;
  margin-bottom: 0.8rem;
  font-weight: bold;
}

.button-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.button-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-button {
  padding: 0.8rem 1.2rem;
  font-size: 1rem;
  font-weight: bold;
  border: 3px solid black;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
}

.round-button {
  flex: 1;
  min-width: 120px;
  background-image: linear-gradient(135deg, #3498db, #2980b9);
}

.clue-button {
  background-image: linear-gradient(135deg, #27ae60, #229954);
}

.next-button {
  background-image: linear-gradient(135deg, #e67e22, #d35400);
}

.control-button:hover:not(:disabled) {
  transform: scale(1.02);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-image: linear-gradient(135deg, #7f8c8d, #95a5a6);
}
```

### Step 3: Create ScoreManager Component

Create `src/components/Host/ScoreManager.tsx`:

```typescript
import './ScoreManager.css';

interface Player {
  number: number;
  name: string;
  score: number;
}

interface ScoreManagerProps {
  players: Player[];
  onScoreChange: (playerNumber: number, change: number) => void;
  currentValue: number;
}

export function ScoreManager({ players, onScoreChange, currentValue }: ScoreManagerProps) {
  return (
    <div className="score-manager">
      <h2>Score Management</h2>
      <p className="current-value">Current Value: ${currentValue}</p>

      <div className="players-grid">
        {players.map((player) => (
          <div key={player.number} className="player-score-card">
            <h3>{player.name}</h3>
            <div className="score-display">${player.score.toLocaleString()}</div>
            <div className="score-buttons">
              <button
                className="score-btn correct-btn"
                onClick={() => onScoreChange(player.number, currentValue)}
              >
                Correct (+${currentValue})
              </button>
              <button
                className="score-btn incorrect-btn"
                onClick={() => onScoreChange(player.number, -currentValue)}
              >
                Incorrect (-${currentValue})
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Create `src/components/Host/ScoreManager.css`:

```css
.score-manager {
  background: white;
  border: 4px solid black;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.score-manager h2 {
  font-family: 'Impact', sans-serif;
  font-size: 1.8rem;
  margin-bottom: 1rem;
  text-align: center;
}

.current-value {
  text-align: center;
  font-size: 1.5rem;
  font-weight: bold;
  color: rgb(1, 27, 172);
  margin-bottom: 1.5rem;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.player-score-card {
  background-image: linear-gradient(to right, rgb(1, 27, 172), rgb(0, 19, 150));
  border: 3px solid black;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.player-score-card h3 {
  color: white;
  font-size: 1.3rem;
  margin-bottom: 0.5rem;
}

.score-display {
  color: rgb(245, 173, 63);
  font-size: 2rem;
  font-weight: bold;
  font-family: 'Arial Black', sans-serif;
  text-shadow: 2px 2px 4px black;
  margin-bottom: 1rem;
}

.score-buttons {
  display: flex;
  gap: 0.5rem;
}

.score-btn {
  flex: 1;
  padding: 0.8rem;
  font-size: 0.9rem;
  font-weight: bold;
  border: 2px solid black;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
}

.correct-btn {
  background-image: linear-gradient(135deg, #27ae60, #229954);
}

.incorrect-btn {
  background-image: linear-gradient(135deg, #e74c3c, #c0392b);
}

.score-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}
```

### Step 4: Create HostView

Create `src/views/HostView/HostView.tsx`:

```typescript
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../../components/Header/Header';
import { Board } from '../../components/Board/Board';
import { ClueModal } from '../../components/Board/ClueModal';
import { ControlPanel } from '../../components/Host/ControlPanel';
import { ScoreManager } from '../../components/Host/ScoreManager';
import type { Category, Clue } from '../../types/Episode';
import './HostView.css';

// Mock data for testing
const mockCategories: Category[] = [
  {
    id: 1,
    name: 'SCIENCE',
    round_type: 'single',
    position: 0,
    clues: [
      { id: 1, question: 'This element has the symbol Au', answer: 'What is Gold?', value: 200, position: 0, is_daily_double: false },
      { id: 2, question: 'The powerhouse of the cell', answer: 'What is Mitochondria?', value: 400, position: 1, is_daily_double: false },
      { id: 3, question: 'This planet is known as the Red Planet', answer: 'What is Mars?', value: 600, position: 2, is_daily_double: false },
      { id: 4, question: 'H2O is the chemical formula for this', answer: 'What is Water?', value: 800, position: 3, is_daily_double: false },
      { id: 5, question: 'The study of living organisms', answer: 'What is Biology?', value: 1000, position: 4, is_daily_double: false },
    ]
  },
  // Add more categories...
];

export function HostView() {
  const { season, episode } = useParams<{ season: string; episode: string }>();
  const [currentRound, setCurrentRound] = useState<'single' | 'double' | 'final' | ''>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [revealedClues, setRevealedClues] = useState<number[]>([]);
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [clueRead, setClueRead] = useState(false);

  const [players, setPlayers] = useState([
    { number: 1, name: 'Alice', score: 0 },
    { number: 2, name: 'Bob', score: 0 },
    { number: 3, name: 'Charlie', score: 0 },
  ]);

  const handleStartRound = (round: 'single' | 'double' | 'final') => {
    setCurrentRound(round);
    // TODO: Load episode data for this round
    setCategories(mockCategories);
    setRevealedClues([]);
  };

  const handleClueClick = (clue: Clue) => {
    setSelectedClue(clue);
    setShowAnswer(false);
    setClueRead(false);
  };

  const handleReadClue = () => {
    setClueRead(true);
    // TODO: Send message via WebSocket to enable buzzing
  };

  const handleNextClue = () => {
    if (selectedClue) {
      setRevealedClues([...revealedClues, selectedClue.id]);
    }
    setSelectedClue(null);
    setShowAnswer(false);
    setClueRead(false);
  };

  const handleScoreChange = (playerNumber: number, change: number) => {
    setPlayers(players.map(p =>
      p.number === playerNumber
        ? { ...p, score: p.score + change }
        : p
    ));
    // TODO: Send score update via WebSocket
  };

  const handleToggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  return (
    <div className="host-view">
      <Header title={`Host: Season ${season} Episode ${episode}`} />

      <div className="host-content">
        <div className="host-left-panel">
          <ControlPanel
            onStartRound={handleStartRound}
            onReadClue={handleReadClue}
            onNextClue={handleNextClue}
            currentRound={currentRound}
            clueSelected={selectedClue !== null}
            clueRead={clueRead}
          />

          <ScoreManager
            players={players}
            onScoreChange={handleScoreChange}
            currentValue={selectedClue?.value || 0}
          />

          {selectedClue && (
            <div className="answer-reveal-section">
              <button
                className="reveal-answer-btn"
                onClick={handleToggleAnswer}
              >
                {showAnswer ? 'Hide Answer' : 'Show Answer'}
              </button>
            </div>
          )}
        </div>

        <div className="host-board-section">
          {categories.length > 0 && (
            <Board
              categories={categories}
              revealedClues={revealedClues}
              onClueClick={handleClueClick}
              round={currentRound as 'single' | 'double'}
              disabled={selectedClue !== null}
            />
          )}
        </div>
      </div>

      <ClueModal
        clue={selectedClue}
        onClose={handleNextClue}
        showAnswer={showAnswer}
      />
    </div>
  );
}
```

Create `src/views/HostView/HostView.css`:

```css
.host-view {
  min-height: 100vh;
  background-color: gray;
}

.host-content {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 1rem;
  padding: 1rem;
  max-width: 1800px;
  margin: 0 auto;
}

.host-left-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.host-board-section {
  min-height: 600px;
}

.answer-reveal-section {
  background: white;
  border: 4px solid black;
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
}

.reveal-answer-btn {
  width: 100%;
  padding: 1rem;
  font-size: 1.2rem;
  font-weight: bold;
  background-image: linear-gradient(135deg, #9b59b6, #8e44ad);
  color: white;
  border: 3px solid black;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.reveal-answer-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

@media (max-width: 1200px) {
  .host-content {
    grid-template-columns: 1fr;
  }
}
```

---

## Part F: Integration & Testing

### Step 1: Set Up Routing

First, install React Router if not already installed:

```bash
npm install react-router-dom
```

Update `src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

Update `src/App.tsx`:

```typescript
import { Routes, Route, Link } from 'react-router-dom';
import { TestView } from './views/TestView/TestView';
import { PlayerView } from './views/PlayerView/PlayerView';
import { HostView } from './views/HostView/HostView';
import { BoardView } from './views/BoardView/BoardView';

function Home() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Jeopardy! Game</h1>
      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        <Link to="/test" style={{ fontSize: '1.2rem', padding: '1rem 2rem', background: '#0066cc', color: 'white', textDecoration: 'none', borderRadius: '8px' }}>
          Test View (Board Components)
        </Link>
        <Link to="/host/1/1" style={{ fontSize: '1.2rem', padding: '1rem 2rem', background: '#27ae60', color: 'white', textDecoration: 'none', borderRadius: '8px' }}>
          Host Interface
        </Link>
        <Link to="/player/Alice/1" style={{ fontSize: '1.2rem', padding: '1rem 2rem', background: '#e74c3c', color: 'white', textDecoration: 'none', borderRadius: '8px' }}>
          Player 1 Interface
        </Link>
        <Link to="/board/1/1" style={{ fontSize: '1.2rem', padding: '1rem 2rem', background: '#9b59b6', color: 'white', textDecoration: 'none', borderRadius: '8px' }}>
          Board View
        </Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/test" element={<TestView />} />
      <Route path="/host/:season/:episode" element={<HostView />} />
      <Route path="/player/:playerName/:playerNumber" element={<PlayerView />} />
      <Route path="/board/:season/:episode" element={<BoardView />} />
    </Routes>
  );
}

export default App;
```

### Step 2: Create BoardView (Display-Only)

Create `src/views/BoardView/BoardView.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../../components/Header/Header';
import { ScoreDisplay } from '../../components/ScoreDisplay/ScoreDisplay';
import { Board } from '../../components/Board/Board';
import { ClueModal } from '../../components/Board/ClueModal';
import type { Category, Clue } from '../../types/Episode';
import './BoardView.css';

export function BoardView() {
  const { season, episode } = useParams<{ season: string; episode: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [revealedClues, setRevealedClues] = useState<number[]>([]);
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({});

  // TODO: Connect to WebSocket and listen for updates

  return (
    <div className="board-view">
      <Header title="JEOPARDY!" subtitle={`Season ${season} - Episode ${episode}`} />

      <div className="board-content">
        <ScoreDisplay scores={scores} playerNames={playerNames} />

        {categories.length > 0 && (
          <Board
            categories={categories}
            revealedClues={revealedClues}
            onClueClick={() => {}} // No-op - board is display-only
            round="single"
            disabled={true}
          />
        )}
      </div>

      <ClueModal
        clue={selectedClue}
        onClose={() => {}} // No-op - controlled by host
        showAnswer={showAnswer}
      />
    </div>
  );
}
```

Create `src/views/BoardView/BoardView.css`:

```css
.board-view {
  min-height: 100vh;
  background-color: gray;
}

.board-content {
  padding: 1rem;
  max-width: 1600px;
  margin: 0 auto;
}
```

### Step 3: Testing Checklist

Now test each interface:

**Test Board Components (http://localhost:5173/test):**
- ✓ Categories display with proper styling
- ✓ Clue cards show dollar amounts
- ✓ Clicking a clue opens the modal
- ✓ Answer can be shown/hidden
- ✓ Scores display correctly

**Test Host Interface (http://localhost:5173/host/1/1):**
- ✓ Round buttons work
- ✓ Board loads when round starts
- ✓ Clicking clue opens modal
- ✓ "Read Clue" button enables
- ✓ Score buttons modify player scores
- ✓ "Next Clue" returns to board and marks clue as revealed

**Test Player Interface (http://localhost:5173/player/Alice/1):**
- ✓ Player name and number display
- ✓ Score displays
- ✓ Buzz button renders
- ✓ Wager input appears (manually trigger for testing)
- ✓ Answer input appears (manually trigger for testing)

**Test Board View (http://localhost:5173/board/1/1):**
- ✓ Display-only (no interactions)
- ✓ Scores display
- ✓ Board renders

### Step 4: Next Steps for WebSocket Integration

In the next phase, you'll:

1. **Connect all views to WebSocket** - Use the `GameWebSocket` service we created
2. **Implement message handlers** - Each view listens for relevant messages
3. **Send actions via WebSocket** - Buzz, wagers, scores, etc.
4. **Synchronize state** - All three views stay in sync
5. **Test full game flow** - Host selects clue → Players buzz → Host judges → Scores update

### Step 5: Important Notes

**Styling Considerations:**
- All components use the classic Jeopardy color scheme (blue gradient `rgb(1,27,172)` to `rgb(0,19,150)`)
- Gold dollar amounts (`rgb(245,173,63)`) with black text shadow
- Impact font for headers
- Black borders and backgrounds
- The board is fullscreen-ready - just needs CSS adjustments for production

**Board View Behavior:**
- Should be display-only
- Controlled entirely by Host via WebSocket
- No clickable elements
- Updates automatically when host selects clues or updates scores

**Future Enhancements:**
- Add Daily Double handling
- Add Final Jeopardy workflow
- Add player ready/waiting states
- Add timer displays
- Add sound effects
- Add animations for reveals

---

## Summary

You've now created:
- **Part D**: Complete Player Interface with buzz button, wager input, and answer submission
- **Part E**: Complete Host Interface with control panel, score manager, and board integration
- **Part F**: Routing setup and integration framework

**What's Working:**
- All three role interfaces (Host, Player, Board)
- Basic game flow (select clue, buzz, judge, score)
- Classic Jeopardy styling throughout

**What's Next:**
- Connect WebSocket for real-time communication
- Integrate with backend API for episode data
- Add Daily Double and Final Jeopardy workflows
- Test complete multiplayer game flow
- Fine-tune styling and UX

The foundation is complete - you can now test the interfaces independently and verify the flow before adding WebSocket integration!
