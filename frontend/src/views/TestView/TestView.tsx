import { useState } from 'react';
import { Header } from '../../components/Header/Header';
import { ScoreDisplay } from '../../components/ScoreDisplay/ScoreDisplay';
import { Board } from '../../components/Board/Board';
import { ClueModal } from '../../components/Board/ClueModal';
import type { Category, Clue } from '../../types/Episode';

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
      { id: 3, question: 'This planet is known as the Red Planet', answer: 'What is Mars?', value: 600, position: 2, is_daily_double: true },
      { id: 4, question: 'H2O is the chemical formula for this', answer: 'What is Water?', value: 800, position: 3, is_daily_double: false },
      { id: 5, question: 'The study of living organisms', answer: 'What is Biology?', value: 1000, position: 4, is_daily_double: false },
    ]
  },
  {
    id: 2,
    name: 'HISTORY',
    round_type: 'single',
    position: 1,
    clues: [
      { id: 6, question: 'Year the Declaration of Independence was signed', answer: 'What is 1776?', value: 200, position: 0, is_daily_double: false },
      { id: 7, question: 'First President of the United States', answer: 'Who is George Washington?', value: 400, position: 1, is_daily_double: false },
      { id: 8, question: 'This wall fell in 1989', answer: 'What is the Berlin Wall?', value: 600, position: 2, is_daily_double: false },
      { id: 9, question: 'Ancient wonder in Egypt', answer: 'What are the Pyramids?', value: 800, position: 3, is_daily_double: false },
      { id: 10, question: 'Roman emperor when Jesus was born', answer: 'Who is Augustus?', value: 1000, position: 4, is_daily_double: false },
    ]
  },
  {
    id: 3,
    name: 'GEOGRAPHY',
    round_type: 'single',
    position: 2,
    clues: [
      { id: 11, question: 'Capital of France', answer: 'What is Paris?', value: 200, position: 0, is_daily_double: false },
      { id: 12, question: 'Longest river in the world', answer: 'What is the Nile?', value: 400, position: 1, is_daily_double: false },
      { id: 13, question: 'Largest ocean on Earth', answer: 'What is the Pacific?', value: 600, position: 2, is_daily_double: false },
      { id: 14, question: 'Number of continents', answer: 'What is seven?', value: 800, position: 3, is_daily_double: false },
      { id: 15, question: 'Tallest mountain in the world', answer: 'What is Mount Everest?', value: 1000, position: 4, is_daily_double: false },
    ]
  },
  {
    id: 4,
    name: 'LITERATURE',
    round_type: 'single',
    position: 3,
    clues: [
      { id: 16, question: 'Author of Harry Potter series', answer: 'Who is J.K. Rowling?', value: 200, position: 0, is_daily_double: false },
      { id: 17, question: 'Shakespeare\'s tragic prince of Denmark', answer: 'Who is Hamlet?', value: 400, position: 1, is_daily_double: false },
      { id: 18, question: 'Novel about a white whale', answer: 'What is Moby Dick?', value: 600, position: 2, is_daily_double: false },
      { id: 19, question: 'Greek epic about the Trojan War', answer: 'What is the Iliad?', value: 800, position: 3, is_daily_double: false },
      { id: 20, question: 'Dickens novel with Pip as protagonist', answer: 'What is Great Expectations?', value: 1000, position: 4, is_daily_double: false },
    ]
  },
  {
    id: 5,
    name: 'SPORTS',
    round_type: 'single',
    position: 4,
    clues: [
      { id: 21, question: 'Number of players on a baseball team', answer: 'What is nine?', value: 200, position: 0, is_daily_double: false },
      { id: 22, question: 'Sport with love, deuce, and ace', answer: 'What is Tennis?', value: 400, position: 1, is_daily_double: false },
      { id: 23, question: 'The Olympics are held every this many years', answer: 'What is four?', value: 600, position: 2, is_daily_double: false },
      { id: 24, question: 'Country that hosted 2016 Summer Olympics', answer: 'What is Brazil?', value: 800, position: 3, is_daily_double: false },
      { id: 25, question: 'Golf tournament held at Augusta', answer: 'What is The Masters?', value: 1000, position: 4, is_daily_double: false },
    ]
  },
  {
    id: 6,
    name: 'MOVIES',
    round_type: 'single',
    position: 5,
    clues: [
      { id: 26, question: 'Film with "I\'ll be back"', answer: 'What is The Terminator?', value: 200, position: 0, is_daily_double: false },
      { id: 27, question: 'Director of Jaws and E.T.', answer: 'Who is Steven Spielberg?', value: 400, position: 1, is_daily_double: false },
      { id: 28, question: 'Highest-grossing film of all time', answer: 'What is Avatar?', value: 600, position: 2, is_daily_double: false },
      { id: 29, question: 'Film where Jack freezes in the ocean', answer: 'What is Titanic?', value: 800, position: 3, is_daily_double: false },
      { id: 30, question: 'Wizard who lives at Hogwarts', answer: 'Who is Harry Potter?', value: 1000, position: 4, is_daily_double: false },
    ]
  },
];

export function TestView() {
  const [revealedClues, setRevealedClues] = useState<number[]>([]);
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const scores = {
    1: 2400,
    2: -800,
    3: 1600,
  };

  const playerNames = {
    1: 'Alice',
    2: 'Bob',
    3: 'Charlie',
  };

  const handleClueClick = (clue: Clue) => {
    setSelectedClue(clue);
    setShowAnswer(false);
  };

  const handleCloseModal = () => {
    if (selectedClue) {
      setRevealedClues([...revealedClues, selectedClue.id]);
    }
    setSelectedClue(null);
    setShowAnswer(false);
  };

  const handleToggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f0f0' }}>
      <Header title="JEOPARDY!" subtitle="Test View - Board Components" />

      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <ScoreDisplay scores={scores} playerNames={playerNames} />

        <div style={{ margin: '2rem 0', textAlign: 'center' }}>
          <p style={{ fontSize: '1.2rem', color: '#666' }}>
            Click a clue to see the modal. Click the modal background or X to close.
          </p>
          {selectedClue && (
            <button
              onClick={handleToggleAnswer}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                fontSize: '1rem',
                background: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {showAnswer ? 'Hide Answer' : 'Show Answer'}
            </button>
          )}
        </div>

        <Board
          categories={mockCategories}
          revealedClues={revealedClues}
          onClueClick={handleClueClick}
          round="single"
        />
      </div>

      <ClueModal
        clue={selectedClue}
        onClose={handleCloseModal}
        showAnswer={showAnswer}
      />
    </div>
  );
}
