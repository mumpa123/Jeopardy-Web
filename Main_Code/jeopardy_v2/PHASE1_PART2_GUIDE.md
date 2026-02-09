# Phase 1 Part 2: Database Models & Data Import - Beginner's Guide

## What We're Building in This Part

Now that we have the foundation set up, we need to:
1. **Define our data structure** (database models)
2. **Create database tables** (migrations)
3. **Import CSV data** (move your old episode data into PostgreSQL)
4. **Set up basic WebSocket consumer** (real-time communication)

Think of this like furnishing your house - the foundation is built, now we add the rooms and furniture.

---

## Understanding Django Models & ORM

### What is the ORM?

**ORM = Object-Relational Mapping**

**Simple explanation:** The ORM is Django's translator between Python code and SQL database queries.

**Without ORM (the old way):**
```python
# You'd write raw SQL:
cursor.execute("SELECT * FROM episodes WHERE season_number = 5")
results = cursor.fetchall()
```

**With ORM (Django's way):**
```python
# You write Python:
episodes = Episode.objects.filter(season_number=5)
```

**Why this is amazing:**
- You write Python, Django writes SQL for you
- Works with any database (PostgreSQL, MySQL, SQLite) without changing code
- Prevents SQL injection attacks automatically
- Much easier to read and maintain

### What is a Model?

A **model** is a Python class that represents a database table.

**Real-world analogy:** Think of a model like a blueprint for a form:
- The model defines: "An Episode has a season number, episode number, and air date"
- Django creates: A database table with those columns
- When you create an Episode object: Django inserts a row into the table

**Example:**
```python
class Episode(models.Model):
    season_number = models.IntegerField()    # Column for integers
    episode_number = models.IntegerField()   # Column for integers
    air_date = models.DateField()            # Column for dates

# Usage:
episode = Episode.objects.create(
    season_number=1,
    episode_number=5,
    air_date="1984-09-14"
)
# Django automatically: INSERT INTO episodes (season_number, episode_number, air_date) VALUES (1, 5, '1984-09-14')
```

### What are Migrations?

**Migrations** are Django's way of tracking database changes.

**Real-world analogy:** Migrations are like version control for your database schema. Just like Git tracks code changes, migrations track database structure changes.

**How it works:**
1. You create/modify models in Python
2. Run `python manage.py makemigrations` - Django creates a migration file (instructions)
3. Run `python manage.py migrate` - Django applies changes to database

**Example flow:**
```
You write:              Django creates:           Database gets:
Episode model     →     0001_initial.py     →     episodes table
Add new field     →     0002_add_field.py   →     new column added
```

**Why this is useful:**
- Can roll back changes if something breaks
- Share database changes with team members
- Keep database in sync across development/production

---

## Step 1: Create Database Models

We'll create models for the entire game system. I'll explain each model as we go.

### 1.1 Users App Models

Open `users/models.py` and replace everything with:

```python
from django.db import models
from django.contrib.auth.models import User
import uuid

class Player(models.Model):
    """
    Represents a player in the game.
    Can be linked to a User account or be a guest.
    """
    # Link to Django's built-in User model (optional - for registered users)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Link to user account if player is registered"
    )

    # Display name shown in game
    display_name = models.CharField(
        max_length=50,
        help_text="Name displayed during gameplay"
    )

    # For guest players (not registered)
    guest_session = models.UUIDField(
        null=True,
        blank=True,
        default=uuid.uuid4,
        help_text="Unique identifier for guest players"
    )

    # Statistics
    total_games = models.IntegerField(
        default=0,
        help_text="Total number of games played"
    )

    total_score = models.BigIntegerField(
        default=0,
        help_text="Cumulative score across all games"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this player was created"
    )

    class Meta:
        ordering = ['-created_at']  # Newest players first
        verbose_name = 'Player'
        verbose_name_plural = 'Players'

    def __str__(self):
        """String representation shown in admin panel"""
        return self.display_name

    @property
    def average_score(self):
        """Calculate average score per game"""
        if self.total_games == 0:
            return 0
        return self.total_score / self.total_games
```

**Let's break this down:**

**Field types explained:**
- `CharField`: Text with max length (like a short answer field)
- `IntegerField`: Whole numbers (1, 2, 3, etc.)
- `BigIntegerField`: Really large whole numbers (for scores that can go negative)
- `UUIDField`: Unique identifier (like a serial number)
- `DateTimeField`: Date and time
- `OneToOneField`: Links to another model (one Player = one User)

**Key concepts:**
- `null=True`: Database can store NULL (no value)
- `blank=True`: Django forms allow empty value
- `default=0`: If not specified, use 0
- `auto_now_add=True`: Automatically set to now when created
- `on_delete=models.CASCADE`: If User is deleted, delete Player too

**The Meta class:**
- `ordering`: How objects are sorted by default
- `verbose_name`: Human-readable name (used in admin panel)

**The `__str__` method:**
- Defines how the object looks when printed
- Super useful in admin panel and debugging

**The `@property` decorator:**
- Makes a method act like a field
- `player.average_score` instead of `player.average_score()`

### 1.2 Games App Models

Open `games/models.py` and replace everything with:

```python
from django.db import models
from users.models import Player
import uuid

class Episode(models.Model):
    """
    Represents a single Jeopardy! episode with all its clues.
    One episode = one game board (Single, Double, Final Jeopardy)
    """
    season_number = models.IntegerField(
        help_text="Season number (e.g., 1, 2, 3)"
    )

    episode_number = models.IntegerField(
        help_text="Episode number within season"
    )

    air_date = models.DateField(
        null=True,
        blank=True,
        help_text="Original air date (if known)"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        # Ensure no duplicate episodes
        unique_together = ('season_number', 'episode_number')
        ordering = ['season_number', 'episode_number']
        verbose_name = 'Episode'
        verbose_name_plural = 'Episodes'

    def __str__(self):
        return f"S{self.season_number}E{self.episode_number}"

    @property
    def total_clues(self):
        """Count all clues in this episode"""
        return self.clue_set.count()


class Category(models.Model):
    """
    Represents a category on the game board.
    Each episode has 6 categories for Single, 6 for Double, 1 for Final.
    """
    ROUND_CHOICES = [
        ('single', 'Single Jeopardy'),
        ('double', 'Double Jeopardy'),
        ('final', 'Final Jeopardy'),
    ]

    episode = models.ForeignKey(
        Episode,
        on_delete=models.CASCADE,
        help_text="Which episode this category belongs to"
    )

    name = models.CharField(
        max_length=200,
        help_text="Category name (e.g., 'POTENT POTABLES')"
    )

    round_type = models.CharField(
        max_length=20,
        choices=ROUND_CHOICES,
        help_text="Which round this category appears in"
    )

    position = models.IntegerField(
        help_text="Position on board (0-5 for regular rounds)"
    )

    class Meta:
        ordering = ['episode', 'round_type', 'position']
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'

    def __str__(self):
        return f"{self.episode} - {self.name}"


class Clue(models.Model):
    """
    Represents a single clue (question/answer pair).
    Each category has 5 clues (except Final which has 1).
    """
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        help_text="Which category this clue belongs to"
    )

    question = models.TextField(
        help_text="The clue text (what's read to players)"
    )

    answer = models.TextField(
        help_text="The correct answer"
    )

    value = models.IntegerField(
        help_text="Point value (200, 400, 600, 800, 1000, or 400, 800, etc.)"
    )

    position = models.IntegerField(
        help_text="Position within category (0-4)"
    )

    is_daily_double = models.BooleanField(
        default=False,
        help_text="Is this clue a Daily Double?"
    )

    class Meta:
        ordering = ['category', 'position']
        verbose_name = 'Clue'
        verbose_name_plural = 'Clues'

    def __str__(self):
        return f"{self.category.name} - ${self.value}"


class Game(models.Model):
    """
    Represents a single game instance.
    Multiple people can play the same episode simultaneously in different games.
    """
    STATUS_CHOICES = [
        ('waiting', 'Waiting for Players'),
        ('active', 'Game in Progress'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('abandoned', 'Abandoned'),
    ]

    ROUND_CHOICES = [
        ('single', 'Single Jeopardy'),
        ('double', 'Double Jeopardy'),
        ('final', 'Final Jeopardy'),
    ]

    # Unique identifier for this game
    game_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        db_index=True,
        editable=False,
        help_text="Unique game identifier (used in URLs)"
    )

    episode = models.ForeignKey(
        Episode,
        on_delete=models.PROTECT,  # Can't delete episode if games exist
        help_text="Which episode this game uses"
    )

    host = models.ForeignKey(
        Player,
        on_delete=models.SET_NULL,
        null=True,
        related_name='hosted_games',
        help_text="Player who is hosting this game"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='waiting',
        help_text="Current game status"
    )

    current_round = models.CharField(
        max_length=20,
        choices=ROUND_CHOICES,
        default='single',
        help_text="Which round the game is currently in"
    )

    settings = models.JSONField(
        default=dict,
        blank=True,
        help_text="Game configuration (optional rules, timing, etc.)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Game'
        verbose_name_plural = 'Games'

    def __str__(self):
        return f"Game {self.game_id} ({self.status})"


class GameParticipant(models.Model):
    """
    Links a Player to a Game.
    Tracks their score and position (player 1, 2, or 3).
    """
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        help_text="Which game this participant is in"
    )

    player = models.ForeignKey(
        Player,
        on_delete=models.CASCADE,
        help_text="Which player this is"
    )

    player_number = models.IntegerField(
        help_text="Position (1, 2, or 3)"
    )

    score = models.IntegerField(
        default=0,
        help_text="Current score in this game"
    )

    final_wager = models.IntegerField(
        null=True,
        blank=True,
        help_text="Wager amount for Final Jeopardy"
    )

    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Each game can only have one player in each position
        unique_together = ('game', 'player_number')
        ordering = ['game', 'player_number']
        verbose_name = 'Game Participant'
        verbose_name_plural = 'Game Participants'

    def __str__(self):
        return f"{self.player.display_name} (Player {self.player_number}) - ${self.score}"


class GameAction(models.Model):
    """
    Audit trail: logs every action in the game.
    Used for buzzer timing, debugging, and game replay.
    """
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        help_text="Which game this action occurred in"
    )

    participant = models.ForeignKey(
        GameParticipant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Which participant performed this action"
    )

    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="When this action occurred"
    )

    action_type = models.CharField(
        max_length=50,
        help_text="Type of action (buzz, answer, score_change, etc.)"
    )

    data = models.JSONField(
        default=dict,
        help_text="Action-specific data stored as JSON"
    )

    server_timestamp_us = models.BigIntegerField(
        help_text="Microsecond precision timestamp for buzzer timing"
    )

    class Meta:
        ordering = ['timestamp']
        verbose_name = 'Game Action'
        verbose_name_plural = 'Game Actions'

    def __str__(self):
        return f"{self.action_type} at {self.timestamp}"


class ClueReveal(models.Model):
    """
    Tracks which clues have been revealed in a game.
    Records who buzzed, whether they got it right, etc.
    """
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        help_text="Which game this clue was revealed in"
    )

    clue = models.ForeignKey(
        Clue,
        on_delete=models.PROTECT,
        help_text="Which clue was revealed"
    )

    revealed_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the clue was revealed"
    )

    revealed_by = models.ForeignKey(
        GameParticipant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Who selected this clue (host picks for them)"
    )

    buzz_winner = models.ForeignKey(
        GameParticipant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='won_buzzes',
        help_text="Who buzzed in first and got to answer"
    )

    correct = models.BooleanField(
        null=True,
        blank=True,
        help_text="Was the answer correct? (None = not answered yet)"
    )

    class Meta:
        ordering = ['revealed_at']
        verbose_name = 'Clue Reveal'
        verbose_name_plural = 'Clue Reveals'

    def __str__(self):
        return f"{self.clue} revealed in {self.game}"
```

**Key Model Concepts Explained:**

**ForeignKey relationships:**
```python
category = models.ForeignKey(Category, on_delete=models.CASCADE)
```
- Creates a link between models (like a reference)
- `CASCADE`: If Category is deleted, delete all its Clues too
- `PROTECT`: Can't delete if linked objects exist
- `SET_NULL`: Set to NULL if linked object is deleted

**Real-world example:**
- Episode → Category → Clue (hierarchy)
- If you delete an Episode, all its Categories and Clues are also deleted (CASCADE)
- But you can't delete an Episode if there are active Games using it (PROTECT on Game → Episode)

**Choices:**
```python
STATUS_CHOICES = [
    ('waiting', 'Waiting for Players'),  # (value_in_db, human_readable)
    ('active', 'Game in Progress'),
]
status = models.CharField(max_length=20, choices=STATUS_CHOICES)
```
- Restricts field to specific values (like a dropdown)
- First value stored in database, second shown to users

**JSONField:**
```python
settings = models.JSONField(default=dict)
```
- Stores arbitrary JSON data
- Flexible for settings that might change
- Example: `{"allow_negative_scores": True, "time_limit": 30}`

**unique_together:**
```python
class Meta:
    unique_together = ('season_number', 'episode_number')
```
- Prevents duplicates (can't have two Season 1 Episode 5's)

---

## Step 2: Create and Apply Migrations

Now we'll create the database tables from our models.

```bash
# Generate migration files (Django creates instructions)
python manage.py makemigrations

# You should see output like:
# Migrations for 'games':
#   games/migrations/0001_initial.py
#     - Create model Episode
#     - Create model Category
#     - ...
# Migrations for 'users':
#   users/migrations/0001_initial.py
#     - Create model Player
```

**What just happened:**
Django looked at your models and created Python files with instructions to create the database tables. Check `games/migrations/0001_initial.py` - it's human-readable!

```bash
# Apply migrations (actually create the tables)
python manage.py migrate

# You should see output like:
# Running migrations:
#   Applying games.0001_initial... OK
#   Applying users.0001_initial... OK
```

**What just happened:**
Django executed SQL commands to create tables in PostgreSQL. Your database now has tables for Episode, Category, Clue, Game, Player, etc.!

**Verify it worked:**
```bash
# Connect to PostgreSQL
psql -U jeopardy_user -d jeopardy_v2

# List all tables
\dt

# You should see tables like:
# games_episode
# games_category
# games_clue
# users_player
# etc.

# Exit PostgreSQL
\q
```

---

## Step 3: Register Models in Admin Panel

Let's make our models visible in Django's admin panel so we can browse data easily.

### 3.1 Users App Admin

Edit `users/admin.py`:

```python
from django.contrib import admin
from .models import Player

@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    """
    Configure how Player model appears in admin panel
    """
    # Fields to display in list view
    list_display = ('display_name', 'total_games', 'total_score', 'average_score', 'created_at')

    # Add filters in sidebar
    list_filter = ('created_at',)

    # Add search functionality
    search_fields = ('display_name', 'user__username')

    # Fields that can't be edited
    readonly_fields = ('created_at', 'guest_session', 'average_score')

    # Organize fields into sections
    fieldsets = (
        ('Basic Information', {
            'fields': ('display_name', 'user', 'guest_session')
        }),
        ('Statistics', {
            'fields': ('total_games', 'total_score', 'average_score')
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)  # Collapsible section
        }),
    )
```

**What this does:**
- `@admin.register(Player)`: Registers Player model with admin
- `list_display`: Columns shown in list view
- `list_filter`: Filterable fields
- `search_fields`: Searchable fields
- `readonly_fields`: Can view but not edit
- `fieldsets`: Organizes edit form into sections

### 3.2 Games App Admin

Edit `games/admin.py`:

```python
from django.contrib import admin
from .models import Episode, Category, Clue, Game, GameParticipant, GameAction, ClueReveal

@admin.register(Episode)
class EpisodeAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'season_number', 'episode_number', 'air_date', 'total_clues', 'created_at')
    list_filter = ('season_number', 'created_at')
    search_fields = ('season_number', 'episode_number')
    ordering = ('season_number', 'episode_number')


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'episode', 'round_type', 'position')
    list_filter = ('round_type', 'episode__season_number')
    search_fields = ('name', 'episode__season_number')
    ordering = ('episode', 'round_type', 'position')


@admin.register(Clue)
class ClueAdmin(admin.ModelAdmin):
    list_display = ('category', 'value', 'position', 'is_daily_double', 'question_preview')
    list_filter = ('is_daily_double', 'value', 'category__round_type')
    search_fields = ('question', 'answer', 'category__name')

    def question_preview(self, obj):
        """Show first 50 characters of question"""
        return obj.question[:50] + '...' if len(obj.question) > 50 else obj.question
    question_preview.short_description = 'Question Preview'


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ('game_id', 'episode', 'host', 'status', 'current_round', 'created_at')
    list_filter = ('status', 'current_round', 'created_at')
    search_fields = ('game_id', 'host__display_name')
    readonly_fields = ('game_id', 'created_at', 'started_at', 'ended_at')

    fieldsets = (
        ('Game Information', {
            'fields': ('game_id', 'episode', 'host', 'status', 'current_round')
        }),
        ('Settings', {
            'fields': ('settings',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'started_at', 'ended_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(GameParticipant)
class GameParticipantAdmin(admin.ModelAdmin):
    list_display = ('player', 'game', 'player_number', 'score', 'joined_at')
    list_filter = ('player_number', 'joined_at')
    search_fields = ('player__display_name', 'game__game_id')
    ordering = ('game', 'player_number')


@admin.register(GameAction)
class GameActionAdmin(admin.ModelAdmin):
    list_display = ('game', 'participant', 'action_type', 'timestamp')
    list_filter = ('action_type', 'timestamp')
    search_fields = ('game__game_id', 'participant__player__display_name')
    readonly_fields = ('timestamp', 'server_timestamp_us')
    ordering = ('-timestamp',)


@admin.register(ClueReveal)
class ClueRevealAdmin(admin.ModelAdmin):
    list_display = ('game', 'clue', 'buzz_winner', 'correct', 'revealed_at')
    list_filter = ('correct', 'revealed_at')
    search_fields = ('game__game_id', 'clue__question')
    ordering = ('-revealed_at',)
```

**Test it:**
```bash
# Start server
python manage.py runserver

# Visit http://127.0.0.1:8000/admin/
# Log in with your superuser account
# You should see all your models organized nicely!
```

---

## Step 4: Create CSV Import Script

Now we'll write a script to import your existing episode data from CSV files into PostgreSQL.

### 4.1 Create Management Command Directory

```bash
# Create directory structure for custom management commands
mkdir -p games/management/commands
touch games/management/__init__.py
touch games/management/commands/__init__.py
```

**What this does:**
Creates the structure Django needs to recognize custom management commands (like `python manage.py import_episodes`).

### 4.2 Write Import Script

Create `games/management/commands/import_episodes.py`:

```python
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
            self.stdout.write(self.style.SUCCESS('✓ Data cleared'))

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
        # Example: "season_1/episode_5.csv" → season=1, episode=5
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

        # Read CSV file
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.reader(f, delimiter='|')
            row = next(reader)  # CSV has only one row

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
            value=0,  # Wagered amount
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
            # Clues are arranged: cat1_clue1, cat2_clue1, ..., cat6_clue1, cat1_clue2, ...
            for row_idx in range(5):  # 5 rows of values
                # Calculate position in clues list
                clue_idx = cat_idx + (row_idx * 6)

                value = base_value * (row_idx + 1)  # 200, 400, 600, 800, 1000

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

        Example: b'POTENT POTABLES' → POTENT POTABLES
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
```

**What this script does:**

1. **Finds CSV files:** Uses `glob` to search for all `episode_*.csv` files
2. **Extracts season/episode:** Parses filename and path to get numbers
3. **Reads CSV:** Opens file and reads the single row of data
4. **Creates Episode:** Makes Episode object in database
5. **Parses data:** Splits the 135-field row into categories, clues, and answers
6. **Creates Categories/Clues:** Inserts all data into database

**Key Python concepts:**

```python
def add_arguments(self, parser):
```
- Defines command-line options
- `--path`: Where to find CSV files
- `--clear`: Delete old data first

```python
glob.glob(pattern, recursive=True)
```
- Searches for files matching pattern
- `**/episode_*.csv` = any file named `episode_X.csv` in any subdirectory

```python
with open(file, 'r', encoding='utf-8') as f:
```
- Opens file for reading
- `with` automatically closes file when done
- `encoding='utf-8'` handles special characters

---

## Step 5: Import Episode Data

Now let's run the import script!

```bash
# Run import command
python manage.py import_episodes --path ../testChat/chat/jeopardy_clue_data/

# You should see output like:
# Found 150 CSV files
# ✓ season_1/episode_1.csv
# ✓ season_1/episode_2.csv
# ...
# 150 episodes imported successfully
```

**If you need to re-import:**
```bash
# Clear old data and import fresh
python manage.py import_episodes --path ../testChat/chat/jeopardy_clue_data/ --clear
```

**Verify the import:**
```bash
# Check database counts
python manage.py shell

# In the Python shell:
>>> from games.models import Episode, Category, Clue
>>> Episode.objects.count()
150  # Or however many episodes you have
>>> Category.objects.count()
1950  # 150 episodes × 13 categories each
>>> Clue.objects.count()
9150  # 150 episodes × 61 clues each

# Exit shell
>>> exit()
```

**Or check in admin panel:**
- Go to http://127.0.0.1:8000/admin/
- Click "Episodes" - you should see all your episodes!
- Click one episode to see its categories and clues

---

## Step 6: Create Basic WebSocket Consumer

Finally, let's set up a basic WebSocket consumer to test real-time communication.

### 6.1 Create Consumer

Edit `games/consumers.py`:

```python
from channels.generic.websocket import AsyncJsonWebsocketConsumer
import json

class GameConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time game communication.
    This is a basic version - we'll expand it in Phase 2.
    """

    async def connect(self):
        """
        Called when WebSocket connection is established.
        """
        # Get game_id from URL
        self.game_id = self.scope['url_route']['kwargs'].get('game_id', 'test')

        # Create room group name
        self.room_group_name = f'game_{self.game_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # Accept WebSocket connection
        await self.accept()

        # Send welcome message
        await self.send_json({
            'type': 'connection_established',
            'message': f'Connected to game {self.game_id}'
        })

    async def disconnect(self, close_code):
        """
        Called when WebSocket connection is closed.
        """
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive_json(self, content):
        """
        Called when we receive a message from WebSocket.
        """
        message_type = content.get('type', 'unknown')

        # Echo the message back to the group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_message',
                'message': content
            }
        )

    async def game_message(self, event):
        """
        Called when a message is sent to the group.
        Sends the message to this WebSocket.
        """
        await self.send_json(event['message'])
```

**What this does:**

- `connect()`: Run when client connects
  - Extracts game_id from URL
  - Joins a "room" (group of connections for this game)
  - Sends welcome message

- `disconnect()`: Run when client disconnects
  - Leaves the room

- `receive_json()`: Run when client sends message
  - Receives message
  - Broadcasts to everyone in the room

- `game_message()`: Run when room receives broadcast
  - Sends message to this specific client

**The flow:**
```
Client 1 sends message
    ↓
receive_json() receives it
    ↓
group_send() broadcasts to room
    ↓
game_message() on all clients (including Client 1)
    ↓
All clients receive the message
```

### 6.2 Update Routing

Edit `games/routing.py` (you created this as empty earlier):

```python
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/game/(?P<game_id>[^/]+)/$', consumers.GameConsumer.as_asgi()),
]
```

**What this does:**
- Defines WebSocket URL pattern
- `ws/game/<game_id>/` routes to GameConsumer
- `(?P<game_id>[^/]+)` captures game_id from URL

**Example:**
- Connect to: `ws://localhost:8000/ws/game/test123/`
- `game_id` will be "test123"

---

## Step 7: Test Everything

### 7.1 Start the Server

```bash
python manage.py runserver
```

### 7.2 Test Admin Panel

1. Visit http://127.0.0.1:8000/admin/
2. Check each model:
   - **Episodes:** Should see all imported episodes
   - **Categories:** Click one episode, should see categories
   - **Clues:** Should see all clues with questions/answers
   - **Players:** Empty for now (we'll create via API later)
   - **Games:** Empty for now

### 7.3 Test WebSocket (Browser Console)

1. Open http://127.0.0.1:8000/admin/ (any page)
2. Open browser console (F12 → Console tab)
3. Paste this JavaScript code:

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8000/ws/game/test123/');

// When connection opens
ws.onopen = () => {
    console.log('✓ WebSocket connected!');
};

// When we receive a message
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
};

// Send a test message
ws.send(JSON.stringify({
    type: 'test',
    message: 'Hello from browser!'
}));
```

**Expected output:**
```
✓ WebSocket connected!
Received: {type: "connection_established", message: "Connected to game test123"}
Received: {type: "test", message: "Hello from browser!"}
```

**If this works:** Your WebSocket system is functioning!

### 7.4 Test with Multiple Tabs

1. Open http://127.0.0.1:8000/admin/ in two browser tabs
2. In each tab, run the WebSocket code above
3. In one tab, send a message:
   ```javascript
   ws.send(JSON.stringify({type: 'chat', message: 'Hello everyone!'}));
   ```
4. **Both tabs should receive the message!**

This demonstrates the real-time broadcasting system.

---

## Troubleshooting

### Import Script Errors

**"No CSV files found"**
- Check the path is correct
- Use absolute path: `python manage.py import_episodes --path /full/path/to/csv/`

**"Could not extract season number"**
- CSV files must be in folders named `season_X`
- Files must be named `episode_Y.csv`

**"Index out of range"**
- CSV file doesn't have 135 fields
- Check file format (should be pipe-delimited: `|`)

### WebSocket Errors

**"Cannot connect to WebSocket"**
- Make sure Redis is running: `sudo service redis-server status`
- Check CHANNEL_LAYERS in settings.py

**"Connection refused"**
- Server must be running: `python manage.py runserver`
- Use correct URL: `ws://localhost:8000/ws/game/...` (not `http://`)

---

## Understanding What We've Built

```
┌─────────────────────────────────────────────┐
│         Database (PostgreSQL)               │
│                                             │
│  ┌─────────────┐        ┌──────────────┐  │
│  │  Episodes   │──┬────→│  Categories  │  │
│  │  (150)      │  │     │  (1950)      │  │
│  └─────────────┘  │     └───────┬──────┘  │
│                   │             │          │
│                   │     ┌───────▼──────┐  │
│                   │     │    Clues     │  │
│                   │     │    (9150)    │  │
│                   │     └──────────────┘  │
│                   │                        │
│                   └────→┌──────────────┐  │
│                         │    Games     │  │
│                         └──────┬───────┘  │
│                                │          │
│                         ┌──────▼───────┐  │
│                         │ Participants │  │
│                         └──────────────┘  │
└─────────────────────────────────────────────┘
                    ▲
                    │ Read/Write
                    │
┌───────────────────┴─────────────────────────┐
│           Django Application                │
│                                             │
│  ┌──────────────┐      ┌──────────────┐   │
│  │    Models    │      │   Consumer   │   │
│  │  (Data Layer)│      │  (WebSocket) │   │
│  └──────────────┘      └──────┬───────┘   │
└────────────────────────────────┼───────────┘
                              └─────────────────┘
```

**What we have now:**
✅ Database schema defined (7 models)
✅ All episode data imported from CSV
✅ Admin panel to browse data
✅ WebSocket consumer for real-time communication
✅ Redis handling message passing

**What's next (Phase 2):**
- Build REST API endpoints
- Create game state manager
- Implement server-authoritative buzzer
- Add authentication

---

## Summary Checklist

Make sure you've completed:                           │
                        ┌────────▼────────┐
                        │     Redis       │
                        │ (Message Queue) │


- [ ] Created all model files (users/models.py, games/models.py)
- [ ] Ran `makemigrations` successfully
- [ ] Ran `migrate` successfully
- [ ] Registered models in admin panel
- [ ] Created import script
- [ ] Imported episode data (can see in admin panel)
- [ ] Created GameConsumer
- [ ] Updated routing.py
- [ ] Tested WebSocket connection in browser console
- [ ] Tested message broadcasting between tabs

**Once all checked:** You've completed Phase 1! 🎉

Your app now has:
- Solid database foundation
- All episode data in PostgreSQL
- Working WebSocket system
- Professional admin interface

Ready to move on to Phase 2 (REST API and game logic)?
