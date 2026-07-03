# 📅 課程大綱(12 週規劃)

本大綱假設每週投入 6–10 小時(業餘進修步調)。全職學習者可依此壓縮為 6–8 週。每週結尾都有「檢核點」,確認自己真的具備該週能力再往下走。

## Module 1｜Python 基礎(第 1–2 週)

| 週次 | 主題 | 內容 |
|---|---|---|
| W1 | 語法與資料結構 | 開發環境設置、變數與資料型別、運算子、list/tuple/dict/set、流程控制(if/for/while) |
| W2 | 函式與物件導向 | 函式定義與參數、lambda、例外處理、class 與物件導向、模組與套件管理(pip/venv) |

**檢核點**:能寫出一個含函式、類別、例外處理的 100 行以上小程式(例如簡易記帳工具)。

## Module 2｜SQL 資料庫(第 3 週)

| 週次 | 主題 | 內容 |
|---|---|---|
| W3 | 關聯式資料庫與 SQL | 資料庫設計與正規化、SELECT/WHERE/JOIN/GROUP BY、INSERT/UPDATE/DELETE、Python 連接資料庫(sqlite3) |

**檢核點**:能設計一個 3 張表以上的資料庫 schema,並寫出至少一個含 JOIN 的查詢。

## Module 3｜Power BI 視覺化分析(第 4 週)

| 週次 | 主題 | 內容 |
|---|---|---|
| W4 | 資料視覺化 | Power Query 資料清理、資料建模、DAX 基礎、圖表選型、互動式儀表板設計與發佈 |

**檢核點**:完成一份含至少 4 種圖表類型、可互動篩選的儀表板。

## Module 4｜ChatGPT API 串接(第 5–6 週)

| 週次 | 主題 | 內容 |
|---|---|---|
| W5 | LLM 基礎與 API 呼叫 | 生成式 AI 概念、OpenAI API 設定、Chat Completions、Prompt Engineering、串流回應 |
| W6 | 進階應用 | Function Calling、Embeddings 與 RAG 概念、用 FastAPI 包裝成 Web API、成本與安全性控管 |

**檢核點**:完成一個可透過 API 呼叫、有基本記憶(對話歷史)的問答機器人後端。

## Module 5｜AWS 雲端部署(第 7–8 週)

| 週次 | 主題 | 內容 |
|---|---|---|
| W7 | 雲端基礎與運算服務 | IaaS/PaaS/SaaS 概念、IAM 權限、EC2、S3、RDS |
| W8 | 容器化與無伺服器部署 | Docker 基礎、Lambda + API Gateway、CloudWatch 監控、成本管理 |

**檢核點**:把 Module 4 的 API 部署上 AWS(EC2 或 Lambda 皆可),取得一個公開可呼叫的網址。

## Module 6｜LINE Bot 應用開發(第 9 週)

| 週次 | 主題 | 內容 |
|---|---|---|
| W9 | LINE Messaging API | Webhook 設定、line-bot-sdk 開發、Flex Message、串接 ChatGPT API 打造智慧客服 |

**檢核點**:用手機 LINE 加官方帳號為好友,能實際跟你部署的機器人對話。

## Module 7｜PMP 專案管理(第 10 週)

| 週次 | 主題 | 內容 |
|---|---|---|
| W10 | 專案管理方法論 | 專案生命週期、五大流程組、十大知識領域、WBS、風險管理、Agile/Scrum 對照 |

**檢核點**:為 Capstone 專案寫出一份 WBS(工作分解結構)+ 簡易風險登記表。

## Module 8｜微服務架構(第 11–12 週)

| 週次 | 主題 | 內容 |
|---|---|---|
| W11 | 微服務設計原則 | Monolith vs Microservices、服務拆分原則、API Gateway、服務間溝通(REST/訊息佇列) |
| W12 | 容器編排與可觀測性 | Docker Compose 多容器整合、Kubernetes 基礎概念、Logging/Monitoring、CI/CD 概念 |

**檢核點**:用 docker-compose 把至少 2 個服務(例如 ChatGPT API 服務 + LINE Bot 服務)串起來本地運行。

## Capstone Project｜期末整合專案

整合 Module 1–8 全部技術,打造一個「AI 智慧客服系統」:
- Python + FastAPI 後端服務
- SQL 資料庫記錄對話與使用紀錄
- ChatGPT API 提供智慧問答
- LINE Bot 作為使用者互動介面
- 拆分為微服務、用 Docker Compose 編排
- 部署到 AWS
- 用 Power BI 做使用量與滿意度分析儀表板
- 附上用 PMP 方法寫的專案管理文件(WBS、時程、風險登記表)

詳見 [`capstone-project/README.md`](./capstone-project/README.md)。
