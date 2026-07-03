# 🏁 Capstone Project｜AI 智慧客服系統

恭喜完成 8 個模組!這個期末專案會把你學到的所有技術整合成一個真實可用的系統 —— **一個能透過 LINE 對話、用 ChatGPT 理解問題、查詢真實訂單資料、部署在雲端、並有使用量儀表板的 AI 智慧客服系統。**

## 🎯 專案目標

打造一個線上商店的智慧客服機器人,使用者可以在 LINE 上詢問:
- 常見問題(退貨政策、運送時間等)→ 用 RAG 從 FAQ 知識庫回答
- 訂單狀態查詢(「我的訂單 A1234 到哪了?」)→ 用 Function Calling 查詢真實資料庫
- 一般閒聊 → 由 ChatGPT 自然回應

**成功標準(驗收依據)**:
1. 能透過 LINE 官方帳號實際對話,且部署在雲端(非本機)
2. 機器人能正確判斷「該查資料庫」還是「該查 FAQ」還是「直接聊天回答」
3. 系統至少拆成 2 個獨立部署的微服務
4. 有一份 Power BI 儀表板呈現使用量(訊息數、常見問題類型分布等)
5. 附上完整的 PMP 專案管理文件(章程、WBS、風險登記表)

## 🧩 架構總覽

```
                    ┌─────────────────────┐
   使用者(LINE)  ──▶│  linebot-service      │  (Module 6 + 8)
                    │  - Webhook 接收        │
                    │  - 簽章驗證            │
                    └──────────┬───────────┘
                               │ REST API
                               ▼
                    ┌─────────────────────┐
                    │  chat-service         │  (Module 4 + 8)
                    │  - Prompt Engineering │
                    │  - Function Calling   │
                    │  - RAG(FAQ 知識庫）    │
                    └──────┬────────┬──────┘
                           │        │
                 ┌─────────┘        └─────────┐
                 ▼                             ▼
     ┌─────────────────────┐      ┌─────────────────────┐
     │  order-service        │      │  資料庫(RDS/SQLite）  │  (Module 2)
     │  - 查訂單狀態          │─────▶│  - orders, books 等   │
     └─────────────────────┘      │  - 對話紀錄 log       │
                                   └──────────┬──────────┘
                                              │
                                              ▼
                                   ┌─────────────────────┐
                                   │  Power BI 儀表板        │  (Module 3)
                                   │  - 使用量分析          │
                                   └─────────────────────┘

全部服務用 Docker 容器化(Module 5 + 8),部署到 AWS(Module 5)。
```

## 📋 建議實作步驟

### 第一階段:規劃(對應 Module 7)
1. 寫出專案章程(參考 [`07-pmp-project-management/exercises.md`](../07-pmp-project-management/exercises.md) 練習 1)
2. 畫出 WBS,拆解成可執行的任務清單
3. 列出風險登記表(API 額度、LINE 審核時間等)

### 第二階段:資料層(對應 Module 2)
1. 設計資料庫 schema:`orders`(訂單)、`faq`(常見問題)、`conversations`(對話紀錄,供 Power BI 分析用)
2. `conversations` 表建議欄位:`id, user_id, message, intent(訂單查詢/FAQ/閒聊), reply, created_at`—— 這是之後 Power BI 儀表板的資料來源

### 第三階段:AI 核心邏輯(對應 Module 4)
1. 實作 RAG:把 FAQ 資料轉成 embeddings,建立檢索邏輯(參考 [`04-chatgpt-api/examples/rag_demo.py`](../04-chatgpt-api/examples/rag_demo.py))
2. 實作 Function Calling:讓模型能呼叫 `get_order_status(order_id)`(參考 [`04-chatgpt-api/examples/function_calling.py`](../04-chatgpt-api/examples/function_calling.py))
3. 每次對話都寫入 `conversations` 表(供後續分析)

### 第四階段:LINE 介面(對應 Module 6)
1. 申請正式的 LINE 官方帳號(或先用測試帳號)
2. 實作 Webhook,接上第三階段的 chat-service(參考 [`06-line-bot/examples/line_bot_app.py`](../06-line-bot/examples/line_bot_app.py))

### 第五階段:微服務化與部署(對應 Module 5 + 8)
1. 依 [`08-microservices/examples/`](../08-microservices/examples) 的架構,拆成 `chat-service`、`linebot-service`、`order-service`(選做)
2. 用 Docker 容器化每個服務
3. 部署到 AWS(EC2 或 ECS,資料庫可用 RDS 取代本機 SQLite)

### 第六階段:分析儀表板(對應 Module 3)
1. 把 `conversations` 表的資料匯入 Power BI
2. 建立儀表板呈現:每日訊息量趨勢、意圖分布(訂單查詢 vs FAQ vs 閒聊)、平均回應時間

### 第七階段:驗收與總結
1. 對照本文件開頭的「成功標準」逐項檢查
2. 寫一份簡短的專案總結(Lessons Learned):哪裡卡最久?如果重做一次會怎麼調整架構?

## ✅ 交付物清單

- [ ] 專案章程 + WBS + 風險登記表(Markdown 或 Excel)
- [ ] 資料庫 schema 與建表 SQL
- [ ] chat-service 原始碼(含 RAG + Function Calling)
- [ ] linebot-service 原始碼
- [ ] docker-compose.yml(本機可一鍵啟動)
- [ ] AWS 部署後的公開 LINE 官方帳號(可實際加好友對話)
- [ ] Power BI 儀表板(截圖或 .pbix 檔)
- [ ] 專案總結文件

## 💡 提示

- 不需要一次做到完美,先讓「LINE → chat-service → 純聊天回覆」的最短路徑跑通,再逐步加上 RAG、Function Calling、微服務拆分
- 每完成一個階段,回頭對照 [`00-syllabus.md`](../00-syllabus.md) 各模組的「檢核點」,確認基礎沒有偷工減料
- 卡關時,思考「這個問題屬於哪個模組的範疇」,回去該模組的教材複習,而不是漫無目的地搜尋

---
完成這個專案,你就具備了從資料庫設計、AI 應用開發、雲端部署到專案管理的完整能力鏈 —— 這正是「雲端系統開發：AI 應用與微服務架構工程師」這個職稱背後真正的技能組合。祝你順利畢業 🎓
