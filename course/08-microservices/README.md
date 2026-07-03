# Module 8｜微服務架構(第 11–12 週)

## 🎯 學習目標
- 理解 Monolith(單體式)與 Microservices(微服務)架構的差異與取捨
- 掌握微服務設計原則與服務間溝通方式
- 能用 Docker Compose 編排多容器應用
- 認識 Kubernetes 基礎概念
- 理解可觀測性(Observability)與 CI/CD 的基本概念

## 1. 單體式 vs 微服務

**單體式(Monolith)**:整個應用是一個程式碼庫、一次部署(例如 Module 4–6 目前把 ChatGPT 邏輯、LINE Bot 邏輯都寫在同一個 FastAPI 專案裡)。

**微服務(Microservices)**:把應用拆成多個獨立部署、獨立資料庫的小服務,服務之間透過 API 或訊息佇列溝通。

| | 單體式 | 微服務 |
|---|---|---|
| 開發初期速度 | 快(不用處理服務間通訊) | 較慢(需要設計介面、處理分散式問題) |
| 部署 | 整包一起部署 | 各服務可獨立部署、獨立擴展 |
| 技術選型 | 通常統一技術棧 | 各服務可用不同語言/資料庫 |
| 故障隔離 | 一個 bug 可能拖垮整個系統 | 單一服務故障不一定影響其他服務 |
| 維運複雜度 | 低 | 高(需要服務發現、監控、分散式追蹤) |
| 適合場景 | 小團隊、專案初期、需求還在快速變動 | 團隊夠大、系統夠複雜、需要獨立擴展特定功能 |

> ⚠️ **重要觀念**:微服務不是「越多越好」。很多專案在規模還小時就過早拆分微服務,反而增加不必要的複雜度(這叫「過早的微服務化」)。業界常見建議是「先用單體式把產品做出來,等真的遇到擴展瓶頸或團隊協作問題,再依邊界拆分」。

## 2. 微服務設計原則

- **單一職責(Single Responsibility)**:一個服務只負責一個業務能力,例如「訂單服務」「客服對話服務」分開
- **資料庫分離(Database per Service)**:每個服務有自己的資料庫,不直接共用同一張表,避免服務間隱性耦合
- **透過 API 溝通,不共用程式碼**:服務之間只能透過定義好的介面(REST/gRPC/訊息)互動
- **每個服務可獨立部署**:改了訂單服務的程式碼,不需要重新部署客服服務

以 Capstone 專案為例,可以把原本單體的 FastAPI 應用拆成:

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  LINE Bot 服務    │─────▶│  Chat 服務(ChatGPT）│─────▶│  訂單查詢服務      │
│ (Webhook 接收)   │      │  (Prompt/RAG 邏輯) │      │  (查 Module 2 DB) │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

## 3. 服務間溝通方式

| 方式 | 特性 | 適合場景 |
|---|---|---|
| REST API | 簡單、廣泛支援,同步呼叫 | 大部分場景的預設選擇 |
| gRPC | 效能高、強型別,但學習曲線較高 | 服務數量多、內部高頻呼叫 |
| 訊息佇列(如 RabbitMQ、SQS） | 非同步、解耦,一方掛掉不會馬上影響另一方 | 不需要立即回應的任務,例如「背景生成報表」 |

初學建議先用 **REST API(同步)** 把服務拆開的基本概念練熟,之後再視情境導入訊息佇列處理非同步任務(例如 Module 6 提到的「LINE Reply Token 時效」問題,就很適合用訊息佇列 + Push API 來解決)。

## 4. API Gateway

當有多個微服務時,通常會在最前面放一個 **API Gateway**,統一處理:
- 路由(把 `/chat/*` 導到 Chat 服務,`/orders/*` 導到訂單服務)
- 身份驗證與速率限制(不用每個服務都重複實作)
- 統一的日誌與監控入口

AWS 的 API Gateway(Module 5 學過)本身就可以扮演這個角色;本地開發時可以用 Nginx 或簡易的 FastAPI 反向代理模擬。

## 5. Docker Compose 多容器編排

Docker Compose 讓你用一個 YAML 檔定義多個容器如何一起運行,是本機模擬微服務架構最好的工具:

```yaml
# docker-compose.yml
version: "3.9"

services:
  chat-service:
    build: ./chat-service
    ports:
      - "8001:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}

  linebot-service:
    build: ./linebot-service
    ports:
      - "8002:8000"
    environment:
      - LINE_CHANNEL_ACCESS_TOKEN=${LINE_CHANNEL_ACCESS_TOKEN}
      - LINE_CHANNEL_SECRET=${LINE_CHANNEL_SECRET}
      - CHAT_SERVICE_URL=http://chat-service:8000
    depends_on:
      - chat-service

  db:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=devpassword
      - POSTGRES_DB=course_db
    ports:
      - "5432:5432"
```

```bash
docker compose up --build
```

注意 `linebot-service` 呼叫 `chat-service` 時用的是 **服務名稱**(`http://chat-service:8000`)而不是 `localhost` —— Docker Compose 會自動建立一個內部網路,容器之間可以用服務名稱互相定址,這就是最簡單的「服務發現(Service Discovery)」。完整範例見 [`examples/`](./examples)。

## 6. Kubernetes 基礎概念(認識即可)

Docker Compose 適合本機開發與小規模部署,正式的大型微服務生產環境常用 **Kubernetes(K8s)** 做容器編排,核心概念:

| 概念 | 說明 |
|---|---|
| Pod | 最小部署單位,通常包一個容器 |
| Deployment | 定義要跑幾個 Pod 副本、如何滾動更新 |
| Service | 給一組 Pod 一個穩定的存取入口(內部負載平衡) |
| Ingress | 管理外部流量如何進到叢集內的 Service(類似 API Gateway） |
| ConfigMap / Secret | 管理設定值與機密資訊(對應 `.env` 概念) |

K8s 學習曲線較陡,本課程只要求「看得懂架構圖、理解核心名詞」,不要求熟練操作。AWS 對應服務是 **EKS(Elastic Kubernetes Service)**。

## 7. 可觀測性(Observability)

微服務架構下,一個請求可能經過好幾個服務,問題排查比單體式複雜很多,需要:
- **Logging(日誌)**:每個服務都要有結構化日誌,並集中收集(呼應 Module 5 的 CloudWatch)
- **Monitoring(監控)**:追蹤每個服務的健康狀態、延遲、錯誤率(每個服務都應該有 `/health` 端點,如 Module 4/6 範例)
- **Distributed Tracing(分散式追蹤)**:給每個請求一個唯一的 Trace ID,貫穿所有服務,方便還原一次呼叫的完整路徑(進階工具如 Jaeger、AWS X-Ray)

最小可行實作:在每個服務的請求進來時產生/延續一個 `X-Request-ID`,所有日誌都印出這個 ID,之後排查問題時可以搜尋同一個 ID 串起完整流程。

## 8. CI/CD 概念

**CI(持續整合)**:每次提交程式碼,自動跑測試、檢查程式碼品質。
**CD(持續部署/交付)**:測試通過後,自動(或一鍵)部署到正式環境。

微服務架構下,每個服務通常有自己獨立的 CI/CD pipeline,可以獨立測試、獨立部署,不用整個系統一起重新部署。常見工具:GitHub Actions、GitLab CI。一個最簡單的 GitHub Actions 範例概念:

```yaml
# .github/workflows/deploy.yml(概念範例)
name: Deploy Chat Service
on:
  push:
    branches: [main]
    paths: ["chat-service/**"]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: pytest chat-service/tests
      - name: Build and push Docker image
        run: docker build -t my-registry/chat-service:latest chat-service/
      - name: Deploy
        run: echo "部署到 AWS ECS / Lambda(依 Module 5 學到的方式)"
```

## 📁 範例程式碼
[`examples/`](./examples) 資料夾:
- `docker-compose.yml` — 完整可執行的多容器範例(chat-service + linebot-service + db)
- `chat-service/` — 極簡的 Chat 微服務(可替換成 Module 4 的完整程式碼)
- `linebot-service/` — 極簡的 LINE Bot 微服務,呼叫 chat-service

執行方式:
```bash
cd course/08-microservices/examples
docker compose up --build
curl -X POST http://localhost:8001/chat -H "Content-Type: application/json" -d '{"message": "你好"}'
```

## 📖 延伸資源
- [Microservices.io](https://microservices.io/) — Chris Richardson 的微服務架構模式權威資源
- [Docker Compose 官方文件](https://docs.docker.com/compose/)
- [Kubernetes 官方文件（中文）](https://kubernetes.io/zh-cn/docs/home/)
- [12-Factor App](https://12factor.net/zh_tw/)

## ✅ 完成本模組後
做完 [`exercises.md`](./exercises.md),前往 [Capstone Project｜期末整合專案](../capstone-project/README.md),把 8 個模組的技術整合成一個完整系統。
