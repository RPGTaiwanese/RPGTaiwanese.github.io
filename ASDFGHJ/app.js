// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, get, onValue, update, runTransaction, serverTimestamp, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
// No analytics for this example

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDEl_nGYv2oRbaI0BBloR87d-MIqZJDv-4", // 使用你自己的 API Key
    authDomain: "text-games-71eab.firebaseapp.com",
    databaseURL: "https://text-games-71eab-default-rtdb.firebaseio.com",
    projectId: "text-games-71eab",
    storageBucket: "text-games-71eab.firebasestorage.app",
    messagingSenderId: "1051403183982",
    appId: "1:1051403183982:web:31fa501e59ccc04a00037f",
    // measurementId: "G-1Z6Y89XK26" // Measurement ID is optional
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Global state
let currentUser = null;
let userData = null; // Stores profile and monster data
let pixelData = []; // Array of {x, y, color}
const PIXEL_SIZE = 10; // For canvas drawing, canvas internal size is 10x10 pixels
const CANVAS_DIMENSION = 10; // 10x10 grid

// DOM Elements
const guestLoginBtn = document.getElementById('guestLoginBtn');
const authSection = document.getElementById('auth-section');
const userInfoDiv = document.getElementById('user-info');
const spriteEditorDiv = document.getElementById('sprite-editor');
const monsterStatusDiv = document.getElementById('monster-status');
const gameLogDiv = document.getElementById('game-log');

const userIdDisplay = document.getElementById('userIdDisplay');
const levelDisplay = document.getElementById('levelDisplay');
const xpDisplay = document.getElementById('xpDisplay');
const xpToNextLevelDisplay = document.getElementById('xpToNextLevelDisplay');
const maxBlocksDisplay = document.getElementById('maxBlocksDisplay');

const pixelCanvas = document.getElementById('pixelCanvas');
const ctx = pixelCanvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const saveSpriteBtn = document.getElementById('saveSpriteBtn');
const blocksUsedDisplay = document.getElementById('blocksUsedDisplay');

const monsterHpDisplay = document.getElementById('monsterHpDisplay');
const monsterMaxHpDisplay = document.getElementById('monsterMaxHpDisplay');
const monsterAtkDisplay = document.getElementById('monsterAtkDisplay');
const monsterStateDisplay = document.getElementById('monsterStateDisplay');
const monsterCooldownReductionDisplay = document.getElementById('monsterCooldownReductionDisplay');
const manualRestBtn = document.getElementById('manualRestBtn');
const manualExploreBtn = document.getElementById('manualExploreBtn');

const logEntries = document.getElementById('logEntries');
const leaderboardList = document.getElementById('leaderboard-list');

// --- Authentication ---
guestLoginBtn.addEventListener('click', async () => {
    try {
        const userCredential = await signInAnonymously(auth);
        // User is signed in. Handled by onAuthStateChanged
        console.log("Guest signed in:", userCredential.user.uid);
    } catch (error) {
        console.error("Error signing in anonymously:", error);
        addLog(`登入失敗: ${error.message}`);
    }
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        userIdDisplay.textContent = user.uid.substring(0, 8) + "..."; // Display shortened UID
        authSection.style.display = 'none';
        userInfoDiv.style.display = 'block';
        spriteEditorDiv.style.display = 'block';
        monsterStatusDiv.style.display = 'block';
        gameLogDiv.style.display = 'block';

        await loadOrCreateUserData(user.uid);
        startMonsterAI();
        listenToLeaderboard();
    } else {
        currentUser = null;
        userData = null;
        authSection.style.display = 'block';
        userInfoDiv.style.display = 'none';
        spriteEditorDiv.style.display = 'none';
        monsterStatusDiv.style.display = 'none';
        gameLogDiv.style.display = 'none';
        stopMonsterAI();
        leaderboardList.innerHTML = ''; // Clear leaderboard
        addLog("使用者已登出或未登入");
    }
});

// --- User Data Management ---
async function loadOrCreateUserData(userId) {
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
        userData = snapshot.val();
        // Ensure all necessary fields exist, apply defaults if not
        userData.profile = userData.profile || {};
        userData.profile.level = userData.profile.level || 1;
        userData.profile.xp = userData.profile.xp || 0;
        userData.profile.maxBlocks = userData.profile.maxBlocks || (5 + (userData.profile.level - 1));
        userData.profile.spriteData = userData.profile.spriteData || [];
        
        userData.monster = userData.monster || {};
        userData.monster.maxHp = userData.monster.maxHp || (100 + (userData.profile.level - 1) * 10);
        userData.monster.hp = userData.monster.hp || userData.monster.maxHp;
        userData.monster.atk = userData.monster.atk || (10 + (userData.profile.level - 1) * 2);
        userData.monster.status = userData.monster.status || "閒置";
        userData.monster.cooldownReduction = userData.monster.cooldownReduction || 0; // Example: 0-50%
        userData.monster.lastActionTime = userData.monster.lastActionTime || Date.now();
        userData.monster.food = userData.monster.food || 0;

        pixelData = userData.profile.spriteData;
        addLog("玩家資料已載入。");
    } else {
        userData = {
            profile: {
                name: `Guest-${userId.substring(0, 5)}`,
                level: 1,
                xp: 0,
                maxBlocks: 5,
                spriteData: []
            },
            monster: {
                maxHp: 100,
                hp: 100,
                atk: 10,
                status: "閒置",
                cooldownReduction: 0,
                lastActionTime: Date.now(),
                food: 0
            }
        };
        await set(userRef, userData);
        pixelData = [];
        addLog("新玩家資料已建立。");
    }
    updateUI();
    drawSprite(); // Draw initial or saved sprite
    listenToUserData(userId); // Listen for realtime updates to this user's data
}

function listenToUserData(userId) {
    const userRef = ref(db, `users/${userId}`);
    onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
            userData = snapshot.val();
            // It's important to update pixelData if it changed elsewhere,
            // though sprite is typically only changed by the local user.
            if (userData.profile && userData.profile.spriteData) {
                 pixelData = userData.profile.spriteData;
            }
            updateUI(); // Update UI with new data
            // No need to call drawSprite() here unless spriteData can be changed by server
        }
    });
}

function updateUI() {
    if (!userData || !userData.profile || !userData.monster) return;

    levelDisplay.textContent = userData.profile.level;
    xpDisplay.textContent = userData.profile.xp;
    xpToNextLevelDisplay.textContent = calculateXpToNextLevel(userData.profile.level);
    maxBlocksDisplay.textContent = userData.profile.maxBlocks;
    blocksUsedDisplay.textContent = `已用方塊: ${pixelData.length}`;

    monsterHpDisplay.textContent = userData.monster.hp;
    monsterMaxHpDisplay.textContent = userData.monster.maxHp;
    monsterAtkDisplay.textContent = userData.monster.atk;
    monsterStateDisplay.textContent = userData.monster.status;
    monsterCooldownReductionDisplay.textContent = userData.monster.cooldownReduction;
}


// --- Sprite Editor ---
function setupCanvas() {
    pixelCanvas.width = CANVAS_DIMENSION * PIXEL_SIZE;
    pixelCanvas.height = CANVAS_DIMENSION * PIXEL_SIZE;
    ctx.imageSmoothingEnabled = false; // For sharp pixels
    drawGrid();
    drawSprite();
}
setupCanvas(); // Initial setup

function drawGrid() {
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= CANVAS_DIMENSION; i++) {
        ctx.beginPath();
        ctx.moveTo(i * PIXEL_SIZE, 0);
        ctx.lineTo(i * PIXEL_SIZE, CANVAS_DIMENSION * PIXEL_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * PIXEL_SIZE);
        ctx.lineTo(CANVAS_DIMENSION * PIXEL_SIZE, i * PIXEL_SIZE);
        ctx.stroke();
    }
}

function drawSprite() {
    ctx.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height);
    drawGrid();
    pixelData.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x * PIXEL_SIZE, p.y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
    });
    blocksUsedDisplay.textContent = `已用方塊: ${pixelData.length}`;
}

pixelCanvas.addEventListener('click', (event) => {
    if (!userData) return;

    const rect = pixelCanvas.getBoundingClientRect();
    // Adjust for display scaling vs internal canvas resolution
    const scaleX = pixelCanvas.width / rect.width;
    const scaleY = pixelCanvas.height / rect.height;

    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;
    
    const x = Math.floor(canvasX / PIXEL_SIZE);
    const y = Math.floor(canvasY / PIXEL_SIZE);

    const existingPixelIndex = pixelData.findIndex(p => p.x === x && p.y === y);

    if (existingPixelIndex > -1) {
        pixelData.splice(existingPixelIndex, 1); // Remove pixel
    } else {
        if (pixelData.length < userData.profile.maxBlocks) {
            pixelData.push({ x, y, color: colorPicker.value });
        } else {
            addLog(`方塊已達上限 (${userData.profile.maxBlocks})`);
        }
    }
    drawSprite();
});

saveSpriteBtn.addEventListener('click', async () => {
    if (!currentUser || !userData) return;
    try {
        const userProfileRef = ref(db, `users/${currentUser.uid}/profile/spriteData`);
        await set(userProfileRef, pixelData);
        addLog("精靈已儲存！");
    } catch (error) {
        console.error("Error saving sprite:", error);
        addLog(`儲存精靈失敗: ${error.message}`);
    }
});


// --- Game Logic: XP and Leveling ---
function calculateXpToNextLevel(level) {
    return 50 + level * 50; // Example: Level 1 needs 100 XP, Level 2 needs 150 XP
}

async function gainXP(amount) {
    if (!currentUser || !userData) return;
    
    const newXp = userData.profile.xp + amount;
    const xpNeeded = calculateXpToNextLevel(userData.profile.level);
    let newLevel = userData.profile.level;
    let newMaxBlocks = userData.profile.maxBlocks;
    let newMaxHp = userData.monster.maxHp;
    let newAtk = userData.monster.atk;

    let finalXp = newXp;

    if (newXp >= xpNeeded) {
        newLevel++;
        finalXp = newXp - xpNeeded; // Carry over excess XP
        newMaxBlocks++;
        newMaxHp += 10; // Increase max HP on level up
        newAtk += 2;   // Increase ATK on level up
        addLog(`恭喜！等級提升至 ${newLevel}！`);
    }
    
    try {
        const updates = {};
        updates[`users/${currentUser.uid}/profile/xp`] = finalXp;
        updates[`users/${currentUser.uid}/profile/level`] = newLevel;
        updates[`users/${currentUser.uid}/profile/maxBlocks`] = newMaxBlocks;
        updates[`users/${currentUser.uid}/monster/maxHp`] = newMaxHp;
        updates[`users/${currentUser.uid}/monster/atk`] = newAtk;
        // If leveled up, also restore HP to new maxHP
        if (newLevel > userData.profile.level) {
            updates[`users/${currentUser.uid}/monster/hp`] = newMaxHp;
        }

        await update(ref(db), updates);
        // Local data will be updated by onValue listener
    } catch (error) {
        console.error("Error updating XP/Level:", error);
        addLog(`更新經驗值/等級失敗: ${error.message}`);
    }
}

// --- Monster AI ---
let aiInterval = null;
const AI_TICK_RATE = 5000; // AI makes a decision every 5 seconds (base)

function startMonsterAI() {
    if (aiInterval) clearInterval(aiInterval);
    aiInterval = setInterval(monsterAIBehavior, AI_TICK_RATE * (1 - (userData.monster.cooldownReduction / 100 || 0)));
}

function stopMonsterAI() {
    if (aiInterval) clearInterval(aiInterval);
    aiInterval = null;
}

async function monsterAIBehavior() {
    if (!currentUser || !userData || !userData.monster) return;

    // Make sure local userData is reasonably fresh, or use server data for decisions
    // For simplicity, we'll use the current `userData` which is updated by onValue
    
    let currentMonster = userData.monster;
    let currentProfile = userData.profile;

    // 1. Check HP for resting/sleeping
    if (currentMonster.hp < currentMonster.maxHp * 0.3) { // HP below 30%
        if (currentMonster.status !== "睡覺中") {
            await updateMonsterStatus("睡覺中");
            addLog("怪獸HP過低，開始睡覺...");
        }
        // Sleeping recovers more HP
        let healedHp = Math.min(currentMonster.hp + Math.floor(currentMonster.maxHp * 0.15), currentMonster.maxHp); // Heal 15%
        await updateMonsterData({ hp: healedHp, lastActionTime: Date.now() });
        return;
    } else if (currentMonster.hp < currentMonster.maxHp * 0.7 && currentMonster.status !== "睡覺中") { // HP below 70%
        if (currentMonster.status !== "休息中") {
            await updateMonsterStatus("休息中");
            addLog("怪獸HP偏低，開始休息...");
        }
        // Resting recovers HP
        let healedHp = Math.min(currentMonster.hp + Math.floor(currentMonster.maxHp * 0.05), currentMonster.maxHp); // Heal 5%
        await updateMonsterData({ hp: healedHp, lastActionTime: Date.now() });
        return;
    }

    // If monster was sleeping/resting and HP is now good, change status
    if ((currentMonster.status === "睡覺中" || currentMonster.status === "休息中") && currentMonster.hp >= currentMonster.maxHp * 0.9) {
        await updateMonsterStatus("閒置");
        addLog("怪獸恢復完畢！");
    }

    // 2. Random actions if not resting/sleeping
    const actionRoll = Math.random();
    if (actionRoll < 0.5) { // 50% chance to explore (and potentially fight)
        await explore();
    } else if (actionRoll < 0.8) { // 30% chance to find food
        await findFood();
    } else { // 20% chance to just be idle
        if (currentMonster.status !== "閒置") {
            await updateMonsterStatus("閒置");
        }
        addLog("怪獸正在閒置...");
        await updateMonsterData({ lastActionTime: Date.now() });
    }
}

async function updateMonsterStatus(newStatus) {
    if (!currentUser) return;
    await update(ref(db, `users/${currentUser.uid}/monster`), { status: newStatus, lastActionTime: Date.now() });
    // userData.monster.status will be updated by onValue
}

async function updateMonsterData(dataToUpdate) {
    if (!currentUser) return;
    await update(ref(db, `users/${currentUser.uid}/monster`), { ...dataToUpdate, lastActionTime: Date.now() });
}

async function explore() {
    if (!currentUser || !userData) return;
    await updateMonsterStatus("探索中");
    addLog("怪獸正在探索...");

    // Simulate finding another monster
    const findOpponentRoll = Math.random();
    if (findOpponentRoll < 0.5) { // 50% chance to find an opponent
        await attemptToFightAnotherMonster();
    } else {
        addLog("怪獸探索了一圈，沒有特別的發現。");
        await updateMonsterStatus("閒置");
    }
}

async function findFood() {
    if (!currentUser || !userData) return;
    await updateMonsterStatus("尋找食物");
    addLog("怪獸正在尋找食物...");
    
    const foodAmount = Math.floor(Math.random() * 5) + 1; // Find 1-5 food
    const newFoodCount = (userData.monster.food || 0) + foodAmount;
    let healedHp = userData.monster.hp + foodAmount * 5; // Each food heals 5 HP
    healedHp = Math.min(healedHp, userData.monster.maxHp);

    await updateMonsterData({ food: newFoodCount, hp: healedHp });
    addLog(`怪獸找到了 ${foodAmount} 份食物，恢復了 ${foodAmount * 5} HP！`);
    await updateMonsterStatus("閒置");
}

manualRestBtn.addEventListener('click', async () => {
    if (!currentUser || !userData) return;
    if (userData.monster.hp >= userData.monster.maxHp) {
        addLog("怪獸HP已滿，無需休息。");
        return;
    }
    await updateMonsterStatus("休息中");
    let healedHp = Math.min(userData.monster.hp + Math.floor(userData.monster.maxHp * 0.1), userData.monster.maxHp); // Heal 10%
    await updateMonsterData({ hp: healedHp });
    addLog("怪獸手動休息，恢復了少量HP。");
    // AI might override this quickly, or you can add a "manual_override" flag
});

manualExploreBtn.addEventListener('click', async () => {
    if (!currentUser || !userData) return;
    await explore();
});

// --- Combat System (Simplified AI vs AI) ---
async function attemptToFightAnotherMonster() {
    if (!currentUser) return;
    addLog("怪獸試圖尋找其他怪獸進行戰鬥...");

    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
        const allUsers = snapshot.val();
        const otherUserIds = Object.keys(allUsers).filter(id => id !== currentUser.uid);

        if (otherUserIds.length > 0) {
            const randomIndex = Math.floor(Math.random() * otherUserIds.length);
            const opponentId = otherUserIds[randomIndex];
            const opponentData = allUsers[opponentId];

            if (opponentData && opponentData.monster && opponentData.profile) {
                // Simplification: Only fight if opponent is not "睡覺中"
                if (opponentData.monster.status === "睡覺中") {
                    addLog(`找到 ${opponentData.profile.name || '一個對手'}，但它在睡覺。`);
                    await updateMonsterStatus("閒置");
                    return;
                }
                addLog(`遭遇 ${opponentData.profile.name || '一個對手'} (等級 ${opponentData.profile.level})！準備戰鬥！`);
                await engageCombat(currentUser.uid, opponentId);
            } else {
                addLog("找到一個潛在對手，但其資料不完整。");
                await updateMonsterStatus("閒置");
            }
        } else {
            addLog("附近沒有其他怪獸。");
            await updateMonsterStatus("閒置");
        }
    } else {
        addLog("世界中沒有其他怪獸。");
        await updateMonsterStatus("閒置");
    }
}

async function engageCombat(attackerId, defenderId) {
    await update(ref(db, `users/${attackerId}/monster`), { status: "戰鬥中", lastActionTime: Date.now() });
    // For simplicity, defender doesn't change status, they are just attacked.
    // In a more complex game, defender would also enter "combat" status.

    // Use a transaction to ensure atomic updates for HP during combat.
    // This is a very simplified combat round.
    const attackerMonsterRef = ref(db, `users/${attackerId}/monster`);
    const defenderMonsterRef = ref(db, `users/${defenderId}/monster`);
    const attackerProfileRef = ref(db, `users/${attackerId}/profile`);
    const defenderProfileRef = ref(db, `users/${defenderId}/profile`);

    // Fetch current data for both within a transaction or just before
    const attackerSnap = await get(attackerMonsterRef);
    const defenderSnap = await get(defenderMonsterRef);
    const attackerProfileSnap = await get(attackerProfileRef);
    const defenderProfileSnap = await get(defenderProfileRef);


    if (!attackerSnap.exists() || !defenderSnap.exists() || !attackerProfileSnap.exists() || !defenderProfileSnap.exists()) {
        addLog("戰鬥中止：一方玩家資料不存在。");
        await update(ref(db, `users/${attackerId}/monster`), { status: "閒置", lastActionTime: Date.now() });
        return;
    }

    let attackerMonster = attackerSnap.val();
    let defenderMonster = defenderSnap.val();
    let attackerProfile = attackerProfileSnap.val();
    let defenderProfile = defenderProfileSnap.val();
    
    const defenderName = defenderProfile.name || `Guest-${defenderId.substring(0,5)}`;

    // Simulate one round of combat
    addLog(`你的怪獸 (HP: ${attackerMonster.hp}, ATK: ${attackerMonster.atk}) 攻擊 ${defenderName} (HP: ${defenderMonster.hp}, ATK: ${defenderMonster.atk})`);

    // Attacker hits defender
    let damageToDefender = Math.max(1, attackerMonster.atk - (defenderMonster.def || 0)); // Assume def if exists
    defenderMonster.hp -= damageToDefender;
    addLog(`你的怪獸對 ${defenderName} 造成 ${damageToDefender} 傷害。${defenderName} 剩餘 HP: ${Math.max(0, defenderMonster.hp)}`);

    const updates = {};

    if (defenderMonster.hp <= 0) {
        addLog(`${defenderName} 被擊敗了！`);
        const xpGained = 20 + defenderProfile.level * 5; // XP based on opponent level
        await gainXP(xpGained); // gainXP handles updating attacker's profile
        addLog(`你的怪獸獲得了 ${xpGained} XP!`);
        
        // Defender might lose something or just "respawn" with full HP after a delay (not implemented here)
        // For simplicity, just reset defender's HP.
        updates[`users/${defenderId}/monster/hp`] = defenderMonster.maxHp; // Defender recovers
        updates[`users/${defenderId}/monster/status`] = "休息中"; // Defender needs to recover
        // Log for defender (they won't see this unless they are online and check logs)
        // This could be a "battle_reports" node in DB.
    } else {
        // Defender hits attacker (if not defeated)
        let damageToAttacker = Math.max(1, defenderMonster.atk - (attackerMonster.def || 0));
        attackerMonster.hp -= damageToAttacker;
        addLog(`${defenderName} 反擊，對你的怪獸造成 ${damageToAttacker} 傷害。你的怪獸剩餘 HP: ${Math.max(0, attackerMonster.hp)}`);
        
        updates[`users/${defenderId}/monster/hp`] = defenderMonster.hp;

        if (attackerMonster.hp <= 0) {
            addLog(`你的怪獸被 ${defenderName} 擊敗了...`);
            attackerMonster.hp = 1; // Respawn with 1 HP
            // Maybe lose some XP (not implemented)
            updates[`users/${currentUser.uid}/monster/status`] = "睡覺中"; // Needs to recover
        }
    }
    updates[`users/${currentUser.uid}/monster/hp`] = Math.max(0, attackerMonster.hp);
    updates[`users/${currentUser.uid}/monster/status`] = attackerMonster.hp <=0 ? "睡覺中" : "閒置";
    updates[`users/${currentUser.uid}/monster/lastActionTime`] = Date.now();
    
    await update(ref(db), updates);
}

// --- Leaderboard ---
function listenToLeaderboard() {
    const usersQuery = query(ref(db, 'users'), orderByChild('profile/level'), limitToLast(10)); // Get top 10 by level
    
    onValue(usersQuery, (snapshot) => {
        leaderboardList.innerHTML = ''; // Clear previous list
        if (snapshot.exists()) {
            const usersData = [];
            snapshot.forEach(childSnapshot => {
                // Firebase returns in ascending order, so we unshift to make it descending for display
                // or sort client-side after getting all.
                usersData.unshift({ // Add to beginning of array to reverse order
                    id: childSnapshot.key, 
                    ...childSnapshot.val() 
                }); 
            });
            
            // Secondary sort by XP if levels are tied (optional)
            // usersData.sort((a, b) => {
            //    if (b.profile.level === a.profile.level) {
            //        return (b.profile.xp || 0) - (a.profile.xp || 0);
            //    }
            //    return b.profile.level - a.profile.level;
            // });


            usersData.forEach(userEntry => {
                if (userEntry.profile) {
                    const li = document.createElement('li');
                    li.textContent = `${userEntry.profile.name || 'Guest-' + userEntry.id.substring(0,5)} - 等級: ${userEntry.profile.level} (XP: ${userEntry.profile.xp || 0})`;
                    leaderboardList.appendChild(li);
                }
            });
        } else {
            leaderboardList.innerHTML = '<li>尚無玩家資料</li>';
        }
    });
}

// --- Utility: Game Log ---
function addLog(message) {
    const li = document.createElement('li');
    const timestamp = new Date().toLocaleTimeString();
    li.textContent = `[${timestamp}] ${message}`;
    logEntries.prepend(li); // Add to top
    if (logEntries.children.length > 50) { // Keep log size manageable
        logEntries.removeChild(logEntries.lastChild);
    }
    console.log(message); // Also log to console for debugging
}

// Initialize
addLog("遊戲腳本已載入。請登入開始。");