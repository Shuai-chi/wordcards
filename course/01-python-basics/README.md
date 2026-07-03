# Module 1｜Python 基礎(第 1–2 週)

## 🎯 學習目標
- 建立 Python 開發環境,理解虛擬環境與套件管理
- 熟悉 Python 基本語法、資料型別與資料結構
- 能寫出含流程控制、函式、物件導向、例外處理的完整程式
- 能讀寫檔案、使用第三方套件

## 1. 開發環境設置

### 安裝 Python
到 [python.org](https://www.python.org/downloads/) 下載 3.11 以上版本。安裝完在終端機確認:
```bash
python3 --version
```

### 虛擬環境(venv)
每個專案都應該有獨立的虛擬環境,避免套件版本互相污染:
```bash
python3 -m venv .venv          # 建立虛擬環境
source .venv/bin/activate      # 啟用(Windows: .venv\Scripts\activate)
pip install requests           # 在虛擬環境中安裝套件
pip freeze > requirements.txt  # 匯出目前套件清單
deactivate                     # 離開虛擬環境
```

> 💡 之後每個模組的範例都建議在各自的虛擬環境中執行。

## 2. 變數與資料型別

```python
# 基本型別
age = 25                # int
price = 19.99           # float
name = "Ada"             # str
is_active = True        # bool

# 型別轉換
age_str = str(age)
price_int = int(price)  # 19,無條件捨去

print(type(age), type(price), type(name))
```

### 常用資料結構

```python
# list:有序、可變
fruits = ["apple", "banana", "cherry"]
fruits.append("date")
fruits[0] = "avocado"

# tuple:有序、不可變(常用於固定資料,如座標)
point = (3, 4)

# dict:鍵值對
user = {"name": "Ada", "age": 25, "email": "ada@example.com"}
user["age"] = 26
for key, value in user.items():
    print(f"{key}: {value}")

# set:不重複集合
tags = {"python", "sql", "aws"}
tags.add("linebot")
```

### 常用操作(list/dict comprehension)

```python
numbers = [1, 2, 3, 4, 5]
squares = [n ** 2 for n in numbers]              # [1, 4, 9, 16, 25]
even_squares = [n ** 2 for n in numbers if n % 2 == 0]

word_lengths = {w: len(w) for w in fruits}       # {'avocado': 7, 'banana': 6, ...}
```

## 3. 流程控制

```python
score = 85

if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
else:
    grade = "C"

# for 迴圈
for fruit in fruits:
    print(fruit)

for i in range(5):        # 0,1,2,3,4
    print(i)

# while 迴圈
count = 0
while count < 3:
    print(count)
    count += 1

# break / continue
for n in range(10):
    if n == 5:
        break
    if n % 2 == 0:
        continue
    print(n)
```

## 4. 函式

```python
def greet(name, greeting="Hello"):
    """基本函式,greeting 有預設值"""
    return f"{greeting}, {name}!"

print(greet("Ada"))
print(greet("Bob", greeting="Hi"))

# *args / **kwargs
def sum_all(*args):
    return sum(args)

def print_info(**kwargs):
    for key, value in kwargs.items():
        print(f"{key} = {value}")

print(sum_all(1, 2, 3, 4))          # 10
print_info(name="Ada", age=25)

# lambda(匿名函式)
square = lambda x: x ** 2
sorted_users = sorted(
    [{"name": "Bob", "age": 30}, {"name": "Ada", "age": 25}],
    key=lambda u: u["age"]
)
```

## 5. 物件導向(OOP)

```python
class BankAccount:
    """簡易銀行帳戶類別"""

    def __init__(self, owner: str, balance: float = 0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount: float):
        if amount <= 0:
            raise ValueError("存款金額必須大於 0")
        self.balance += amount

    def withdraw(self, amount: float):
        if amount > self.balance:
            raise ValueError("餘額不足")
        self.balance -= amount

    def __str__(self):
        return f"{self.owner} 的帳戶餘額:{self.balance}"


class SavingsAccount(BankAccount):
    """繼承 BankAccount,加上利息功能"""

    def __init__(self, owner: str, balance: float = 0, interest_rate: float = 0.01):
        super().__init__(owner, balance)
        self.interest_rate = interest_rate

    def apply_interest(self):
        self.balance += self.balance * self.interest_rate


account = SavingsAccount("Ada", 1000, interest_rate=0.02)
account.deposit(500)
account.apply_interest()
print(account)  # Ada 的帳戶餘額:1530.0
```

### dataclass(簡化資料類別)

```python
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

p1 = Point(3, 4)
print(p1)  # Point(x=3, y=4)
```

## 6. 例外處理

```python
def divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        print("錯誤:除數不可為 0")
        return None
    except TypeError as e:
        print(f"型別錯誤:{e}")
        return None
    finally:
        print("除法運算結束")


class InsufficientFundsError(Exception):
    """自訂例外"""
    pass


def withdraw(balance, amount):
    if amount > balance:
        raise InsufficientFundsError(f"餘額 {balance} 不足以提領 {amount}")
    return balance - amount
```

## 7. 檔案讀寫與模組

```python
# 寫入檔案
with open("notes.txt", "w", encoding="utf-8") as f:
    f.write("第一行\n第二行\n")

# 讀取檔案
with open("notes.txt", "r", encoding="utf-8") as f:
    for line in f:
        print(line.strip())

# JSON 讀寫(之後串 API 會大量用到)
import json

data = {"name": "Ada", "skills": ["python", "sql"]}
with open("data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open("data.json", "r", encoding="utf-8") as f:
    loaded = json.load(f)
```

### 匯入自己的模組

```python
# math_utils.py
def add(a, b):
    return a + b

# main.py
from math_utils import add
print(add(2, 3))
```

## 8. 常用第三方套件速覽

| 套件 | 用途 | 之後會用到 |
|---|---|---|
| `requests` | 呼叫 HTTP API | Module 4(ChatGPT API)、Module 6(LINE Bot) |
| `pandas` | 資料處理與分析 | Module 3(Power BI 前置處理) |
| `sqlite3`(內建) | 輕量資料庫 | Module 2 |
| `fastapi` / `flask` | 建立 Web API | Module 4、5、6、8 |
| `python-dotenv` | 管理環境變數(API Key 等機密) | Module 4 起 |

```bash
pip install requests pandas fastapi uvicorn python-dotenv
```

## 📁 範例程式碼
完整可執行範例在 [`examples/`](./examples) 資料夾:
- `01_basics.py` — 變數、資料型別、資料結構
- `02_control_flow.py` — 流程控制
- `03_functions.py` — 函式與 lambda
- `04_oop.py` — 物件導向(銀行帳戶範例)
- `05_file_io.py` — 檔案與 JSON 讀寫

執行方式:
```bash
cd course/01-python-basics/examples
python3 04_oop.py
```

## 📖 延伸資源
- [Python 官方教學文件](https://docs.python.org/zh-tw/3/tutorial/)(有繁中版)
- [Real Python](https://realpython.com/) — 高品質英文教學文章
- [Python Tutor](https://pythontutor.com/) — 視覺化程式執行過程,適合初學除錯

## ✅ 完成本模組後,前往
[`exercises.md`](./exercises.md) 做練習,通過後進入 [Module 2｜SQL 資料庫](../02-sql-database/README.md)。
