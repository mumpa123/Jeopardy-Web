# TODO

Found while fixing the frontend TypeScript build (2026-09-18), not yet implemented:

## Daily Double banner missing on spectator Board view (wanted)

`BoardView.tsx` (the shared/TV screen route) tracks `isDailyDouble`, `ddPlayerName`,
and `ddWager` correctly when a Daily Double happens (state updates on the
`daily_double_detected` / `daily_double_revealed` / `wager_submitted` messages),
but nothing renders them — spectators watching the shared board never see who's
on the Daily Double or what they wagered. `showDDAnimation` triggers some
existing animation, but it doesn't appear to surface the player name/wager.
Add a banner using this state (already there in `useState`, just needs JSX).

## Final Jeopardy display on spectator Board view (revisit later)

`BoardView.tsx` has no dedicated Final Jeopardy block — during the final round
it falls through to a placeholder ("No categories for final jeopardy"). Worth
checking in the browser whether this actually shows something useful in
practice before deciding what (if anything) to build here.

## Backend 'paused' game status has no frontend handling (undecided)

`Game.STATUS_CHOICES` includes `'paused'` on the backend, but nothing in the
frontend sets or displays it. Not urgent — no code path currently pauses a
game. Decide later whether a pause feature is wanted.
