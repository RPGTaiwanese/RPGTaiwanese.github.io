import { app, db } from "./firebase-config.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { ref, get, set } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

document.getElementById("login-btn").addEventListener("click", () => {
  signInWithPopup(auth, provider)
    .then((result) => {
      const user = result.user;
      console.log("登入成功：", user);
      const charRef = ref(db, "characters/" + user.uid);
      get(charRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            console.log("找到儲存的角色：", snapshot.val());
            loadSavedCharacter(snapshot.val());
          } else {
            console.log("尚無角色存檔，導向選擇職業頁面");
            showRoleSelection();
          }
        })
        .catch((error) => {
          console.error("取得角色存檔時發生錯誤：", error);
        });
    })
    .catch((error) => {
      console.error("登入錯誤：", error);
    });
});

document.getElementById("logout-btn").addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      console.log("已登出");
    })
    .catch((error) => {
      console.error("登出錯誤：", error);
    });
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("login-btn").style.display = "none";
    document.getElementById("logout-btn").style.display = "inline-block";
  } else {
    document.getElementById("login-btn").style.display = "inline-block";
    document.getElementById("logout-btn").style.display = "none";
  }
});

document.getElementById("start-btn").addEventListener("click", startGame);

function startGame() {
  const introSection = document.getElementById("intro");
  const gameContent = document.getElementById("game-content");

  introSection.classList.add("hidden");
  gameContent.classList.remove("hidden");

  gameContent.innerHTML = "";

  let narrative =
    "在新台灣的夜幕中，霓虹閃爍，數位靈魂輕聲召喚。請選擇你的角色，開始你的冒險……";
  let introPen = document.createElement("p");
  introPen.textContent = narrative;
  gameContent.appendChild(introPen);

  showRoleSelection();
}

function showRoleSelection() {
  const gameContent = document.getElementById("game-content");
  gameContent.innerHTML = "";

  const selectionContainer = document.createElement("div");
  selectionContainer.id = "role-selection";

  const roles = [
    {
      id: "outsider_hahamut",
      name: "場外人 —— 哈哈姆特的鄉民",
      background: "在數位洪流與現實交織的世界中，這群來自網路邊緣的鄉民平日只懂得調侃，卻在關鍵時刻喚醒潛藏的數位力量。"
    },
    {
      id: "data_drifter",
      name: "資料流浪者 (Data Drifter)",
      background: "生於資料洪流，自小對數位資訊敏銳。自由徘徊於虛擬與現實間。",
      abilities: [
        "監察針",
        "數據流動",
        "資訊解析",
        "數位迷思"
      ]
    },
    {
      id: "cyber_samurai",
      name: "網絡劍士 (Cyber Samurai)",
      background: "來自家族傳承，用現代科技賦予劍術新意義。",
      abilities: [
        "數位打擊",
        "影斬連斬",
        "符文護盾"
      ]
    },
    {
      id: "virtual_seer",
      name: "虛擬靈媒 (Virtual Seer)",
      background: "天生能看透數據幻象，成為網路焦點的媒介。",
      abilities: [
        "預測",
        "精靈護盾",
        "記憶重構"
      ]
    },
    {
      id: "system_engineer",
      name: "系統工程師 (System Engineer)",
      background: "在系統事故中脫險，於虛實間守護平衡。",
      abilities: [
        "防火牆結構",
        "系統重組",
        "程式編纂"
      ]
    },
    {
      id: "digital_mage",
      name: "數字法師 (Digital Mage)",
      background: "從古老魔法典籍中吸取力量，以符文施法創造奇蹟。",
      abilities: [
        "數字風暴",
        "符文爆裂",
        "虛空召喚"
      ]
    }
  ];

  roles.forEach(role => {
    const card = document.createElement("div");
    card.classList.add("role-card");

    const title = document.createElement("h3");
    title.classList.add("role-title");
    title.textContent = role.name;
    card.appendChild(title);

    const desc = document.createElement("p");
    desc.classList.add("role-description");

    if (role.id === "outsider_hahamut") {
      const fullText = role.background;
      // Truncate to 80 characters and use a toggle "展開" button
      const truncatedText = fullText.length > 80 ? fullText.substring(0, 80) + "..." : fullText;
      desc.innerHTML = truncatedText;
      const toggleBtn = document.createElement("button");
      toggleBtn.textContent = "展開";
      toggleBtn.style.marginTop = "10px";
      toggleBtn.addEventListener("click", () => {
        if (toggleBtn.textContent === "展開") {
          desc.innerHTML = fullText;
          toggleBtn.textContent = "收合";
        } else {
          desc.innerHTML = truncatedText;
          toggleBtn.textContent = "展開";
        }
      });
      card.appendChild(desc);
      card.appendChild(toggleBtn);
    } else {
      desc.innerHTML = role.background;
      card.appendChild(desc);
    }

    const abilitiesDiv = document.createElement("div");
    abilitiesDiv.classList.add("role-abilities");
    const abilitiesList = document.createElement("ul");
    if (role.abilities) {
      role.abilities.forEach(ability => {
        const li = document.createElement("li");
        li.textContent = ability;
        abilitiesList.appendChild(li);
      });
    }
    abilitiesDiv.appendChild(abilitiesList);
    card.appendChild(abilitiesDiv);

    const selectBtn = document.createElement("button");
    selectBtn.classList.add("select-role-btn");
    selectBtn.textContent = "選擇此職業";
    selectBtn.addEventListener("click", () => handleRoleSelection(role));
    card.appendChild(selectBtn);

    selectionContainer.appendChild(card);
  });

  gameContent.appendChild(selectionContainer);

  const backBtn = document.createElement("button");
  backBtn.textContent = "返回上一頁";
  backBtn.style.marginTop = "20px";
  backBtn.addEventListener("click", backToIntro);
  gameContent.appendChild(backBtn);
}

function handleRoleSelection(role) {
  const gameContent = document.getElementById("game-content");
  window.selectedRole = role;

  const roleSelection = document.getElementById("role-selection");
  if (roleSelection) {
    roleSelection.remove();
  }

  gameContent.innerHTML = "";

  const confirmation = document.createElement("p");
  confirmation.textContent = `你選擇了 ${role.name}。現在讓我們開始角色客製化，以進一步定義你的冒險者。`;
  gameContent.appendChild(confirmation);

  const customizeBtn = document.createElement("button");
  customizeBtn.textContent = "創造角色";
  customizeBtn.style.marginTop = "20px";
  customizeBtn.addEventListener("click", showCharacterCustomization);
  gameContent.appendChild(customizeBtn);

  const backBtn = document.createElement("button");
  backBtn.textContent = "返回選擇職業";
  backBtn.style.marginTop = "20px";
  backBtn.style.marginLeft = "10px";
  backBtn.addEventListener("click", () => {
    gameContent.innerHTML = "";
    showRoleSelection();
  });
  gameContent.appendChild(backBtn);
}

function showCharacterCustomization() { 
  const gameContent = document.getElementById("game-content");
  gameContent.innerHTML = "";

  const formTitle = document.createElement("h2");
  formTitle.textContent = "角色客製化";
  gameContent.appendChild(formTitle);

  const nameLabel = document.createElement("label");
  nameLabel.textContent = "角色名稱: ";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.id = "character-name";
  nameInput.value = window.selectedRole.name;
  nameInput.required = true;
  nameLabel.appendChild(nameInput);
  gameContent.appendChild(nameLabel);
  gameContent.appendChild(document.createElement("br"));

  const avatarLabel = document.createElement("div");
  avatarLabel.textContent = "選擇代表符號: ";
  gameContent.appendChild(avatarLabel);

  const avatarOptions = document.createElement("div");
  avatarOptions.className = "avatar-options";

  const avatars = [
    { id: "avatar1", svg: '<svg width="40" height="40"><circle cx="20" cy="20" r="18" stroke="cyan" stroke-width="2" fill="none" /></svg>' },
    { id: "avatar2", svg: '<svg width="40" height="40"><rect x="5" y="5" width="30" height="30" stroke="cyan" stroke-width="2" fill="none" /></svg>' },
    { id: "avatar3", svg: '<svg width="40" height="40"><polygon points="20,5 35,35 5,35" stroke="cyan" stroke-width="2" fill="none" /></svg>' }
  ];

  avatars.forEach(av => {
    const label = document.createElement("label");
    label.style.marginRight = "10px";
    label.innerHTML = `<input type="radio" name="avatar" value="${av.id}" ${av.id === "avatar1" ? "checked" : ""}> ${av.svg}`;
    avatarOptions.appendChild(label);
  });
  gameContent.appendChild(avatarOptions);

  const attributesTitle = document.createElement("h3");
  attributesTitle.textContent = "分配初始屬性 (剩餘點數: 10)";
  gameContent.appendChild(attributesTitle);

  const totalPoints = 10;
  let remainingPoints = totalPoints;

  const remainingDisplay = document.createElement("p");
  remainingDisplay.id = "remaining-points";
  remainingDisplay.textContent = `剩餘點數: ${remainingPoints}`;
  gameContent.appendChild(remainingDisplay);

  const attributeInputs = {};
  const attributes = [
    { key: "attack", label: "攻擊" },
    { key: "defense", label: "防禦" },
    { key: "agility", label: "靈敏" },
    { key: "network", label: "網路連結" }
  ];
  attributes.forEach(attr => {
    const attrDiv = document.createElement("div");
    attrDiv.className = "attribute-input";

    const attrLabel = document.createElement("label");
    attrLabel.textContent = attr.label + ": ";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.value = "0";
    input.dataset.attrKey = attr.key;
    input.style.width = "50px";
    input.addEventListener("change", updateRemainingPoints);

    attrLabel.appendChild(input);
    attrDiv.appendChild(attrLabel);
    gameContent.appendChild(attrDiv);

    attributeInputs[attr.key] = input;
  });

  function updateRemainingPoints() {
    let sum = 0;
    Object.values(attributeInputs).forEach(inp => {
      sum += parseInt(inp.value) || 0;
    });
    remainingPoints = totalPoints - sum;
    remainingDisplay.textContent = `剩餘點數: ${remainingPoints}`;
    remainingDisplay.style.color = remainingPoints < 0 ? "red" : "#f0f0f0";
  }

  const backgroundTitle = document.createElement("h3");
  backgroundTitle.textContent = "選擇背景故事與個人目標";
  gameContent.appendChild(backgroundTitle);

  const goals = [
    { value: "truth", label: "尋求真相" },
    { value: "protect", label: "保護夥伴" },
    { value: "power", label: "追求力量" }
  ];

  const goalDiv = document.createElement("div");
  goals.forEach(goal => {
    const label = document.createElement("label");
    label.style.marginRight = "10px";
    label.innerHTML = `<input type="radio" name="goal" value="${goal.value}" ${goal.value === "truth" ? "checked" : ""}> ${goal.label}`;
    goalDiv.appendChild(label);
  });
  gameContent.appendChild(goalDiv);

  const storyLabel = document.createElement("label");
  storyLabel.textContent = "簡述你的背景故事 (可選): ";
  const storyInput = document.createElement("textarea");
  storyInput.id = "background-story";
  storyInput.rows = 3;
  storyInput.cols = 40;
  storyLabel.appendChild(storyInput);
  gameContent.appendChild(document.createElement("br"));
  gameContent.appendChild(storyLabel);

  const submitBtn = document.createElement("button");
  submitBtn.textContent = "確認角色資料送出";
  submitBtn.style.marginTop = "20px";
  submitBtn.addEventListener("click", submitCustomization);
  gameContent.appendChild(document.createElement("br"));
  gameContent.appendChild(submitBtn);

  const backBtn = document.createElement("button");
  backBtn.textContent = "返回選擇職業";
  backBtn.style.marginTop = "20px";
  backBtn.style.marginLeft = "10px";
  backBtn.addEventListener("click", () => {
    gameContent.innerHTML = "";
    showRoleSelection();
  });
  gameContent.appendChild(backBtn);

  function submitCustomization() {
    if (remainingPoints < 0) {
      alert("請分配正確的屬性點數，剩餘點數不能為負數！");
      return;
    }
    const characterName = document.getElementById("character-name").value;
    const selectedAvatar = document.querySelector('input[name="avatar"]:checked').value;
    const attributesData = {};
    Object.keys(attributeInputs).forEach(key => {
      attributesData[key] = parseInt(attributeInputs[key].value) || 0;
    });
    const selectedGoal = document.querySelector('input[name="goal"]:checked').value;
    const backgroundStory = document.getElementById("background-story").value;

    window.characterData = {
      name: characterName,
      avatar: selectedAvatar,
      attributes: attributesData,
      goal: selectedGoal,
      backgroundStory: backgroundStory,
      role: window.selectedRole,
      level: 1,
      exp: 0,
      expNext: 100,
      resources: { dataCoin: 100, networkEnergy: 50 },
      questProgress: {
        currentQuest: null,
        progress: "目前無任務，開始你的旅程！"
      },
      onlineLink: window.location.href
    };

    const currentUser = auth.currentUser;
    if (currentUser) {
      set(ref(db, "characters/" + currentUser.uid), window.characterData)
        .then(() => {
          console.log("角色資料儲存成功。");
          gameLobby();
        })
        .catch((error) => {
          console.error("角色資料儲存失敗：", error);
        });
    } else {
      console.error("沒有使用者登入。");
    }
  }
}

function backToIntro() {
  const introSection = document.getElementById("intro");
  const gameContent = document.getElementById("game-content");
  gameContent.innerHTML = "";
  introSection.classList.remove("hidden");
  gameContent.classList.add("hidden");
}

function loadSavedCharacter(characterData) {
  window.characterData = characterData;
  const gameContent = document.getElementById("game-content");
  gameContent.classList.remove("hidden");
  gameContent.innerHTML = "";
  const welcomeMsg = document.createElement("p");
  welcomeMsg.textContent = "歡迎回來, " + characterData.name + "!";
  gameContent.appendChild(welcomeMsg);
  const continueBtn = document.createElement("button");
  continueBtn.textContent = "進入遊戲大廳";
  continueBtn.style.marginTop = "20px";
  continueBtn.addEventListener("click", gameLobby);
  gameContent.appendChild(continueBtn);
}

function gameLobby() {
  const gameContent = document.getElementById("game-content");
  gameContent.innerHTML = "";

  const lobbyContainer = document.createElement("div");
  lobbyContainer.classList.add("lobby-container");

  const navMenu = document.createElement("div");
  navMenu.classList.add("lobby-nav-menu");
  const modules = [
    { id: "profile", label: "個人資料" },
    { id: "quests", label: "任務系統" },
    { id: "dungeons", label: "副本挑戰" },
    { id: "inventory", label: "物品背包" },
    { id: "leaderboard", label: "排行榜" }
  ];
  modules.forEach(mod => {
    const btn = document.createElement("button");
    btn.textContent = mod.label;
    btn.addEventListener("click", () => {
      alert(`模組 ${mod.label} 功能尚未開發`);
    });
    navMenu.appendChild(btn);
  });
  lobbyContainer.appendChild(navMenu);

  const character = window.characterData || {
    name: "冒險者",
    avatar: "avatar1",
    role: { name: "未知職業" },
    level: 1,
    exp: 0,
    expNext: 100,
    attributes: { attack: 0, defense: 0, agility: 0, network: 0 },
    resources: { dataCoin: 0, networkEnergy: 0 },
    questProgress: { progress: "目前無任務" }
  };

  const profileCard = document.createElement("div");
  profileCard.classList.add("lobby-profile-card");

  let avatarSVG = "";
  if (character.avatar === "avatar1") {
    avatarSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="38" stroke="cyan" stroke-width="2" fill="none"/></svg>';
  } else if (character.avatar === "avatar2") {
    avatarSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect x="10" y="10" width="60" height="60" stroke="cyan" stroke-width="2" fill="none"/></svg>';
  } else if (character.avatar === "avatar3") {
    avatarSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><polygon points="40,10 70,70 10,70" stroke="cyan" stroke-width="2" fill="none"/></svg>';
  } else {
    avatarSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="38" stroke="cyan" stroke-width="2" fill="none"/></svg>';
  }
  const avatarContainer = document.createElement("div");
  avatarContainer.innerHTML = avatarSVG;
  profileCard.appendChild(avatarContainer);

  const nameEl = document.createElement("h3");
  nameEl.textContent = character.name;
  profileCard.appendChild(nameEl);

  const roleEl = document.createElement("p");
  roleEl.textContent = character.role ? character.role.name : "";
  profileCard.appendChild(roleEl);

  const levelEl = document.createElement("p");
  levelEl.textContent = `等級 ${character.level} | EXP: ${character.exp}/${character.expNext}`;
  profileCard.appendChild(levelEl);

  const attrEl = document.createElement("p");
  attrEl.innerHTML = `屬性: 攻擊 ${character.attributes.attack}, 防禦 ${character.attributes.defense}, 靈敏 ${character.attributes.agility}, 網絡連結 ${character.attributes.network}`;
  profileCard.appendChild(attrEl);

  const resourcesEl = document.createElement("p");
  resourcesEl.textContent = `資源: 數據幣 ${character.resources.dataCoin}, 數網能量 ${character.resources.networkEnergy}`;
  profileCard.appendChild(resourcesEl);

  lobbyContainer.appendChild(profileCard);

  // 新增任務進度區塊（Quest Progress Section）
  const questCard = document.createElement("div");
  questCard.classList.add("lobby-quest-card");
  questCard.style.background = "rgba(255,255,255,0.9)";
  questCard.style.color = "#333";
  questCard.style.padding = "20px";
  questCard.style.borderRadius = "8px";
  questCard.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.3)";
  questCard.style.maxWidth = "400px";
  questCard.style.width = "100%";
  questCard.style.textAlign = "center";
  questCard.style.marginBottom = "20px";
  questCard.innerHTML = `
    <h3 style="margin:0; font-size:1.5rem; margin-bottom: 5px;">任務進度</h3>
    <p>${character.questProgress && character.questProgress.progress ? character.questProgress.progress : "目前無任務"}</p>
  `;
  lobbyContainer.appendChild(questCard);

  gameContent.appendChild(lobbyContainer);
}