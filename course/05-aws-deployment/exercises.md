# Module 5 練習題

## 練習 1:IAM 權限設定
1. 建立一個新的 IAM 使用者,只給予 S3 讀寫權限(不要用 AdministratorAccess)
2. 用這個使用者的憑證,測試能否成功上傳檔案到 S3,並確認它「不能」做其他操作(例如啟動 EC2)應該會被拒絕

## 練習 2:S3 備份腳本
寫一個 Python 腳本,把 Module 2 的 `bookstore.db` 自動上傳到 S3,檔名加上時間戳記(例如 `bookstore_20260702.db`),模擬每日備份的情境。

## 練習 3:Docker 容器化(整合練習)
1. 用 [`examples/Dockerfile`](./examples/Dockerfile) 把 Module 4 的 API 容器化
2. 本機測試 `docker run` 能正常運作
3. 把 image 推送到 [Docker Hub](https://hub.docker.com/) 或 AWS ECR

## 練習 4:雲端部署(整合練習,核心目標)
選擇以下其中一種方式,把 Module 4 的 ChatGPT API 服務部署到 AWS,並取得一個外部可存取的網址:
- **方式 A(EC2)**:依照 [`examples/ec2-deploy-steps.md`](./examples/ec2-deploy-steps.md) 部署
- **方式 B(Lambda)**:用 [`examples/lambda_handler.py`](./examples/lambda_handler.py) 包裝後部署到 Lambda + API Gateway

完成後用 `curl` 或 Postman 從你的本機呼叫這個雲端網址,確認能拿到 ChatGPT 的回應。

## 練習 5:成本控管
1. 在 AWS Billing 設定一個 5 美金的預算警示
2. 練習結束後,列出你這次練習建立的所有資源(EC2、S3 bucket、Lambda、IAM 使用者等),確認哪些需要刪除以避免持續計費

---
完成後 → 前往 [Module 6｜LINE Bot 應用開發](../06-line-bot/README.md)
