# AGENTS.md - Terminal 0 Bingo

## Project Overview

**Terminal 0** is a multiplayer bingo game designed for players on mobile phones at airports. The theme is "esoteric airport sightings" - surreal, mysterious, and humorous observations that passengers might spot in an airport terminal.

### Game Concept
- Players receive unique 5x5 bingo cards with 25 random "sightings" from a pool of 50 esoteric items
- Items are called manually by players during gameplay
- Players mark items on their cards when they appear in the called list
- First player to complete a row, column, or diagonal wins
- Designed for casual multiplayer sessions at airports

### Technology Stack
- **Frontend**: React 19, TypeScript, TailwindCSS 4, Motion (Framer Motion)
- **Backend**: Cloudflare Workers + Durable Objects
- **Real-time**: WebSockets for live multiplayer state synchronization
- **Build**: Vite 6 with Cloudflare plugin
- **Deployment**: Cloudflare Workers (global edge network)

---

## Architecture

### File Structure
```
terminal-0-bingo/
├── src/
│   ├── App.tsx              # Main React app, WebSocket client logic
│   ├── types.ts             # Shared TypeScript types, SIGHTINGS arrays
│   ├── components/
│   │   ├── RoomSelector.tsx # Room creation/join screen
│   │   ├── Lobby.tsx        # Player name entry screen
│   │   ├── BingoCard.tsx    # 5x5 interactive bingo grid
│   │   ├── GameLog.tsx      # Scrolling list of seen items
│   │   └── ConfirmModal.tsx # Confirmation dialog component
│   ├── main.tsx             # React entry point
│   └── index.css            # Global styles
├── worker/
│   └── index.ts             # Cloudflare Worker + GameRoom Durable Object
├── tests/
│   ├── gameplay.spec.ts     # Comprehensive gameplay tests
│   └── two-player-gameplay.spec.ts  # Two-player interaction tests
├── vite.config.ts           # Vite configuration with Cloudflare plugin
├── playwright.config.ts     # Playwright test configuration
├── package.json             # Dependencies and scripts
├── README.md                # Setup and deployment instructions
└── AGENTS.md                # This file - comprehensive project documentation
```

### Key Components

#### 1. **Frontend (`src/App.tsx`)**
- Manages WebSocket connection to server
- Handles three game states: `waiting`, `playing`, `ended`
- Receives `STATE_UPDATE`, `WELCOME`, and `ERROR` messages from server
- Sends `JOIN`, `START`, and `MARK` messages to server
- Renders Lobby (pre-join), Game Board, or Winner overlay based on state

**WebSocket Flow:**
```
Client connects to /ws/{roomCode} → Server sends WELCOME with playerId + roomCode
Client sends JOIN → Server adds player to game with random card
Client sends START → Server begins game, marks center tiles as free
Client sends TOGGLE_SEEN → Server toggles item in player's seen list
Server updates marked array → Server checks for bingo
Server broadcasts STATE_UPDATE → All clients re-render
Client sends REGENERATE_CARD → Server generates new card for that player only
```

#### 2. **Backend (`worker/index.ts`)**
- **Main Worker**: Routes WebSocket upgrades to GameRoom Durable Object by room code, serves static assets
- **GameRoom Durable Object**: One instance per room code (`idFromName(roomCode)`) manages game state
  - Persists state to Durable Object storage with 48-hour expiration
  - Broadcasts state changes to all connected WebSocket clients
  - Handles player toggling items as seen/unseen

**State Management:**
- Each room has isolated game state in its Durable Object
- State persisted to Durable Object storage on every change
- When last player disconnects, state resets to initial
- Player names saved to localStorage per room for auto-rejoin

#### 3. **Shared Types (`src/types.ts`)**
- `GameState`: `status`, `players`, `winner`, `roomCode`, `createdAt`
- `Player`: `id`, `name`, `card` (25 strings), `marked` (25 booleans), `seen` (string array), `hasBingo`
- `ClientMessage`: `JOIN`, `MARK`, `TOGGLE_SEEN`, `START`, `REGENERATE_CARD`
- `ServerMessage`: `STATE_UPDATE`, `ERROR`, `WELCOME` (includes `playerId` + `roomCode`)
- `Sightings`: categorized arrays (`LOOKS_SIGHTINGS`, `BEHAVIOR_SIGHTINGS`, `SMELL_SIGHTINGS`, `OBJECT_SIGHTINGS`) with 100+ items each, combined via `ALL_SIGHTINGS`

---

## Game Flow

### 1. **Room Selection & Connection**
1. Player opens app → sees RoomSelector component
2. Player can:
   - Create new room → generates 4-character code (e.g., `ABC1`), sets URL hash, reloads
   - Join existing room → enters 4-character code, sets URL hash, reloads
3. App reads room code from URL hash (`window.location.hash`)
4. WebSocket connects to `/ws/{roomCode}`
5. Server sends `WELCOME` with unique `playerId` (UUID) and `roomCode`
6. Server sends initial `STATE_UPDATE` with current game state
7. If player has saved name in localStorage for this room, auto-joins
8. Otherwise, player enters name in Lobby → sends `JOIN` message
9. Server creates Player object with random 25-item card, adds to `gameState.players`
10. Server broadcasts updated state to all clients

### 2. **Starting the Game**
1. Any player clicks "Start Game" → sends `START` message
2. Server:
   - Sets `status` to `'playing'`
   - Resets `winner`
   - If game was `ended`, regenerates new random cards for all players
   - If game was `waiting`, keeps existing cards (players may have already marked items)
   - Center tile (index 12) is automatically marked as "free space" for all players
   - Center item added to each player's `seen` array
3. Server broadcasts updated state
4. Players can now tap any tile on their card to toggle it as seen/unseen

### 3. **Gameplay Loop**
1. Players tap any tile on their bingo card → sends `TOGGLE_SEEN` message with item text
2. Server toggles item in player's `seen` array:
   - If item already in `seen`, remove it (mark as unseen)
   - If item not in `seen`, add it (mark as seen)
3. Server updates `marked` array: for each card position, mark as true if that item is in `seen`
4. Server checks for bingo (row/column/diagonal)
5. If bingo detected:
   - Set `player.hasBingo = true`
   - Set `gameState.winner = player.name`
   - Set `status = 'ended'`
6. Server broadcasts state → all clients update
7. GameLog component shows all items marked as seen by any player, with player names

### 4. **Winning & Reset**
1. Winner overlay appears for all players
2. Any player can click "Restart Game" → sends `START`
3. Game resets with new cards and begins again

---

## Multiplayer Mechanics

### Multi-Room Architecture
- Each room has a unique 4-character code (e.g., `ABC1`, `XYZ9`)
- Room codes use characters: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no confusing chars)
- Each room is a separate Durable Object instance
- Rooms expire after 48 hours of inactivity
- Players can share room URL or room code to invite others

### Two-Player Scenario (Verified)
1. **Player A** creates room → gets room code `ABC1`
2. **Player A** shares code with **Player B**
3. **Player B** joins room `ABC1` via RoomSelector
4. Both connect to same Durable Object instance
5. Both join with names → both see each other in "Players" sidebar
6. Either player starts game → both receive cards (or keep existing if already generated)
7. Players tap tiles to mark items as seen → both see updates in GameLog in real-time
8. Players mark their own cards independently (different cards)
9. First to complete a pattern wins → both see winner announcement
10. Either player can regenerate their own card ("New Card" button) → only affects that player
11. Either player can restart → both get new cards and game resets

### State Synchronization
- Single source of truth: GameRoom Durable Object
- Every state change broadcasts to all connected clients
- Clients are stateless - they only render what server sends
- No client-side validation of marks (server enforces rules)

### Disconnect Handling
- When player disconnects, removed from `gameState.players`
- If last player disconnects, game resets to initial state
- Reconnecting players must rejoin (new playerId assigned)

---

## Key Game Rules

### Bingo Detection (`checkBingo` function)
- **Rows**: Any 5 consecutive marked cells in a row (0-4, 5-9, 10-14, 15-19, 20-24)
- **Columns**: Any 5 marked cells in same column (0,5,10,15,20 | 1,6,11,16,21 | etc.)
- **Diagonals**: 
  - Top-left to bottom-right: indices 0,6,12,18,24
  - Top-right to bottom-left: indices 4,8,12,16,20
- **Free center space** - index 12 (center tile) starts pre-marked for all players

### Card Generation
- Each player gets 25 random items from the 50-item `SIGHTINGS` pool
- Cards are shuffled independently - players have different cards
- New cards generated on every game start/restart

### Marking Rules
- Players can toggle any item on their card as seen/unseen at any time during gameplay
- No restriction on which items can be marked (player-driven gameplay)
- Tiles can be toggled on/off repeatedly
- Disabled states:
  - Game not in `'playing'` status
  - Player already has bingo

---

## UI/UX Design

### Theme: "Terminal 0" - Cyberpunk Airport
- **Color Palette**: Dark zinc grays, emerald green accents, yellow warnings
- **Typography**: Monospace font for terminal aesthetic
- **Animations**: Motion library for smooth transitions, pulse effects
- **Responsive**: Mobile-first design (primary use case: phones at airport)

### Layout
- **Header**: Game status, player count, current player name
- **Left Sidebar** (desktop) / Bottom Panel (mobile):
  - Mission Control: Start/restart button
  - Sighting Log: Scrolling list of called items with timestamps
  - Manifest: List of all players, shows who has bingo
- **Main Area**: 5x5 bingo card grid
- **Winner Overlay**: Full-screen modal when game ends

### Visual States
- **Unmarked, uncalled**: Dark gray, disabled
- **Called, unmarked**: Lighter gray, clickable, hover effects
- **Marked**: Emerald green, bold, border animation
- **Winner**: Full-screen overlay with player name

---

## Development Workflow

### Local Development
```bash
pnpm install          # Install dependencies
pnpm dev              # Start Vite dev server with Cloudflare Workers runtime
```
- Opens at `http://localhost:5173`
- WebSockets work locally via Cloudflare Vite plugin
- Hot module reload enabled (unless `DISABLE_HMR=true`)

### Testing Two Players Locally
1. Open `http://localhost:5173` in two browser tabs/windows
2. Join with different names in each tab
3. Start game from either tab
4. Mark items independently
5. Verify state syncs across both tabs

### Deployment
```bash
pnpm dlx wrangler login   # Authenticate (first time only)
pnpm build                # Build client + worker bundle
pnpm deploy               # Deploy to Cloudflare Workers
```
- Deploys to global edge network
- Durable Object provides consistent state worldwide
- WebSockets work identically to local dev

---

## Common Modifications

### Adding New Sightings
**File**: `src/types.ts`
```typescript
export const SIGHTINGS = [
  "Existing sighting...",
  "Your new esoteric sighting here",
  // Add more items (keep total count reasonable for game balance)
];
```

### Adding Automatic Calling (Optional)
The game is designed for manual calling. To add automatic calling:
1. Add `nextCallTime` back to `GameState` type
2. Implement `scheduleNextCall()` method in GameRoom
3. Add `alarm()` handler to call items on schedule
4. Call `scheduleNextCall()` from `handleStart()` and `handleCallItem()`

### Changing Bingo Rules
**File**: `worker/index.ts`, function `checkBingo`
- Modify to add free space in center (index 12)
- Add "four corners" pattern
- Require full card ("blackout")

### Styling Adjustments
**Files**: `src/App.tsx`, `src/components/*.tsx`
- TailwindCSS 4 utility classes throughout
- Responsive breakpoints: `sm:`, `md:`, `lg:`
- Motion animations: `initial`, `animate`, `exit` props

---

## Troubleshooting

### WebSocket Connection Issues
- **Local dev**: Ensure Cloudflare Vite plugin is active in `vite.config.ts`
- **Production**: Check Wrangler deployment logs for errors
- **Mixed content**: HTTPS pages require WSS protocol (handled automatically)

### State Not Syncing
- Check browser console for WebSocket errors
- Verify `broadcastState()` is called after state changes
- Ensure Durable Object storage is persisting correctly

### Cards Not Updating
- Verify `generateCard()` is called in `handleStart()`
- Check that `STATE_UPDATE` messages include full player data
- Ensure React is re-rendering when `gameState` changes

### Bingo Not Detecting
- Test `checkBingo()` function with known patterns
- Verify `marked` array indices match card layout (row-major order)
- Check diagonal index calculations (0,6,12,18,24 and 4,8,12,16,20)

---

## Security & Performance

### Security Considerations
- Player names sanitized: trimmed, max 12 chars
- WebSocket messages validated before processing
- No authentication (casual game, no sensitive data)
- Durable Object provides isolation between game rooms (currently single global room)

### Performance
- Cloudflare Workers: Sub-millisecond cold starts globally
- Durable Objects: Strongly consistent state, automatic persistence
- WebSocket broadcasts: O(n) where n = connected players
- Card generation: O(1) shuffle, negligible overhead

### Scalability
- Current design: Multiple concurrent rooms via 4-character codes
- Each room is a separate Durable Object instance
- Rooms are isolated from each other
- No global state or cross-room communication
- Cloudflare Workers scale automatically to handle many concurrent rooms

---

## Future Enhancements

### Potential Features
1. **Room System**: Multiple concurrent games with room codes
2. **Spectator Mode**: Watch games without playing
3. **Sound Effects**: Audio cues for called items, bingo win
4. **Achievements**: Track stats (games played, wins, fastest bingo)
5. **Custom Sightings**: Players submit their own items
6. **Difficulty Modes**: Faster calling, require multiple bingos
7. **Chat**: In-game messaging between players
8. **Leaderboard**: Persistent win tracking across sessions

### Technical Improvements
1. **Reconnection Logic**: Preserve playerId in localStorage, rejoin automatically
2. **Offline Support**: Service worker for PWA functionality
3. **Analytics**: Track game metrics (avg game duration, popular items)
4. **Rate Limiting**: Prevent spam clicking/starting
5. **Accessibility**: ARIA labels, keyboard navigation, screen reader support

---

## Testing

### Testing Philosophy

**Focus on Behavior and Content, Not Styles**
- Tests should verify **what the user sees and can do**, not how it looks
- Avoid testing CSS classes, colors, gradients, or visual styling
- Test for presence of text content, buttons, and interactive elements
- Test for correct game state transitions and data flow
- Test for multiplayer synchronization and real-time updates

**Use Chrome DevTools MCP for Verification**
- When writing new tests, use the `chrome-devtools` MCP server to:
  - Take snapshots of the page to verify content is present
  - Interact with elements using `uid` from snapshots
  - Verify text content and element visibility
  - Check network requests and console messages
  - Debug test failures by inspecting actual page state

### Test Framework
- **Tool**: Playwright with TypeScript
- **Location**: `tests/` directory
- **Run**: `pnpm test` (headless), `pnpm test:headed` (visible), `pnpm test:ui` (interactive)
- **Configuration**: `playwright.config.ts`

### Writing Tests

#### Good Test Practices ✅
```typescript
// ✅ Test for text content
await expect(page.locator('text=Terminal 0 Bingo')).toBeVisible();

// ✅ Test for button functionality
await page.click('button:has-text("Start Game")');

// ✅ Test for game state
await expect(page.locator('text=🎮 Playing')).toBeVisible();

// ✅ Test for element count
await expect(page.locator('.grid button')).toHaveCount(25);

// ✅ Test for data synchronization
const tileText = await firstTile.textContent();
await expect(player2.locator(`text=${tileText}`)).toBeVisible();
```

#### Bad Test Practices ❌
```typescript
// ❌ Don't test CSS classes for styling
await expect(tile).toHaveClass(/from-pink-400/);

// ❌ Don't test colors or gradients
await expect(element).toHaveCSS('background', 'linear-gradient(...)');

// ❌ Don't test specific font sizes or spacing
await expect(element).toHaveCSS('font-size', '16px');

// ❌ Don't test animation states
await expect(element).toHaveClass(/animate-pulse/);
```

### Test Coverage

#### Room Management
- [ ] User can create a new room with 4-character code
- [ ] User can join existing room by entering code
- [ ] Room code appears in URL hash
- [ ] Room code is displayed in header
- [ ] Share button copies room URL to clipboard
- [ ] Invalid room codes are rejected

#### Player Connection & Join
- [ ] Player receives unique ID on connection
- [ ] Player can enter name and join game
- [ ] Player name is saved to localStorage per room
- [ ] Player auto-rejoins on page refresh with saved name
- [ ] Multiple players can join same room
- [ ] All players see each other in Players list
- [ ] Player count updates correctly

#### Game Start
- [ ] Any player can start the game from waiting state
- [ ] Game status changes to "Playing" for all players
- [ ] All players receive bingo cards (25 tiles each)
- [ ] Center tile (index 12) is pre-marked as free space
- [ ] Cards are different for each player
- [ ] Starting from "ended" state regenerates all cards
- [ ] Starting from "waiting" state keeps existing cards

#### Gameplay - Marking Tiles
- [ ] Players can tap any tile to mark it as seen
- [ ] Tapping a marked tile unmarks it (toggle behavior)
- [ ] Marked tiles show checkmark (✓)
- [ ] Marked items appear in GameLog for all players
- [ ] GameLog shows which player marked each item
- [ ] Multiple players can mark same item independently
- [ ] Tiles are disabled when game is not playing
- [ ] Tiles are disabled when player has bingo

#### Winning & Restart
- [ ] First player to complete a row wins
- [ ] First player to complete a column wins
- [ ] First player to complete a diagonal wins
- [ ] Winner overlay appears for all players
- [ ] Winner's name is displayed correctly
- [ ] Game status changes to "Ended"
- [ ] Either player can restart the game
- [ ] Restart generates new cards for all players
- [ ] Restart resets all marked items

#### Card Regeneration
- [ ] Player can click "New Card" button during waiting/playing
- [ ] Confirmation modal appears before regenerating
- [ ] Confirming regenerates only that player's card
- [ ] Other players' cards are not affected
- [ ] Canceling modal keeps current card
- [ ] Regenerated card has different items
- [ ] Regeneration resets that player's marked items

#### State Synchronization
- [ ] All state changes broadcast to all connected players
- [ ] Players see real-time updates when others mark items
- [ ] Players see real-time updates when others join/leave
- [ ] Players see real-time updates when game starts/ends
- [ ] WebSocket reconnection works after disconnect

#### Disconnect Handling
- [ ] Player disconnect removes them from Players list
- [ ] Last player disconnect resets game state
- [ ] Reconnecting player must rejoin (new ID assigned)
- [ ] Game continues if some players disconnect

#### Edge Cases
- [ ] Second player joining doesn't reset first player's marks
- [ ] Rapid clicking doesn't cause duplicate marks
- [ ] Multiple players achieving bingo simultaneously (first wins)
- [ ] Page refresh maintains room connection
- [ ] Invalid WebSocket messages are handled gracefully

### Using Chrome DevTools MCP in Tests

When writing or debugging tests, use the Chrome DevTools MCP to verify page state:

```typescript
// Example: Verify page content using MCP
test('verify game board content', async ({ page }) => {
  await page.goto('/#ABC1');
  
  // Use MCP to take snapshot and verify content
  // This helps identify correct selectors and verify text content
  // without relying on CSS classes or styling
});
```

**MCP Tools Available:**
- `mcp0_take_snapshot`: Get text representation of page elements
- `mcp0_click`: Click elements by UID from snapshot
- `mcp0_fill`: Fill form inputs
- `mcp0_navigate_page`: Navigate to URLs
- `mcp0_list_console_messages`: Check for errors
- `mcp0_list_network_requests`: Verify API calls

### Manual Testing Checklist

For features not yet covered by automated tests:

- [ ] Mobile responsiveness (primary use case)
- [ ] Touch interactions on mobile devices
- [ ] Share button on mobile (Web Share API)
- [ ] Clipboard fallback when Web Share unavailable
- [ ] Visual polish and animations
- [ ] Accessibility (keyboard navigation, screen readers)
- [ ] Performance with many players (10+ in one room)
- [ ] Long-running games (multiple hours)
- [ ] Room expiration after 48 hours

---

## Contact & Contribution

This is a standalone game project. For modifications:
1. Fork the repository
2. Make changes locally
3. Test with `pnpm dev`
4. Deploy your own version with `pnpm deploy`

**Key Files to Understand:**
- `worker/index.ts` - All server logic
- `src/App.tsx` - Client WebSocket handling
- `src/types.ts` - Shared data structures

**Development Philosophy:**
- Keep it simple and fun
- Mobile-first design
- Real-time multiplayer is core feature
- Esoteric theme should be maintained in any new sightings
