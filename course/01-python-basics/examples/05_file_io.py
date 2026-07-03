"""Module 1 範例:檔案與 JSON 讀寫"""

import json
import os

BASE_DIR = os.path.dirname(__file__)
NOTES_PATH = os.path.join(BASE_DIR, "notes.txt")
DATA_PATH = os.path.join(BASE_DIR, "data.json")

# 寫入純文字檔
with open(NOTES_PATH, "w", encoding="utf-8") as f:
    f.write("第一行\n第二行\n")

# 讀取純文字檔
with open(NOTES_PATH, "r", encoding="utf-8") as f:
    for line in f:
        print(line.strip())

# JSON 寫入
data = {"name": "Ada", "skills": ["python", "sql"]}
with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# JSON 讀取
with open(DATA_PATH, "r", encoding="utf-8") as f:
    loaded = json.load(f)
print("loaded:", loaded)
