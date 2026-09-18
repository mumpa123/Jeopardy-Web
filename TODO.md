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

## Host can't start Final Jeopardy if not everyone wagered (wanted)

If a player left the game, disconnected, or just never submits a Final
Jeopardy wager, the host has no way to proceed - the "Reveal Clue" button
never appears at all.

Root cause: in `HostView.tsx`'s `fj_wager_submitted` handler, `fjStage` only
transitions to `'wagering'` (which is what makes `FinalJeopardyControls`
render the "Reveal Clue" button - see its `stage === 'wagering'` block)
once `prev.every(pa => pa.wager !== null)` is true across every player
tracked in `fjPlayerAnswers`. If one player's wager entry never arrives,
that condition never becomes true and the stage never advances. There's no
backend gate at all (`handle_reveal_fj_clue` doesn't check wager
completeness) - this is purely a frontend UI gap.

Fix should give the host a way to proceed regardless, e.g. a manual
"Reveal Clue Anyway" override alongside the automatic all-wagers-in
transition, rather than only ever gating on every tracked player having
wagered.
