"""Module 8 範例:極簡的 Chat 微服務
單一職責:只負責跟 LLM 對話,不管 LINE、不管訂單。
正式使用時可直接替換成 Module 4 的完整 api_server.py 邏輯。
"""

import os

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="chat-service")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "chat-service"}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if not OPENAI_API_KEY:
        # 沒設定 API Key 時回傳假回覆,方便本地測試微服務串接邏輯而不必花費 API 額度
        return ChatResponse(reply=f"[demo mode] 收到訊息:{req.message}")

    from openai import OpenAI

    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "你是客服助理,回答要簡潔。"},
            {"role": "user", "content": req.message},
        ],
    )
    return ChatResponse(reply=response.choices[0].message.content)
