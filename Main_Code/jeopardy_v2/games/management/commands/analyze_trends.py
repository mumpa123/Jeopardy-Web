"""
Django management command to analyze temporal trends in Jeopardy categories.
Shows how category usage evolves over seasons and years.
"""

from django.core.management.base import BaseCommand
from django.db.models import Count, Q, Min, Max
from django.db.models.functions import ExtractYear
from games.models import Category, Episode
from collections import defaultdict
from .analytics_utils import format_percentage, print_table


class Command(BaseCommand):
    help = 'Analyze temporal trends in Jeopardy categories over time'

    def add_arguments(self, parser):
        parser.add_argument(
            '--group-by',
            type=str,
            choices=['season', 'year'],
            default='season',
            help='Group data by season or year (default: season)'
        )
        parser.add_argument(
            '--category',
            type=str,
            help='Track a specific category name over time'
        )
        parser.add_argument(
            '--top',
            type=int,
            default=10,
            help='Number of top categories to show per period (default: 10)'
        )
        parser.add_argument(
            '--min-episodes',
            type=int,
            default=1,
            help='Minimum episodes per category to include (default: 1)'
        )
        parser.add_argument(
            '--round',
            type=str,
            choices=['single', 'double', 'final', 'all'],
            default='all',
            help='Filter by round type (default: all)'
        )
        parser.add_argument(
            '--emerging',
            action='store_true',
            help='Show emerging categories (new in recent seasons)'
        )
        parser.add_argument(
            '--declining',
            action='store_true',
            help='Show declining categories (less frequent in recent seasons)'
        )

    def handle(self, *args, **options):
        group_by = options['group_by']
        specific_category = options['category']
        top_n = options['top']
        min_episodes = options['min_episodes']
        round_type = options['round']
        show_emerging = options['emerging']
        show_declining = options['declining']

        self.stdout.write(self.style.SUCCESS('\n=== JEOPARDY CATEGORY TRENDS ===\n'))

        # Build base queryset
        queryset = Category.objects.select_related('episode')

        if round_type != 'all':
            queryset = queryset.filter(round_type=round_type)
            round_display = round_type.capitalize() + ' Jeopardy'
        else:
            round_display = 'All Rounds'

        # Check if we have episode data with air dates
        episodes_with_dates = Episode.objects.filter(air_date__isnull=False).count()
        total_episodes = Episode.objects.count()

        self.stdout.write(f'Round: {round_display}')
        self.stdout.write(f'Total episodes: {total_episodes:,}')
        self.stdout.write(f'Episodes with air dates: {episodes_with_dates:,}')

        if episodes_with_dates == 0:
            self.stdout.write(self.style.WARNING(
                '\n⚠ No episodes have air dates. Analysis will be based on season numbers only.\n'
            ))

        # Handle specific category tracking
        if specific_category:
            self.track_specific_category(
                specific_category, group_by, round_type, queryset
            )
            return

        # General trend analysis
        if group_by == 'season':
            self.analyze_by_season(queryset, top_n, min_episodes, round_type)
        else:  # year
            if episodes_with_dates == 0:
                self.stdout.write(self.style.ERROR(
                    'Cannot group by year without air dates. Use --group-by season instead.'
                ))
                return
            self.analyze_by_year(queryset, top_n, min_episodes, round_type)

        # Show emerging/declining categories if requested
        if show_emerging or show_declining:
            self.stdout.write(f'\n{"-" * 80}\n')
            if show_emerging:
                self.find_emerging_categories(queryset, group_by)
            if show_declining:
                self.find_declining_categories(queryset, group_by)

        self.stdout.write(self.style.SUCCESS('\n✓ Analysis complete!\n'))

    def track_specific_category(self, category_name, group_by, round_type, queryset):
        """Track a specific category over time."""
        self.stdout.write(f'\nTracking category: "{category_name}"\n')

        # Find matching categories
        matching = queryset.filter(name__iexact=category_name)

        if not matching.exists():
            # Try case-insensitive contains
            matching = queryset.filter(name__icontains=category_name)
            if not matching.exists():
                self.stdout.write(self.style.ERROR(
                    f'No categories found matching "{category_name}"'
                ))
                return
            else:
                self.stdout.write(self.style.WARNING(
                    f'No exact match. Showing similar categories:\n'
                ))
                similar = matching.values('name').annotate(count=Count('id')).order_by('-count')
                for item in similar[:10]:
                    self.stdout.write(f'  • {item["name"]} ({item["count"]} times)')
                return

        # Group by time period
        if group_by == 'season':
            time_data = matching.values('episode__season_number').annotate(
                count=Count('id')
            ).order_by('episode__season_number')

            headers = ['Season', 'Appearances']
            widths = [15, 15]
            rows = []

            for item in time_data:
                season = item['episode__season_number']
                count = item['count']
                rows.append([f"Season {season}", count])

        else:  # year
            time_data = matching.annotate(
                year=ExtractYear('episode__air_date')
            ).values('year').annotate(
                count=Count('id')
            ).order_by('year')

            headers = ['Year', 'Appearances']
            widths = [15, 15]
            rows = []

            for item in time_data:
                if item['year']:
                    rows.append([str(item['year']), item['count']])

        if rows:
            print_table(headers, rows, widths)
            total = sum(int(row[1]) for row in rows)
            self.stdout.write(f'\nTotal appearances: {total}')
            self.stdout.write(f'Time periods: {len(rows)}')
        else:
            self.stdout.write('No data found.')

    def analyze_by_season(self, queryset, top_n, min_episodes, round_type):
        """Analyze trends grouped by season."""
        self.stdout.write(f'\nGrouping by: Season')
        self.stdout.write(f'Showing top {top_n} categories per season\n')

        # Get season range
        season_stats = Episode.objects.aggregate(
            min_season=Min('season_number'),
            max_season=Max('season_number')
        )

        min_season = season_stats['min_season']
        max_season = season_stats['max_season']

        if not min_season or not max_season:
            self.stdout.write(self.style.ERROR('No season data available.'))
            return

        self.stdout.write(f'Season range: {min_season} to {max_season}\n')

        # Analyze each season
        for season in range(max_season, max(max_season - 5, min_season - 1), -1):
            season_categories = queryset.filter(
                episode__season_number=season
            ).values('name').annotate(
                count=Count('id')
            ).filter(
                count__gte=min_episodes
            ).order_by('-count')[:top_n]

            if season_categories:
                self.stdout.write(f'\n--- Season {season} ---')
                for rank, item in enumerate(season_categories, 1):
                    self.stdout.write(f"{rank:2}. {item['name']:50} ({item['count']} times)")

    def analyze_by_year(self, queryset, top_n, min_episodes, round_type):
        """Analyze trends grouped by year."""
        self.stdout.write(f'\nGrouping by: Year')
        self.stdout.write(f'Showing top {top_n} categories per year\n')

        # Get year range
        year_stats = Episode.objects.filter(
            air_date__isnull=False
        ).annotate(
            year=ExtractYear('air_date')
        ).aggregate(
            min_year=Min('year'),
            max_year=Max('year')
        )

        min_year = year_stats['min_year']
        max_year = year_stats['max_year']

        if not min_year or not max_year:
            self.stdout.write(self.style.ERROR('No year data available.'))
            return

        self.stdout.write(f'Year range: {min_year} to {max_year}\n')

        # Analyze each year (show last 5 years)
        for year in range(max_year, max(max_year - 5, min_year - 1), -1):
            year_categories = queryset.filter(
                episode__air_date__year=year
            ).values('name').annotate(
                count=Count('id')
            ).filter(
                count__gte=min_episodes
            ).order_by('-count')[:top_n]

            if year_categories:
                self.stdout.write(f'\n--- {year} ---')
                for rank, item in enumerate(year_categories, 1):
                    self.stdout.write(f"{rank:2}. {item['name']:50} ({item['count']} times)")

    def find_emerging_categories(self, queryset, group_by):
        """Find categories that are new or increasing in frequency."""
        self.stdout.write('\n=== EMERGING CATEGORIES ===\n')

        # Get recent and older time periods
        if group_by == 'season':
            max_season = Episode.objects.aggregate(Max('season_number'))['season_number__max']
            if not max_season:
                return

            recent_seasons = range(max_season - 2, max_season + 1)
            older_seasons = range(max_season - 10, max_season - 2)

            recent_cats = queryset.filter(
                episode__season_number__in=recent_seasons
            ).values('name').annotate(count=Count('id'))

            older_cats = queryset.filter(
                episode__season_number__in=older_seasons
            ).values('name').annotate(count=Count('id'))

        else:  # year
            max_year = Episode.objects.filter(
                air_date__isnull=False
            ).aggregate(max_year=Max(ExtractYear('air_date')))['max_year']

            if not max_year:
                return

            recent_cats = queryset.filter(
                episode__air_date__year__gte=max_year - 2
            ).values('name').annotate(count=Count('id'))

            older_cats = queryset.filter(
                episode__air_date__year__lt=max_year - 2,
                episode__air_date__year__gte=max_year - 10
            ).values('name').annotate(count=Count('id'))

        # Find categories that appear in recent but not (or rarely) in older
        older_dict = {item['name']: item['count'] for item in older_cats}
        emerging = []

        for item in recent_cats:
            name = item['name']
            recent_count = item['count']
            older_count = older_dict.get(name, 0)

            # New or significantly increased
            if older_count == 0 or recent_count > older_count * 2:
                emerging.append({
                    'name': name,
                    'recent': recent_count,
                    'older': older_count,
                    'change': 'NEW' if older_count == 0 else f'+{recent_count - older_count}'
                })

        # Sort by recent frequency
        emerging.sort(key=lambda x: x['recent'], reverse=True)

        if emerging[:15]:
            self.stdout.write('Categories appearing more frequently in recent seasons:\n')
            for item in emerging[:15]:
                self.stdout.write(
                    f"  • {item['name']:50} "
                    f"(recent: {item['recent']}, older: {item['older']}) [{item['change']}]"
                )
        else:
            self.stdout.write('No significant emerging categories found.')

    def find_declining_categories(self, queryset, group_by):
        """Find categories that are decreasing in frequency."""
        self.stdout.write('\n=== DECLINING CATEGORIES ===\n')

        # Similar logic but reversed
        if group_by == 'season':
            max_season = Episode.objects.aggregate(Max('season_number'))['season_number__max']
            if not max_season:
                return

            recent_seasons = range(max_season - 2, max_season + 1)
            older_seasons = range(max_season - 10, max_season - 2)

            recent_cats = queryset.filter(
                episode__season_number__in=recent_seasons
            ).values('name').annotate(count=Count('id'))

            older_cats = queryset.filter(
                episode__season_number__in=older_seasons
            ).values('name').annotate(count=Count('id'))

        else:  # year
            max_year = Episode.objects.filter(
                air_date__isnull=False
            ).aggregate(max_year=Max(ExtractYear('air_date')))['max_year']

            if not max_year:
                return

            recent_cats = queryset.filter(
                episode__air_date__year__gte=max_year - 2
            ).values('name').annotate(count=Count('id'))

            older_cats = queryset.filter(
                episode__air_date__year__lt=max_year - 2,
                episode__air_date__year__gte=max_year - 10
            ).values('name').annotate(count=Count('id'))

        # Find categories that appeared often before but rarely/not now
        recent_dict = {item['name']: item['count'] for item in recent_cats}
        declining = []

        for item in older_cats:
            name = item['name']
            older_count = item['count']
            recent_count = recent_dict.get(name, 0)

            # Disappeared or significantly decreased
            if older_count >= 3 and (recent_count == 0 or older_count > recent_count * 2):
                declining.append({
                    'name': name,
                    'recent': recent_count,
                    'older': older_count,
                    'change': 'GONE' if recent_count == 0 else f'-{older_count - recent_count}'
                })

        # Sort by how much they declined
        declining.sort(key=lambda x: x['older'] - x['recent'], reverse=True)

        if declining[:15]:
            self.stdout.write('Categories appearing less frequently in recent seasons:\n')
            for item in declining[:15]:
                self.stdout.write(
                    f"  • {item['name']:50} "
                    f"(recent: {item['recent']}, older: {item['older']}) [{item['change']}]"
                )
        else:
            self.stdout.write('No significant declining categories found.')
