# Module 8 練習題

## 練習 1:本機執行微服務範例
1. 執行 `docker compose up --build`(或若你的環境沒有 Docker,直接用兩個終端機分別跑 `uvicorn app:app --port 8001` 和 `uvicorn app:app --port 8002`)
2. 呼叫 `linebot-service` 的 `/webhook`,確認它能成功呼叫 `chat-service` 並拿到回覆
3. 觀察 `linebot-service/app.py` 如何用服務名稱(`http://chat-service:8000`)而不是 IP 找到另一個服務

## 練習 2:新增第三個服務
新增一個 `order-service`,提供 `/orders/{order_id}` 查詢訂單狀態(可用 Module 2 的 SQLite 資料庫,或簡單的假資料)。修改 `chat-service` 的 Function Calling 邏輯(參考 Module 4),讓它在需要時呼叫 `order-service` 取得真實訂單資訊。

## 練習 3:健康檢查與監控(整合練習)
1. 確認三個服務都有 `/health` 端點
2. 在 `docker-compose.yml` 中加上 [healthcheck](https://docs.docker.com/compose/compose-file/05-services/#healthcheck) 設定,讓 Docker 能自動偵測服務是否存活
3. 幫每個服務的請求加上簡易的 `X-Request-ID` 追蹤(可用 `uuid` 產生,並在回應 header 中回傳),模擬分散式追蹤的第一步

## 練習 4:失敗情境演練
1. 停掉 `chat-service`(`docker compose stop chat-service`),觀察 `linebot-service` 呼叫失敗時會發生什麼(目前的 `raise_for_status()` 會直接拋出例外)
2. 改寫 `linebot-service/app.py`,加上例外處理,當 `chat-service` 無法連線時回傳友善的錯誤訊息而不是整個崩潰 —— 這是微服務架構中「容錯設計」的基本功

## 挑戰題(選做)
把這套微服務部署到 AWS(可用 Module 5 學到的 ECS,或簡化成多個獨立的 EC2/Lambda),並用 API Gateway 統一對外入口,體驗正式的微服務部署流程。

---
完成後 → 前往 [Capstone Project｜期末整合專案](../capstone-project/README.md)
