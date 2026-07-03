# Module 6 練習題

## 練習 1:基本 Echo Bot
先不接 ChatGPT,做一個最簡單的 Echo Bot(使用者傳什麼,機器人就回傳一模一樣的內容),確認 Webhook、簽章驗證、Reply API 都正常運作後,再進到下一步。

## 練習 2:Flex Message
設計一個 Flex Message,當使用者輸入「訂單查詢」時,回傳一張包含「訂單編號、狀態、預計送達日」的卡片(可用假資料,或串接 Module 2 的 SQLite 資料庫查詢)。

## 練習 3:ChatGPT 客服 Bot(整合練習)
1. 部署 [`examples/line_bot_app.py`](./examples/line_bot_app.py),接上你自己申請的 LINE 官方帳號
2. 用手機加好友,實際傳訊息測試對話
3. 加上簡易的多輪對話記憶(依 `event.source.user_id` 區分不同使用者的對話歷史)

## 練習 4:錯誤處理與逾時保護
1. 模擬 ChatGPT API 逾時的情境(例如故意設定極短的 timeout),確認機器人會回覆友善的錯誤訊息而不是整個崩潰
2. 加上簡易的速率限制,避免單一使用者短時間內狂發訊息耗盡你的 API 額度

## 挑戰題(選做)
把練習 3 的多輪對話記憶,以及 Module 4 練習 4 做的 RAG 知識庫整合進來,做出一個「認得使用者身份、記得對話歷史、能查真實 FAQ」的完整智慧客服 LINE Bot。這會是 Capstone 專案的核心元件之一。

---
完成後 → 前往 [Module 7｜PMP 專案管理](../07-pmp-project-management/README.md)
