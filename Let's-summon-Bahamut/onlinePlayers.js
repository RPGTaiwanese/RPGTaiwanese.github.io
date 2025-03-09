import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 取得預設的 Firebase Database（利用主程式已初始化的 app）
const db = getDatabase();
// 取得在線玩家視窗中列表的 DOM 參考
const onlinePlayersListElem = document.getElementById("online-players-list");

// 監聽 players 節點並更新在線玩家列表
onValue(ref(db, 'players'), (snapshot) => {
  const playersData = snapshot.val();
  onlinePlayersListElem.innerHTML = "";
  if (playersData) {
    for (const key in playersData) {
      let li = document.createElement("li");
      li.textContent = playersData[key].account;
      onlinePlayersListElem.appendChild(li);
    }
  }
});