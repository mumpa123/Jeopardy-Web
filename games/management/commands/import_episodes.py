
from django.core.management.base import BaseCommand
from games.models import Episode, Category, Clue
import csv
import glob
import os

class Command(BaseCommand):
    """
    Custom management command to import Jeopardy episodes from CSV files.

    Usage: python manage.py import_episodes --path /path/to/csv/files/
    """
    help = 'Import Jeopardy episodes from CSV files'

    def add_arguments(self, parser):
        """Define command-line arguments"""
        parser.add_argument(
                '--path',
                type=str,
                default='../testChat/chat/jeopardy_clue_data/',
                help='Path to directory containing CSV files'
            )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before importing'
            )

    def handle(self, *args, **options):
        """Main command logic"""
        path = options['path']
        clear_data = options['clear']

        # Clear existing data if requested
        if clear_data:
            self.stdout.write(self.style.WARNING('Clearing existing episode data...'))
            Episode.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✓ Data Cleared'))

        # Find all CSV files
        csv_pattern = os.path.join(path, '**/episode_*.csv')
        csv_files = glob.glob(csv_pattern, recursive=True)

        if not csv_files:
            self.stdout.write(self.style.ERROR(f'No CSV files found in {path}'))
            return

        self.stdout.write(f'Found {len(csv_files)} CSV files')

        # Import each file
        success_count = 0
        error_count = 0

        for csv_file in csv_files:
            try:
                self._import_episode(csv_file)
                success_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ {csv_file}'))
            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f'✗ {csv_file}: {str(e)}'))

        # Summary
        self.stdout.write(self.style.SUCCESS(f'\n{success_count} episodes imported successfully'))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'{error_count} episodes failed'))

    def _import_episode(self, csv_file):
        """Import a single episode from CSV file"""
        # Extract season and episode numbers from filename
        # Example: "season_1/episode_5.csv" -> season=1, episode=5 
        path_parts = csv_file.split(os.sep)

        # Find season number
        season_part = [p for p in path_parts if p.startswith('season_')]
        if not season_part:
            raise ValueError('Could not extract season number from path')
        season_num = int(season_part[0].replace('season_', ''))

        # Find episode number
        filename = path_parts[-1]
        episode_num = int(filename.replace('episode_', '').replace('.csv', ''))

        # Check if episode already exists
        if Episode.objects.filter(season_number=season_num, episode_number=episode_num).exists():
            self.stdout.write(f'  Episode S{season_num}E{episode_num} already exists, skipping')
            return

        #Read CSV file
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.reader(f, delimiter='|')
            row = next(reader) # CSV has only one row

        # Create episode
        episode = Episode.objects.create(
                season_number=season_num,
                episode_number=episode_num
        )

        # Parse and create categories/clues
        self._parse_episode_data(episode, row)

    def _parse_episode_data(self, episode, row):
        """
        Parse CSV row and create Category and Clue objects.

        CSV structure (pipe-delimited):
        Positions 0-5: Single Jeopardy categories
        Positions 6-35: Single Jeopardy clues (30 clues, 5 per category)
        Positions 36-65: Single Jeopardy answers
        Positions 66-71: Double Jeopardy categories
        Positions 72-101: Double Jeopardy clues
        Positions 102-131: Double Jeopardy answers
        Position 132: Final Jeopardy category
        Position 133: Final Jeopardy clue
        Position 134: Final Jeopardy answer
        """

        # Single Jeopardy
        single_categories = row[0:6]
        single_clues = row[6:36]
        single_answers = row[36:66]

        self._create_round_data(
                episode,
                'single',
                single_categories,
                single_clues,
                single_answers,
                base_value=200
        )

        # Double Jeopardy
        double_categories = row[66:72]
        double_clues = row[72:102]
        double_answers = row[102:132]

        self._create_round_data(
                episode,
                'double',
                double_categories,
                double_clues,
                double_answers,
                base_value=400
        )

        # Final Jeopardy
        final_category = row[132]
        final_clue = row[133]
        final_answer = row[134]

        category = Category.objects.create(
                episode=episode,
                name=self._clean_text(final_category),
                round_type='final',
                position=0
        )

        Clue.objects.create(
                category=category,
                question=self._clean_text(final_clue),
                answer=self._clean_text(final_answer),
                value=0, # Wagered amount
                position=0
        )

    def _create_round_data(self, episode, round_type, categories, clues, answers, base_value):
        """
        Create categories and clues for a round (Single or Double Jeopardy).

        Args:
            episode: Episode object
            round_type: 'single' or 'double'
            categories: List of 6 category names
            clues: List of 30 clue texts
            answers: List of 30 answers
            base_value: 200 for Single, 400 for Double
        """

        # Create 6 categories
        for cat_idx, cat_name in enumerate(categories):
            category = Category.objects.create(
                    episode=episode,
                    name=self._clean_text(cat_name),
                    round_type=round_type,
                    position=cat_idx
            )
            
            # Create 5 clues for this category
            # Clues are arranged: cat1_clue1, cat2_clue1, ..., cat6_clue1, cat1_clue2
            for row_idx in range(5): # 5 rows of values
                # Calculate position in clues list
                clue_idx = cat_idx + (row_idx * 6)

                value = base_value * (row_idx + 1) # 200, 400, 600, 800, 1000

                Clue.objects.create(
                        category=category,
                        question=self._clean_text(clues[clue_idx]),
                        answer=self._clean_text(answers[clue_idx]),
                        value=value,
                        position=row_idx
                )

    def _clean_text(self, text):
        """
        Clean text from CSV (remove byte string markers, extra quotes, etc.)

        Example: b'POTENT POTABLES' -> POTENT POTABLES
        """
        if not text:
            return ''

        # Remove byte string marker
        text = text.strip("b'\"")

        # Replace escaped quotes
        text = text.replace("\\'", "'")
        text = text.replace('\\"', '"')

        # Remove extra whitespace
        text = text.strip()

        return text


















