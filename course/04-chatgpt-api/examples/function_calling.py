"""Module 4 範例:Function Calling 完整雙向流程"""

import json
import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

MODEL = "gpt-4o-mini"

# --- 假的訂單資料庫(實務上會查 Module 2 學到的 SQL 資料庫) ---
FAKE_ORDERS_DB = {
    "A1234": {"status": "已出貨", "eta_days": 3},
    "B5678": {"status": "備貨中", "eta_days": 7},
}

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_order_status",
            "description": "查詢訂單目前的物流狀態",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {"type": "string", "description": "訂單編號,例如 A1234"}
                },
                "required": ["order_id"],
            },
        },
    }
]


def get_order_status(order_id: str) -> str:
    order = FAKE_ORDERS_DB.get(order_id)
    if not order:
        return json.dumps({"error": f"找不到訂單 {order_id}"}, ensure_ascii=False)
    return json.dumps(
        {"order_id": order_id, "status": order["status"], "eta_days": order["eta_days"]},
        ensure_ascii=False,
    )


AVAILABLE_FUNCTIONS = {"get_order_status": get_order_status}


def run(user_input: str) -> str:
    messages = [{"role": "user", "content": user_input}]

    response = client.chat.completions.create(model=MODEL, messages=messages, tools=tools)
    message = response.choices[0].message

    if not message.tool_calls:
        return message.content

    # 模型要求呼叫工具:把 assistant 的回覆與工具結果都加入對話歷史
    messages.append(message)
    for call in message.tool_calls:
        func = AVAILABLE_FUNCTIONS[call.function.name]
        args = json.loads(call.function.arguments)
        result = func(**args)
        messages.append(
            {
                "role": "tool",
                "tool_call_id": call.id,
                "content": result,
            }
        )

    # 把工具結果餵回模型,讓它組織成自然語言回覆
    final_response = client.chat.completions.create(model=MODEL, messages=messages)
    return final_response.choices[0].message.content


if __name__ == "__main__":
    print(run("我的訂單 A1234 到哪了?"))
    print(run("訂單 Z9999 呢?"))
