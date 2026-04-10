# WordForge — 工業級英文單字 SRS 學習系統

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)
![IndexedDB](https://img.shields.io/badge/IndexedDB-007ACC?style=for-the-badge&logo=sqlite&logoColor=white)

WordForge 是一款專為對抗極端邊界狀況而生的**全本地端間隔重複 (Spaced Repetition System, SRS) 學習工具**。經過 24 個版本的終極盲測與架構淬鍊，它以極致的流暢度、純淨的原子化寫入架構以及對 iOS/多頁籤特例的底層破解，提供無懈可擊的沉浸式背單字體驗。

---

## ✨ 核心特色 (Core Features)

- 🔒 **100% 離線本地端**：純前端原生架構，無需伺服器。利用瀏覽器原生 IndexedDB 提供大容量與高併發的原子化持久儲存。
- 🚀 **樂觀 UI (Optimistic UI) 零延遲**：學習點擊的瞬間即刻切換卡片與發音，資料庫寫入在背景原子化完成，打擊感零毫秒延遲。
- 🤖 **抗髒亂 CSV 狀態機**：自研的高階 CSV 雙引號解析器（State Machine），徹底攔截並相容由 AI 生成的各類惡意換行與髒資料。
- 🛡️ **深層資源防護**：包含跨分頁同步鎖、iOS 硬體音軌靜音詛咒破解、Rollback 異常靜默防護，以及 Fisher-Yates 密碼學隨機洗牌。
- 🧠 **改良版 SM-2 演算法**：細分 `New`, `Learning`, `Relearning`, `Graduated` 四大狀態。對「困難(Hard)」衰退與間隔極限有更符合人性的防護預算。

---

## 📖 使用說明 (User Guide)

### 1. 準備卡牌資料 (使用 AI 生成)
為保證學習品質，本系統採用嚴格的「驗證層防護 (Validation Layer)」，只有符合標準格式的單字卡才能被匯入：
1. 請參考資料夾中的 `CSV-for-wordforge_zh-tw.txt`，複製該 Prompt 交給 AI (如 ChatGPT, Claude 等)。
2. AI 將會幫你嚴格生成帶有「包裹雙引號保護」的 4 行結構詳解 CSV 檔（包含詞性、解釋、例句、延伸搭配詞）。

### 2. 啟動系統與匯入
1. 使用瀏覽器直接開啟 **`vocabulary_srs.html`**。
2. 在「學習中心」畫面，將 AI 幫你產生的 `.csv` 檔案拖曳至**上傳區**（或點擊選取檔案）。
3. 系統匯入時若發現不合規的髒資料，會自動實體隔離並丟棄，其餘的將匯入為一個新的「套牌」。

### 3. 個人化學習設定
- **全域學習額度**：點擊右上角 ⚙️ 齒輪，設定你的「每日全域上限」（也就是今天不管複習幾個套牌，總共能消耗的單字體力最大值）。
- **單一套牌配額**：勾選你今天想練習的套牌。你也可以點擊套牌旁邊的 ✏️ **鉛筆圖示**，調整單一套牌在未達全域上限時，「每日最多能抽取幾張新卡片 (New Cards)」。

### 4. 沉浸式練習 (鍵盤操作指南)
勾選完你要的套牌後，點擊「開始練習」進入無干擾模式。

| 動作 | 快捷鍵 | 說明 |
| :--- | :--- | :--- |
| **卡片翻面** | <kbd>Space (空白鍵)</kbd> | 查看背面 4 行詳解，同時會觸發單字英式/美式語音發音。 |
| **重新發音** | <kbd>Enter (確認鍵)</kbd> | 重新朗讀當前單字。 |
| **例句發音** | `滑鼠點擊` | 點閱背面例句區塊右側的 🔊 喇叭圖示，即可朗讀自然英文例句。 |
| **再試 (Again)** | <kbd>1</kbd> | 完全忘記。將重置該單字間隔，今日需重新學習直至熟練。 |
| **困難 (Hard)** | <kbd>2</kbd> | 勉強想起。僅會微幅推遲單字的下次出現時間。 |
| **良好 (Good)** | <kbd>3</kbd> | 原本就會。使卡片畢業並以約 1.2~2.5 倍乘數間隔推遲。 |
| **輕鬆 (Easy)** | <kbd>4</kbd> | 爛熟於心。給予最高間隔獎勵，大幅減少出現機率。|

> 💡 **Tip:** 若你不小心點錯導致資料庫寫入失敗，請放心，系統具備「Rollback 靜默防護」，不會出現崩潰或幽靈語音干擾，畫面會安全的還原並等待你重新選擇。

---

## 🛠️ 開發與架構檔案

本系統將業務邏輯高度內聚，以下是專案的關鍵檔案：
- `vocabulary_srs.html`：系統唯一主程式（包含 HTML/CSS/JS、CSV 狀態機與 IndexedDB 調度）。
- `CSV-for-wordforge_zh-tw.txt`：產生專屬無瑕疵單字資料庫的 AI Prompt (具防止 CSV 結構破壞特例防護)。
- `update_zh-tw.md`：開發歷程與 Changelog (記載本系統如何度過每一次崩潰的血淚技術史)。

---
*Created with extreme engineering rigor. Say goodbye to forgotten words.*
