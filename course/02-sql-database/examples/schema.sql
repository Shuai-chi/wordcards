-- 線上書店資料庫 schema
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS authors;

CREATE TABLE authors (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name    TEXT NOT NULL,
    country TEXT
);

CREATE TABLE books (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    title          TEXT NOT NULL,
    author_id      INTEGER NOT NULL,
    price          REAL NOT NULL,
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

CREATE INDEX idx_books_author_id ON books(author_id);
