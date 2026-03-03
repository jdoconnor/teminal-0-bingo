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
│   ├── types.ts             # Shared TypeScript types, SIGHTINGS array
│   ├── components/
│   │   ├── Lobby.tsx        # Player name entry screen
│   │   ├── BingoCard.tsx    # 5x5 interactive bingo grid
│   │   └── GameLog.tsx      # Scrolling list of called items
│   ├── main.tsx             # React entry point
│   └── index.css            # Global styles
├── worker/
│   └── index.ts             # Cloudflare Worker + GameRoom Durable Object
├── vite.config.ts           # Vite configuration with Cloudflare plugin
├── package.json             # Dependencies and scripts
└── README.md                # Setup and deployment instructions
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
Client connects → Server sends WELCOME with playerId
Client sends JOIN → Server adds player to game
Client sends START → Server begins game (no auto-calling)
Client sends CALL_ITEM → Server calls random uncalled item
Server broadcasts STATE_UPDATE → All clients re-render
Client sends MARK → Server validates and checks for bingo
```

#### 2. **Backend (`worker/index.ts`)**
- **Main Worker**: Routes WebSocket upgrades to GameRoom Durable Object, serves static assets
- **GameRoom Durable Object**: Single global instance (`idFromName('global')`) manages all game state
  - Persists state to Durable Object storage
  - Broadcasts state changes to all connected WebSocket clients
  - Handles manual item calling via CALL_ITEM messages

**State Management:**
- All players share one global game room
- State persisted to Durable Object storage on every change
- When last player disconnects, state resets to initial

#### 3. **Shared Types (`src/types.ts`)**
- `GameState`: `status`, `players`, `winner`, `roomCode`, `createdAt`
- `Player`: `id`, `name`, `card` (25 strings), `marked` (25 booleans), `seen` items, `hasBingo`
- `ClientMessage`: `JOIN`, `MARK`, `TOGGLE_SEEN`, `START`, `REGENERATE_CARD`
- `ServerMessage`: `STATE_UPDATE`, `ERROR`, `WELCOME` (includes `playerId` + `roomCode`)
- `Sightings`: categorized arrays (`LOOKS`, `BEHAVIOR`, `SMELL`, `OBJECT`) combined via `ALL_SIGHTINGS`

---

## Game Flow

### 1. **Connection & Join**
1. Player opens app → WebSocket connects to server
2. Server sends `WELCOME` with unique `playerId` (UUID)
3. Server sends initial `STATE_UPDATE` with current game state
4. Player enters name in Lobby → sends `JOIN` message
5. Server creates Player object with random 25-item card, adds to `gameState.players`
6. Server broadcasts updated state to all clients

### 2. **Starting the Game**
1. Any player clicks "Start Game" → sends `START` message
2. Server:
   - Sets `status` to `'playing'`
   - Resets `winner`
   - Generates new random cards for all players
   - Center tile (index 12) is automatically marked as "free space"
3. Server broadcasts updated state
4. Players can now tap any tile on their card to mark it as seen

### 3. **Gameplay Loop**
1. Players tap any tile on their bingo card → sends `TOGGLE_SEEN` message with item text
2. Server toggles item in player's `seen` array:
   - If item already in `seen`, remove it (mark as unseen)
   - If item not in `seen`, add it (mark as seen)
3. Server updates `marked` array based on which card items are in `seen`
4. Server checks for bingo (row/column/diagonal)
5. If bingo detected:
   - Set `player.hasBingo = true`
   - Set `gameState.winner = player.name`
   - Set `status = 'ended'`
6. Server broadcasts state → all clients update
7. Sighting log shows all items marked as seen by any player

### 4. **Winning & Reset**
1. Winner overlay appears for all players
2. Any player can click "Restart Game" → sends `START`
3. Game resets with new cards and begins again

---

## Multiplayer Mechanics

### Two-Player Scenario (Verified)
1. **Player A** connects → receives playerId `abc-123`
2. **Player B** connects → receives playerId `def-456`
3. Both join with names → both see each other in "Manifest" sidebar
4. Either player starts game → both receive new cards simultaneously
5. Any player calls items manually → both see same called items in real-time
6. Players mark their own cards independently
7. First to complete a pattern wins → both see winner announcement
8. Either player can regenerate thier own card. it does not affect other players' cards
9. Either player can restart → both get new cards

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
- Players can only mark items that have been called
- Once marked, cells cannot be unmarked
- Disabled states:
  - Game not in `'playing'` status
  - Item not yet called
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
- Current design: Single global game room (all players in one game)
- To support multiple concurrent games:
  - Use room codes instead of `idFromName('global')`
  - Add lobby system to create/join rooms
  - Modify worker to route to different Durable Object instances

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

## Testing Checklist

### Manual Testing for Two Players
- [ ] Both players can connect simultaneously
- [ ] Both players see each other in Manifest
- [ ] Either player can start the game
- [ ] Players can manually call items using "Call Next Sighting" button
- [ ] Both players see the same called items
- [ ] Players can mark their own cards independently
- [ ] Marking an uncalled item does nothing
- [ ] First player to complete a pattern wins
- [ ] Winner announcement appears for both players
- [ ] Either player can restart the game
- [ ] New cards are generated on restart
- [ ] Player disconnect removes them from Manifest
- [ ] Last player disconnect resets game state

### Edge Cases
- [ ] Starting game with 0 players (should be prevented by UI)
- [ ] Starting game while already playing (should be no-op)
- [ ] Marking same cell twice (should be no-op)
- [ ] All 50 items called without winner (game ends)
- [ ] Rapid clicking during network lag
- [ ] Multiple players achieving bingo simultaneously (first processed wins)

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
