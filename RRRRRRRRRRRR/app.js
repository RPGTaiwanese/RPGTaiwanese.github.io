// 載入 Firebase 模組
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, set, push, onValue, onDisconnect, onChildAdded, onChildChanged, onChildRemoved, remove, update } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// Firebase 初始化設定
const firebaseConfig = {
  apiKey: "AIzaSyCf18qyn_40HaRDGkLw5jtJHg3Va8UVfLI",
  authDomain: "bahamut-building.firebaseapp.com",
  projectId: "bahamut-building",
  storageBucket: "bahamut-building.firebasestorage.app",
  messagingSenderId: "323018662477",
  appId: "1:323018662477:web:61c61ecc4f63996653b204",
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 遊戲初始參數
let localX = 2500, localY = 2500;
let currentAccount = "";
let currentHeroImageURL = "";
let moveSpeed = 2.5;
let tileWidth = 500, tileHeight = 500;

// 遠端玩家資料儲存
let remotePlayersData = {};

// 物件資料與 DOM 參考
let mapObjectsData = {};
const mapObjectsDom = {};

// 文字物件資料與 DOM 參考
let textObjectsData = {};
const textObjectsDom = {};

// DOM 參考
const worldElem = document.getElementById("world");
const gameWrapper = document.getElementById("game-wrapper");
const coordDisplay = document.getElementById("coord-display");
const onlinePlayersListElem = document.getElementById("online-players-list");

// 聊天面板 DOM
const chatContent = document.getElementById("chat-content");
const chatInput = document.getElementById("chat-input");
const chatMessagesElem = document.getElementById("chat-messages");
const toggleChatBtn = document.getElementById("toggle-chat-btn");

// 放置物件選單 DOM
const objectMenu = document.getElementById("object-menu");
const objectImageUrlInput = document.getElementById("object-image-url");
const objectImageList = document.getElementById("object-image-list");
const submitObjectBtn = document.getElementById("submit-object-btn");
const cancelObjectBtn = document.getElementById("cancel-object-btn");

// 放置物件按鈕
const toggleObjectBtn = document.getElementById("toggle-object-btn");

// 滑鼠與觸控控制
let isMouseDown = false;
let currentMouseX = 0, currentMouseY = 0;

gameWrapper.addEventListener('mousedown', () => { isMouseDown = true; });
document.addEventListener('mouseup', () => { isMouseDown = false; });
document.addEventListener('mousemove', (e) => {
  currentMouseX = e.clientX;
  currentMouseY = e.clientY;
});
gameWrapper.addEventListener('touchstart', (e) => {
  isMouseDown = true;
  if(e.touches && e.touches.length > 0) {
    currentMouseX = e.touches[0].clientX;
    currentMouseY = e.touches[0].clientY;
  }
});
gameWrapper.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if(e.touches && e.touches.length > 0) {
    currentMouseX = e.touches[0].clientX;
    currentMouseY = e.touches[0].clientY;
  }
});
document.addEventListener('touchend', () => { isMouseDown = false; });

// 切換聊天室顯示與隱藏：改為切換 Tailwind 的 hidden class
toggleChatBtn.addEventListener("click", () => {
  chatContent.classList.toggle("hidden");
});

// 切換放置物件選單：切換 hidden class
toggleObjectBtn.addEventListener("click", () => {
  objectMenu.classList.toggle("hidden");
});
cancelObjectBtn.addEventListener("click", () => {
  objectMenu.classList.add("hidden");
});

// 新增放置物件事件
submitObjectBtn.addEventListener("click", () => {
  let inputValue = objectImageUrlInput.value.trim();
  let gridX = Math.round(localX / 100) * 100;
  let gridY = Math.round(localY / 100) * 100;

  if (inputValue.startsWith("http")) {
    // 檢查該格是否已有圖片物件
    for (let key in mapObjectsData) {
      let objPos = mapObjectsData[key]["XY座標"];
      if (Math.round(objPos.x) === gridX && Math.round(objPos.y) === gridY) {
        alert("這裡不能放物件");
        return;
      }
    }
    push(ref(db, 'map/objects'), {
      "圖片網址": inputValue,
      "XY座標": { x: gridX, y: gridY }
    });
  } else {
    // 文字物件處理
    let existingKey = null;
    for (let key in textObjectsData) {
      let pos = textObjectsData[key]["XY座標"];
      if (Math.round(pos.x) === gridX && Math.round(pos.y) === gridY) {
        existingKey = key;
        break;
      }
    }
    if (inputValue !== "") {
      if (existingKey) {
        update(ref(db, 'textObjects/' + existingKey), { "Text": inputValue });
      } else {
        push(ref(db, 'textObjects'), {
          "Text": inputValue,
          "XY座標": { x: gridX, y: gridY }
        });
      }
    } else {
      if (existingKey) {
        remove(ref(db, 'textObjects/' + existingKey));
      }
    }
  }
  objectImageUrlInput.value = "";
});

// 從 Firebase 讀取地圖背景
const mapRef = ref(db, 'map');
onValue(mapRef, (snapshot) => {
  const mapData = snapshot.val();
  if (mapData && mapData.background && mapData.background.indexOf("http") === 0) {
    const bgImg = new Image();
    bgImg.onload = function() {
      tileWidth = bgImg.naturalWidth;
      tileHeight = bgImg.naturalHeight;
      gameWrapper.style.backgroundImage = `url(${mapData.background})`;
      gameWrapper.style.backgroundRepeat = "repeat";
      gameWrapper.style.backgroundSize = `${tileWidth}px ${tileHeight}px`;
    };
    bgImg.src = mapData.background;
  } else {
    gameWrapper.style.backgroundImage = "url('https://via.placeholder.com/500x500/ffffff/cccccc?text=BG')";
    gameWrapper.style.backgroundRepeat = "repeat";
    gameWrapper.style.backgroundSize = "500px 500px";
  }
});

// 監聽圖片物件 (map/objects)
const objectsRef = ref(db, 'map/objects');
onChildAdded(objectsRef, (snapshot) => {
  const key = snapshot.key;
  const data = snapshot.val();
  mapObjectsData[key] = data;
  createOrUpdateObjectElement(key, data);
  updateObjectImageList();
});
onChildChanged(objectsRef, (snapshot) => {
  const key = snapshot.key;
  const data = snapshot.val();
  mapObjectsData[key] = data;
  createOrUpdateObjectElement(key, data);
  updateObjectImageList();
});
onChildRemoved(objectsRef, (snapshot) => {
  const key = snapshot.key;
  delete mapObjectsData[key];
  if (mapObjectsDom[key]) {
    mapObjectsDom[key].remove();
    delete mapObjectsDom[key];
  }
  updateObjectImageList();
});

function createOrUpdateObjectElement(key, data) {
  let elem = mapObjectsDom[key];
  if (!elem) {
    elem = document.createElement("img");
    elem.classList.add("map-object");
    mapObjectsDom[key] = elem;
    worldElem.appendChild(elem);
  }
  elem.src = data["圖片網址"];
  elem.style.left = data["XY座標"].x + "px";
  elem.style.top = data["XY座標"].y + "px";
  if (data.select) {
    elem.style.filter = "brightness(50%)";
  } else {
    elem.style.filter = "";
  }
}

// 監聽文字物件 (textObjects)
const textObjectsRef = ref(db, 'textObjects');
onChildAdded(textObjectsRef, (snapshot) => {
  const key = snapshot.key;
  const data = snapshot.val();
  textObjectsData[key] = data;
  createOrUpdateTextObjectElement(key, data);
});
onChildChanged(textObjectsRef, (snapshot) => {
  const key = snapshot.key;
  const data = snapshot.val();
  textObjectsData[key] = data;
  createOrUpdateTextObjectElement(key, data);
});
onChildRemoved(textObjectsRef, (snapshot) => {
  const key = snapshot.key;
  delete textObjectsData[key];
  if (textObjectsDom[key]) {
    textObjectsDom[key].remove();
    delete textObjectsDom[key];
  }
});

function createOrUpdateTextObjectElement(key, data) {
  let elem = textObjectsDom[key];
  if (!elem) {
    elem = document.createElement("div");
    // 使用 Tailwind 工具類別取代原自訂 CSS
    elem.classList.add("absolute", "z-10", "text-base", "text-black", "bg-transparent", "pointer-events-none", "whitespace-nowrap");
    worldElem.appendChild(elem);
    textObjectsDom[key] = elem;
  }
  elem.innerText = data["Text"] || "";
  elem.style.left = data["XY座標"].x + "px";
  elem.style.top = data["XY座標"].y + "px";
}

// 更新本地玩家圖片與位置，並更新 lastActive
function updateHeroImage(account) {
  if (!account) return;
  currentAccount = account;
  const potentialAvatar = `https://avatar2.bahamut.com.tw/avataruserpic/${account.charAt(0)}/${account.charAt(1)}/${account}/${account}.png`;
  const img = new Image();
  img.onload = function() {
    currentHeroImageURL = potentialAvatar;
    updatePlayerData(localX, localY);
  };
  img.onerror = function() {
    currentHeroImageURL = "avatar.png";
    this.onerror = null;
    updatePlayerData(localX, localY);
  };
  img.src = potentialAvatar;
}

// 將本地玩家資料存入 Firebase
function updatePlayerData(x, y) {
  if (!currentAccount) return;
  const playerRef = ref(db, 'players/' + currentAccount);
  set(playerRef, { 
    x, 
    y, 
    account: currentAccount, 
    image: currentHeroImageURL,
    lastActive: Date.now()
  });
}

// 登入與遊客登入
function login() {
  const account = document.getElementById("bahamut-account").value.trim();
  if (account.length < 2) {
    alert("請輸入至少兩個字元。");
    return;
  }
  updateHeroImage(account);
  const playerRef = ref(db, 'players/' + account);
  onDisconnect(playerRef).remove();
  document.getElementById("login-area").classList.add("hidden");
}
function guestLogin() {
  const randomGuest = "遊客" + (Math.floor(Math.random() * 90000) + 10000);
  document.getElementById("bahamut-account").value = randomGuest;
  updateHeroImage(randomGuest);
  const playerRef = ref(db, 'players/' + randomGuest);
  onDisconnect(playerRef).remove();
  document.getElementById("login-area").classList.add("hidden");
}
document.getElementById("login-btn").addEventListener("click", login);
document.getElementById("guest-login-btn").addEventListener("click", guestLogin);

// 建立或更新玩家元素
const playersDom = {};
function updatePlayerElement(account, playerData) {
  let playerElem = playersDom[account];
  if (!playerElem) {
    playerElem = document.createElement("div");
    playerElem.classList.add("player", "absolute");
    const img = document.createElement("img");
    img.classList.add("player-image", "w-12", "h-12", "rounded-full");
    img.onerror = function() {
      this.onerror = null;
      this.src = "avatar.png";
    };
    playerElem.appendChild(img);
    const label = document.createElement("div");
    label.classList.add("player-label", "text-sm", "text-center");
    label.textContent = playerData.account;
    playerElem.appendChild(label);
    playersDom[account] = playerElem;
    worldElem.appendChild(playerElem);
  }
  playerElem.setAttribute("data-x", playerData.x);
  playerElem.setAttribute("data-y", playerData.y);
  playerElem.style.left = playerData.x + "px";
  playerElem.style.top = playerData.y + "px";
  playerElem.querySelector("img").src = playerData.image;
  playerElem.querySelector(".player-label").textContent = playerData.account;
  
  if(playerData.chat && playerData.chat.trim() !== "") {
    let chatElem = playerElem.querySelector('.chat-message');
    if(!chatElem) {
      chatElem = document.createElement("div");
      chatElem.classList.add("chat-message", "text-xs", "bg-white", "p-1", "rounded", "mt-1");
      playerElem.appendChild(chatElem);
    }
    chatElem.innerText = playerData.chat;
    chatElem.style.color = "#000";
    if(playerElem._chatTimer) clearTimeout(playerElem._chatTimer);
    playerElem._chatTimer = setTimeout(() => {
      if(chatElem.parentNode) chatElem.parentNode.removeChild(chatElem);
      playerElem._chatTimer = null;
    }, 5000);
  } else {
    let chatElem = playerElem.querySelector('.chat-message');
    if(chatElem) chatElem.remove();
    if(playerElem._chatTimer) {
      clearTimeout(playerElem._chatTimer);
      playerElem._chatTimer = null;
    }
  }
}
onChildAdded(ref(db, 'players'), (snapshot) => {
  const account = snapshot.key;
  const data = snapshot.val();
  remotePlayersData[account] = data;
  updatePlayerElement(account, data);
});
onChildChanged(ref(db, 'players'), (snapshot) => {
  const account = snapshot.key;
  const data = snapshot.val();
  remotePlayersData[account] = data;
  updatePlayerElement(account, data);
});
onChildRemoved(ref(db, 'players'), (snapshot) => {
  const account = snapshot.key;
  if (playersDom[account]) {
    playersDom[account].remove();
    delete playersDom[account];
  }
  delete remotePlayersData[account];
});

// 拖曳圖片上傳功能
gameWrapper.addEventListener('dragover', function(e) {
  e.preventDefault();
});
gameWrapper.addEventListener('drop', function(e) {
  e.preventDefault();
  let imageUrl = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
  if (!imageUrl) {
    alert("無法獲取圖片網址");
    return;
  }
  for (let key in remotePlayersData) {
    if (remotePlayersData[key].image === imageUrl) {
      alert("不能使用玩家圖片作為物件");
      return;
    }
  }
  let gridX = Math.round(localX / 100) * 100;
  let gridY = Math.round(localY / 100) * 100;
  for (let key in mapObjectsData) {
    let objPos = mapObjectsData[key]["XY座標"];
    if (Math.round(objPos.x) === gridX && Math.round(objPos.y) === gridY) {
      alert("這裡不能放物件");
      return;
    }
  }
  push(ref(db, 'map/objects'), {
    "圖片網址": imageUrl,
    "XY座標": { x: gridX, y: gridY }
  });
});

// 更新圖片物件清單：避免相同網址重複顯示
function updateObjectImageList() {
  objectImageList.innerHTML = "";
  const seenUrls = new Set();
  for (let key in mapObjectsData) {
    let url = mapObjectsData[key]["圖片網址"];
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    let img = document.createElement("img");
    img.src = url;
    img.classList.add("w-16", "h-16", "m-1", "cursor-pointer", "border");
    img.addEventListener("click", () => {
      objectImageUrlInput.value = img.src;
    });
    objectImageList.appendChild(img);
  }
}

// 聊天面板處理：監聽 chatHistory
function updateChatHistory() {
  const chatHistoryRef = ref(db, 'chatHistory');
  onValue(chatHistoryRef, (snapshot) => {
    const data = snapshot.val();
    chatMessagesElem.innerHTML = "";
    if(data) {
      let messages = Object.keys(data).map(key => data[key]);
      messages.sort((a, b) => a.timestamp - b.timestamp);
      messages.forEach(msg => {
        let div = document.createElement("div");
        div.innerText = `[${msg.account}] ${msg.message}`;
        chatMessagesElem.appendChild(div);
      });
      chatMessagesElem.scrollTop = chatMessagesElem.scrollHeight;
    }
  });
}
updateChatHistory();

// 監聽聊天室輸入框
chatInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter" || e.keyCode === 13) {
    if(!currentAccount) return;
    const message = chatInput.value.trim();
    if(!message) return;
    push(ref(db, 'chatHistory'), {
      account: currentAccount,
      message: message,
      timestamp: Date.now()
    });
    chatInput.value = "";
  }
});

// 定時檢查遠端玩家是否活躍
setInterval(() => {
  const now = Date.now();
  for (let account in remotePlayersData) {
    if (now - remotePlayersData[account].lastActive > 5000) {
      remove(ref(db, 'players/' + account));
    }
  }
}, 3000);

// 動畫循環：更新背景位置、玩家移動與物件交互
function animate() {
  if (currentAccount) {
    if (isMouseDown) {
      let centerX = gameWrapper.clientWidth / 2;
      let centerY = gameWrapper.clientHeight / 2;
      let dx = currentMouseX - centerX;
      let dy = currentMouseY - centerY;
      let distance = Math.sqrt(dx * dx + dy * dy);
      const threshold = 10;
      if (distance > threshold) {
        let normX = dx / distance;
        let normY = dy / distance;
        localX += normX * moveSpeed * 2;
        localY += normY * moveSpeed * 2;
        updatePlayerData(localX, localY);
      }
    }
    let repulsionRadius = 150;
    let repulsionForce = 10;
    let selectThreshold = 100; // 物件選取範圍

    // 圖片物件的交互：斥力與選取狀態
    for (let key in mapObjectsData) {
      let obj = mapObjectsData[key];
      let objX = obj["XY座標"].x;
      let objY = obj["XY座標"].y;
      let dx = localX - objX;
      let dy = localY - objY;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (!obj.select && dist < repulsionRadius && dist > 0) {
        let force = repulsionForce * (repulsionRadius - dist) / repulsionRadius;
        localX += (dx / dist) * force;
        localY += (dy / dist) * force;
        updatePlayerData(localX, localY);
      }
      if (dist < selectThreshold) {
        if (!obj.select) {
          obj.select = true;
          obj.selectTimestamp = Date.now();
          const objRef = ref(db, 'map/objects/' + key);
          update(objRef, { select: true, selectTimestamp: obj.selectTimestamp });
        } else {
          let elapsed = Date.now() - obj.selectTimestamp;
          if (elapsed > 3000) {
            const objRef = ref(db, 'map/objects/' + key);
            remove(objRef);
            delete mapObjectsData[key];
            if (mapObjectsDom[key]) {
              mapObjectsDom[key].remove();
              delete mapObjectsDom[key];
            }
            continue;
          }
        }
      } else {
        if (obj.select) {
          const objRef = ref(db, 'map/objects/' + key);
          update(objRef, { select: null, selectTimestamp: null });
          delete obj.select;
          delete obj.selectTimestamp;
        }
      }
    }

    // 玩家間交互
    for (let account in remotePlayersData) {
      if (account !== currentAccount) {
        let other = remotePlayersData[account];
        let dx = localX - other.x;
        let dy = localY - other.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < repulsionRadius && dist > 0) {
          let force = repulsionForce * (repulsionRadius - dist) / repulsionRadius;
          localX += (dx / dist) * force;
          localY += (dy / dist) * force;
          updatePlayerData(localX, localY);
        }
      }
    }
  }
  let offsetX = gameWrapper.clientWidth / 2 - localX;
  let offsetY = gameWrapper.clientHeight / 2 - localY;
  worldElem.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  coordDisplay.textContent = `X: ${Math.round(localX)}, Y: ${Math.round(localY)}`;
  
  let modX = ((localX % tileWidth) + tileWidth) % tileWidth;
  let modY = ((localY % tileHeight) + tileHeight) % tileHeight;
  gameWrapper.style.backgroundPosition = `-${modX}px -${modY}px`;
  
  requestAnimationFrame(animate);
}
animate();
