# TODO

Found while fixing the frontend TypeScript build (2026-09-18), not yet implemented:

## Daily Double banner on spectator Board view - DONE (2026-09-18)

Added a banner to ClueModal (shown on the shared Board view) displaying the
Daily Double player's name and wager once the clue is revealed.

## Final Jeopardy display on spectator Board view (revisit later)

`BoardView.tsx` has no dedicated Final Jeopardy block — during the final round
it falls through to a placeholder ("No categories for final jeopardy"). Worth
checking in the browser whether this actually shows something useful in
practice before deciding what (if anything) to build here.

## Backend 'paused' game status has no frontend handling (undecided)

`Game.STATUS_CHOICES` includes `'paused'` on the backend, but nothing in the
frontend sets or displays it. Not urgent — no code path currently pauses a
game. Decide later whether a pause feature is wanted.
