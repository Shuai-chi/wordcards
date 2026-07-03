-- 基本查詢
SELECT * FROM books;

SELECT title, price FROM books WHERE price > 300;

SELECT title, price FROM books ORDER BY price DESC LIMIT 5;

SELECT * FROM books WHERE title LIKE '%Python%';

SELECT * FROM books WHERE price BETWEEN 200 AND 500 AND published_year >= 2020;

-- JOIN
SELECT books.title, authors.name AS author_name
FROM books
INNER JOIN authors ON books.author_id = authors.id;

SELECT authors.name, books.title
FROM authors
LEFT JOIN books ON books.author_id = authors.id;

-- 聚合 + HAVING
SELECT authors.name, COUNT(orders.id) AS total_orders, SUM(orders.quantity * books.price) AS revenue
FROM orders
JOIN books ON orders.book_id = books.id
JOIN authors ON books.author_id = authors.id
GROUP BY authors.name
HAVING revenue > 1000
ORDER BY revenue DESC;

-- 更新 / 刪除
UPDATE books SET price = 350 WHERE id = 1;

DELETE FROM orders WHERE order_date < '2020-01-01';
