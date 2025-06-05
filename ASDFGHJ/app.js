// ... (Firebase imports and config remain the same) ...

// Global state
let currentUser = null;
let userData = null;
let pixelData = [];
const PIXEL_SIZE_EDITOR = 10; // For sprite editor canvas
const CANVAS_DIMENSION_EDITOR = 10;

// NEW: Game State
let gameState = 'spriteEditor'; // 'spriteEditor', 'worldMap'

// NEW: World Map Elements and State
const worldViewDiv = document.getElementById('world-view');
const worldCanvas = document.getElementById('worldCanvas');
const worldCtx = worldCanvas.getContext('2d');
const coordsDisplay = document.getElementById('coordsDisplay');
const enterWorldBtn = document.getElementById('enterWorldBtn');

const TILE_SIZE_MAP = 32; // Size of each tile on the world map
let worldDefinition = { // Default empty world, loaded from DB
    width: 50, // in tiles
    height: 30, // in tiles
    tiles: {}, // e.g., {"0_0": "forest"}
    npcs: {}   // e.g., {"npc1": {x:5, y:5, name:"商人", sprite:[...]}}
};
let playerWorldPosition = { x: 1, y: 1 }; // Player's current position in tile coordinates
let otherMonstersOnMap = {}; // { uid: { x, y, spriteData, name, level }, ... }
let cameraOffset = { x: 0, y: 0 }; // For map dragging, in pixels
let isDraggingMap = false;
let lastMouseDragPosition = { x: 0, y: 0 };

// --- DOM Elements (ensure all are correctly identified) ---
// ... (many existing ones) ...
const spriteEditorCanvas = document.getElementById('pixelCanvas'); // Renamed for clarity
const editorCtx = spriteEditorCanvas.getContext('2d'); // Renamed for clarity


// --- Authentication (mostly same) ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // ... (currentUser, userIdDisplay setup) ...
        await loadOrCreateUserData(user.uid);
        if (userData.profile.spriteData && userData.profile.spriteData.length > 0) {
            enterWorldBtn.style.display = 'inline-block'; // Show if sprite exists
        }
        // Initial UI state based on gameState (which defaults to spriteEditor)
        updateGameView();
        startMonsterAI(); // AI will now respect gameState
        listenToLeaderboard();
    } else {
        // ... (reset logic) ...
        gameState = 'spriteEditor';
        updateGameView();
    }
});

function updateGameView() {
    if (gameState === 'spriteEditor') {
        authSection.style.display = currentUser ? 'none' : 'block';
        userInfoDiv.style.display = currentUser ? 'block' : 'none';
        spriteEditorDiv.style.display = currentUser ? 'block' : 'none';
        monsterStatusDiv.style.display = currentUser ? 'block' : 'none';
        gameLogDiv.style.display = currentUser ? 'block' : 'none';
        worldViewDiv.style.display = 'none';
        // Ensure editor canvas is setup if we switch back
        if(currentUser) setupSpriteEditorCanvas();
    } else if (gameState === 'worldMap') {
        authSection.style.display = 'none';
        userInfoDiv.style.display = 'block'; // Keep user info visible
        spriteEditorDiv.style.display = 'none';
        monsterStatusDiv.style.display = 'block'; // Keep monster status
        gameLogDiv.style.display = 'block'; // Keep game log
        worldViewDiv.style.display = 'block';
        renderWorldMap(); // Initial render
    }
}

// --- User Data Management (mostly same, ensure spriteData is handled) ---
async function loadOrCreateUserData(userId) {
    // ... (existing logic) ...
    // After loading or creating:
    if (userData.profile.spriteData && userData.profile.spriteData.length > 0) {
        pixelData = userData.profile.spriteData; // Load existing sprite for editor
        enterWorldBtn.style.display = 'inline-block';
    } else {
        pixelData = [];
        enterWorldBtn.style.display = 'none';
    }
    // Initialize player world position if not set (e.g., first time)
    // This position should ideally be saved/loaded per user from `users/{uid}/worldPos`
    // For now, let's just put them at a default or random spot when they enter world
    const userPosRef = ref(db, `users/${userId}/worldPosition`);
    const posSnap = await get(userPosRef);
    if (posSnap.exists()) {
        playerWorldPosition = posSnap.val();
    } else {
        playerWorldPosition = { // Default starting position
            x: Math.floor(worldDefinition.width / 2),
            y: Math.floor(worldDefinition.height / 2)
        };
        await set(userPosRef, playerWorldPosition);
    }


    updateUI(); // Ensure this updates based on current userData
    setupSpriteEditorCanvas(); // Setup editor canvas
    listenToUserData(userId);
}


// --- Sprite Editor (editorCtx instead of ctx, PIXEL_SIZE_EDITOR, etc.) ---
function setupSpriteEditorCanvas() {
    spriteEditorCanvas.width = CANVAS_DIMENSION_EDITOR * PIXEL_SIZE_EDITOR;
    spriteEditorCanvas.height = CANVAS_DIMENSION_EDITOR * PIXEL_SIZE_EDITOR;
    editorCtx.imageSmoothingEnabled = false;
    drawEditorGrid();
    drawEditorSprite();
}
// Rename drawGrid to drawEditorGrid, drawSprite to drawEditorSprite
// and make them use editorCtx, PIXEL_SIZE_EDITOR, etc.
function drawEditorGrid() { /* ... use editorCtx ... */ }
function drawEditorSprite() { /* ... use editorCtx, pixelData ... */ }

// Modify pixelCanvas event listener to use editorCtx related calculations
spriteEditorCanvas.addEventListener('click', (event) => {
    // ... (use spriteEditorCanvas.getBoundingClientRect(), PIXEL_SIZE_EDITOR) ...
});

saveSpriteBtn.addEventListener('click', async () => {
    if (!currentUser || !userData) return;
    if (pixelData.length === 0) {
        addLog("精靈是空的，請畫點東西！");
        return;
    }
    try {
        await update(ref(db, `users/${currentUser.uid}/profile`), { spriteData: pixelData });
        addLog("精靈已儲存！");
        enterWorldBtn.style.display = 'inline-block'; // Show button after saving
        // Also update this user's entry in `world/monsterPositions` if they are in the world
        if (gameState === 'worldMap') {
            updatePlayerMonsterOnMap();
        }
    } catch (error) {
        console.error("Error saving sprite:", error);
        addLog(`儲存精靈失敗: ${error.message}`);
    }
});

// --- Button to Enter World ---
enterWorldBtn.addEventListener('click', () => {
    if (!pixelData || pixelData.length === 0) {
        addLog("請先繪製並儲存一個非空的精靈！");
        return;
    }
    gameState = 'worldMap';
    addLog("進入世界地圖...");
    updateGameView();
    initializeWorldMap(); // Setup map listeners and initial player position
});


// --- World Map Logic ---
async function initializeWorldMap() {
    // 1. Load static map definition (terrain, NPCs)
    const mapDefRef = ref(db, 'world/mapDefinition');
    onValue(mapDefRef, (snapshot) => {
        if (snapshot.exists()) {
            worldDefinition = snapshot.val();
            // Ensure defaults if parts are missing
            worldDefinition.tiles = worldDefinition.tiles || {};
            worldDefinition.npcs = worldDefinition.npcs || {};
            worldDefinition.width = worldDefinition.width || 50;
            worldDefinition.height = worldDefinition.height || 30;
            addLog("世界地圖定義已載入。");
        } else {
            // Create a default map if none exists (for first-time setup)
            addLog("未找到世界地圖定義，使用預設。考慮在 Firebase 中預先設定。");
            // You might want to `set` a default mapDefinition here if you're the admin.
            // For now, client uses its hardcoded `worldDefinition` if DB is empty.
        }
        // Once map def is loaded, (re)render
        renderWorldMap();
    }, (error) => {
        console.error("Error loading world definition:", error);
        addLog("載入世界地圖定義失敗。");
    });

    // 2. Listen for other monsters' positions
    const monsterPosRef = ref(db, 'world/monsterPositions');
    onValue(monsterPosRef, (snapshot) => {
        otherMonstersOnMap = {}; // Clear current
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                if (childSnapshot.key !== currentUser.uid) { // Don't add self
                    otherMonstersOnMap[childSnapshot.key] = childSnapshot.val();
                }
            });
        }
        // (Re)render map when other monsters move/appear/disappear
        if (gameState === 'worldMap') renderWorldMap();
    }, (error) => {
        console.error("Error listening to monster positions:", error);
        addLog("監聽其他怪物位置時發生錯誤。");
    });
    
    // 3. Place player monster on map (or update if already there)
    await updatePlayerMonsterOnMap();

    // 4. Start render loop for map
    gameLoop(); // This will call renderWorldMap repeatedly
}

// Call this when player moves or their sprite/info changes
async function updatePlayerMonsterOnMap() {
    if (!currentUser || !userData || !userData.profile) return;
    const playerMapEntry = {
        x: playerWorldPosition.x,
        y: playerWorldPosition.y,
        spriteData: userData.profile.spriteData, // Use current sprite
        name: userData.profile.name || `Guest-${currentUser.uid.substring(0,5)}`,
        level: userData.profile.level,
        lastUpdate: serverTimestamp()
    };
    try {
        await set(ref(db, `world/monsterPositions/${currentUser.uid}`), playerMapEntry);
        // Also save current position to user's private data for persistence
        await set(ref(db, `users/${currentUser.uid}/worldPosition`), playerWorldPosition);
    } catch (error) {
        console.error("Error updating player on map:", error);
        addLog("更新玩家在地圖上的位置失敗。");
    }
}


// --- Game Loop for World Map ---
let lastRenderTime = 0;
function gameLoop(timestamp) {
    if (gameState !== 'worldMap') return; // Stop loop if not on map

    const deltaTime = timestamp - lastRenderTime;
    // updateGameLogic(deltaTime); // For future physics, animations, etc.
    renderWorldMap();
    lastRenderTime = timestamp;
    requestAnimationFrame(gameLoop);
}

// --- World Map Rendering ---
function renderWorldMap() {
    if (!worldCtx || gameState !== 'worldMap') return;

    worldCtx.clearRect(0, 0, worldCanvas.width, worldCanvas.height);
    worldCtx.save();

    // Calculate view offset: center player on screen, then apply camera drag offset
    // The view's top-left corner in world pixel coordinates:
    const viewX = playerWorldPosition.x * TILE_SIZE_MAP - (worldCanvas.width / 2);
    const viewY = playerWorldPosition.y * TILE_SIZE_MAP - (worldCanvas.height / 2);

    // Apply camera drag offset
    worldCtx.translate(-cameraOffset.x, -cameraOffset.y);

    // --- Draw Terrain ---
    // Calculate visible tile range to optimize drawing (culling)
    const startTileX = Math.floor((viewX + cameraOffset.x) / TILE_SIZE_MAP);
    const endTileX = Math.ceil((viewX + cameraOffset.x + worldCanvas.width) / TILE_SIZE_MAP);
    const startTileY = Math.floor((viewY + cameraOffset.y) / TILE_SIZE_MAP);
    const endTileY = Math.ceil((viewY + cameraOffset.y + worldCanvas.height) / TILE_SIZE_MAP);

    for (let x = Math.max(0, startTileX); x < Math.min(worldDefinition.width, endTileX); x++) {
        for (let y = Math.max(0, startTileY); y < Math.min(worldDefinition.height, endTileY); y++) {
            const tileKey = `${x}_${y}`;
            const terrainType = worldDefinition.tiles[tileKey] || "grass"; // Default to grass
            
            // Calculate screen position for this tile
            const screenX = x * TILE_SIZE_MAP - viewX;
            const screenY = y * TILE_SIZE_MAP - viewY;

            worldCtx.fillStyle = getTerrainColor(terrainType);
            worldCtx.fillRect(screenX, screenY, TILE_SIZE_MAP, TILE_SIZE_MAP);
            // worldCtx.strokeStyle = "#777"; // Optional grid lines
            // worldCtx.strokeRect(screenX, screenY, TILE_SIZE_MAP, TILE_SIZE_MAP);
        }
    }

    // --- Draw NPCs ---
    for (const npcId in worldDefinition.npcs) {
        const npc = worldDefinition.npcs[npcId];
        // Simple NPC representation (e.g., a blue square)
        // In future, npc.spriteData could be used like monster sprites
        const npcScreenX = npc.x * TILE_SIZE_MAP - viewX;
        const npcScreenY = npc.y * TILE_SIZE_MAP - viewY;

        if (npcScreenX > -TILE_SIZE_MAP && npcScreenX < worldCanvas.width &&
            npcScreenY > -TILE_SIZE_MAP && npcScreenY < worldCanvas.height) { // Basic culling
            worldCtx.fillStyle = 'blue';
            worldCtx.fillRect(npcScreenX + TILE_SIZE_MAP / 4, npcScreenY + TILE_SIZE_MAP / 4, TILE_SIZE_MAP / 2, TILE_SIZE_MAP / 2);
            worldCtx.fillStyle = 'white';
            worldCtx.textAlign = 'center';
            worldCtx.fillText(npc.name, npcScreenX + TILE_SIZE_MAP / 2, npcScreenY - 5);
        }
    }

    // --- Draw Other Monsters ---
    for (const uid in otherMonstersOnMap) {
        const monster = otherMonstersOnMap[uid];
        const monsterScreenX = monster.x * TILE_SIZE_MAP - viewX;
        const monsterScreenY = monster.y * TILE_SIZE_MAP - viewY;

        if (monsterScreenX > -TILE_SIZE_MAP && monsterScreenX < worldCanvas.width &&
            monsterScreenY > -TILE_SIZE_MAP && monsterScreenY < worldCanvas.height) { // Basic culling
            drawMonsterSpriteOnMap(monster.spriteData, monsterScreenX, monsterScreenY, monster.name);
        }
    }
    
    // --- Draw Player Monster (always in the center of the effective viewport) ---
    // The player's visual position is canvas center, adjusted by how much the world has been dragged
    const playerVisualX = worldCanvas.width / 2 - (TILE_SIZE_MAP / 2) ; // Center of tile
    const playerVisualY = worldCanvas.height / 2 - (TILE_SIZE_MAP / 2) ; // Center of tile
    if (userData && userData.profile && userData.profile.spriteData) {
         drawMonsterSpriteOnMap(userData.profile.spriteData, playerVisualX, playerVisualY, userData.profile.name || "You");
    }

    worldCtx.restore(); // Restore transform

    // Update coordinate display
    coordsDisplay.textContent = `座標: X:${playerWorldPosition.x}, Y:${playerWorldPosition.y} (視野偏移 X:${Math.round(cameraOffset.x)}, Y:${Math.round(cameraOffset.y)})`;
}

function getTerrainColor(type) {
    switch (type) {
        case "forest": return "#228B22"; // ForestGreen
        case "water": return "#1E90FF";  // DodgerBlue
        case "mountain": return "#A9A9A9"; // DarkGray
        case "town_path": return "#D2B48C"; // Tan
        default: return "#90EE90"; // LightGreen (grass)
    }
}

// Helper to draw a monster's pixel sprite onto the world map (scaled)
function drawMonsterSpriteOnMap(spritePixelData, screenX, screenY, name) {
    if (!spritePixelData || spritePixelData.length === 0) return;
    
    const mapSpritePixelSize = TILE_SIZE_MAP / CANVAS_DIMENSION_EDITOR; // Scale editor pixels to fit tile

    spritePixelData.forEach(p => {
        worldCtx.fillStyle = p.color;
        worldCtx.fillRect(
            screenX + p.x * mapSpritePixelSize,
            screenY + p.y * mapSpritePixelSize,
            mapSpritePixelSize,
            mapSpritePixelSize
        );
    });
    if (name) {
        worldCtx.fillStyle = 'black';
        worldCtx.textAlign = 'center';
        worldCtx.fillText(name, screenX + TILE_SIZE_MAP / 2, screenY - 5);
    }
}

// --- Camera Drag Logic ---
worldCanvas.addEventListener('mousedown', (e) => {
    if (gameState !== 'worldMap') return;
    isDraggingMap = true;
    lastMouseDragPosition = { x: e.clientX, y: e.clientY };
    worldCanvas.style.cursor = 'grabbing';
});
worldCanvas.addEventListener('mousemove', (e) => {
    if (gameState !== 'worldMap' || !isDraggingMap) return;
    const dx = e.clientX - lastMouseDragPosition.x;
    const dy = e.clientY - lastMouseDragPosition.y;
    cameraOffset.x -= dx; // Subtract because we drag the world, not the camera view itself
    cameraOffset.y -= dy;
    lastMouseDragPosition = { x: e.clientX, y: e.clientY };
    // No need to call renderWorldMap here if using requestAnimationFrame gameLoop
});
worldCanvas.addEventListener('mouseup', () => {
    if (gameState !== 'worldMap') return;
    isDraggingMap = false;
    worldCanvas.style.cursor = 'grab';
});
worldCanvas.addEventListener('mouseleave', () => { // Stop dragging if mouse leaves canvas
    if (gameState !== 'worldMap') return;
    isDraggingMap = false;
    worldCanvas.style.cursor = 'grab';
});


// --- Monster AI Modifications ---
async function monsterAIBehavior() {
    if (!currentUser || !userData || !userData.monster) return;
    // ... (existing HP checks for resting/sleeping - these are still good) ...
    // If resting or sleeping, AI might not move or interact on the map
    if (userData.monster.status === "睡覺中" || userData.monster.status === "休息中") {
        // Potentially skip movement if sleeping/resting heavily
        // For now, let's allow AI to continue simplified map actions even if resting
    }


    if (gameState === 'worldMap') {
        // World map AI logic
        const actionRoll = Math.random();
        if (actionRoll < 0.6) { // 60% chance to try moving
            const moveRoll = Math.random();
            let dx = 0, dy = 0;
            if (moveRoll < 0.25) dx = 1;
            else if (moveRoll < 0.5) dx = -1;
            else if (moveRoll < 0.75) dy = 1;
            else dy = -1;

            if (dx !== 0 || dy !== 0) {
                await attemptMovePlayerMonster(dx, dy);
            }
        } else if (actionRoll < 0.8) { // 20% chance to "scan" for interactions
            await checkAndTriggerInteraction(playerWorldPosition.x, playerWorldPosition.y);
        } else { // 20% idle on map
            addLog("你的怪獸在地圖上觀察四周...");
            await updateMonsterStatus("觀察中"); // New status for map idle
        }

    } else { // Sprite Editor or other states - use old AI
        // ... (old AI logic: explore (battle), findFood, idle without map context) ...
        // The old `explore()` could be repurposed or removed if map is primary.
        // For now, let's keep it simple: AI primarily focuses on map if on map.
        const oldActionRoll = Math.random();
        if (oldActionRoll < 0.5) { /* await oldExplore(); */ addLog("AI在編輯器模式下閒置"); }
        else { addLog("AI在編輯器模式下閒置"); }
    }
    // Update last action time, regardless of state
    await update(ref(db, `users/${currentUser.uid}/monster`), { lastActionTime: Date.now() });
}

async function attemptMovePlayerMonster(dx, dy) {
    const newX = playerWorldPosition.x + dx;
    const newY = playerWorldPosition.y + dy;

    // 1. Boundary checks
    if (newX < 0 || newX >= worldDefinition.width || newY < 0 || newY >= worldDefinition.height) {
        addLog("你的怪獸撞到了世界的邊緣！");
        return;
    }

    // 2. Terrain collision check (e.g., can't walk on water without ability)
    const targetTileKey = `${newX}_${newY}`;
    const targetTerrain = worldDefinition.tiles[targetTileKey] || "grass";
    if (targetTerrain === "water" || targetTerrain === "mountain") { // Example non-walkable
        addLog(`你的怪獸無法進入 ${targetTerrain} 地形。`);
        return;
    }
    
    addLog(`你的怪獸移動到 X:${newX}, Y:${newY}`);
    playerWorldPosition.x = newX;
    playerWorldPosition.y = newY;
    await updatePlayerMonsterOnMap(); // Update DB with new position and current sprite/info
    await updateMonsterStatus("移動中");

    // 3. Check for interactions at the new tile
    await checkAndTriggerInteraction(newX, newY);
}

async function checkAndTriggerInteraction(x, y) {
    // Check for NPC interaction
    for (const npcId in worldDefinition.npcs) {
        const npc = worldDefinition.npcs[npcId];
        if (npc.x === x && npc.y === y) {
            addLog(`你的怪獸遇到了 ${npc.name}！`);
            if (npc.dialog) addLog(`${npc.name}: "${npc.dialog}"`);
            // TODO: More complex NPC interaction logic (quests, shop, etc.)
            await updateMonsterStatus("與NPC互動");
            return; // Prioritize NPC interaction
        }
    }

    // Check for other monster interaction
    for (const otherUid in otherMonstersOnMap) {
        const otherMonster = otherMonstersOnMap[otherUid];
        if (otherMonster.x === x && otherMonster.y === y) {
            addLog(`你的怪獸在 X:${x}, Y:${y} 遇到了 ${otherMonster.name || '另一隻怪獸'}！`);
            await handleMonsterEncounter(currentUser.uid, otherUid, otherMonster);
            return; // One interaction per move/check for simplicity
        }
    }
}

async function handleMonsterEncounter(myUid, otherUid, otherMonsterData) {
    // Get my monster's current full data for combat/interaction
    const myMonsterFullDataSnap = await get(ref(db, `users/${myUid}`));
    if (!myMonsterFullDataSnap.exists()) return;
    const myMonsterFullData = myMonsterFullDataSnap.val();

    const interactionRoll = Math.random();
    if (interactionRoll < 0.1) { // 10% 一見鍾情 (just a log message for now)
        addLog(`💖 你的怪獸對 ${otherMonsterData.name} 一見鍾情了！`);
        await updateMonsterStatus("戀愛中");
    } else if (interactionRoll < 0.3) { // 20% 聊天 (log)
        addLog(`你的怪獸和 ${otherMonsterData.name} 友好地聊了起來。`);
        await updateMonsterStatus("聊天中");
    } else if (interactionRoll < 0.5) { // 20% 無視
        addLog(`你的怪獸和 ${otherMonsterData.name} 互相無視了對方。`);
        await updateMonsterStatus("閒逛");
    } else if (interactionRoll < 0.7) { // 20% 敵視 (log, no combat yet)
        addLog(`你的怪獸對 ${otherMonsterData.name} 露出了敵意！`);
        await updateMonsterStatus("敵視中");
    } else { // 30% 戰鬥
        addLog(`⚔️ 你的怪獸向 ${otherMonsterData.name} 發起了挑戰！`);
        // engageCombat needs to be adapted to fetch full stats for both monsters if not available
        await engageCombat(myUid, otherUid); // engageCombat already fetches details
    }
}

// engageCombat needs to be robust to fetch latest monster stats for both players
// (The existing engageCombat fetches data, so it should be mostly fine)
// Make sure it updates monster status appropriately after combat (e.g., back to "閒置" or "移動中")

// --- XP and Leveling (mostly same) ---
// --- Leaderboard (mostly same) ---
// --- Utility: Game Log (same) ---

// --- Initial Call ---
addLog("遊戲腳本已載入。請登入開始。");
// No auto gameLoop() start here, it's started when entering worldMap