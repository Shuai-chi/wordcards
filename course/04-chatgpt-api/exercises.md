# Module 4 練習題

## 練習 1:Prompt Engineering 實驗
針對同一個問題(例如「幫我寫一封請假信」),分別用三種不同的 system prompt(正式語氣 / 輕鬆語氣 / 條列式重點),觀察輸出差異,並記錄哪種寫法最容易得到你要的結果。

## 練習 2:結構化輸出
寫一個程式,輸入一段商品評論,用 `response_format={"type": "json_object"}` 要求模型回傳固定格式的 JSON:
```json
{"sentiment": "positive|negative|neutral", "keywords": ["...", "..."], "summary": "一句話摘要"}
```
批次處理 5 則評論,並把結果整理成表格印出(這會用到 Module 1 的資料結構操作)。

## 練習 3:Function Calling(整合練習)
擴充 [`examples/function_calling.py`](./examples/function_calling.py):
1. 新增第二個工具函式 `check_stock(product_name)`,查詢商品庫存(可用假資料)
2. 讓模型能依對話內容自動決定該呼叫 `get_order_status` 還是 `check_stock`,或兩者都呼叫
3. 把資料來源改成真的呼叫 Module 2 的 SQLite 資料庫查詢,而不是寫死的字典

## 練習 4:RAG 客服機器人
把 [`examples/rag_demo.py`](./examples/rag_demo.py) 的知識庫擴充成至少 10 條 FAQ,並且:
1. 把 embedding 結果快取到本機檔案(JSON 或 pickle),避免每次執行都重新呼叫 API 計算,節省成本
2. 加上「若檢索到的相似度都太低,直接回答不確定」的邏輯(設一個相似度門檻值)

## 練習 5:Web API(整合練習)
擴充 [`examples/api_server.py`](./examples/api_server.py):
1. 新增 `/chat/history` 端點,能依 session_id 維持多輪對話記憶(先用記憶體字典儲存即可)
2. 加上簡易的請求速率限制(可用 `slowapi` 套件,或自己用時間戳記實作)
3. 用 `curl` 或 [Postman](https://www.postman.com/) 完整測試你的 API

## 挑戰題(選做)
把練習 4 的 RAG 邏輯整合進練習 5 的 API,做出一個「知道自家 FAQ、能查訂單狀態」的完整客服 API —— 這就是 Capstone 專案的雛形。

---
完成後 → 前往 [Module 5｜AWS 雲端部署](../05-aws-deployment/README.md)
