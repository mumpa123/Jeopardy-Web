"""
Django management command to analyze Jeopardy answers.
Shows most common answers, answer patterns, and statistical insights.
"""

from django.core.management.base import BaseCommand
from django.db.models import Count, Avg, Q
from games.models import Clue, Category
from collections import Counter
import re
from .analytics_utils import (
    format_percentage,
    print_table,
    truncate_text,
    extract_word_frequencies,
    clean_text
)


class Command(BaseCommand):
    help = 'Analyze Jeopardy answer patterns and frequencies'

    def add_arguments(self, parser):
        parser.add_argument(
            '--analysis',
            type=str,
            choices=['exact', 'words', 'patterns', 'lengths', 'all'],
            default='all',
            help='Type of answer analysis to perform (default: all)'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Number of top results to display (default: 50)'
        )
        parser.add_argument(
            '--min-count',
            type=int,
            default=2,
            help='Minimum occurrences to include (default: 2)'
        )
        parser.add_argument(
            '--round',
            type=str,
            choices=['single', 'double', 'final', 'all'],
            default='all',
            help='Filter by round type (default: all)'
        )
        parser.add_argument(
            '--search',
            type=str,
            help='Search for answers containing this text'
        )
        parser.add_argument(
            '--examples',
            action='store_true',
            help='Show example questions for each answer'
        )
        parser.add_argument(
            '--by-value',
            action='store_true',
            help='Group results by clue value'
        )

    def handle(self, *args, **options):
        analysis_type = options['analysis']
        limit = options['limit']
        min_count = options['min_count']
        round_type = options['round']
        search_term = options['search']
        show_examples = options['examples']
        by_value = options['by_value']

        self.stdout.write(self.style.SUCCESS('\n=== JEOPARDY ANSWER ANALYSIS ===\n'))

        # Build base queryset
        queryset = Clue.objects.select_related('category')

        if round_type != 'all':
            queryset = queryset.filter(category__round_type=round_type)

        if search_term:
            queryset = queryset.filter(answer__icontains=search_term)

        total_clues = queryset.count()
        round_display = round_type.capitalize() + ' Jeopardy' if round_type != 'all' else 'All Rounds'

        self.stdout.write(f'Round: {round_display}')
        self.stdout.write(f'Total clues: {total_clues:,}')
        if search_term:
            self.stdout.write(f'Search filter: "{search_term}"')

        # Determine which analyses to run
        if analysis_type == 'all':
            analyses = ['exact', 'words', 'patterns', 'lengths']
        else:
            analyses = [analysis_type]

        for i, analysis in enumerate(analyses):
            if i > 0:
                self.stdout.write(f'\n{"-" * 80}\n')

            if analysis == 'exact':
                self.analyze_exact_answers(queryset, limit, min_count, show_examples, by_value)
            elif analysis == 'words':
                self.analyze_answer_words(queryset, limit, min_count)
            elif analysis == 'patterns':
                self.analyze_answer_patterns(queryset, limit)
            elif analysis == 'lengths':
                self.analyze_answer_lengths(queryset)

        self.stdout.write(self.style.SUCCESS('\n✓ Analysis complete!\n'))

    def analyze_exact_answers(self, queryset, limit, min_count, show_examples, by_value):
        """Analyze most common exact answer matches."""
        self.stdout.write('\n=== MOST COMMON ANSWERS (Exact Matches) ===\n')

        total_clues = queryset.count()

        # Group by exact answer
        answer_counts = queryset.values('answer').annotate(
            count=Count('id')
        ).filter(
            count__gte=min_count
        ).order_by('-count')

        unique_answers = answer_counts.count()
        self.stdout.write(f'Unique answers: {unique_answers:,}')
        if min_count > 1:
            self.stdout.write(f'(showing answers with {min_count}+ occurrences)')

        # Get top N
        top_answers = list(answer_counts[:limit])

        self.stdout.write(f'\nTop {len(top_answers)} answers:\n')

        # Prepare table
        headers = ['Rank', 'Answer', 'Count', '%']
        widths = [6, 55, 8, 8]
        rows = []

        for rank, item in enumerate(top_answers, 1):
            answer = truncate_text(item['answer'], max_length=53)
            count = item['count']
            percentage = format_percentage(count, total_clues)

            rows.append([
                f"#{rank}",
                answer,
                f"{count:,}",
                percentage
            ])

        print_table(headers, rows, widths)

        # Show examples if requested
        if show_examples and top_answers:
            self.stdout.write('\n--- Example Questions ---')
            for item in top_answers[:5]:
                answer = item['answer']
                examples = queryset.filter(answer=answer)[:3]

                self.stdout.write(f'\n"{answer}" appears in:')
                for clue in examples:
                    question = truncate_text(clue.question, max_length=70)
                    self.stdout.write(f'  • [{clue.category.name}] {question}')

        # Statistics
        if top_answers:
            self.stdout.write('\n--- Statistics ---')

            most_common = top_answers[0]
            self.stdout.write(
                f"Most common: \"{most_common['answer']}\" "
                f"({most_common['count']:,} times)"
            )

            # Single occurrence answers
            if min_count <= 1:
                single_answers = queryset.values('answer').annotate(
                    count=Count('id')
                ).filter(count=1).count()
                single_pct = format_percentage(single_answers, unique_answers)
                self.stdout.write(
                    f"One-time answers: {single_answers:,} "
                    f"({single_pct} of unique answers)"
                )

    def analyze_answer_words(self, queryset, limit, min_count):
        """Analyze word frequency in answers."""
        self.stdout.write('\n=== WORD FREQUENCY IN ANSWERS ===\n')

        # Get all answers
        answers = list(queryset.values_list('answer', flat=True))

        # Extract word frequencies
        word_freq = extract_word_frequencies(
            answers,
            remove_stop_words=True,
            min_length=2
        )

        # Filter by minimum count
        filtered_freq = {
            word: count for word, count in word_freq.items()
            if count >= min_count
        }

        total_words = sum(word_freq.values())
        unique_words = len(filtered_freq)

        self.stdout.write(f'Total words in answers: {total_words:,}')
        self.stdout.write(f'Unique words: {unique_words:,}')
        if min_count > 1:
            self.stdout.write(f'(showing words with {min_count}+ occurrences)')

        # Get top N
        top_words = word_freq.most_common(limit)

        self.stdout.write(f'\nTop {len(top_words)} words:\n')

        # Prepare table
        headers = ['Rank', 'Word', 'Count', '%']
        widths = [6, 30, 10, 8]
        rows = []

        for rank, (word, count) in enumerate(top_words, 1):
            percentage = format_percentage(count, total_words)

            rows.append([
                f"#{rank}",
                word,
                f"{count:,}",
                percentage
            ])

        print_table(headers, rows, widths)

        # Show some context
        if top_words:
            self.stdout.write('\n--- Examples ---')
            for word, count in top_words[:5]:
                examples = queryset.filter(answer__icontains=word)[:3]
                self.stdout.write(f'\n"{word}" appears in answers like:')
                for clue in examples:
                    answer = truncate_text(clue.answer, max_length=50)
                    self.stdout.write(f'  • {answer}')

    def analyze_answer_patterns(self, queryset, limit):
        """Analyze common patterns in answers."""
        self.stdout.write('\n=== ANSWER PATTERN ANALYSIS ===\n')

        # Get all answers
        answers = list(queryset.values_list('answer', flat=True))

        # Pattern detection
        patterns = {
            'People Names': 0,
            'Places/Countries': 0,
            'Years/Dates': 0,
            'Single Word': 0,
            'Two Words': 0,
            'Three+ Words': 0,
            'Contains Numbers': 0,
            'All Caps': 0,
            'Parentheses': 0,
            'Quotation Marks': 0,
        }

        # Common people name patterns
        name_patterns = [
            r'\b[A-Z][a-z]+ [A-Z][a-z]+\b',  # First Last
            r'\b[A-Z]\. [A-Z][a-z]+\b',  # F. Last
        ]

        # Common place indicators
        place_words = ['CITY', 'COUNTRY', 'STATE', 'RIVER', 'MOUNTAIN', 'OCEAN', 'SEA']

        # Country names (sample)
        countries = ['FRANCE', 'GERMANY', 'ITALY', 'SPAIN', 'CHINA', 'JAPAN', 'INDIA',
                    'RUSSIA', 'BRAZIL', 'MEXICO', 'CANADA', 'AUSTRALIA', 'ENGLAND',
                    'BRITAIN', 'AMERICA', 'EGYPT', 'GREECE', 'ROME']

        for answer in answers:
            if not answer:
                continue

            # Check for people names
            for pattern in name_patterns:
                if re.search(pattern, answer):
                    patterns['People Names'] += 1
                    break

            # Check for places
            answer_upper = answer.upper()
            if any(word in answer_upper for word in place_words) or \
               any(country in answer_upper for country in countries):
                patterns['Places/Countries'] += 1

            # Check for years/dates
            if re.search(r'\b(1[0-9]{3}|20[0-2][0-9])\b', answer):
                patterns['Years/Dates'] += 1

            # Word count
            word_count = len(answer.split())
            if word_count == 1:
                patterns['Single Word'] += 1
            elif word_count == 2:
                patterns['Two Words'] += 1
            elif word_count >= 3:
                patterns['Three+ Words'] += 1

            # Other patterns
            if re.search(r'\d', answer):
                patterns['Contains Numbers'] += 1
            if answer.isupper() and len(answer) > 2:
                patterns['All Caps'] += 1
            if '(' in answer or ')' in answer:
                patterns['Parentheses'] += 1
            if '"' in answer or "'" in answer:
                patterns['Quotation Marks'] += 1

        total = len(answers)

        self.stdout.write('Answer patterns:\n')

        # Sort by frequency
        sorted_patterns = sorted(patterns.items(), key=lambda x: x[1], reverse=True)

        headers = ['Pattern', 'Count', '%']
        widths = [25, 12, 10]
        rows = []

        for pattern_name, count in sorted_patterns:
            if count > 0:
                percentage = format_percentage(count, total)
                rows.append([
                    pattern_name,
                    f"{count:,}",
                    percentage
                ])

        print_table(headers, rows, widths)

        # Show examples for top patterns
        self.stdout.write('\n--- Pattern Examples ---')

        # People names
        people_examples = [a for a in answers[:1000]
                          if any(re.search(p, a) for p in name_patterns)][:5]
        if people_examples:
            self.stdout.write('\nPeople Names:')
            for ex in people_examples:
                self.stdout.write(f'  • {ex}')

        # Places
        place_examples = [a for a in answers[:1000]
                         if any(word in a.upper() for word in place_words + countries)][:5]
        if place_examples:
            self.stdout.write('\nPlaces/Countries:')
            for ex in place_examples:
                self.stdout.write(f'  • {ex}')

        # Years
        year_examples = [a for a in answers[:1000]
                        if re.search(r'\b(1[0-9]{3}|20[0-2][0-9])\b', a)][:5]
        if year_examples:
            self.stdout.write('\nYears/Dates:')
            for ex in year_examples:
                self.stdout.write(f'  • {ex}')

    def analyze_answer_lengths(self, queryset):
        """Analyze answer length statistics."""
        self.stdout.write('\n=== ANSWER LENGTH ANALYSIS ===\n')

        # Get all answers
        answers = list(queryset.values_list('answer', flat=True))
        answers = [a for a in answers if a]  # Filter None

        if not answers:
            self.stdout.write('No answers to analyze.')
            return

        # Character length statistics
        char_lengths = [len(answer) for answer in answers]
        avg_chars = sum(char_lengths) / len(char_lengths)
        min_chars = min(char_lengths)
        max_chars = max(char_lengths)

        # Word count statistics
        word_counts = [len(answer.split()) for answer in answers]
        avg_words = sum(word_counts) / len(word_counts)
        min_words = min(word_counts)
        max_words = max(word_counts)

        self.stdout.write('--- Character Length ---')
        self.stdout.write(f'Average: {avg_chars:.1f} characters')
        self.stdout.write(f'Range: {min_chars} to {max_chars} characters')

        self.stdout.write('\n--- Word Count ---')
        self.stdout.write(f'Average: {avg_words:.1f} words')
        self.stdout.write(f'Range: {min_words} to {max_words} words')

        # Distribution by character length
        self.stdout.write('\n--- Length Distribution ---')

        length_buckets = {
            '1-5 chars': 0,
            '6-10 chars': 0,
            '11-20 chars': 0,
            '21-30 chars': 0,
            '31-50 chars': 0,
            '51+ chars': 0,
        }

        for length in char_lengths:
            if length <= 5:
                length_buckets['1-5 chars'] += 1
            elif length <= 10:
                length_buckets['6-10 chars'] += 1
            elif length <= 20:
                length_buckets['11-20 chars'] += 1
            elif length <= 30:
                length_buckets['21-30 chars'] += 1
            elif length <= 50:
                length_buckets['31-50 chars'] += 1
            else:
                length_buckets['51+ chars'] += 1

        total = len(char_lengths)
        for bucket, count in length_buckets.items():
            percentage = format_percentage(count, total)
            self.stdout.write(f'{bucket:15} {count:8,} ({percentage})')

        # Show some examples of extremes
        self.stdout.write('\n--- Examples ---')

        # Shortest answers
        shortest = sorted(answers, key=len)[:5]
        self.stdout.write('\nShortest answers:')
        for ans in shortest:
            self.stdout.write(f'  • "{ans}" ({len(ans)} chars)')

        # Longest answers
        longest = sorted(answers, key=len, reverse=True)[:5]
        self.stdout.write('\nLongest answers:')
        for ans in longest:
            self.stdout.write(f'  • "{truncate_text(ans, 70)}" ({len(ans)} chars)')
