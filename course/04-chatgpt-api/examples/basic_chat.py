"""Module 4 範例:基本 Chat Completions 呼叫與多輪對話
需要環境變數 OPENAI_API_KEY(或 .env 檔案)。
"""

import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

MODEL = "gpt-4o-mini"

conversation = [
    {"role": "system", "content": "你是一個友善的客服助理,回答要簡潔。"},
]


def chat(user_input: str) -> str:
    conversation.append({"role": "user", "content": user_input})
    response = client.chat.completions.create(
        model=MODEL,
        messages=conversation,
        temperature=0.7,
    )
    reply = response.choices[0].message.content
    conversation.append({"role": "assistant", "content": reply})
    return reply


if __name__ == "__main__":
    print(chat("請問你們的退貨政策是什麼?"))
    print(chat("那如果商品已經拆封了呢?"))  # 會延續上一輪的上下文
