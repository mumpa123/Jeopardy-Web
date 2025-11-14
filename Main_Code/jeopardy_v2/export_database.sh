#!/bin/bash
# Export PostgreSQL database for transfer to Arch Linux

echo "Exporting Jeopardy database..."
echo "This will create jeopardy_database_dump.sql in the current directory"
echo ""

# Export database
pg_dump -U jeopardy_user -h localhost jeopardy_v2 > jeopardy_database_dump.sql

if [ $? -eq 0 ]; then
    echo "✓ Database exported successfully!"
    echo ""
    echo "File created: jeopardy_database_dump.sql"
    echo "Size: $(du -h jeopardy_database_dump.sql | cut -f1)"
    echo ""
    echo "Transfer this file to your Arch laptop and run:"
    echo "  psql -U jeopardy_user -d jeopardy_v2 -h localhost < jeopardy_database_dump.sql"
else
    echo "✗ Database export failed!"
    echo "Make sure PostgreSQL is running and you have access to the database."
fi
