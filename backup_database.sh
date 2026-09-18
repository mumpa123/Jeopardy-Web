#!/bin/bash
# Automated, timestamped Postgres backup with rotation.
# Run manually, or via the weekly cron entry.
set -euo pipefail
cd "$(dirname "$0")"

BACKUP_DIR="backups"
RETENTION=8
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="$BACKUP_DIR/jeopardy_v2_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

PGPASSWORD=jeopardy_user pg_dump -U jeopardy_user -h localhost jeopardy_v2 --no-owner --no-acl -Fc -f "$DUMP_FILE"

echo "$(date): Backup created: $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"

# Keep only the most recent $RETENTION dumps
ls -1t "$BACKUP_DIR"/jeopardy_v2_*.dump 2>/dev/null | tail -n +$((RETENTION + 1)) | xargs -r rm -v
