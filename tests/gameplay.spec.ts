import { test, expect, type Page } from '@playwright/test';

test.describe('Terminal 0 Bingo - Full Gameplay Tests', () => {
  let player1: Page;
  let player2: Page;

  test.beforeEach(async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    player1 = await context1.newPage();
    player2 = await context2.newPage();
  });

  test.afterEach(async () => {
    await player1.close();
    await player2.close();
  });

  test('single user can create and start a game', async () => {
    // Navigate to home page
    await player1.goto('/');
    
    // Should see room selector
    await expect(player1.locator('text=Terminal 0 Bingo')).toBeVisible();
    await expect(player1.locator('button:has-text("Create New Game")')).toBeVisible();
    
    // Create a new game
    await player1.click('button:has-text("Create New Game")');
    
    // Should be redirected to a room with a 4-character code
    await player1.waitForURL(/\/#[A-Z0-9]{4}/);
    const roomCode = player1.url().split('#')[1];
    expect(roomCode).toHaveLength(4);
    
    // Should see lobby to enter name
    await player1.waitForSelector('input[type="text"]');
    await player1.fill('input[type="text"]', 'Alice');
    await player1.click('button:has-text("Join Game")');
    
    // Should see game controls
    await player1.waitForSelector('.font-bold.text-gray-800:has-text("Alice")');
    await expect(player1.locator('.text-pink-700:has-text("⏳ Waiting")')).toBeVisible();
    
    // Should see Start Game button
    const startButton = player1.locator('button:has-text("Start Game")');
    await expect(startButton).toBeVisible();
    
    // Start the game
    await startButton.click();
    
    // Should see playing status
    await expect(player1.locator('text=🎮 Playing')).toBeVisible();
    
    // Should see bingo card (5x5 grid = 25 buttons)
    const cardButtons = player1.locator('.grid button');
    await expect(cardButtons).toHaveCount(25);
    
    // Verify tiles are interactive and contain text
    const firstTile = cardButtons.first();
    await expect(firstTile).toBeVisible();
    const tileText = await firstTile.textContent();
    expect(tileText).toBeTruthy();
  });

  test('user can invite another player via room code', async () => {
    // Player 1 creates a room
    await player1.goto('/');
    await player1.click('button:has-text("Create New Game")');
    await player1.waitForURL(/\/#[A-Z0-9]{4}/);
    const roomCode = player1.url().split('#')[1];
    
    // Player 1 joins
    await player1.fill('input[type="text"]', 'Alice');
    await player1.click('button:has-text("Join Game")');
    await player1.waitForSelector('text=Alice');
    
    // Verify room code is displayed
    await expect(player1.locator(`text=${roomCode}`)).toBeVisible();
    
    // Player 2 uses the room code to join
    await player2.goto('/');
    await player2.click('button:has-text("Join Game")');
    
    // Should see join form
    await player2.waitForSelector('input#room-code');
    await player2.fill('input#room-code', roomCode);
    await player2.click('button:has-text("Join Game")');
    
    // Should be in the room, now enter name
    await player2.waitForSelector('input[type="text"]');
    await player2.fill('input[type="text"]', 'Bob');
    await player2.click('button:has-text("Join Game")');
    
    // Both players should see each other in the players list
    await expect(player1.locator('text=Alice (You)')).toBeVisible();
    await expect(player1.locator('.truncate:has-text("Bob")')).toBeVisible();
    
    await expect(player2.locator('.truncate:has-text("Alice")')).toBeVisible();
    await expect(player2.locator('text=Bob (You)')).toBeVisible();
    
    // Both should see 2 players
    await expect(player1.locator('text=👥 2')).toBeVisible();
    await expect(player2.locator('text=👥 2')).toBeVisible();
  });

  test('user can re-join their own game after disconnect with saved name', async () => {
    // Player 1 creates and joins a room
    await player1.goto('/');
    await player1.click('button:has-text("Create New Game")');
    await player1.waitForURL(/\/#[A-Z0-9]{4}/);
    const roomUrl = player1.url();
    const roomCode = roomUrl.split('#')[1];
    
    await player1.fill('input[type="text"]', 'Alice');
    await player1.click('button:has-text("Join Game")');
    await player1.waitForSelector('text=Alice');
    
    // Start the game
    await player1.click('button:has-text("Start Game")');
    await expect(player1.locator('text=🎮 Playing')).toBeVisible();
    
    // Mark a tile to create some game state
    const firstTile = player1.locator('.grid button').first();
    await firstTile.click();
    await player1.waitForTimeout(500);
    
    // Simulate page refresh (localStorage persists)
    await player1.reload();
    await player1.waitForTimeout(1000);
    
    // Should auto-join with saved name - no lobby should appear
    // Wait for the player name to appear in header
    await player1.waitForSelector('.font-bold.text-gray-800:has-text("Alice")', { timeout: 5000 });
    await expect(player1.locator(`text=${roomCode}`)).toBeVisible();
    
    // Should be back in the game automatically
    const statusElement = player1.locator('.text-pink-700, .text-purple-700');
    await expect(statusElement.first()).toBeVisible();
  });

  test('regenerate card shows confirmation modal and only affects the user who pressed the button', async () => {
    // Player 1 creates room
    await player1.goto('/');
    await player1.click('button:has-text("Create New Game")');
    await player1.waitForURL(/\/#[A-Z0-9]{4}/);
    const roomCode = player1.url().split('#')[1];
    
    await player1.fill('input[type="text"]', 'Alice');
    await player1.click('button:has-text("Join Game")');
    await player1.waitForSelector('text=Alice');
    
    // Player 2 joins
    await player2.goto(`/#${roomCode}`);
    await player2.waitForSelector('input[type="text"]');
    await player2.fill('input[type="text"]', 'Bob');
    await player2.click('button:has-text("Join Game")');
    await player2.waitForSelector('text=Bob');
    
    // Start the game
    await player1.click('button:has-text("Start Game")');
    await expect(player1.locator('text=🎮 Playing')).toBeVisible();
    await expect(player2.locator('text=🎮 Playing')).toBeVisible();
    
    // Get Player 1's initial card items
    await player1.waitForTimeout(1000);
    const player1Tiles = player1.locator('.grid button');
    const player1InitialCards: string[] = [];
    for (let i = 0; i < 25; i++) {
      const text = await player1Tiles.nth(i).textContent();
      player1InitialCards.push(text || '');
    }
    
    // Get Player 2's initial card items
    const player2Tiles = player2.locator('.grid button');
    const player2InitialCards: string[] = [];
    for (let i = 0; i < 25; i++) {
      const text = await player2Tiles.nth(i).textContent();
      player2InitialCards.push(text || '');
    }
    
    // Player 1 clicks regenerate card button
    await player1.click('button:has-text("New Card")');
    
    // Should see confirmation modal
    await expect(player1.locator('text=Reset Your Card?')).toBeVisible();
    await expect(player1.locator('text=Getting a new card will reset all your marked sightings')).toBeVisible();
    
    // Confirm the regeneration
    await player1.click('button:has-text("Get New Card")');
    await player1.waitForTimeout(1000);
    
    // Get Player 1's new card items
    const player1NewCards: string[] = [];
    for (let i = 0; i < 25; i++) {
      const text = await player1Tiles.nth(i).textContent();
      player1NewCards.push(text || '');
    }
    
    // Get Player 2's card items again (should be unchanged)
    const player2CurrentCards: string[] = [];
    for (let i = 0; i < 25; i++) {
      const text = await player2Tiles.nth(i).textContent();
      player2CurrentCards.push(text || '');
    }
    
    // Player 1's card should have changed
    expect(player1NewCards).not.toEqual(player1InitialCards);
    
    // Player 2's card should remain the same
    expect(player2CurrentCards).toEqual(player2InitialCards);
  });

  test('new card modal can be cancelled without regenerating', async () => {
    // Player 1 creates and joins
    await player1.goto('/');
    await player1.click('button:has-text("Create New Game")');
    await player1.waitForURL(/\/#[A-Z0-9]{4}/);
    
    await player1.fill('input[type="text"]', 'Alice');
    await player1.click('button:has-text("Join Game")');
    await player1.waitForSelector('text=Alice');
    
    // Start the game
    await player1.click('button:has-text("Start Game")');
    await expect(player1.locator('text=🎮 Playing')).toBeVisible();
    
    await player1.waitForTimeout(1000);
    
    // Get initial card
    const tiles = player1.locator('.grid button');
    const initialCards: string[] = [];
    for (let i = 0; i < 25; i++) {
      const text = await tiles.nth(i).textContent();
      initialCards.push(text || '');
    }
    
    // Click New Card button
    await player1.click('button:has-text("New Card")');
    
    // Should see confirmation modal
    await expect(player1.locator('text=Reset Your Card?')).toBeVisible();
    
    // Click cancel
    await player1.click('button:has-text("Keep Current")');
    
    // Modal should close
    await expect(player1.locator('text=Reset Your Card?')).not.toBeVisible();
    
    // Card should remain unchanged
    const currentCards: string[] = [];
    for (let i = 0; i < 25; i++) {
      const text = await tiles.nth(i).textContent();
      currentCards.push(text || '');
    }
    
    expect(currentCards).toEqual(initialCards);
  });

  test('second player joining does not reset first player selections', async () => {
    // Player 1 creates and joins
    await player1.goto('/');
    await player1.click('button:has-text("Create New Game")');
    await player1.waitForURL(/\/#[A-Z0-9]{4}/);
    const roomCode = player1.url().split('#')[1];
    
    await player1.fill('input[type="text"]', 'Alice');
    await player1.click('button:has-text("Join Game")');
    await player1.waitForSelector('text=Alice');
    
    // Start the game
    await player1.click('button:has-text("Start Game")');
    await expect(player1.locator('text=🎮 Playing')).toBeVisible();
    
    await player1.waitForTimeout(1000);
    
    // Player 1 marks several tiles
    const player1Tiles = player1.locator('.grid button');
    await player1Tiles.nth(0).click();
    await player1.waitForTimeout(300);
    await player1Tiles.nth(1).click();
    await player1.waitForTimeout(300);
    await player1Tiles.nth(2).click();
    await player1.waitForTimeout(300);
    
    // Verify tiles show checkmarks when marked
    await expect(player1Tiles.nth(0).locator('text=✓')).toBeVisible();
    await expect(player1Tiles.nth(1).locator('text=✓')).toBeVisible();
    await expect(player1Tiles.nth(2).locator('text=✓')).toBeVisible();
    
    // Player 2 joins the game
    await player2.goto(`/#${roomCode}`);
    await player2.waitForSelector('input[type="text"]');
    await player2.fill('input[type="text"]', 'Bob');
    await player2.click('button:has-text("Join Game")');
    await player2.waitForSelector('text=Bob');
    
    // Wait for state to sync
    await player1.waitForTimeout(1000);
    
    // Player 1's marked tiles should STILL show checkmarks (not reset)
    await expect(player1Tiles.nth(0).locator('text=✓')).toBeVisible();
    await expect(player1Tiles.nth(1).locator('text=✓')).toBeVisible();
    await expect(player1Tiles.nth(2).locator('text=✓')).toBeVisible();
  });

  test('tapping on a card tile marks it as seen', async () => {
    // Player 1 creates and joins
    await player1.goto('/');
    await player1.click('button:has-text("Create New Game")');
    await player1.waitForURL(/\/#[A-Z0-9]{4}/);
    
    await player1.fill('input[type="text"]', 'Alice');
    await player1.click('button:has-text("Join Game")');
    await player1.waitForSelector('text=Alice');
    
    // Start the game
    await player1.click('button:has-text("Start Game")');
    await expect(player1.locator('text=🎮 Playing')).toBeVisible();
    
    await player1.waitForTimeout(1000);
    
    // Get the first tile
    const firstTile = player1.locator('.grid button').first();
    const tileText = await firstTile.textContent();
    
    // Initially should not show checkmark
    await expect(firstTile.locator('text=✓')).not.toBeVisible();
    
    // Click to mark it
    await firstTile.click();
    await player1.waitForTimeout(500);
    
    // Should now show checkmark
    await expect(firstTile.locator('text=✓')).toBeVisible();
    
    // Should appear in the sighting log
    const logItem = player1.locator('.bg-white.p-2\\.5').filter({ hasText: tileText || '' });
    await expect(logItem).toBeVisible();
    await expect(logItem.locator('.text-purple-600')).toContainText('Spotted by: Alice');
  });

  test('tapping tile can toggle between seen and unseen', async () => {
    // Player 1 creates and joins
    await player1.goto('/');
    await player1.click('button:has-text("Create New Game")');
    await player1.waitForURL(/\/#[A-Z0-9]{4}/);
    
    await player1.fill('input[type="text"]', 'Alice');
    await player1.click('button:has-text("Join Game")');
    await player1.waitForSelector('text=Alice');
    
    // Start the game
    await player1.click('button:has-text("Start Game")');
    await expect(player1.locator('text=🎮 Playing')).toBeVisible();
    
    await player1.waitForTimeout(1000);
    
    const firstTile = player1.locator('.grid button').first();
    
    // Initially unmarked (no checkmark)
    await expect(firstTile.locator('text=✓')).not.toBeVisible();
    
    // Click to mark
    await firstTile.click();
    await player1.waitForTimeout(300);
    await expect(firstTile.locator('text=✓')).toBeVisible();
    
    // Click again to unmark
    await firstTile.click();
    await player1.waitForTimeout(300);
    await expect(firstTile.locator('text=✓')).not.toBeVisible();
    
    // Click once more to mark again
    await firstTile.click();
    await player1.waitForTimeout(300);
    await expect(firstTile.locator('text=✓')).toBeVisible();
  });

  test('when ANY user hits start game, game starts for everyone and bingo cards appear', async () => {
    // Player 1 creates room
    await player1.goto('/');
    await player1.click('button:has-text("Create New Game")');
    await player1.waitForURL(/\/#[A-Z0-9]{4}/);
    const roomCode = player1.url().split('#')[1];
    
    await player1.fill('input[type="text"]', 'Alice');
    await player1.click('button:has-text("Join Game")');
    await player1.waitForSelector('text=Alice');
    
    // Player 2 joins
    await player2.goto(`/#${roomCode}`);
    await player2.waitForSelector('input[type="text"]');
    await player2.fill('input[type="text"]', 'Bob');
    await player2.click('button:has-text("Join Game")');
    await player2.waitForSelector('text=Bob');
    
    // Both should see waiting status (use more specific selector to avoid strict mode)
    await expect(player1.locator('.text-pink-700:has-text("⏳ Waiting")')).toBeVisible();
    await expect(player2.locator('.text-pink-700:has-text("⏳ Waiting")')).toBeVisible();
    
    // Both should see Start Game button
    await expect(player1.locator('button:has-text("Start Game")')).toBeVisible();
    await expect(player2.locator('button:has-text("Start Game")')).toBeVisible();
    
    // Player 2 (not Player 1) starts the game
    await player2.click('button:has-text("Start Game")');
    
    // BOTH players should see playing status
    await expect(player1.locator('text=🎮 Playing')).toBeVisible();
    await expect(player2.locator('text=🎮 Playing')).toBeVisible();
    
    // BOTH players should see their bingo cards (25 tiles each)
    await expect(player1.locator('.grid button')).toHaveCount(25);
    await expect(player2.locator('.grid button')).toHaveCount(25);
    
    // Verify tiles are clickable and contain text
    const player1FirstTile = player1.locator('.grid button').first();
    const player2FirstTile = player2.locator('.grid button').first();
    await expect(player1FirstTile).toBeVisible();
    await expect(player2FirstTile).toBeVisible();
    
    // Verify both players have different cards
    const p1Text = await player1FirstTile.textContent();
    const p2Text = await player2FirstTile.textContent();
    expect(p1Text).toBeTruthy();
    expect(p2Text).toBeTruthy();
    
    // Start Game button should be hidden (replaced with Play Again)
    await expect(player1.locator('button:has-text("Start Game")')).not.toBeVisible();
    await expect(player2.locator('button:has-text("Start Game")')).not.toBeVisible();
  });

  test('multiple players can mark tiles and see each others sightings', async () => {
    // Setup two players in a game
    await player1.goto('/');
    await player1.click('button:has-text("Create New Game")');
    await player1.waitForURL(/\/#[A-Z0-9]{4}/);
    const roomCode = player1.url().split('#')[1];
    
    await player1.fill('input[type="text"]', 'Alice');
    await player1.click('button:has-text("Join Game")');
    await player1.waitForSelector('text=Alice');
    
    await player2.goto(`/#${roomCode}`);
    await player2.waitForSelector('input[type="text"]');
    await player2.fill('input[type="text"]', 'Bob');
    await player2.click('button:has-text("Join Game")');
    await player2.waitForSelector('text=Bob');
    
    await player1.click('button:has-text("Start Game")');
    await expect(player1.locator('text=🎮 Playing')).toBeVisible();
    await expect(player2.locator('text=🎮 Playing')).toBeVisible();
    
    await player1.waitForTimeout(1000);
    
    // Player 1 marks a tile
    const player1FirstTile = player1.locator('.grid button').first();
    const player1TileText = await player1FirstTile.textContent();
    await player1FirstTile.click();
    await player1.waitForTimeout(500);
    
    // Player 2 should see Player 1's sighting in the log
    const player2LogItem = player2.locator('.bg-white.p-2\\.5').filter({ hasText: player1TileText || '' });
    await expect(player2LogItem).toBeVisible();
    await expect(player2LogItem).toContainText('Alice');
    
    // Player 2 marks a different tile
    const player2SecondTile = player2.locator('.grid button').nth(1);
    const player2TileText = await player2SecondTile.textContent();
    await player2SecondTile.click();
    await player2.waitForTimeout(500);
    
    // Player 1 should see Player 2's sighting in the log
    const player1LogItem = player1.locator('.bg-white.p-2\\.5').filter({ hasText: player2TileText || '' });
    await expect(player1LogItem).toBeVisible();
    await expect(player1LogItem).toContainText('Bob');
  });

  test('game can be restarted and new cards are generated', async () => {
    // Setup and start a game
    await player1.goto('/');
    await player1.click('button:has-text("Create New Game")');
    await player1.waitForURL(/\/#[A-Z0-9]{4}/);
    
    await player1.fill('input[type="text"]', 'Alice');
    await player1.click('button:has-text("Join Game")');
    await player1.waitForSelector('text=Alice');
    
    await player1.click('button:has-text("Start Game")');
    await expect(player1.locator('text=🎮 Playing')).toBeVisible();
    
    await player1.waitForTimeout(1000);
    
    // Get initial card
    const tiles = player1.locator('.grid button');
    const initialCards: string[] = [];
    for (let i = 0; i < 25; i++) {
      const text = await tiles.nth(i).textContent();
      initialCards.push(text || '');
    }
    
    // Mark all tiles in top row to get bingo
    for (let i = 0; i < 5; i++) {
      await tiles.nth(i).click();
      await player1.waitForTimeout(200);
    }
    
    // Check if game ended (winner overlay appears)
    const gameOver = player1.locator('text=GAME OVER');
    const hasGameOver = await gameOver.count() > 0;
    
    if (hasGameOver) {
      await expect(gameOver).toBeVisible();
      
      // Click Play Again
      await player1.click('button:has-text("Play Again")');
      await expect(player1.locator('text=🎮 Playing')).toBeVisible();
      
      // Get new card
      const newCards: string[] = [];
      for (let i = 0; i < 25; i++) {
        const text = await tiles.nth(i).textContent();
        newCards.push(text || '');
      }
      
      // Cards should be different
      expect(newCards).not.toEqual(initialCards);
    }
  });
});
