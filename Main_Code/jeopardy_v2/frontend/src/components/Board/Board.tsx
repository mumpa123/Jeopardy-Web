import type { Category, Clue } from '../../types/Episode';
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
