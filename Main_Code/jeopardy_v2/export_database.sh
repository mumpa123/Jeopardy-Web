#!/bin/bash
# Export PostgreSQL database for transfer to Arch Linux

echo "Exporting Jeopardy database..."
echo "This will create jeopardy_database.dump in the current directory"
echo "Using PostgreSQL custom format (more reliable than SQL)"
echo ""

# Export database using custom format (handles special characters better)
PGPASSWORD=jeopardy_user pg_dump -U jeopardy_user -h localhost jeopardy_v2 --no-owner --no-acl -Fc -f jeopardy_database.dump

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Database exported successfully!"
    echo ""
    echo "File created: jeopardy_database.dump"
    echo "Size: $(du -h jeopardy_database.dump | cut -f1)"
    echo ""
    echo "Transfer this file to your Arch laptop and run:"
    echo "  PGPASSWORD=jeopardy_user pg_restore -U jeopardy_user -h localhost -d jeopardy_v2 --no-owner --no-acl jeopardy_database.dump"
    echo ""
    echo "Or use the import script: ./import_database.sh"
else
    echo ""
    echo "✗ Database export failed!"
    echo "Make sure PostgreSQL is running and you have access to the database."
    echo ""
    echo "Try manually:"
    echo "  PGPASSWORD=jeopardy_user pg_dump -U jeopardy_user -h localhost jeopardy_v2 -Fc -f jeopardy_database.dump"
fi
