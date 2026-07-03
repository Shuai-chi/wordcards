"""Module 4 範例:簡易 RAG(檢索增強生成)
用記憶體內的餘弦相似度取代真正的向量資料庫,方便理解核心概念。
"""

import os

import numpy as np
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

EMBEDDING_MODEL = "text-embedding-3-small"
CHAT_MODEL = "gpt-4o-mini"

# --- 模擬公司知識庫文件(實務上會來自真實文件、Module 2 的資料庫等) ---
DOCUMENTS = [
    "退貨政策:商品收到 7 天內,若未拆封可申請全額退款。",
    "運送時間:一般訂單約 3-5 個工作天送達,離島需額外 2-3 天。",
    "會員制度:累積消費滿 3000 元可升級為銀卡會員,享 95 折優惠。",
]


def get_embedding(text: str) -> list[float]:
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=text)
    return response.data[0].embedding


def cosine_similarity(a, b) -> float:
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def retrieve(query: str, top_k: int = 2) -> list[str]:
    query_embedding = get_embedding(query)
    doc_embeddings = [get_embedding(doc) for doc in DOCUMENTS]
    scored = [
        (doc, cosine_similarity(query_embedding, emb))
        for doc, emb in zip(DOCUMENTS, doc_embeddings)
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [doc for doc, _score in scored[:top_k]]


def answer_with_rag(query: str) -> str:
    context_docs = retrieve(query)
    context = "\n".join(f"- {doc}" for doc in context_docs)

    response = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "你是客服助理,只能根據下方提供的資料回答問題,"
                    "若資料中沒有答案請回答『我不確定,建議聯繫客服』。\n\n"
                    f"參考資料:\n{context}"
                ),
            },
            {"role": "user", "content": query},
        ],
    )
    return response.choices[0].message.content


if __name__ == "__main__":
    print(answer_with_rag("如果我買的東西已經拆封,還能退貨嗎?"))
    print(answer_with_rag("你們有實體門市嗎?"))  # 資料庫中沒有這個資訊,模型應誠實回答不確定
