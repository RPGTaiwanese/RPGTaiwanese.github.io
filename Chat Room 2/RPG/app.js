// app.js
// 載入 Firebase 所需模組（建議使用 CDN 模組版本）
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// 你提供的 Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyDt9mJRH-BHlEksl4xla32sVIUGVnLUxWY",
  authDomain: "future-infusion-368721.firebaseapp.com",
  projectId: "future-infusion-368721",
  storageBucket: "future-infusion-368721.firebasestorage.app",
  messagingSenderId: "345445420847",
  appId: "1:345445420847:web:070778c173ec6157c6dbda",
  measurementId: "G-57PJMMNNWW"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// 遊戲狀態結構：每個狀態包含敘事文字與可選擇項（按鈕顯示文字與下一個狀態 ID）
const gameStates = {
  start: {
    text: "你是一位普通的學生，在一個平凡的夜晚，突然接到一則神秘訊息：「是否願意進入數網，探索未知的世界？」",
    options: [
      { text: "進入數網", next: "enter" },
      { text: "忽略訊息，安然入睡", next: "ignore" }
    ]
  },
  enter: {
    text: "你決定接受挑戰，進入數網世界。剛踏入這個充滿數位光影與神秘符文的世界，便遇到了一位自稱『藍影』的神秘網管，他告訴你：『你的命運，已與數據緊緊相連。』",
    options: [
      { text: "詢問藍影有關命運的秘密", next: "inquire" },
      { text: "直接前往尋找『數網之心』", next: "search" }
    ]
  },
  ignore: {
    text: "你選擇忽略這個神秘訊息，安心睡去。然而，夢中卻頻頻出現數字與符文交織的景象，似乎在暗示你遺漏了一場重要冒險……（遊戲結束）",
    options: []
  },
  inquire: {
    text: "藍影告訴你：『數網不僅僅是虛擬空間，更是現實的隱秘支流。只有掌握其中的力量，才能改變世界的命運。』",
    options: [
      { text: "聽從藍影指引，尋找數網之心", next: "search" },
      { text: "猶豫不決，返回現實", next: "ignore" }
    ]
  },
  search: {
    text: "你開始在數網中探尋線索，每一行程式碼似的路徑都彷彿通往未知的冒險……（此處可擴充更多劇情與任務）",
    options: [
      { text: "（尚未實作的後續劇情）", next: "start" }
    ]
  }
};

// 記錄目前遊戲狀態，初始為 start
let currentStateId = "start";

// 選取頁面元素
const storyEl = document.getElementById("story");
const optionsEl = document.getElementById("options");
const saveButton = document.getElementById("saveButton");
const loadButton = document.getElementById("loadButton");

/**
 * 根據 stateId 渲染遊戲畫面：顯示敘事文字與選項按鈕
 * @param {string} stateId 
 */
function renderState(stateId) {
  currentStateId = stateId;
  const state = gameStates[stateId];
  if (!state) {
    storyEl.textContent = "未知的狀態！";
    optionsEl.innerHTML = "";
    return;
  }
  // 顯示故事敘述
  storyEl.textContent = state.text;
  // 清空選項區塊
  optionsEl.innerHTML = "";
  // 為每個選項產生一個按鈕
  state.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.className = "option-button";
    btn.textContent = option.text;
    btn.addEventListener("click", () => {
      renderState(option.next);
    });
    optionsEl.appendChild(btn);
  });
}

// 儲存進度至 Firestore
async function saveProgress() {
  try {
    // 這裡我們以固定的文件 ID "testUser" 儲存進度，正式專案可結合 Firebase Authentication 取得使用者 uid
    await setDoc(doc(db, "gameProgress", "testUser"), {
      currentStateId: currentStateId,
      timestamp: Date.now()
    });
    alert("進度已儲存！");
  } catch (error) {
    console.error("儲存進度失敗：", error);
    alert("儲存失敗，請稍後再試。");
  }
}

// 從 Firestore 讀取進度
async function loadProgress() {
  try {
    const docRef = doc(db, "gameProgress", "testUser");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      renderState(data.currentStateId);
      alert("進度已讀取！");
    } else {
      alert("找不到進度資料。");
    }
  } catch (error) {
    console.error("讀取進度失敗：", error);
    alert("讀取進度失敗，請稍後再試。");
  }
}

// 綁定儲存與讀取進度按鈕事件
saveButton.addEventListener("click", saveProgress);
loadButton.addEventListener("click", loadProgress);

// 啟動遊戲：先渲染初始狀態
renderState(currentStateId);
