"""
Django management command to analyze statistical patterns in Jeopardy categories.
Shows Daily Double patterns, value distributions, and category diversity.
"""

from django.core.management.base import BaseCommand
from django.db.models import Count, Avg, Sum, Q, F, Max, Min
from games.models import Category, Clue, Episode, ClueReveal
from collections import defaultdict, Counter
from .analytics_utils import format_percentage, print_table, truncate_text


class Command(BaseCommand):
    help = 'Analyze statistical patterns in Jeopardy categories and clues'

    def add_arguments(self, parser):
        parser.add_argument(
            '--analysis',
            type=str,
            choices=['daily-doubles', 'values', 'diversity', 'difficulty', 'all'],
            default='all',
            help='Type of statistical analysis to perform (default: all)'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=20,
            help='Number of top results to display (default: 20)'
        )
        parser.add_argument(
            '--round',
            type=str,
            choices=['single', 'double', 'all'],
            default='all',
            help='Filter by round type - note: Final Jeopardy excluded (default: all)'
        )

    def handle(self, *args, **options):
        analysis_type = options['analysis']
        limit = options['limit']
        round_type = options['round']

        self.stdout.write(self.style.SUCCESS('\n=== JEOPARDY STATISTICAL ANALYSIS ===\n'))

        # Determine which analyses to run
        if analysis_type == 'all':
            analyses = ['daily-doubles', 'values', 'diversity', 'difficulty']
        else:
            analyses = [analysis_type]

        for i, analysis in enumerate(analyses):
            if i > 0:
                self.stdout.write(f'\n{"-" * 80}\n')

            if analysis == 'daily-doubles':
                self.analyze_daily_doubles(limit, round_type)
            elif analysis == 'values':
                self.analyze_value_distribution(limit, round_type)
            elif analysis == 'diversity':
                self.analyze_category_diversity()
            elif analysis == 'difficulty':
                self.analyze_difficulty(limit, round_type)

        self.stdout.write(self.style.SUCCESS('\n✓ Analysis complete!\n'))

    def analyze_daily_doubles(self, limit, round_type):
        """Analyze Daily Double placement patterns."""
        self.stdout.write('\n=== DAILY DOUBLE ANALYSIS ===\n')

        # Build queryset
        dd_clues = Clue.objects.filter(is_daily_double=True).select_related('category')

        if round_type != 'all':
            dd_clues = dd_clues.filter(category__round_type=round_type)

        total_dd = dd_clues.count()
        self.stdout.write(f'Total Daily Doubles: {total_dd:,}\n')

        if total_dd == 0:
            self.stdout.write('No Daily Doubles found in database.')
            return

        # 1. Categories with most Daily Doubles
        self.stdout.write('--- Categories with Most Daily Doubles ---\n')

        dd_by_category = dd_clues.values('category__name').annotate(
            count=Count('id')
        ).order_by('-count')[:limit]

        headers = ['Rank', 'Category Name', 'DD Count', '%']
        widths = [6, 55, 10, 8]
        rows = []

        for rank, item in enumerate(dd_by_category, 1):
            name = truncate_text(item['category__name'], max_length=53)
            count = item['count']
            percentage = format_percentage(count, total_dd)

            rows.append([
                f"#{rank}",
                name,
                f"{count:,}",
                percentage
            ])

        print_table(headers, rows, widths)

        # 2. Daily Double by value/position
        self.stdout.write('\n--- Daily Double Distribution by Value ---\n')

        dd_by_value = dd_clues.values('value').annotate(
            count=Count('id')
        ).order_by('value')

        value_headers = ['Value', 'Count', '%']
        value_widths = [10, 10, 8]
        value_rows = []

        for item in dd_by_value:
            value = item['value'] if item['value'] else 'N/A'
            count = item['count']
            percentage = format_percentage(count, total_dd)

            value_rows.append([
                f"${value}" if value != 'N/A' else value,
                f"{count:,}",
                percentage
            ])

        print_table(value_headers, value_rows, value_widths)

        # 3. Daily Double by position (row on board)
        self.stdout.write('\n--- Daily Double Distribution by Position (Row) ---\n')

        dd_by_position = dd_clues.values('position').annotate(
            count=Count('id')
        ).order_by('position')

        pos_headers = ['Position', 'Count', '%']
        pos_widths = [10, 10, 8]
        pos_rows = []

        for item in dd_by_position:
            position = item['position']
            position_label = f"Row {position + 1}" if position is not None else 'Unknown'
            count = item['count']
            percentage = format_percentage(count, total_dd)

            pos_rows.append([
                position_label,
                f"{count:,}",
                percentage
            ])

        print_table(pos_headers, pos_rows, pos_widths)

        # 4. Daily Double by round
        self.stdout.write('\n--- Daily Double Distribution by Round ---\n')

        dd_by_round = dd_clues.values('category__round_type').annotate(
            count=Count('id')
        ).order_by('category__round_type')

        for item in dd_by_round:
            round_name = item['category__round_type'].capitalize() + ' Jeopardy'
            count = item['count']
            percentage = format_percentage(count, total_dd)
            self.stdout.write(f'{round_name:20} {count:6,} ({percentage})')

    def analyze_value_distribution(self, limit, round_type):
        """Analyze clue value distribution across categories."""
        self.stdout.write('\n=== VALUE DISTRIBUTION ANALYSIS ===\n')

        # Build queryset
        queryset = Clue.objects.select_related('category')

        if round_type != 'all':
            queryset = queryset.filter(category__round_type=round_type)

        # Overall value distribution
        self.stdout.write('--- Overall Value Distribution ---\n')

        value_dist = queryset.values('value').annotate(
            count=Count('id')
        ).order_by('value')

        total_clues = queryset.count()

        for item in value_dist:
            value = item['value'] if item['value'] else 'N/A'
            count = item['count']
            percentage = format_percentage(count, total_clues)

            value_str = f"${value}" if value != 'N/A' else value
            self.stdout.write(f'{value_str:10} {count:8,} clues ({percentage})')

        # Average values by category
        self.stdout.write(f'\n--- Categories by Average Clue Value (Top {limit}) ---\n')

        # Calculate average value per category
        category_avg_values = queryset.values(
            'category__name'
        ).annotate(
            avg_value=Avg('value'),
            clue_count=Count('id')
        ).filter(
            avg_value__isnull=False,
            clue_count__gte=3  # At least 3 clues
        ).order_by('-avg_value')[:limit]

        headers = ['Rank', 'Category Name', 'Avg Value', 'Clues']
        widths = [6, 50, 12, 8]
        rows = []

        for rank, item in enumerate(category_avg_values, 1):
            name = truncate_text(item['category__name'], max_length=48)
            avg_val = item['avg_value']
            clue_count = item['clue_count']

            rows.append([
                f"#{rank}",
                name,
                f"${avg_val:,.0f}",
                f"{clue_count}"
            ])

        print_table(headers, rows, widths)

        # Total money distribution
        self.stdout.write('\n--- Total Point Value by Category Type ---\n')

        total_by_category = queryset.values(
            'category__name'
        ).annotate(
            total_value=Sum('value'),
            clue_count=Count('id')
        ).filter(
            total_value__isnull=False
        ).order_by('-total_value')[:limit]

        headers = ['Rank', 'Category Name', 'Total Value', 'Clues']
        widths = [6, 50, 14, 8]
        rows = []

        for rank, item in enumerate(total_by_category, 1):
            name = truncate_text(item['category__name'], max_length=48)
            total_val = item['total_value']
            clue_count = item['clue_count']

            rows.append([
                f"#{rank}",
                name,
                f"${total_val:,}",
                f"{clue_count}"
            ])

        print_table(headers, rows, widths)

    def analyze_category_diversity(self):
        """Analyze how diverse categories are within episodes."""
        self.stdout.write('\n=== CATEGORY DIVERSITY ANALYSIS ===\n')

        # Get all episodes
        episodes = Episode.objects.all()
        total_episodes = episodes.count()

        if total_episodes == 0:
            self.stdout.write('No episodes found in database.')
            return

        self.stdout.write(f'Analyzing {total_episodes:,} episodes...\n')

        # Calculate diversity metrics per episode
        diversity_scores = []

        for episode in episodes[:1000]:  # Analyze first 1000 episodes for performance
            categories = Category.objects.filter(episode=episode)
            category_names = list(categories.values_list('name', flat=True))

            if category_names:
                unique_count = len(set(category_names))
                total_count = len(category_names)
                diversity_score = unique_count / total_count if total_count > 0 else 0

                diversity_scores.append({
                    'episode': episode,
                    'unique': unique_count,
                    'total': total_count,
                    'score': diversity_score
                })

        if not diversity_scores:
            self.stdout.write('No category data available.')
            return

        # Calculate statistics
        avg_diversity = sum(d['score'] for d in diversity_scores) / len(diversity_scores)
        avg_unique = sum(d['unique'] for d in diversity_scores) / len(diversity_scores)
        avg_total = sum(d['total'] for d in diversity_scores) / len(diversity_scores)

        self.stdout.write(f'Average categories per episode: {avg_total:.1f}')
        self.stdout.write(f'Average unique categories: {avg_unique:.1f}')
        self.stdout.write(f'Average diversity score: {avg_diversity:.2%}')
        self.stdout.write('(100% = all categories unique, 0% = all categories repeated)\n')

        # Show most and least diverse episodes
        diversity_scores.sort(key=lambda x: x['score'])

        self.stdout.write('--- Least Diverse Episodes (Most Repetition) ---')
        for item in diversity_scores[:5]:
            ep = item['episode']
            self.stdout.write(
                f"Season {ep.season_number}, Episode {ep.episode_number}: "
                f"{item['unique']}/{item['total']} unique ({item['score']:.0%})"
            )

        self.stdout.write('\n--- Most Diverse Episodes (All Unique) ---')
        for item in diversity_scores[-5:]:
            ep = item['episode']
            self.stdout.write(
                f"Season {ep.season_number}, Episode {ep.episode_number}: "
                f"{item['unique']}/{item['total']} unique ({item['score']:.0%})"
            )

    def analyze_difficulty(self, limit, round_type):
        """Analyze category difficulty based on game play data."""
        self.stdout.write('\n=== DIFFICULTY ANALYSIS ===\n')

        # Check if we have game play data
        total_reveals = ClueReveal.objects.count()

        if total_reveals == 0:
            self.stdout.write(self.style.WARNING(
                '⚠ No game play data available. Difficulty analysis requires completed games.\n'
                'This analysis will be available once games have been played.'
            ))
            return

        self.stdout.write(f'Analyzing {total_reveals:,} clue reveals from gameplay...\n')

        # Build queryset for clues that have been revealed
        queryset = ClueReveal.objects.select_related('clue', 'clue__category')

        if round_type != 'all':
            queryset = queryset.filter(clue__category__round_type=round_type)

        # Calculate success rate by category
        self.stdout.write('--- Categories by Answer Success Rate ---\n')

        # Get categories with at least some gameplay
        categories_with_data = {}

        for reveal in queryset:
            cat_name = reveal.clue.category.name
            if cat_name not in categories_with_data:
                categories_with_data[cat_name] = {'correct': 0, 'incorrect': 0, 'unanswered': 0}

            if reveal.correct is True:
                categories_with_data[cat_name]['correct'] += 1
            elif reveal.correct is False:
                categories_with_data[cat_name]['incorrect'] += 1
            else:
                categories_with_data[cat_name]['unanswered'] += 1

        # Calculate success rates
        category_difficulty = []
        for cat_name, stats in categories_with_data.items():
            total = stats['correct'] + stats['incorrect'] + stats['unanswered']
            answered = stats['correct'] + stats['incorrect']

            if answered >= 3:  # Minimum 3 answered clues
                success_rate = stats['correct'] / answered if answered > 0 else 0
                category_difficulty.append({
                    'name': cat_name,
                    'success_rate': success_rate,
                    'correct': stats['correct'],
                    'incorrect': stats['incorrect'],
                    'total': total
                })

        if not category_difficulty:
            self.stdout.write('Not enough gameplay data yet for difficulty analysis.')
            return

        # Sort by difficulty (lowest success rate = hardest)
        category_difficulty.sort(key=lambda x: x['success_rate'])

        self.stdout.write(f'\n--- Hardest Categories (Lowest Success Rate, min 3 answered) ---\n')

        headers = ['Rank', 'Category Name', 'Success', 'Correct', 'Wrong']
        widths = [6, 45, 10, 10, 10]
        rows = []

        for rank, item in enumerate(category_difficulty[:limit], 1):
            name = truncate_text(item['name'], max_length=43)
            success = f"{item['success_rate']:.1%}"
            correct = item['correct']
            incorrect = item['incorrect']

            rows.append([
                f"#{rank}",
                name,
                success,
                f"{correct}",
                f"{incorrect}"
            ])

        print_table(headers, rows, widths)

        # Easiest categories
        self.stdout.write(f'\n--- Easiest Categories (Highest Success Rate) ---\n')

        category_difficulty.sort(key=lambda x: x['success_rate'], reverse=True)

        rows = []
        for rank, item in enumerate(category_difficulty[:limit], 1):
            name = truncate_text(item['name'], max_length=43)
            success = f"{item['success_rate']:.1%}"
            correct = item['correct']
            incorrect = item['incorrect']

            rows.append([
                f"#{rank}",
                name,
                success,
                f"{correct}",
                f"{incorrect}"
            ])

        print_table(headers, rows, widths)

        # Overall statistics
        all_correct = sum(item['correct'] for item in category_difficulty)
        all_incorrect = sum(item['incorrect'] for item in category_difficulty)
        overall_success = all_correct / (all_correct + all_incorrect) if (all_correct + all_incorrect) > 0 else 0

        self.stdout.write('\n--- Overall Statistics ---')
        self.stdout.write(f'Total answered clues: {all_correct + all_incorrect:,}')
        self.stdout.write(f'Overall success rate: {overall_success:.1%}')
