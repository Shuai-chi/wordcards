# Module 6｜LINE Bot 應用開發(第 9 週)

## 🎯 學習目標
- 理解 LINE Messaging API 的運作原理(Webhook)
- 能用 `line-bot-sdk` 開發回覆邏輯
- 能設計 Flex Message 豐富訊息格式
- 能把 Module 4 的 ChatGPT API 接上 LINE,做出智慧客服機器人

## 1. LINE Messaging API 運作原理

```
使用者在 LINE 傳訊息
        │
        ▼
LINE 平台伺服器
        │  (HTTP POST,Webhook)
        ▼
你的伺服器(Module 5 部署的 API)
        │  (呼叫 Reply API 或 Push API)
        ▼
LINE 平台伺服器 → 回傳訊息給使用者
```

核心是 **Webhook**:使用者傳訊息給你的官方帳號時,LINE 平台會把事件(訊息內容、使用者 ID 等)POST 到你事先設定好的網址,你的伺服器收到後決定怎麼回覆。這就是為什麼 Module 5 要先學會把服務部署到一個「外部可存取的網址」——LINE 平台必須能連到你的伺服器。

## 2. 申請 LINE Bot

1. 到 [LINE Developers Console](https://developers.line.biz/console/) 註冊
2. 建立一個 **Provider**,再建立一個 **Messaging API Channel**
3. 取得兩個關鍵憑證:
   - **Channel Access Token**:你的伺服器呼叫 LINE API 時的身份證明
   - **Channel Secret**:用來驗證 Webhook 請求真的來自 LINE(防止偽造請求)
4. 在 Channel 設定頁填入你的 **Webhook URL**(例如 `https://your-domain.com/webhook`),並開啟「Use webhook」

## 3. 安裝 SDK 與基本 Webhook 處理

```bash
pip install line-bot-sdk fastapi uvicorn
```

```python
from fastapi import FastAPI, Request, HTTPException
from linebot.v3 import WebhookHandler
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.messaging import Configuration, ApiClient, MessagingApi, ReplyMessageRequest, TextMessage
from linebot.v3.webhooks import MessageEvent, TextMessageContent

import os

CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET")

configuration = Configuration(access_token=CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(CHANNEL_SECRET)

app = FastAPI()


@app.post("/webhook")
async def webhook(request: Request):
    signature = request.headers.get("X-Line-Signature", "")
    body = await request.body()

    try:
        handler.handle(body.decode("utf-8"), signature)
    except InvalidSignatureError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    return "OK"


@handler.add(MessageEvent, message=TextMessageContent)
def handle_text_message(event):
    with ApiClient(configuration) as api_client:
        messaging_api = MessagingApi(api_client)
        messaging_api.reply_message(
            ReplyMessageRequest(
                reply_token=event.reply_token,
                messages=[TextMessage(text=f"你說了:{event.message.text}")],
            )
        )
```

**安全性重點**:一定要驗證 `X-Line-Signature`(SDK 的 `handler.handle()` 已自動處理),否則任何人都能偽造請求呼叫你的 Webhook。

## 4. Flex Message(豐富訊息卡片)

純文字訊息之外,LINE 支援類似「卡片」的 Flex Message,適合呈現商品資訊、選單等結構化內容:

```python
from linebot.v3.messaging import FlexMessage, FlexContainer

flex_content = {
    "type": "bubble",
    "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
            {"type": "text", "text": "訂單狀態", "weight": "bold", "size": "lg"},
            {"type": "text", "text": "訂單 A1234 已出貨,預計 3 天內送達", "wrap": True, "margin": "md"},
        ],
    },
}

flex_message = FlexMessage(alt_text="訂單狀態通知", contents=FlexContainer.from_dict(flex_content))
```

可以用 [LINE Flex Message Simulator](https://developers.line.biz/flex-simulator/) 線上設計並產生 JSON,不用手刻版面。

## 5. 串接 ChatGPT API 打造智慧客服 LINE Bot

把 Module 4 的邏輯接進 `handle_text_message`:

```python
from openai import OpenAI

openai_client = OpenAI()

@handler.add(MessageEvent, message=TextMessageContent)
def handle_text_message(event):
    user_message = event.message.text

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "你是 LINE 官方客服機器人,回答要簡潔友善。"},
            {"role": "user", "content": user_message},
        ],
    )
    reply_text = response.choices[0].message.content

    with ApiClient(configuration) as api_client:
        messaging_api = MessagingApi(api_client)
        messaging_api.reply_message(
            ReplyMessageRequest(
                reply_token=event.reply_token,
                messages=[TextMessage(text=reply_text)],
            )
        )
```

> ⚠️ **時間限制**:LINE 的 Reply Token 有時效性(約 1 分鐘內要回覆),若 ChatGPT API 回應較慢,建議先用 `push_message`(不受時效限制,但需事先知道 user_id)搭配非同步處理,或先回一句「處理中,請稍候」再用背景工作補發完整回覆。完整範例見 [`examples/line_bot_app.py`](./examples/line_bot_app.py)。

## 6. 本機測試:讓 LINE 連到你的本機

開發階段還沒部署上雲端時,可以用 [ngrok](https://ngrok.com/) 建立臨時的公開網址對應到本機:

```bash
uvicorn line_bot_app:app --reload --port 8000
ngrok http 8000
# 會產生類似 https://xxxx.ngrok-free.app 的網址,填進 LINE Developers Console 的 Webhook URL
```

## 7. 正式部署

延續 Module 5 學到的技能,把這個 FastAPI 服務部署到 AWS(EC2 或 Lambda + API Gateway 皆可),取得穩定的公開網址後填入 LINE Developers Console。若用 Lambda,注意 Reply Token 時效與 Lambda 冷啟動的交互影響,流量穩定的正式服務建議優先考慮 EC2 或容器化部署(Module 8 會延伸到 ECS)。

## 📁 範例程式碼
[`examples/`](./examples) 資料夾:
- `line_bot_app.py` — 完整可執行的 LINE Bot(整合 ChatGPT API,含錯誤處理與逾時保護)

## 📖 延伸資源
- [LINE Developers 官方文件](https://developers.line.biz/zh-hant/docs/messaging-api/)
- [line-bot-sdk-python GitHub](https://github.com/line/line-bot-sdk-python)
- [LINE Flex Message Simulator](https://developers.line.biz/flex-simulator/)
- [ngrok](https://ngrok.com/) — 本機開發測試用

## ✅ 完成本模組後
做完 [`exercises.md`](./exercises.md),前往 [Module 7｜PMP 專案管理](../07-pmp-project-management/README.md)。
