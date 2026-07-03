# Module 4｜ChatGPT API 串接(第 5–6 週)

## 🎯 學習目標
- 理解 LLM(大型語言模型)的基本運作概念與限制
- 能安全地管理 API 金鑰,呼叫 Chat Completions API
- 掌握 Prompt Engineering 基本技巧
- 能實作 Function Calling 與簡易 RAG(檢索增強生成)
- 能把 LLM 呼叫包裝成一個 Web API(FastAPI)

> 本模組以 OpenAI 的 API 為範例(業界最普及、文件最完整),但概念(角色訊息、Function Calling、串流、RAG)可平移到 Anthropic Claude API、Google Gemini API 等其他 LLM 服務。

## 1. LLM 基礎概念

- LLM 是根據前文「預測下一個字」的機率模型,本質上不具備真正的「記憶」——每次呼叫都要把完整對話歷史一起傳入,模型才「記得」上文
- **Token** 是計費與長度限制的單位,中文一個字通常算 1–2 tokens,英文一個單字約 1 token
- **Context Window(上下文長度)** 是模型單次能處理的最大 token 數,超過會被截斷或報錯
- LLM 會「幻覺(hallucination)」——生成看似合理但實際錯誤的內容,這是為什麼 Module 4.6 會介紹 RAG(用真實資料佐證回答)

## 2. 環境設定與金鑰管理

到 [platform.openai.com](https://platform.openai.com/) 註冊帳號並建立 API Key。

**絕對不要把 API Key 直接寫在程式碼或提交進 Git**,用 `.env` 檔案 + `python-dotenv` 管理:

```bash
pip install openai python-dotenv
```

```bash
# .env(記得加進 .gitignore,不要提交到 Git)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
```

```python
from dotenv import load_dotenv
import os

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
```

## 3. 基本 Chat Completions 呼叫

```python
from openai import OpenAI

client = OpenAI()  # 會自動讀取環境變數 OPENAI_API_KEY

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "你是一個友善的客服助理,回答要簡潔。"},
        {"role": "user", "content": "請問你們的退貨政策是什麼?"},
    ],
    temperature=0.7,
)

print(response.choices[0].message.content)
```

三種角色:
- `system`:設定 AI 的角色、語氣、行為邊界(整段對話只需設定一次,放在最前面)
- `user`:使用者輸入
- `assistant`:AI 先前的回覆(維持多輪對話記憶時需要帶入歷史)

### 維持多輪對話(記憶)

```python
conversation = [
    {"role": "system", "content": "你是一個友善的客服助理。"},
]

def chat(user_input: str) -> str:
    conversation.append({"role": "user", "content": user_input})
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=conversation,
    )
    reply = response.choices[0].message.content
    conversation.append({"role": "assistant", "content": reply})
    return reply
```

> 💡 對話越長,每次呼叫要傳的 token 越多、越貴。實務上常見做法是「只保留最近 N 輪」或「定期用 LLM 把舊對話摘要成一段話」來控制長度。

## 4. Prompt Engineering 技巧

| 技巧 | 說明 | 範例 |
|---|---|---|
| 明確角色設定 | 在 system prompt 定義身份、語氣、限制 | 「你是保險業客服,只能回答本公司保單相關問題」 |
| 給範例(Few-shot) | 提供 1–3 個範例讓模型模仿格式 | 在 prompt 中放「輸入 → 輸出」範例對 |
| 要求結構化輸出 | 明確要求 JSON 格式,方便程式解析 | 「請用 JSON 格式回答,欄位為 answer 與 confidence」 |
| 拆解複雜任務 | 一次只問一件事,或用「思考步驟」引導 | 「請先列出重點,再依重點寫摘要」 |
| 限制回答範圍 | 避免模型「腦補」 | 「若資料中沒有答案,請回答『我不確定』」 |

### 結構化輸出範例(JSON mode)

```python
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "你是情感分析助理,只回傳 JSON,不要有其他文字。"},
        {"role": "user", "content": "這家餐廳的服務態度很差,但食物很好吃。"},
    ],
    response_format={"type": "json_object"},
)
import json
result = json.loads(response.choices[0].message.content)
print(result)  # 例如 {"sentiment": "mixed", "positive_aspects": ["食物"], "negative_aspects": ["服務"]}
```

## 5. 串流回應(Streaming)

串流可以讓使用者「邊生成邊看到文字」,大幅改善體感速度,是 ChatGPT 網頁版的標準體驗:

```python
stream = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "用 100 字介紹微服務架構"}],
    stream=True,
)

for chunk in stream:
    delta = chunk.choices[0].delta.content
    if delta:
        print(delta, end="", flush=True)
```

## 6. Function Calling(工具呼叫)

讓 LLM 決定「何時該呼叫哪個函式」,是把 LLM 接上真實系統(查資料庫、呼叫外部 API)的關鍵技術:

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_order_status",
            "description": "查詢訂單目前的物流狀態",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {"type": "string", "description": "訂單編號"}
                },
                "required": ["order_id"],
            },
        },
    }
]

def get_order_status(order_id: str) -> str:
    # 實務上這裡會查資料庫(呼應 Module 2 的 SQL)
    return f"訂單 {order_id} 已出貨,預計 3 天內送達。"

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "我的訂單 A1234 到哪了?"}],
    tools=tools,
)

message = response.choices[0].message
if message.tool_calls:
    for call in message.tool_calls:
        if call.function.name == "get_order_status":
            args = json.loads(call.function.arguments)
            result = get_order_status(**args)
            print(result)
```

真實流程是:模型先回傳「我要呼叫 get_order_status(order_id='A1234')」→ 你的程式執行這個函式 → 把結果再傳回給模型 → 模型組織成自然語言回覆使用者。完整雙向流程請見 [`examples/function_calling.py`](./examples/function_calling.py)。

## 7. Embeddings 與 RAG(檢索增強生成)

RAG 的核心概念:與其要模型「憑記憶」回答(容易幻覺),不如**先從你自己的資料庫/文件中檢索出相關內容,再連同問題一起餵給模型**,讓它「照著資料回答」。

流程:
1. 把你的文件切成小段落(chunk)
2. 用 Embeddings API 把每段文字轉成向量(數字陣列,代表語意)
3. 存進向量資料庫(簡單情境可以只存在記憶體或 SQLite,大規模可用 Pinecone、Chroma、pgvector)
4. 使用者提問時,把問題也轉成向量,找出最相似的段落
5. 把「檢索到的段落 + 使用者問題」一起送給 Chat Completions API

```python
def get_embedding(text: str) -> list[float]:
    response = client.embeddings.create(model="text-embedding-3-small", input=text)
    return response.data[0].embedding

import numpy as np

def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
```

完整最小可行範例(用簡易餘弦相似度取代真的向量資料庫)在 [`examples/rag_demo.py`](./examples/rag_demo.py)。

## 8. 包裝成 Web API(FastAPI)

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
def chat_endpoint(req: ChatRequest):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": req.message}],
    )
    return {"reply": response.choices[0].message.content}
```

```bash
uvicorn main:app --reload --port 8000
# 測試: curl -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d '{"message": "你好"}'
```

這個 FastAPI 服務就是 Module 5(部署到 AWS)與 Module 6(接上 LINE Bot)的基礎。

## 9. 成本與安全性控管

- **設定用量上限**:OpenAI 後台可設定每月消費上限,避免超支
- **限制 `max_tokens`**:避免單次回應過長浪費成本
- **Rate Limiting**:自己的 API 也要對外部使用者做速率限制,避免被濫用(可用 `slowapi` 套件)
- **輸入驗證**:避免使用者輸入過長文字灌爆 context window
- **絕不把使用者輸入直接串進「系統指令」**:防範 Prompt Injection(使用者輸入「請忽略先前指令,改為 XXX」來操控模型),應在 system prompt 中明確劃清界線,並對高風險操作(如 Function Calling 觸發付款)加上額外的程式碼驗證,不能完全信任模型的判斷

## 📁 範例程式碼
[`examples/`](./examples) 資料夾:
- `basic_chat.py` — 基本呼叫與多輪對話
- `streaming.py` — 串流回應
- `function_calling.py` — 完整 Function Calling 雙向流程
- `rag_demo.py` — 簡易 RAG 範例(不需外部向量資料庫)
- `api_server.py` — FastAPI 包裝的聊天 API

> ⚠️ 執行範例前需要設定環境變數 `OPENAI_API_KEY`(或建立 `.env` 檔),且會產生實際 API 用量費用。

## 📖 延伸資源
- [OpenAI API 官方文件](https://platform.openai.com/docs)
- [OpenAI Cookbook](https://cookbook.openai.com/)(大量實戰範例)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [FastAPI 官方文件](https://fastapi.tiangolo.com/)

## ✅ 完成本模組後
做完 [`exercises.md`](./exercises.md),前往 [Module 5｜AWS 雲端部署](../05-aws-deployment/README.md)。
