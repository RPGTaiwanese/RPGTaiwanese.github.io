// DuelRoom.js
import { getDatabase, ref, set, get, onValue, update, runTransaction } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const TURN_DURATION = 10000; // 每回合 10 秒
let mouthCannonMoves = {}; // 儲存從 Firebase 讀取的嘴砲數據

// 讀取 Firebase 中 MouthCannon 資料
function loadMouthCannonData() {
  const db = getDatabase();
  const mcRef = ref(db, "MouthCannon");
  onValue(mcRef, snapshot => {
    mouthCannonMoves = snapshot.val();
    updateMouthCannonSelect();
  });
}

// 更新嘴砲選單
function updateMouthCannonSelect() {
  const select = document.getElementById("mouthcannon-select");
  if (select && mouthCannonMoves) {
    select.innerHTML = "";
    for (let key in mouthCannonMoves) {
      const option = document.createElement("option");
      option.value = key;
      option.text = mouthCannonMoves[key].text;
      select.appendChild(option);
    }
  }
}

// 提交玩家選擇的嘴砲話
function submitMove(duelRef, playerID, moveKey) {
  const move = mouthCannonMoves[moveKey];
  if (!move) return;
  runTransaction(duelRef, data => {
    if (data) {
      if (!data.moves) data.moves = {};
      data.moves[playerID] = moveKey;
    }
    return data;
  }).then(() => {
    console.log("Move submitted: ", move.text);
  });
}

// 根據嘴砲話屬性計算回合結果
function decideOutcome(attr1, attr2) {
  // 規則：A 克 C, C 克 B, B 克 A
  if (attr1 === "A" && attr2 === "C") return "p1";
  if (attr1 === "C" && attr2 === "B") return "p1";
  if (attr1 === "B" && attr2 === "A") return "p1";
  if (attr2 === "A" && attr1 === "C") return "p2";
  if (attr2 === "C" && attr1 === "B") return "p2";
  if (attr2 === "B" && attr1 === "A") return "p2";
  return "draw";
}

// 當雙方都提交嘴砲話時，計算本回合結果
function calculateRoundResult(duelRef, roomData) {
  const movesSubmitted = roomData.moves;
  if (!movesSubmitted || !movesSubmitted[roomData.p1.id] || !movesSubmitted[roomData.p2.id]) return;
  const move1 = mouthCannonMoves[movesSubmitted[roomData.p1.id]];
  const move2 = mouthCannonMoves[movesSubmitted[roomData.p2.id]];
  if (!move1 || !move2) return;
  let resultMsg = `玩家 ${roomData.p1.id} 出招: ${move1.text} (${move1.attr}) vs 玩家 ${roomData.p2.id} 出招: ${move2.text} (${move2.attr})`;
  let outcome = decideOutcome(move1.attr, move2.attr);
  if (outcome === "p1") {
    roomData.p2.hp -= move1.damage;
    resultMsg += `\n玩家 ${roomData.p1.id} 克制玩家 ${roomData.p2.id}, 扣除 ${move1.damage} HP`;
  } else if (outcome === "p2") {
    roomData.p1.hp -= move2.damage;
    resultMsg += `\n玩家 ${roomData.p2.id} 克制玩家 ${roomData.p1.id}, 扣除 ${move2.damage} HP`;
  } else {
    resultMsg += `\n平手，本回合無傷害。`;
  }
  roomData.log.push(resultMsg);
  delete roomData.moves;
  // 輪流改變回合：簡單地交替
  roomData.turn = (roomData.turn === roomData.p1.id) ? roomData.p2.id : roomData.p1.id;
  // 更新 Firebase
  update(duelRef, roomData);
}

// 更新決鬥房間 UI
function updateDuelRoomUI(data) {
  const logDiv = document.getElementById("duel-log");
  if (logDiv && data.log) {
    logDiv.innerHTML = "";
    data.log.forEach(msg => {
      const p = document.createElement("p");
      p.innerText = msg;
      logDiv.appendChild(p);
    });
  }
  const statusDiv = document.getElementById("duel-status");
  if (statusDiv) {
    statusDiv.innerText = `目前回合: ${data.turn}`;
  }
  // 當雙方都提交 move 後，計算結果
  if (data.moves && data.moves[data.p1.id] && data.moves[data.p2.id]) {
    calculateRoundResult(duelRefGlobal, data);
  }
}

// 全域變數保存目前決鬥房間參考（供計算回合結果使用）
let duelRefGlobal = null;

// 動態建立決鬥房間 UI
function showDuelRoomUI(roomID, duelRef) {
  duelRefGlobal = duelRef;
  // 隱藏大廳（假設 index.html 已隱藏 main-section）
  let duelRoomDiv = document.getElementById("duel-room");
  if (!duelRoomDiv) {
    duelRoomDiv = document.createElement("div");
    duelRoomDiv.id = "duel-room";
    document.body.appendChild(duelRoomDiv);
  }
  duelRoomDiv.style.display = "block";
  duelRoomDiv.innerHTML = `
    <h2>決鬥房間 - ${roomID}</h2>
    <div id="duel-log" style="height:150px;overflow-y:auto;border:1px solid #333;padding:5px;background:#fff;"></div>
    <div id="duel-controls">
      <select id="mouthcannon-select"></select>
      <button id="submit-move">送出嘴砲話</button>
    </div>
    <div id="duel-status"></div>
  `;
  loadMouthCannonData();
  document.getElementById("submit-move").addEventListener("click", () => {
    const select = document.getElementById("mouthcannon-select");
    const selectedKey = select.value;
    if (selectedKey) {
      submitMove(duelRef, window.myID, selectedKey);
    }
  });
  // 監聽決鬥房間資料變更
  onValue(duelRef, snapshot => {
    const data = snapshot.val();
    if (data) {
      updateDuelRoomUI(data);
    }
  });
}

// 提供全域函式 enterDuelRoom，供 index.html 調用
// 參數：myID, myAvatar, myLevel, myHP, opponent（對手資料，屬性至少包含 bahamut, avatar, level, hp）
window.enterDuelRoom = function(myID, myAvatar, myLevel, myHP, opponent) {
  const db = getDatabase();
  let roomID = (myID < opponent.bahamut) ? myID + "_" + opponent.bahamut : opponent.bahamut + "_" + myID;
  const duelRef = ref(db, "duels/" + roomID);
  // 檢查房間是否存在，若存在則更新己方 joined 狀態；若不存在則建立新房間
  get(duelRef).then(snapshot => {
    if (snapshot.exists()) {
      runTransaction(duelRef, d => {
        if (d) {
          if (d.p1.id === myID) d.joined.p1 = true;
          if (d.p2.id === myID) d.joined.p2 = true;
        }
        return d;
      });
    } else {
      let p1, p2, joined = {};
      if (myID < opponent.bahamut) {
        p1 = { id: myID, avatar: myAvatar, lv: myLevel, hp: myHP };
        p2 = { id: opponent.bahamut, avatar: opponent.avatar, lv: opponent.level, hp: opponent.hp };
        joined = { p1: true, p2: false };
      } else {
        p1 = { id: opponent.bahamut, avatar: opponent.avatar, lv: opponent.level, hp: opponent.hp };
        p2 = { id: myID, avatar: myAvatar, lv: myLevel, hp: myHP };
        joined = { p1: false, p2: true };
      }
      const ds = {
        p1: p1,
        p2: p2,
        turn: myID,
        log: ["兩位路見不平的巴友展開了決鬥!!!"],
        turnEnd: Date.now() + TURN_DURATION,
        joined: joined
      };
      set(duelRef, ds);
    }
    showDuelRoomUI(roomID, duelRef);
  });
};
