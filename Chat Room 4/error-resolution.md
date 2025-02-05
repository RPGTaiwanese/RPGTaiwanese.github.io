# Error Resolution and Debugging Notes

Below are some common error messages that may arise during development along with recommended troubleshooting steps.

---

## 1. React Minified Error #418 / #423  
**問題說明：**  
這類錯誤通常出現在生產環境中，因 React 壓縮後只顯示錯誤代碼。常見原因包括：  
• 組件渲染時傳入了錯誤的 props。  
• 返回了不合法的 React 元素。  
• 使用了已棄用的 API。  

**解決方案：**  
- 切換到非壓縮（development）版的 React，這會顯示更詳細的錯誤訊息。  
- 檢查相關組件的邏輯、props 與 state 管理，確保每個 render() 或函式組件都返回有效的 React 節點。  
- 使用 [React Error Decoder](https://reactjs.org/docs/error-decoder.html) 幫助定位錯誤代碼。

---

## 2. 模組載入錯誤：Failed to resolve module specifier "firebase/auth"  
**問題說明：**  
當使用 ES 模組導入時，如果路徑不正確（例如未以 "/", "./" 或 "../" 起頭），瀏覽器就無法解析模組。

**解決方案：**  
- 為 Firebase 模組指定完整 URL。例如:  
  `import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";`  
- 或若使用 npm 模組，則使用打包工具（Webpack、Rollup 等）來正確處理模組路徑。  
- 檢查 import 語法，避免使用裸模組名稱。

---

## 3. CORS 錯誤與資源載入失敗（404、ERR_FAILED）  
**問題說明：**  
資源請求被 CORS 攔截或 URL 不正確（404）。

**解決方案：**  
- 若控制服務器（如 Firebase Hosting 或自有伺服器），請設定正確的 `Access-Control-Allow-Origin` 標頭。  
- 確認第三方 API 或圖片資源是否支持 CORS。  
- 若只需要不透明回應，可設定 fetch 的 `mode: 'no-cors'`（不建議用於需要讀取回應內容的情況）。  
- 驗證資源 URL 是否正確。

---

## 4. Firebase 授權與初始化錯誤
### (a) Firebase: Error (auth/unauthorized-domain)  
**問題說明：**  
這表明目前使用的網域未被允許進行 Firebase 認證。

**解決方案：**  
- 前往 Firebase 控制台，至 Authentication > Sign-in method，將你的開發或部署網域新增到 Authorized domains 清單中。

### (b) Firebase: No Firebase App '[DEFAULT]' has been created  
**問題說明：**  
使用 Firebase 服務之前，必須先呼叫 initializeApp() 以建立預設 Firebase App。

**解決方案：**  
- 確認在其它 Firebase 服務模組使用前，已正確調用 `initializeApp(firebaseConfig)`。  
- 檢查模組載入順序，讓 firebase-config.js 中的初始化程式碼最先執行。

---

## 5. Firestore 與 Realtime Database 連線錯誤  
**問題說明：**  
錯誤消息（例如 “WebChannelConnection RPC 'Listen' stream … failed”）可能代表資料庫 URL 配置錯誤或網路問題。

**解決方案：**  
- 驗證 Firebase 控制台中 Firestore 與 Realtime Database 的 URL 是否與程式碼設定相符。  
- 檢查網路連線及防火牆設定。  
- 確保 Firebase SDK 為最新版本，以避免已知連線問題。

---

## 6. TypeError: Cannot read properties of undefined (reading 'name')
**問題說明：**  
此錯誤通常表示試圖存取尚未定義的物件屬性。可能是資料尚未正確載入或變數拼寫錯誤。

**解決方案：**  
- 在存取物件屬性之前，確認該物件已被初始化（可使用 `if (obj && obj.name)`）。  
- 使用 `console.log()` 調試，確認資料正確流動。

---

希望以上說明能協助您調試和修正開發過程中的問題!