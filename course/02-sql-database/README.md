# Module 2｜SQL 資料庫(第 3 週)

## 🎯 學習目標
- 理解關聯式資料庫的基本概念與正規化設計
- 熟練 SQL 查詢(SELECT / WHERE / JOIN / GROUP BY)
- 能設計一個多表關聯的資料庫 schema
- 能用 Python 連接並操作 SQLite 資料庫

## 1. 資料庫基礎概念

**RDBMS(關聯式資料庫)** 用「表格(table)」儲存資料,表格之間透過「外鍵(foreign key)」建立關聯。常見系統:SQLite(輕量、本機檔案)、PostgreSQL、MySQL、AWS RDS(雲端代管)。

**NoSQL** 則是非關聯式(如 MongoDB、DynamoDB),適合結構彈性大、水平擴展需求高的場景。本課程以 SQL/RDBMS 為主,因為它是最通用、最需要先掌握的基礎。

我們用 **SQLite** 練習,因為它不需要另外安裝伺服器,Python 內建 `sqlite3` 模組即可使用。

## 2. 資料表設計與正規化

以「線上書店」為例,設計三張表:

```sql
CREATE TABLE authors (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name    TEXT NOT NULL,
    country TEXT
);

CREATE TABLE books (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    author_id  INTEGER NOT NULL,
    price      REAL NOT NULL,
    published_year INTEGER,
    FOREIGN KEY (author_id) REFERENCES authors(id)
);

CREATE TABLE orders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id    INTEGER NOT NULL,
    quantity   INTEGER NOT NULL,
    order_date TEXT NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id)
);
```

### 正規化(Normalization)簡介
- **1NF**:每個欄位存單一值(不要把多個作者塞在同一欄用逗號分隔)
- **2NF**:非主鍵欄位必須完全依賴主鍵(拆分出 `authors` 表就是這個原則)
- **3NF**:消除傳遞相依(例如 `books` 表不該再存 `author_country`,因為那應該從 `authors` 表查)

> 💡 正規化的目的是減少資料重複、避免更新異常。但過度正規化會讓查詢變複雜,實務上常會依查詢效能需求做「反正規化(denormalization)」取捨。

## 3. 基本查詢(SELECT / WHERE / ORDER BY)

```sql
-- 查所有書籍
SELECT * FROM books;

-- 條件篩選
SELECT title, price FROM books WHERE price > 300;

-- 排序
SELECT title, price FROM books ORDER BY price DESC LIMIT 5;

-- 模糊搜尋
SELECT * FROM books WHERE title LIKE '%Python%';

-- 多條件
SELECT * FROM books WHERE price BETWEEN 200 AND 500 AND published_year >= 2020;
```

## 4. JOIN(表格關聯查詢)

```sql
-- INNER JOIN:只回傳兩表都有對應資料的列
SELECT books.title, authors.name AS author_name
FROM books
INNER JOIN authors ON books.author_id = authors.id;

-- LEFT JOIN:保留左表全部資料,右表沒對應的補 NULL
SELECT authors.name, books.title
FROM authors
LEFT JOIN books ON books.author_id = authors.id;

-- 多表 JOIN + 聚合
SELECT authors.name, COUNT(orders.id) AS total_orders, SUM(orders.quantity * books.price) AS revenue
FROM orders
JOIN books ON orders.book_id = books.id
JOIN authors ON books.author_id = authors.id
GROUP BY authors.name
HAVING revenue > 1000
ORDER BY revenue DESC;
```

`WHERE` 在分組前過濾單一列;`HAVING` 在 `GROUP BY` 之後過濾聚合結果 —— 這是初學者最常混淆的地方。

## 5. 新增 / 更新 / 刪除資料

```sql
INSERT INTO authors (name, country) VALUES ('侯文詠', 'Taiwan');

UPDATE books SET price = 350 WHERE id = 1;

DELETE FROM orders WHERE order_date < '2020-01-01';
```

### Transaction(交易)
多個 SQL 操作要「全部成功或全部失敗」時使用交易,避免資料只更新一半:

```sql
BEGIN TRANSACTION;
UPDATE books SET price = price - 50 WHERE id = 1;
UPDATE orders SET quantity = quantity + 1 WHERE id = 10;
COMMIT;   -- 若中途出錯則改用 ROLLBACK;
```

## 6. Index 與效能

當表格資料量大時,常查詢的欄位應該建立索引,加速查詢(但會拖慢寫入速度,是一種取捨):

```sql
CREATE INDEX idx_books_author_id ON books(author_id);
```

## 7. 用 Python 操作 SQLite

```python
import sqlite3

conn = sqlite3.connect("bookstore.db")
cursor = conn.cursor()

cursor.execute("""
    CREATE TABLE IF NOT EXISTS authors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        country TEXT
    )
""")

# 用參數化查詢避免 SQL Injection —— 永遠不要用字串拼接組 SQL!
cursor.execute("INSERT INTO authors (name, country) VALUES (?, ?)", ("侯文詠", "Taiwan"))
conn.commit()

cursor.execute("SELECT * FROM authors")
for row in cursor.fetchall():
    print(row)

conn.close()
```

> ⚠️ **安全性提醒**:絕對不要用 f-string 或 `%` 拼接使用者輸入到 SQL 語句中(例如 `f"SELECT * FROM users WHERE name = '{user_input}'"`),這會造成 SQL Injection 漏洞。永遠使用參數化查詢(`?` 或 `%s` 佔位符)。

### 進階:SQLAlchemy(ORM)
之後在 Module 4/8 建立 Web API 時,通常會用 **SQLAlchemy** 這種 ORM(Object-Relational Mapping)工具,把資料表對應成 Python 類別,寫起來更像操作物件而非寫 SQL 字串:

```python
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

class Book(Base):
    __tablename__ = "books"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    price = Column(Float, nullable=False)

engine = create_engine("sqlite:///bookstore.db")
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
session = Session()

session.add(Book(title="流浪者之歌", price=280))
session.commit()

for book in session.query(Book).filter(Book.price > 200):
    print(book.title, book.price)
```

## 📁 範例程式碼
[`examples/`](./examples) 資料夾:
- `schema.sql` — 建表語句(可直接匯入 DB Browser for SQLite)
- `queries.sql` — 各種查詢範例
- `seed_and_query.py` — 用 Python 建表、灌資料、查詢的完整範例

執行方式:
```bash
cd course/02-sql-database/examples
python3 seed_and_query.py
```

## 📖 延伸資源
- [SQLBolt](https://sqlbolt.com/) — 互動式 SQL 練習(英文)
- [W3Schools SQL Tutorial](https://www.w3schools.com/sql/)
- [DB Browser for SQLite](https://sqlitebrowser.org/) — 圖形化操作工具
- [SQLAlchemy 官方文件](https://docs.sqlalchemy.org/)

## ✅ 完成本模組後
做完 [`exercises.md`](./exercises.md),前往 [Module 3｜Power BI 視覺化分析](../03-power-bi/README.md)。
