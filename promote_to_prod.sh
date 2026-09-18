#!/bin/bash
# Promote the `test` branch to production, with an automatic rollback point.
# Run this from the prod checkout (/home/patrick/jeopardy).
set -euo pipefail
cd "$(dirname "$0")"

echo "== Backing up prod database (rollback point) =="
BACKUP_OUTPUT="$(./backup_database.sh)"
echo "$BACKUP_OUTPUT"
DUMP_FILE="$(echo "$BACKUP_OUTPUT" | grep -oE 'backups/jeopardy_v2_[0-9_]+\.dump')"

TAG="prod-$(date +%Y%m%d_%H%M%S)"
echo "== Tagging current prod commit as $TAG =="
git tag "$TAG"

echo "$TAG	$DUMP_FILE	$(date -Iseconds)" >> backups/promotions.log

echo "== Fetching and merging origin/test =="
git fetch origin test
git merge --no-edit origin/test

echo "== Installing backend dependencies =="
./venv/bin/pip install --quiet -r requirements.txt

echo "== Running migrations =="
./venv/bin/python manage.py migrate

echo "== Building frontend =="
(cd frontend && npm install --silent && npx vite build)

echo "== Collecting static files =="
./venv/bin/python manage.py collectstatic --noinput --clear

echo "== Restarting prod service =="
sudo systemctl restart jeopardy.service
sleep 2
sudo systemctl is-active jeopardy.service
curl -s -o /dev/null -w 'prod health check: %{http_code}\n' http://localhost:8000/

echo "== Pushing merge commit and tag to origin =="
git push origin main
git push origin "$TAG"

echo ""
echo "Promotion complete."
echo "Rollback point: $TAG  (db backup: $DUMP_FILE)"
echo "To roll back: ./rollback.sh $TAG $DUMP_FILE"
