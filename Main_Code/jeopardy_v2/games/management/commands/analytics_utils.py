"""
Utility functions for Jeopardy analytics commands.
Provides text processing, n-gram generation, and helper functions.
"""

import re
from collections import Counter
from typing import List, Tuple, Dict, Any


# Common English stop words to filter out from analysis
STOP_WORDS = {
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'this', 'these', 'those', 'their',
    'them', 'they', 'we', 'you', 'your', 'our', 'or', 'but', 'not',
    'all', 'can', 'had', 'have', 'her', 'his', 'if', 'into', 'no',
    'than', 'then', 'there', 'when', 'where', 'which', 'who', 'whom',
    'why', 'would', 'been', 'were', 'what', 'more', 'may', 'such',
    'each', 'some', 'any', 'many', 'much', 'other', 'so', 'very'
}


def clean_text(text: str) -> str:
    """
    Clean text by removing special characters and normalizing whitespace.

    Args:
        text: Raw text string

    Returns:
        Cleaned text string
    """
    if not text:
        return ""

    # Convert to uppercase
    text = text.upper()

    # Remove special characters but keep spaces, hyphens, and apostrophes
    text = re.sub(r'[^A-Z0-9\s\-\']', ' ', text)

    # Normalize whitespace
    text = ' '.join(text.split())

    return text


def tokenize(text: str, remove_stop_words: bool = True, min_length: int = 2) -> List[str]:
    """
    Tokenize text into words.

    Args:
        text: Text to tokenize
        remove_stop_words: Whether to filter out common stop words
        min_length: Minimum word length to include

    Returns:
        List of tokens
    """
    text = clean_text(text)
    words = text.split()

    # Filter by length
    words = [w for w in words if len(w) >= min_length]

    # Filter stop words if requested
    if remove_stop_words:
        words = [w for w in words if w.lower() not in STOP_WORDS]

    return words


def generate_ngrams(tokens: List[str], n: int = 2) -> List[str]:
    """
    Generate n-grams from a list of tokens.

    Args:
        tokens: List of word tokens
        n: Size of n-grams (2 for bigrams, 3 for trigrams, etc.)

    Returns:
        List of n-gram strings
    """
    if len(tokens) < n:
        return []

    ngrams = []
    for i in range(len(tokens) - n + 1):
        ngram = ' '.join(tokens[i:i+n])
        ngrams.append(ngram)

    return ngrams


def extract_word_frequencies(texts: List[str],
                             remove_stop_words: bool = True,
                             min_length: int = 2) -> Counter:
    """
    Extract word frequencies from a list of texts.

    Args:
        texts: List of text strings
        remove_stop_words: Whether to filter out common stop words
        min_length: Minimum word length to include

    Returns:
        Counter object with word frequencies
    """
    all_words = []
    for text in texts:
        words = tokenize(text, remove_stop_words=remove_stop_words, min_length=min_length)
        all_words.extend(words)

    return Counter(all_words)


def extract_ngram_frequencies(texts: List[str],
                              n: int = 2,
                              remove_stop_words: bool = True,
                              min_length: int = 2) -> Counter:
    """
    Extract n-gram frequencies from a list of texts.

    Args:
        texts: List of text strings
        n: Size of n-grams
        remove_stop_words: Whether to filter out common stop words
        min_length: Minimum word length to include

    Returns:
        Counter object with n-gram frequencies
    """
    all_ngrams = []
    for text in texts:
        tokens = tokenize(text, remove_stop_words=remove_stop_words, min_length=min_length)
        ngrams = generate_ngrams(tokens, n)
        all_ngrams.extend(ngrams)

    return Counter(all_ngrams)


def format_percentage(count: int, total: int, decimals: int = 2) -> str:
    """
    Format a count as a percentage of total.

    Args:
        count: The count value
        total: The total value
        decimals: Number of decimal places

    Returns:
        Formatted percentage string
    """
    if total == 0:
        return "0.00%"
    percentage = (count / total) * 100
    return f"{percentage:.{decimals}f}%"


def format_table_row(columns: List[Any], widths: List[int]) -> str:
    """
    Format a table row with fixed column widths.

    Args:
        columns: List of column values
        widths: List of column widths

    Returns:
        Formatted row string
    """
    parts = []
    for i, (col, width) in enumerate(zip(columns, widths)):
        col_str = str(col)
        if i == 0:  # Left align first column
            parts.append(col_str.ljust(width))
        else:  # Right align other columns
            parts.append(col_str.rjust(width))

    return ' | '.join(parts)


def print_separator(widths: List[int]) -> None:
    """
    Print a table separator line.

    Args:
        widths: List of column widths
    """
    parts = ['-' * width for width in widths]
    print('-+-'.join(parts))


def print_table(headers: List[str], rows: List[List[Any]], widths: List[int]) -> None:
    """
    Print a formatted table.

    Args:
        headers: List of column headers
        rows: List of row data
        widths: List of column widths
    """
    # Print header
    print(format_table_row(headers, widths))
    print_separator(widths)

    # Print rows
    for row in rows:
        print(format_table_row(row, widths))


def truncate_text(text: str, max_length: int = 50) -> str:
    """
    Truncate text to a maximum length with ellipsis.

    Args:
        text: Text to truncate
        max_length: Maximum length

    Returns:
        Truncated text
    """
    if len(text) <= max_length:
        return text
    return text[:max_length-3] + '...'
