"""
Django management command to analyze the most common category names.
Shows exact category name matches with frequency counts.
"""

from django.core.management.base import BaseCommand
from django.db.models import Count
from games.models import Category
from .analytics_utils import format_percentage, print_table, truncate_text


class Command(BaseCommand):
    help = 'Analyze the most common Jeopardy category names'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Number of top categories to display (default: 50)'
        )
        parser.add_argument(
            '--round',
            type=str,
            choices=['single', 'double', 'final', 'all'],
            default='all',
            help='Filter by round type (default: all)'
        )
        parser.add_argument(
            '--min-count',
            type=int,
            default=1,
            help='Minimum number of occurrences to include (default: 1)'
        )
        parser.add_argument(
            '--search',
            type=str,
            help='Search for categories containing this text'
        )

    def handle(self, *args, **options):
        limit = options['limit']
        round_type = options['round']
        min_count = options['min_count']
        search_term = options['search']

        self.stdout.write(self.style.SUCCESS('\n=== JEOPARDY CATEGORY ANALYSIS ===\n'))

        # Build query
        queryset = Category.objects.all()

        # Filter by round type if specified
        if round_type != 'all':
            queryset = queryset.filter(round_type=round_type)
            round_display = round_type.capitalize() + ' Jeopardy'
        else:
            round_display = 'All Rounds'

        # Filter by search term if provided
        if search_term:
            queryset = queryset.filter(name__icontains=search_term)
            self.stdout.write(f'Search filter: "{search_term}"\n')

        # Get total count before aggregation
        total_categories = queryset.count()

        # Aggregate by category name
        category_counts = queryset.values('name').annotate(
            count=Count('id')
        ).filter(
            count__gte=min_count
        ).order_by('-count')

        unique_categories = category_counts.count()

        # Get top N
        top_categories = list(category_counts[:limit])

        # Display summary
        self.stdout.write(f'Round: {round_display}')
        self.stdout.write(f'Total category instances: {total_categories:,}')
        self.stdout.write(f'Unique category names: {unique_categories:,}')
        if min_count > 1:
            self.stdout.write(f'(showing only categories with {min_count}+ occurrences)')
        self.stdout.write(f'\nTop {len(top_categories)} categories:\n')

        # Prepare table data
        headers = ['Rank', 'Category Name', 'Count', '%']
        widths = [6, 60, 8, 8]
        rows = []

        for rank, item in enumerate(top_categories, 1):
            name = truncate_text(item['name'], max_length=58)
            count = item['count']
            percentage = format_percentage(count, total_categories)

            rows.append([
                f"#{rank}",
                name,
                f"{count:,}",
                percentage
            ])

        # Print table
        print_table(headers, rows, widths)

        # Additional statistics
        if top_categories:
            self.stdout.write('\n--- Statistics ---')

            # Most common category
            most_common = top_categories[0]
            self.stdout.write(
                f"Most common: \"{most_common['name']}\" "
                f"({most_common['count']:,} times)"
            )

            # Categories appearing only once (if not filtered)
            if min_count <= 1:
                single_occurrence = category_counts.filter(count=1).count()
                single_pct = format_percentage(single_occurrence, unique_categories)
                self.stdout.write(
                    f"One-time categories: {single_occurrence:,} "
                    f"({single_pct} of unique categories)"
                )

            # Categories appearing multiple times
            if min_count <= 2:
                repeat_categories = category_counts.filter(count__gte=2).count()
                repeat_pct = format_percentage(repeat_categories, unique_categories)
                self.stdout.write(
                    f"Repeated categories: {repeat_categories:,} "
                    f"({repeat_pct} of unique categories)"
                )

            # Average occurrences per category
            total_occurrences = sum(item['count'] for item in category_counts)
            avg_occurrences = total_occurrences / unique_categories if unique_categories > 0 else 0
            self.stdout.write(f"Average occurrences: {avg_occurrences:.2f}")

        self.stdout.write(self.style.SUCCESS('\n✓ Analysis complete!\n'))

        # Suggestions for further exploration
        if not search_term and round_type == 'all':
            self.stdout.write(self.style.WARNING('💡 Try these options:'))
            self.stdout.write('  --round single|double|final  (analyze specific rounds)')
            self.stdout.write('  --search "HISTORY"           (find categories with keywords)')
            self.stdout.write('  --min-count 5                (show only frequently repeated categories)')
            self.stdout.write('')
