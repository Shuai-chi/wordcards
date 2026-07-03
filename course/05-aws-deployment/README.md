# Module 5｜AWS 雲端部署(第 7–8 週)

## 🎯 學習目標
- 理解雲端運算的基本模型(IaaS/PaaS/SaaS)與 AWS 核心服務
- 能用 IAM 設定安全的存取權限
- 能用 EC2 或 Lambda 部署 Module 4 做的 API
- 能用 Docker 容器化應用程式
- 理解基本的成本控管與監控

## 1. 雲端運算基礎概念

| 模型 | 你管理什麼 | 範例 |
|---|---|---|
| IaaS(基礎設施即服務) | 作業系統以上全部自己管 | EC2(虛擬機) |
| PaaS(平台即服務) | 只管程式碼,環境代管 | Elastic Beanstalk、Lambda |
| SaaS(軟體即服務) | 什麼都不用管,直接用 | Gmail、Power BI Service |

AWS 是目前市佔最高的雲端平台,本模組聚焦在建置一個 AI API 服務所需的核心服務:**運算(EC2/Lambda)、儲存(S3)、資料庫(RDS)、網路與安全(IAM)**。

## 2. AWS 帳號與 IAM(身份與存取管理)

**最小權限原則(Principle of Least Privilege)**:每個使用者/程式只給完成任務所需的最小權限,不要圖方便給 AdministratorAccess。

- **Root 帳號**:註冊時建立,權限最高,平常不要用來操作,只用於帳單與帳號設定,務必開啟 MFA(多因子驗證)
- **IAM 使用者(User)**:給人類登入用,依角色分配權限群組(Group)
- **IAM 角色(Role)**:給 AWS 服務之間互相授權用(例如讓 Lambda 有權限讀寫 S3),**不要把 Access Key 寫死在程式碼裡**,能用 Role 就用 Role

```
建議的第一步設定:
1. 開啟 Root 帳號 MFA
2. 建立一個有 AdministratorAccess 的 IAM 使用者(自己平常登入用,不要用 Root)
3. 之後為每個專案建立最小權限的 IAM Role
```

## 3. S3(物件儲存)

用來存放靜態檔案、備份、日誌等:

```bash
aws s3 mb s3://my-course-bucket-yourname       # 建立 bucket(名稱需全球唯一)
aws s3 cp bookstore.db s3://my-course-bucket-yourname/backups/
aws s3 ls s3://my-course-bucket-yourname/
```

```python
import boto3

s3 = boto3.client("s3")
s3.upload_file("bookstore.db", "my-course-bucket-yourname", "backups/bookstore.db")
```

## 4. EC2(虛擬機)部署

1. 啟動一台 EC2 執行個體(建議先選 Free Tier 的 `t2.micro` / `t3.micro`,Amazon Linux 或 Ubuntu)
2. 設定「安全群組(Security Group)」,只開放需要的埠(例如 22 給 SSH、8000 給你的 API,且限制來源 IP)
3. SSH 進去部署程式碼:

```bash
ssh -i my-key.pem ec2-user@<EC2_PUBLIC_IP>

# 在 EC2 上
sudo yum install -y python3 git          # Amazon Linux
git clone <your-repo-url>
cd your-repo
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
nohup uvicorn api_server:app --host 0.0.0.0 --port 8000 &
```

> ⚠️ 直接用 `nohup` 只適合練習,正式環境應該用 `systemd` 服務或容器(見下方 Docker)管理程序生命週期,並搭配 Nginx 做反向代理與 HTTPS。

## 5. RDS(代管資料庫服務)

把 Module 2 的 SQLite 換成正式的雲端資料庫(SQLite 是單機檔案,不適合多台伺服器共用):

- AWS RDS 支援 PostgreSQL、MySQL 等,自動處理備份、修補、高可用
- 建立 RDS 執行個體後,取得連線字串,改用 `psycopg2`(PostgreSQL)或 SQLAlchemy 連接:

```python
from sqlalchemy import create_engine

# 本機開發用 SQLite,正式環境改用 RDS 連線字串,程式碼幾乎不用改(ORM 的好處)
engine = create_engine("postgresql://user:password@your-rds-endpoint:5432/dbname")
```

## 6. Docker 容器化基礎

容器化讓「本機能跑」變成「到哪都能跑」,是 Module 8 微服務架構的基礎:

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8000
CMD ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t chatgpt-api-demo .
docker run -p 8000:8000 --env-file .env chatgpt-api-demo
```

## 7. Lambda + API Gateway(無伺服器)

適合流量不穩定、不想管理伺服器的場景,按呼叫次數計費:

1. 把 FastAPI 應用用 [Mangum](https://mangum.io/) 包裝成 Lambda handler
2. 打包成 zip 或 container image 上傳到 Lambda
3. 建立 API Gateway,把 HTTP 請求路由到 Lambda

```python
# lambda_handler.py
from mangum import Mangum
from api_server import app  # Module 4 的 FastAPI app

handler = Mangum(app)
```

```bash
pip install mangum
zip -r function.zip .
aws lambda create-function \
  --function-name chatgpt-api-demo \
  --runtime python3.11 \
  --handler lambda_handler.handler \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::<account-id>:role/lambda-execution-role
```

**EC2 vs Lambda 怎麼選?**

| | EC2 | Lambda |
|---|---|---|
| 計費方式 | 按時間(持續運行就持續計費) | 按呼叫次數與執行時間 |
| 冷啟動 | 無 | 有(閒置一段時間後首次呼叫較慢) |
| 適合場景 | 流量穩定、長時間運行的服務 | 流量不穩定、間歇性呼叫(例如 LINE Bot webhook) |
| 維運複雜度 | 較高(要自己管作業系統、更新) | 較低(AWS 全代管) |

## 8. CloudWatch 監控與日誌

```python
import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

logger.info("Received chat request: %s", user_message)
```

在 EC2/Lambda 上的程式日誌會自動送到 CloudWatch Logs,可設定「告警(Alarm)」,例如錯誤率過高時發送通知到 Email/Slack。

## 9. 成本管理

- 善用 [Free Tier](https://aws.amazon.com/free/)(t2.micro EC2、少量 Lambda 呼叫、少量 RDS 都在免費額度內)
- 在「Billing」設定「預算警示(Budget Alert)」,超過設定金額時發送通知
- **練習完務必刪除不用的資源**(EC2、RDS 尤其會持續計費),Lambda/S3 用量少通常無感

## 📁 範例程式碼
[`examples/`](./examples) 資料夾:
- `Dockerfile` — 容器化 Module 4 的 API
- `lambda_handler.py` — Lambda + Mangum 包裝範例
- `ec2-deploy-steps.md` — EC2 手動部署步驟清單
- `cloudformation-minimal.yaml` — 用 Infrastructure as Code 建立一台 EC2(選讀)

## 📖 延伸資源
- [AWS Free Tier](https://aws.amazon.com/free/)
- [AWS 官方文件](https://docs.aws.amazon.com/)
- [Mangum(FastAPI on Lambda)](https://mangum.io/)
- [12-Factor App](https://12factor.net/zh_tw/)(雲端原生應用設計原則,強烈建議讀過)

## ✅ 完成本模組後
做完 [`exercises.md`](./exercises.md),前往 [Module 6｜LINE Bot 應用開發](../06-line-bot/README.md)。
