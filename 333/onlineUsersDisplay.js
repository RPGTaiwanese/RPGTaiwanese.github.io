/**
 * 檔案名稱: onlineUsersDisplay.js
 * 描述: 此檔案用於在網頁的右上角顯示 Google 登入在線人數以及其他用戶名。
 *      用戶自己的名字會預設在用戶名列表的第一位。
 *
 * 使用方法:
 * 1. 確保你的網頁已正確設定 Firebase，並已初始化 Firebase 應用程式。
 *    你需要 Firebase 應用程式的配置資訊，例如 apiKey, authDomain 等。
 *    (請參考 Firebase 官方文檔進行設定: https://firebase.google.com/docs/web/setup)
 *
 * 2. 在你的 HTML 檔案的 <head> 或 <body> 標籤中引入此 JavaScript 檔案。
 *    <script src="onlineUsersDisplay.js" type="module"></script>
 *
 * 3. 在你的 HTML 檔案的 <body> 標籤中，你想顯示在線用戶資訊的位置加入一個 HTML 元素
 *    (例如 <div> 或 <span>)。建議放在網頁右上角以便醒目顯示。
 *    例如:
 *    <div id="online-users-display" style="position: absolute; top: 10px; right: 10px; background-color: #f0f0f0; padding: 10px; border-radius: 5px;"></div>
 *
 * 4. 確保你的 HTML 檔案中有處理 Google 登入的按鈕或機制。
 *    當用戶成功使用 Google 登入後，此腳本將會自動顯示在線用戶資訊。
 *
 * 注意事項:
 * - 此腳本依賴 Firebase Authentication 和 Firebase Realtime Database 服務。
 * - 你需要在 Firebase 控制台中啟用 Google 登入提供者。
 * - 確保你的 Firebase Realtime Database 的安全規則設定允許用戶讀取和寫入必要的數據。
 * - 此腳本假設你已經在你的網頁中初始化了 Firebase 應用程式，並具有可用的 `firebaseConfig` 變數。
 */

// Firebase 初始化設定 (使用 CDN 連結)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.19.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.19.1/firebase-auth.js';
import { getDatabase, ref, onValue, set, onDisconnect } from 'https://www.gstatic.com/firebasejs/9.19.1/firebase-database.js';

// 你的 Firebase 配置 (請替換成你自己的配置 - 這個配置資訊將在 HTML 檔案中提供)
// const firebaseConfig = { ... };  // firebaseConfig 將在 HTML 中定義

// 初始化 Firebase 應用程式
const app = initializeApp(firebaseConfig); // firebaseConfig 將在 HTML 中傳入
const auth = getAuth(app);
const database = getDatabase(app);

// HTML 元素 ID，用於顯示在線用戶資訊
const onlineUsersDisplayElementId = 'online-users-display';

/**
 * 處理 Google 登入
 */
function googleSignIn() {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then((result) => {
      // 登入成功
      const user = result.user;
      console.log("Google 登入成功:", user);
      // 在這裡可以處理登入成功後的邏輯，例如設定用戶在線狀態
    }).catch((error) => {
      // 登入失敗
      console.error("Google 登入失敗:", error);
    });
}

/**
 * 處理登出
 */
function signOutUser() {
  signOut(auth).then(() => {
    // 登出成功
    console.log("用戶登出成功");
    // 在這裡可以處理登出成功後的邏輯
  }).catch((error) => {
    // 登出失敗
    console.error("用戶登出失敗:", error);
  });
}

/**
 * 設定用戶在線狀態到 Firebase Realtime Database
 * @param {string} userId 用戶 ID
 * @param {string} userName 用戶名稱
 */
function setUserOnlineStatus(userId, userName) {
  if (!userId) return; // 如果沒有用戶 ID，則不執行

  const userStatusRef = ref(database, 'usersStatus/' + userId);
  const isOfflineForDatabase = {
    state: 'offline',
    last_changed: { '.sv': 'timestamp' },
  };

  const isOnlineForDatabase = {
    state: 'online',
    name: userName, // 儲存用戶名稱
    last_changed: { '.sv': 'timestamp' },
  };

  // 當用戶斷線時，設定為離線
  onDisconnect(userStatusRef).set(isOfflineForDatabase).then(() => {
    // 設置用戶上線狀態
    set(userStatusRef, isOnlineForDatabase);
  });
}

/**
 * 從 Firebase Realtime Database 獲取在線用戶列表並顯示
 */
function displayOnlineUsers() {
  const onlineUsersRef = ref(database, 'usersStatus');
  const displayElement = document.getElementById(onlineUsersDisplayElementId);
  if (!displayElement) {
    console.error(`找不到 HTML 元素，ID: ${onlineUsersDisplayElementId}`);
    return;
  }

  onValue(onlineUsersRef, (snapshot) => {
    let onlineUsers = [];
    let onlineCount = 0;
    let currentUserName = '';
    const usersStatus = snapshot.val();

    if (usersStatus) {
      for (const userId in usersStatus) {
        if (usersStatus[userId].state === 'online') {
          onlineCount++;
          onlineUsers.push({
            id: userId,
            name: usersStatus[userId].name
          });
        }
      }
    }

    // 獲取當前用戶 ID 和 名稱
    const currentUser = auth.currentUser;
    let currentUserId = null;
    if (currentUser) {
      currentUserId = currentUser.uid;
      currentUserName = currentUser.displayName || '未知名用戶'; // 使用 displayName 作為用戶名
    }

    // 將當前用戶名稱放到列表最前面
    let sortedOnlineUsers = [];
    if (currentUserId) {
        let currentUserData = onlineUsers.find(user => user.id === currentUserId);
        if (currentUserData) {
            sortedOnlineUsers.push(currentUserData.name); // 將當前用戶名稱先加入
            onlineUsers = onlineUsers.filter(user => user.id !== currentUserId); // 從原列表中移除當前用戶
        } else if (currentUser) {
            sortedOnlineUsers.push(currentUserName); // 如果當前用戶在線列表中沒有，但已登入，則加入 (例如剛登入還沒同步)
        }
    }
    onlineUsers.forEach(user => sortedOnlineUsers.push(user.name)); // 加入其他在線用戶名稱

    // 構建顯示內容
    let displayContent = `在線人數: ${onlineCount}`;
    if (sortedOnlineUsers.length > 0) {
      displayContent += `<br>用戶: ${sortedOnlineUsers.join(', ')}`;
    } else {
      displayContent += `<br>目前沒有其他用戶在線`;
    }
    displayElement.innerHTML = displayContent;
  });
}


// 監聽用戶身份驗證狀態變化
onAuthStateChanged(auth, (user) => {
  if (user) {
    // 用戶已登入
    const uid = user.uid;
    const userName = user.displayName || '未知名用戶'; // 使用 displayName 作為用戶名
    setUserOnlineStatus(uid, userName); // 設定用戶為在線狀態
    displayOnlineUsers(); // 顯示在線用戶列表
    console.log("用戶已登入:", user.displayName, user.uid);
  } else {
    // 用戶已登出
    console.log("用戶已登出");
    displayOnlineUsers(); // 更新在線用戶列表 (可能會顯示人數為 0 或排除已登出的用戶)
  }
});

// 初始化顯示在線用戶資訊 (在頁面載入時嘗試獲取並顯示)
displayOnlineUsers();

// 以下為範例 Google 登入按鈕 HTML (你需要將此按鈕加入到你的 HTML 中，並綁定 googleSignIn 函數)
// <button onclick="googleSignIn()">使用 Google 登入</button>
// <button onclick="signOutUser()">登出</button>

// 確保 googleSignIn 和 signOutUser 函數在全局作用域中，以便 HTML 可以調用
window.googleSignIn = googleSignIn;
window.signOutUser = signOutUser;