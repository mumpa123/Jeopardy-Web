#!/bin/bash
# Import PostgreSQL database on Arch Linux

echo "Importing Jeopardy database..."
echo ""

# Check if dump file exists (try both .dump and .sql)
if [ -f "jeopardy_database.dump" ]; then
    DUMP_FILE="jeopardy_database.dump"
    USE_RESTORE=true
elif [ -f "jeopardy_database_dump.sql" ]; then
    DUMP_FILE="jeopardy_database_dump.sql"
    USE_RESTORE=false
else
    echo "✗ Error: Database dump file not found!"
    echo "Looking for: jeopardy_database.dump or jeopardy_database_dump.sql"
    echo "Make sure you copied the database dump file to this directory."
    exit 1
fi

echo "Database dump file found: $DUMP_FILE"
echo "Size: $(du -h $DUMP_FILE | cut -f1)"
echo ""
echo "Importing with password: jeopardy_user"
echo ""

if [ "$USE_RESTORE" = true ]; then
    # Use pg_restore for custom format (.dump files)
    echo "Using pg_restore (custom format)..."
    PGPASSWORD=jeopardy_user pg_restore -U jeopardy_user -h localhost -d jeopardy_v2 --no-owner --no-acl -v $DUMP_FILE
else
    # Use psql for SQL format (.sql files)
    echo "Using psql (SQL format)..."
    PGPASSWORD=jeopardy_user psql -U jeopardy_user -d jeopardy_v2 -h localhost -v ON_ERROR_STOP=0 -f $DUMP_FILE
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Database imported successfully!"
    echo ""
    echo "Verify the import:"
    echo "  PGPASSWORD=jeopardy_user psql -U jeopardy_user -d jeopardy_v2 -h localhost -c 'SELECT COUNT(*) FROM games_episode;'"
else
    echo ""
    echo "✗ Database import failed!"
    echo "Check error messages above for details."
fi
