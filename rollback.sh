#!/bin/bash
# Roll prod back to a previous promotion's code + database.
# Usage: ./rollback.sh <git-tag> <backup-dump-file>
# Tag/dump pairs are recorded in backups/promotions.log by promote_to_prod.sh
#
# This restores files from the tag as a NEW commit on main (does not rewrite
# history or force-push), and restores the matching database dump.
set -euo pipefail
cd "$(dirname "$0")"

TAG="${1:?Usage: rollback.sh <git-tag> <backup-dump-file>}"
DUMP="${2:?Usage: rollback.sh <git-tag> <backup-dump-file>}"

if [ ! -f "$DUMP" ]; then
    echo "Dump file not found: $DUMP" >&2
    exit 1
fi

echo "== Restoring files from $TAG as a new commit on main =="
git checkout "$TAG" -- .
git commit -m "Rollback to $TAG"

echo "== Stopping prod service (so nothing holds a connection during DB restore) =="
sudo systemctl stop jeopardy.service

echo "== Restoring database from $DUMP =="
sudo -u postgres dropdb jeopardy_v2
sudo -u postgres createdb jeopardy_v2 --owner jeopardy_user
PGPASSWORD=jeopardy_user pg_restore -U jeopardy_user -h localhost -d jeopardy_v2 --no-owner --no-acl "$DUMP"

echo "== Installing backend dependencies =="
./venv/bin/pip install --quiet -r requirements.txt

echo "== Building frontend =="
(cd frontend && npm install --silent && npx vite build)

echo "== Collecting static files =="
./venv/bin/python manage.py collectstatic --noinput --clear

echo "== Restarting prod service =="
sudo systemctl restart jeopardy.service
sleep 2
sudo systemctl is-active jeopardy.service
curl -s -o /dev/null -w 'prod health check: %{http_code}\n' http://localhost:8000/

echo ""
echo "Rollback to $TAG complete. Push the rollback commit when ready:"
echo "  git push origin main"
