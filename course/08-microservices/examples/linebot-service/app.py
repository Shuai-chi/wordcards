"""Module 8 範例:極簡的 LINE Bot 微服務
單一職責:只負責處理 LINE Webhook,實際的 AI 對話邏輯呼叫 chat-service。
展示微服務之間如何透過服務名稱(Docker Compose 內部網路)互相溝通。
正式使用時可替換成 Module 6 的完整 line_bot_app.py 邏輯(含簽章驗證與真正的 LINE SDK 呼叫）。
"""

import os

import httpx
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="linebot-service")

CHAT_SERVICE_URL = os.getenv("CHAT_SERVICE_URL", "http://localhost:8001")


class WebhookMessage(BaseModel):
    user_id: str
    text: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "linebot-service"}


@app.post("/webhook")
def webhook(msg: WebhookMessage):
    """模擬 LINE Webhook 收到訊息後,呼叫 chat-service 取得回覆。"""
    with httpx.Client(timeout=15) as client:
        response = client.post(f"{CHAT_SERVICE_URL}/chat", json={"message": msg.text})
        response.raise_for_status()
        reply = response.json()["reply"]

    # 正式環境這裡會呼叫 LINE Messaging API 的 reply_message
    return {"user_id": msg.user_id, "reply": reply}
