import type { Category, Clue } from '../../types/Episode';
import { ClueCard } from './ClueCard';
import { getClueValue, cleanClueText } from '../../utils/formatters';
import './Board.css';

interface BoardProps {
  categories: Category[];
  revealedClues: number[];
  activeClueId?: number | null;
  buzzerEnabled?: boolean;
  onClueClick: (clue: Clue) => void;
  round: 'single' | 'double';
  disabled?: boolean;
}

export function Board({
  categories,
  revealedClues,
  activeClueId,
  buzzerEnabled = false,
  onClueClick,
  round,
  disabled = false
}: BoardProps) {
  // Sort categories by position
  const sortedCategories = [...categories].sort((a, b) => a.position - b.position);

  // Calculate font size based on text length
  const getCategoryFontSize = (text: string): string => {
    const length = text.length;
    if (length <= 8) return '2.75rem';
    if (length <= 12) return '2.2rem';
    if (length <= 16) return '1.8rem';
    if (length <= 20) return '1.5rem';
    if (length <= 25) return '1.3rem';
    return '1.1rem';
  };

  return (
    <div className="board-container">
      {/* Category headers */}
      <div className="category-row">
        {sortedCategories.map(category => {
          const cleanedName = cleanClueText(category.name);
          return (
            <div
              key={category.id}
              className="category-header"
              style={{ fontSize: getCategoryFontSize(cleanedName) }}
              dangerouslySetInnerHTML={{ __html: cleanedName }}
            />
          );
        })}
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
            const isActive = activeClueId === clue.id && buzzerEnabled;
            const value = getClueValue(row, round);

            return (
              <ClueCard
                key={clue.id}
                value={value}
                isRevealed={isRevealed}
                isDailyDouble={clue.is_daily_double}
                isActive={isActive}
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
