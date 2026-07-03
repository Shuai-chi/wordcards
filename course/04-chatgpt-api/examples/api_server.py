"""Module 4 範例:用 FastAPI 包裝聊天 API
執行: uvicorn api_server:app --reload --port 8000
測試: curl -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d '{"message": "你好"}'
"""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from openai import OpenAI
from pydantic import BaseModel

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(title="ChatGPT API Demo")


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "你是一個友善的客服助理,回答要簡潔。"},
            {"role": "user", "content": req.message},
        ],
    )
    return ChatResponse(reply=response.choices[0].message.content)
