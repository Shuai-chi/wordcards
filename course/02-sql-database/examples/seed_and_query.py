"""Module 2 範例:用 Python 建表、灌資料、查詢 SQLite 資料庫"""

import os
import sqlite3

BASE_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(BASE_DIR, "bookstore.db")

if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

with open(os.path.join(BASE_DIR, "schema.sql"), "r", encoding="utf-8") as f:
    cursor.executescript(f.read())

authors = [("侯文詠", "Taiwan"), ("村上春樹", "Japan"), ("J.K. Rowling", "UK")]
cursor.executemany("INSERT INTO authors (name, country) VALUES (?, ?)", authors)

books = [
    ("白色巨塔", 1, 380, 1999),
    ("挪威的森林", 2, 320, 1987),
    ("哈利波特：神秘的魔法石", 3, 350, 1997),
    ("1Q84", 2, 450, 2009),
]
cursor.executemany(
    "INSERT INTO books (title, author_id, price, published_year) VALUES (?, ?, ?, ?)",
    books,
)

orders = [(1, 2, "2024-01-15"), (2, 1, "2024-02-20"), (3, 5, "2024-03-01"), (4, 3, "2024-03-10")]
cursor.executemany(
    "INSERT INTO orders (book_id, quantity, order_date) VALUES (?, ?, ?)", orders
)

conn.commit()

print("=== 每位作者的營收排行 ===")
cursor.execute("""
    SELECT authors.name, COUNT(orders.id) AS total_orders,
           SUM(orders.quantity * books.price) AS revenue
    FROM orders
    JOIN books ON orders.book_id = books.id
    JOIN authors ON books.author_id = authors.id
    GROUP BY authors.name
    ORDER BY revenue DESC
""")
for row in cursor.fetchall():
    print(row)

conn.close()
