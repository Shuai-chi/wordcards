# Module 2 練習題

## 練習 1:基本查詢
使用 [`examples/seed_and_query.py`](./examples/seed_and_query.py) 產生的 `bookstore.db`,寫出以下 SQL:
1. 找出所有 2000 年以前出版的書
2. 找出書名包含「魔法」的書
3. 依價格由高到低列出所有書籍

## 練習 2:JOIN 練習
1. 列出每一本書的書名與作者名稱
2. 列出每位作者出版的書籍數量(即使該作者還沒有任何書也要出現,用 LEFT JOIN)
3. 列出訂單金額最高的前 3 筆訂單(含書名)

## 練習 3:資料庫設計(整合練習)
設計一個「線上課程平台」的資料庫 schema,至少包含以下需求:
- `students`(學生)、`courses`(課程)、`enrollments`(選課紀錄,含成績)三張表
- `enrollments` 應該是 `students` 與 `courses` 的多對多關聯表
- 每個課程有一位授課教師(`instructors` 表)
- 寫出建表 SQL,並至少插入 3 位學生、2 位教師、3 門課程、5 筆選課紀錄的測試資料

## 練習 4:分析查詢
基於練習 3 的資料庫,寫出:
1. 每門課程的平均成績
2. 選課數超過 1 門的學生名單
3. 每位教師開課的總選課人數

## 挑戰題(選做)
把練習 3 的資料庫用 SQLAlchemy 重寫一遍(用 ORM 方式定義 model 並查詢),為 Module 4/8 建立 Web API 打基礎。

---
完成後 → 前往 [Module 3｜Power BI 視覺化分析](../03-power-bi/README.md)
