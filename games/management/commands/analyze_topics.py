"""
Django management command to analyze common topics and words in Jeopardy content.
Performs word frequency and n-gram analysis on category names and/or clue text.
"""

from django.core.management.base import BaseCommand
from games.models import Category, Clue
from .analytics_utils import (
    extract_word_frequencies,
    extract_ngram_frequencies,
    format_percentage,
    print_table
)


class Command(BaseCommand):
    help = 'Analyze common topics and words in Jeopardy categories and clues'

    def add_arguments(self, parser):
        parser.add_argument(
            '--source',
            type=str,
            choices=['categories', 'clues', 'answers', 'both'],
            default='categories',
            help='What to analyze: category names, clue questions, answers, or both (default: categories)'
        )
        parser.add_argument(
            '--ngrams',
            type=int,
            choices=[1, 2, 3],
            default=1,
            help='N-gram size: 1=words, 2=phrases, 3=longer phrases (default: 1)'
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
            help='Minimum number of occurrences to include (default: 2)'
        )
        parser.add_argument(
            '--keep-stop-words',
            action='store_true',
            help='Include common stop words (the, and, of, etc.)'
        )
        parser.add_argument(
            '--min-length',
            type=int,
            default=2,
            help='Minimum word length to include (default: 2)'
        )
        parser.add_argument(
            '--round',
            type=str,
            choices=['single', 'double', 'final', 'all'],
            default='all',
            help='Filter by round type (default: all)'
        )
        parser.add_argument(
            '--examples',
            action='store_true',
            help='Show example categories/clues for each result'
        )

    def handle(self, *args, **options):
        source = options['source']
        ngram_size = options['ngrams']
        limit = options['limit']
        min_count = options['min_count']
        remove_stop_words = not options['keep_stop_words']
        min_length = options['min_length']
        round_type = options['round']
        show_examples = options['examples']

        self.stdout.write(self.style.SUCCESS('\n=== JEOPARDY TOPIC ANALYSIS ===\n'))

        # Determine what to analyze
        if source == 'both':
            sources_to_analyze = ['categories', 'clues']
        else:
            sources_to_analyze = [source]

        for current_source in sources_to_analyze:
            if len(sources_to_analyze) > 1:
                self.stdout.write(f'\n{"-" * 80}\n')

            self.analyze_source(
                current_source,
                ngram_size,
                limit,
                min_count,
                remove_stop_words,
                min_length,
                round_type,
                show_examples
            )

        self.stdout.write(self.style.SUCCESS('\n✓ Analysis complete!\n'))

    def analyze_source(self, source, ngram_size, limit, min_count,
                       remove_stop_words, min_length, round_type, show_examples):
        """Analyze a specific source (categories, clues, or answers)."""

        # Build appropriate queryset
        if source == 'categories':
            queryset = Category.objects.all()
            if round_type != 'all':
                queryset = queryset.filter(round_type=round_type)
            texts = list(queryset.values_list('name', flat=True))
            source_display = 'Category Names'
            examples_queryset = queryset
        elif source == 'clues':
            queryset = Clue.objects.select_related('category')
            if round_type != 'all':
                queryset = queryset.filter(category__round_type=round_type)
            texts = list(queryset.values_list('question', flat=True))
            source_display = 'Clue Questions'
            examples_queryset = queryset
        else:  # answers
            queryset = Clue.objects.select_related('category')
            if round_type != 'all':
                queryset = queryset.filter(category__round_type=round_type)
            texts = list(queryset.values_list('answer', flat=True))
            source_display = 'Clue Answers'
            examples_queryset = queryset

        total_items = len(texts)

        # Display header
        self.stdout.write(f'\nAnalyzing: {source_display}')
        if round_type != 'all':
            self.stdout.write(f'Round: {round_type.capitalize()} Jeopardy')
        self.stdout.write(f'Total items: {total_items:,}')

        if ngram_size == 1:
            self.stdout.write(f'Analysis type: Individual words')
        else:
            self.stdout.write(f'Analysis type: {ngram_size}-word phrases')

        if remove_stop_words:
            self.stdout.write(f'Stop words: Removed')
        else:
            self.stdout.write(f'Stop words: Included')

        # Extract frequencies
        if ngram_size == 1:
            frequencies = extract_word_frequencies(
                texts,
                remove_stop_words=remove_stop_words,
                min_length=min_length
            )
        else:
            frequencies = extract_ngram_frequencies(
                texts,
                n=ngram_size,
                remove_stop_words=remove_stop_words,
                min_length=min_length
            )

        # Filter by minimum count
        filtered_frequencies = {
            term: count for term, count in frequencies.items()
            if count >= min_count
        }

        # Get top N
        top_items = frequencies.most_common(limit)

        total_unique = len(filtered_frequencies)
        total_occurrences = sum(frequencies.values())

        self.stdout.write(f'Unique terms found: {total_unique:,}')
        if min_count > 1:
            self.stdout.write(f'(with {min_count}+ occurrences)')

        self.stdout.write(f'\nTop {len(top_items)} terms:\n')

        # Prepare table
        if ngram_size == 1:
            headers = ['Rank', 'Word', 'Count', '%']
            term_width = 30
        else:
            headers = ['Rank', 'Phrase', 'Count', '%']
            term_width = 50

        widths = [6, term_width, 10, 8]
        rows = []

        for rank, (term, count) in enumerate(top_items, 1):
            percentage = format_percentage(count, total_occurrences)

            # Truncate if needed
            if len(term) > term_width - 2:
                term_display = term[:term_width-5] + '...'
            else:
                term_display = term

            rows.append([
                f"#{rank}",
                term_display,
                f"{count:,}",
                percentage
            ])

        print_table(headers, rows, widths)

        # Show examples if requested
        if show_examples and top_items:
            self.stdout.write('\n--- Examples ---')
            # Show examples for top 5 items
            for term, count in top_items[:5]:
                self.stdout.write(f'\n"{term}" appears in:')

                # Find examples
                if source == 'categories':
                    examples = examples_queryset.filter(name__icontains=term)[:3]
                    for cat in examples:
                        self.stdout.write(f'  • {cat.name} ({cat.round_type})')
                elif source == 'clues':
                    examples = examples_queryset.filter(question__icontains=term)[:3]
                    for clue in examples:
                        question = clue.question[:70] + '...' if len(clue.question) > 70 else clue.question
                        self.stdout.write(f'  • [{clue.category.name}] {question}')
                else:  # answers
                    examples = examples_queryset.filter(answer__icontains=term)[:3]
                    for clue in examples:
                        answer = clue.answer[:50] + '...' if len(clue.answer) > 50 else clue.answer
                        self.stdout.write(f'  • {answer} (from {clue.category.name})')

        # Statistics
        if top_items:
            self.stdout.write('\n--- Statistics ---')
            most_common_term, most_common_count = top_items[0]
            self.stdout.write(
                f'Most common: "{most_common_term}" '
                f'({most_common_count:,} occurrences)'
            )

            # Coverage of top N terms
            top_10_coverage = sum(count for _, count in top_items[:10])
            coverage_pct = format_percentage(top_10_coverage, total_occurrences)
            self.stdout.write(
                f'Top 10 coverage: {top_10_coverage:,} occurrences ({coverage_pct})'
            )
