(function() {
  "use strict";

  // 顯示預設提示視窗函式（用於按鈕 1~4）
  function showModal() {
    // 如果已存在則不重複建立
    if (document.getElementById("featureModal")) return;

    // 建立 modal 外層容器
    const modal = document.createElement("div");
    modal.id = "featureModal";
    modal.className = "modal";
    // 初始置中
    modal.style.top = "50%";
    modal.style.left = "50%";
    modal.style.transform = "translate(-50%, -50%)";

    // 建立 modal header（用於拖曳及顯示關閉按鈕）
    const header = document.createElement("div");
    header.className = "modal-header";

    const title = document.createElement("span");
    title.textContent = "提示";
    header.appendChild(title);

    const closeButton = document.createElement("button");
    closeButton.className = "close-button";
    closeButton.textContent = "X";
    header.appendChild(closeButton);

    modal.appendChild(header);

    // 建立內容區，顯示提示文字
    const content = document.createElement("div");
    content.className = "modal-content";
    content.textContent = "這個功能尚未開放";
    modal.appendChild(content);

    // 將 modal 加入頁面
    document.body.appendChild(modal);

    // 拖曳功能實作
    (function makeDraggable(modalEl) {
      let isDragging = false;
      let offsetX = 0;
      let offsetY = 0;

      header.addEventListener("mousedown", function(e) {
        isDragging = true;
        offsetX = e.clientX - modalEl.offsetLeft;
        offsetY = e.clientY - modalEl.offsetTop;
        document.addEventListener("mousemove", moveModal);
        document.addEventListener("mouseup", stopDrag);
      });

      function moveModal(e) {
        if (isDragging) {
          modalEl.style.left = (e.clientX - offsetX) + "px";
          modalEl.style.top = (e.clientY - offsetY) + "px";
          // 當手動設定 left/top 時移除 transform
          modalEl.style.transform = "";
        }
      }

      function stopDrag() {
        isDragging = false;
        document.removeEventListener("mousemove", moveModal);
        document.removeEventListener("mouseup", stopDrag);
      }
    })(modal);

    // 點擊關閉按鈕關閉 modal
    closeButton.addEventListener("click", function() {
      modal.remove();
    });
  }

  // 顯示第五個按鈕專屬的 modal（包含超連結按鈕）
  function showModalForFifth() {
    // 如果已存在則不重複建立
    if (document.getElementById("featureModal")) return;

    const modal = document.createElement("div");
    modal.id = "featureModal";
    modal.className = "modal";
    // 初始置中
    modal.style.top = "50%";
    modal.style.left = "50%";
    modal.style.transform = "translate(-50%, -50%)";

    // 建立 modal header（用於拖曳及顯示關閉按鈕）
    const header = document.createElement("div");
    header.className = "modal-header";

    const title = document.createElement("span");
    title.textContent = "提示";
    header.appendChild(title);

    const closeButton = document.createElement("button");
    closeButton.className = "close-button";
    closeButton.textContent = "X";
    header.appendChild(closeButton);

    modal.appendChild(header);

    // 建立內容區，放入超連結按鈕
    const content = document.createElement("div");
    content.className = "modal-content";

    const linkButton = document.createElement("a");
    linkButton.href = "https://home.gamer.com.tw/artwork.php?sn=6094377";
    // 可依需求設定 target="_blank" 讓連結另開視窗
    // linkButton.target = "_blank";
    linkButton.textContent = "遊戲更新日誌";
    linkButton.style.display = "inline-block";
    linkButton.style.padding = "10px 20px";
    linkButton.style.backgroundColor = "#007BFF";
    linkButton.style.color = "#fff";
    linkButton.style.borderRadius = "4px";
    linkButton.style.textDecoration = "none";
    linkButton.addEventListener("mouseover", function(){
      linkButton.style.backgroundColor = "#0056b3";
    });
    linkButton.addEventListener("mouseout", function(){
      linkButton.style.backgroundColor = "#007BFF";
    });
    content.appendChild(linkButton);

    modal.appendChild(content);

    document.body.appendChild(modal);

    // 拖曳功能實作
    (function makeDraggable(modalEl) {
      let isDragging = false;
      let offsetX = 0;
      let offsetY = 0;

      header.addEventListener("mousedown", function(e) {
        isDragging = true;
        offsetX = e.clientX - modalEl.offsetLeft;
        offsetY = e.clientY - modalEl.offsetTop;
        document.addEventListener("mousemove", moveModal);
        document.addEventListener("mouseup", stopDrag);
      });

      function moveModal(e) {
        if (isDragging) {
          modalEl.style.left = (e.clientX - offsetX) + "px";
          modalEl.style.top = (e.clientY - offsetY) + "px";
          modalEl.style.transform = "";
        }
      }

      function stopDrag() {
        isDragging = false;
        document.removeEventListener("mousemove", moveModal);
        document.removeEventListener("mouseup", stopDrag);
      }
    })(modal);

    // 點擊關閉按鈕關閉 modal
    closeButton.addEventListener("click", function() {
      modal.remove();
    });
  }

  // 等待 DOM 載入完成
  document.addEventListener("DOMContentLoaded", function() {
    // 注入 CSS 樣式（包含選單與 modal 樣式）
    const style = document.createElement("style");
    style.type = "text/css";
    style.textContent =
      /* 選單容器，置中並使用暗黑透明背景 */
      ".menu-container {" +
        "position: fixed;" +
        "top: 20px;" +
        "left: 50%;" +
        "transform: translateX(-50%);" +
        "background: rgba(0, 0, 0, 0.7);" +
        "padding: 10px 20px;" +
        "border-radius: 8px;" +
        "display: flex;" +
        "gap: 15px;" +
        "z-index: 1000;" +
      "}" +
      /* 按鈕圖片樣式 */
      ".menu-button {" +
        "width: 80px;" +
        "height: 80px;" +
        "object-fit: cover;" +
        "transition: transform 0.3s ease, filter 0.3s ease;" +
        "cursor: pointer;" +
      "}" +
      /* 滑鼠移入時放大並增加亮度 */
      ".menu-button:hover {" +
        "transform: scale(1.1);" +
        "filter: brightness(1.3);" +
      "}" +
      /* Modal 視窗樣式 */
      ".modal {" +
        "position: fixed;" +
        "background: #fff;" +
        "border: 1px solid #ccc;" +
        "border-radius: 8px;" +
        "box-shadow: 0 2px 10px rgba(0,0,0,0.2);" +
        "z-index: 1001;" +
        "width: 300px;" +
        "user-select: none;" +
      "}" +
      ".modal-header {" +
        "padding: 10px;" +
        "background: #f1f1f1;" +
        "cursor: move;" +
        "display: flex;" +
        "justify-content: space-between;" +
        "align-items: center;" +
      "}" +
      ".modal-content {" +
        "padding: 20px;" +
        "text-align: center;" +
      "}" +
      ".close-button {" +
        "border: none;" +
        "background: transparent;" +
        "cursor: pointer;" +
        "font-size: 16px;" +
        "font-weight: bold;" +
      "}";
    document.head.appendChild(style);

    // 定義按鈕資料，圖片檔案改用指定網址
    const buttons = [
      { id: "btn1", label: "按鈕 1", img: "https://truth.bahamut.com.tw/s01/202502/48fde449d9d35d06418dd575f4940808.JPG" },
      { id: "btn2", label: "按鈕 2", img: "https://truth.bahamut.com.tw/s01/202502/6bb2581a112c480daa2252baf64b1694.JPG" },
      { id: "btn3", label: "按鈕 3", img: "https://truth.bahamut.com.tw/s01/202502/e03f7abdfb405bd4b8e1ab1a4cb2f7e1.JPG" },
      { id: "btn4", label: "按鈕 4", img: "https://truth.bahamut.com.tw/s01/202502/84bda1bb72f6ddec314d88457f37b944.JPG" },
      { id: "btn5", label: "按鈕 5", img: "https://truth.bahamut.com.tw/s01/202502/e1047580176190709b0447b3206533fe.JPG" }
    ];

    // 建立選單容器
    const menuContainer = document.createElement("div");
    menuContainer.className = "menu-container";

    // 遍歷按鈕資料，建立按鈕
    buttons.forEach(function(btn) {
      // 先檢查圖片是否存在
      const tempImg = new Image();
      tempImg.onload = function() {
        const btnImg = document.createElement("img");
        btnImg.className = "menu-button";
        btnImg.src = btn.img;
        btnImg.alt = btn.label;
        // 根據不同按鈕設定點擊事件：第五個按鈕顯示超連結 modal
        if (btn.id === "btn5") {
          btnImg.addEventListener("click", showModalForFifth);
        } else {
          btnImg.addEventListener("click", showModal);
        }
        menuContainer.appendChild(btnImg);
      };
      tempImg.onerror = function() {
        // 若圖片不存在，則使用文字按鈕
        const btnDiv = document.createElement("div");
        btnDiv.className = "menu-button";
        btnDiv.style.display = "flex";
        btnDiv.style.alignItems = "center";
        btnDiv.style.justifyContent = "center";
        btnDiv.style.background = "#444";
        btnDiv.style.color = "#fff";
        btnDiv.style.fontSize = "14px";
        btnDiv.style.textAlign = "center";
        btnDiv.style.padding = "5px";
        btnDiv.textContent = btn.label;
        if (btn.id === "btn5") {
          btnDiv.addEventListener("click", showModalForFifth);
        } else {
          btnDiv.addEventListener("click", showModal);
        }
        menuContainer.appendChild(btnDiv);
      };
      tempImg.src = btn.img;
    });

    // 將選單容器加入頁面中
    document.body.appendChild(menuContainer);
  });
})();
