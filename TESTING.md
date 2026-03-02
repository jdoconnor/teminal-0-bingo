# Testing Guide - Terminal 0 Bingo

## Overview

This document describes how to test the two-player bingo game functionality. The game has been converted from automatic item calling to **manual human-controlled gameplay**.

## Changes Made

### 1. **Removed Automatic Calling**
- Removed `alarm()` handler from Durable Object
- Removed `scheduleNextCall()` method
- Removed `nextCallTime` from GameState type
- Players now manually call items using a button

### 2. **Added Manual Controls**
- New `CALL_ITEM` message type in ClientMessage
- New `handleCallItem()` method in worker
- "Call Next Sighting" button in UI (yellow button during gameplay)
- Button appears when game status is `'playing'`

### 3. **Updated Documentation**
- AGENTS.md reflects manual gameplay
- All references to automatic calling removed
- Testing checklist updated

## Testing Approaches

### Option 1: Manual Testing (Recommended for Development)

Since the game uses Cloudflare Workers + Durable Objects, the easiest way to test is:

1. **Deploy to Cloudflare Workers:**
   ```bash
   pnpm build
   pnpm deploy
   ```

2. **Open two browser windows/tabs** to the deployed URL

3. **Test the following scenarios:**

#### Basic Two-Player Flow
- [ ] Both players can connect and join with different names
- [ ] Both players see each other in the "Manifest" sidebar
- [ ] Either player can click "Initiate Sequence" to start the game
- [ ] Both players receive new random 5x5 bingo cards
- [ ] Game status changes to "PLAYING" for both players

#### Manual Calling
- [ ] "Call Next Sighting" button appears for both players
- [ ] Any player can click the button to call an item
- [ ] Called item appears in "Sighting Log" for both players
- [ ] Same item appears in both players' logs (real-time sync)
- [ ] Called items on cards become clickable (lighter background)
- [ ] Uncalled items remain disabled (dark background)

#### Marking Items
- [ ] Players can click called items on their own cards
- [ ] Marked items turn emerald green
- [ ] Cannot mark uncalled items (buttons disabled)
- [ ] Marking is independent per player (different cards)

#### Winning
- [ ] First player to complete a row wins
- [ ] First player to complete a column wins  
- [ ] First player to complete a diagonal wins
- [ ] "SEQUENCE COMPLETE" overlay appears for both players
- [ ] Winner's name is displayed correctly
- [ ] Either player can click "Reset Simulation" to restart

#### State Synchronization
- [ ] All state changes sync in real-time
- [ ] Player disconnect removes them from Manifest
- [ ] Last player disconnect resets game state
- [ ] Reconnecting players must rejoin (new ID)

### Option 2: Playwright Tests

Automated tests are provided in `tests/two-player-gameplay.spec.ts`. However, they require the Cloudflare Workers runtime to be properly configured in local dev.

**To run tests against deployed app:**

1. Update `playwright.config.ts` baseURL to your deployed URL:
   ```typescript
   use: {
     baseURL: 'https://your-app.workers.dev',
   }
   ```

2. Remove or comment out the `webServer` section

3. Run tests:
   ```bash
   pnpm test          # Headless mode
   pnpm test:headed   # See browser
   pnpm test:ui       # Interactive UI
   ```

**Test Coverage:**
- ✅ Both players can join and see each other
- ✅ Either player can start the game
- ✅ Players can manually call items
- ✅ Both players see the same called items
- ✅ Players can mark called items on their cards
- ✅ Cannot mark uncalled items
- ✅ Winner announcement appears for both players
- ✅ Game state syncs in real-time

### Option 3: Local Development Testing

**Note:** Local WebSocket testing with Cloudflare Vite plugin can be tricky. If you encounter WebSocket connection issues:

1. **Build and preview locally:**
   ```bash
   pnpm build
   pnpm preview
   ```

2. **Or use Wrangler dev:**
   ```bash
   wrangler dev
   ```

3. **Open two browser tabs** to test multiplayer

## Common Issues

### WebSocket Connection Fails in Dev Mode
**Symptom:** "INITIALIZING TERMINAL CONNECTION..." never completes

**Solution:** Deploy to Cloudflare Workers for testing. The Cloudflare Vite plugin sometimes has issues with WebSocket upgrades in local dev.

```bash
pnpm build
pnpm deploy
```

### Items Not Appearing When Called
**Symptom:** Click "Call Next Sighting" but nothing shows in log

**Check:**
- Browser console for errors
- Network tab for WebSocket messages
- Game status is "PLAYING"

### Cannot Mark Items
**Symptom:** Clicking items does nothing

**Check:**
- Item has been called (appears in Sighting Log)
- Game status is "PLAYING"
- Player hasn't already won (hasBingo = false)

## Test Data

The game uses 50 esoteric airport sightings defined in `src/types.ts`:
- Each player gets 25 random items
- Cards are shuffled independently
- No free space in center

**Bingo Patterns:**
- 5 in a row (horizontal)
- 5 in a column (vertical)  
- 5 in a diagonal (2 diagonals possible)

## Performance Testing

For load testing with many players:
1. Deploy to Cloudflare Workers
2. Open multiple browser windows/tabs
3. Join with different names
4. Verify state syncs across all clients
5. Check Durable Object handles concurrent calls

## Regression Testing

After making changes, verify:
1. Manual calling still works
2. Real-time sync between players
3. Bingo detection (all 3 patterns)
4. Winner overlay displays correctly
5. Game restart generates new cards

## CI/CD Integration

To add tests to CI:

1. **GitHub Actions example:**
   ```yaml
   - name: Install Playwright
     run: pnpm exec playwright install --with-deps chromium
   
   - name: Run tests
     run: pnpm test
     env:
       BASE_URL: ${{ secrets.DEPLOYED_APP_URL }}
   ```

2. **Update playwright.config.ts:**
   ```typescript
   use: {
     baseURL: process.env.BASE_URL || 'http://localhost:5173',
   }
   ```

## Manual Test Checklist

Print this checklist for thorough manual testing:

```
Two-Player Gameplay Test
========================

Setup:
[ ] Deploy app to Cloudflare Workers
[ ] Open two browser windows/tabs
[ ] Both windows load successfully

Player Join:
[ ] Player 1 enters name "Alice" and joins
[ ] Player 2 enters name "Bob" and joins
[ ] Both see "Alice" in Manifest
[ ] Both see "Bob" in Manifest
[ ] Status shows "WAITING" for both

Game Start:
[ ] Player 1 clicks "Initiate Sequence"
[ ] Status changes to "PLAYING" for both
[ ] Both players receive 5x5 bingo cards
[ ] Cards are different (random)
[ ] "Call Next Sighting" button appears for both

Manual Calling:
[ ] Player 1 clicks "Call Next Sighting"
[ ] Item appears in Sighting Log for both players
[ ] Same item text in both logs
[ ] Player 2 clicks "Call Next Sighting"
[ ] Second item appears for both players
[ ] Call 5 more items (total 7 called)

Marking Items:
[ ] Player 1 finds called item on their card
[ ] Click the item - turns emerald green
[ ] Player 2 finds different called item
[ ] Click the item - turns emerald green
[ ] Try clicking uncalled item - nothing happens (disabled)
[ ] Mark 3-4 more items each

Winning:
[ ] Continue calling and marking until someone wins
[ ] "SEQUENCE COMPLETE" overlay appears for both
[ ] Winner name displayed correctly
[ ] Verify winning pattern (row/column/diagonal)

Restart:
[ ] Player 2 clicks "Reset Simulation"
[ ] Status changes to "PLAYING" for both
[ ] New cards generated (different from before)
[ ] Sighting Log clears
[ ] Can call new items

Disconnect:
[ ] Close Player 1's browser tab
[ ] Player 1 disappears from Player 2's Manifest
[ ] Player 2 can continue playing
[ ] Close Player 2's browser tab
[ ] Reopen app - game state reset

All tests passed: [ ]
```

## Next Steps

1. Deploy to Cloudflare Workers for testing
2. Run through manual test checklist
3. Fix any issues found
4. Consider adding more test scenarios
5. Document any edge cases discovered
