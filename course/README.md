# 🎯 雲端系統開發：AI 應用與微服務架構工程師班

一套從零開始、可自學的完整課程教材 —— 從 **Python 基礎** 出發,經過 **SQL 資料庫**、**Power BI 視覺化分析**,銜接 **ChatGPT API 串接**、**AWS 雲端部署**、**LINE Bot 應用開發**,最後以 **PMP 專案管理** 與 **微服務架構** 收尾,並透過一個整合所有技術的 **期末專案(Capstone Project)** 驗收學習成果。

## 🗺️ 如何使用這套教材

1. 依照下方「課程地圖」的順序,一個模組接著一個模組學習 —— 後面的模組會用到前面模組的技能(例如 Module 4 會用到 Module 1 的 Python、Module 6 會用到 Module 4 的 ChatGPT API)。
2. 每個模組資料夾內都有:
   - `README.md`:該模組完整教材(概念講解 + 程式範例 + 圖表 + 延伸資源)
   - `examples/`:可直接執行的範例程式碼(部分技術性模組才有)
   - `exercises.md`:實作練習題,建議每個模組都動手做完再進下一階段
3. 建議搭配「課程大綱」([`00-syllabus.md`](./00-syllabus.md))規劃每週進度,自學者可依自己步調調整。
4. 完成全部 8 個模組後,進入 [`capstone-project/`](./capstone-project/README.md) 做一個整合式的期末專案,把所學串成一個完整可上線的系統。

## 📚 課程地圖(共 8 大模組,建議 12 週)

| 週次 | 模組 | 主題 | 你將學到 |
|---|---|---|---|
| W1–W2 | [01](./01-python-basics/README.md) | Python 基礎 | 語法、資料結構、函式、物件導向、例外處理、套件管理 |
| W3 | [02](./02-sql-database/README.md) | SQL 資料庫 | 關聯式資料庫設計、SQL 查詢、JOIN、正規化、Python 連接資料庫 |
| W4 | [03](./03-power-bi/README.md) | Power BI 視覺化分析 | 資料清理(Power Query)、資料建模、DAX、互動式儀表板 |
| W5–W6 | [04](./04-chatgpt-api/README.md) | ChatGPT API 串接 | LLM 基礎、Prompt Engineering、Function Calling、RAG、Web API 開發 |
| W7–W8 | [05](./05-aws-deployment/README.md) | AWS 雲端部署 | EC2、S3、RDS、Lambda、Docker、CI/CD 部署到雲端 |
| W9 | [06](./06-line-bot/README.md) | LINE Bot 應用開發 | Messaging API、Webhook、Flex Message、AI 客服機器人整合 |
| W10 | [07](./07-pmp-project-management/README.md) | PMP 專案管理 | 專案生命週期、十大知識領域、WBS、風險管理、Agile/Scrum |
| W11–W12 | [08](./08-microservices/README.md) | 微服務架構 | 服務拆分、API Gateway、Docker Compose、Kubernetes 基礎、可觀測性 |
| — | [Capstone](./capstone-project/README.md) | 期末整合專案 | 把以上全部技術整合成一個真實可用的 AI 客服系統 |

## 🧰 事前準備(開發環境)

在開始 Module 1 之前,建議先安裝好以下工具(不用全部一次裝完,可依模組進度陸續安裝):

| 工具 | 用途 | 何時需要 |
|---|---|---|
| [Python 3.11+](https://www.python.org/downloads/) | 主要程式語言 | Module 1 開始 |
| [VS Code](https://code.visualstudio.com/) | 程式編輯器(建議裝 Python、SQLite、Docker 擴充套件) | Module 1 開始 |
| [Git](https://git-scm.com/) | 版本控制 | Module 1 開始 |
| [DB Browser for SQLite](https://sqlitebrowser.org/) | 圖形化操作 SQLite 資料庫 | Module 2 |
| [Power BI Desktop](https://powerbi.microsoft.com/desktop/)(僅 Windows) | 視覺化分析工具 | Module 3 |
| OpenAI API Key([platform.openai.com](https://platform.openai.com/)) | ChatGPT API 串接 | Module 4 |
| [AWS 帳號](https://aws.amazon.com/)(可用 Free Tier) | 雲端部署 | Module 5 |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 容器化 | Module 5、8 |
| [LINE Developers 帳號](https://developers.line.biz/) | LINE Bot 開發 | Module 6 |

> 💡 沒有 Windows 電腦、無法安裝 Power BI Desktop 的話,可改用 [Power BI Service(網頁版)](https://app.powerbi.com/) 搭配範例資料集,一樣能完成 Module 3 的練習。

## ✅ 學習建議

- **每個模組結束都要動手做 `exercises.md` 的練習**,光看教材不會內化成技能。
- 遇到不懂的名詞,先查官方文件(每個模組的教材最後都附延伸資源連結)。
- 程式範例建議「自己重新打一次」而不是複製貼上,肌肉記憶對初學者很重要。
- 卡關超過 30 分鐘,先把問題寫下來(錯誤訊息 + 你嘗試過的方法),再去搜尋或提問,這樣學習效率最高。

---
祝學習順利,一步步從 Python 新手成長為能獨立串接 AI 服務、部署雲端系統的工程師 🚀
