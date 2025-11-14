#!/bin/bash
# Import PostgreSQL database on Arch Linux

echo "Importing Jeopardy database..."
echo ""

# Check if dump file exists
if [ ! -f "jeopardy_database_dump.sql" ]; then
    echo "✗ Error: jeopardy_database_dump.sql not found!"
    echo "Make sure you copied the database dump file to this directory."
    exit 1
fi

echo "Database dump file found: jeopardy_database_dump.sql"
echo "Size: $(du -h jeopardy_database_dump.sql | cut -f1)"
echo ""

# Import database
psql -U jeopardy_user -d jeopardy_v2 -h localhost < jeopardy_database_dump.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Database imported successfully!"
    echo ""
    echo "Verify the import:"
    echo "  psql -U jeopardy_user -d jeopardy_v2 -h localhost"
    echo "  Then run: SELECT COUNT(*) FROM games_episode;"
else
    echo ""
    echo "✗ Database import failed!"
    echo "Check error messages above for details."
fi
