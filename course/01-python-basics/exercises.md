# Module 1 練習題

## 練習 1:資料型別暖身
寫一個程式,輸入一個購物清單(list of dict,每個 dict 含 `name` 和 `price`),計算：
1. 總金額
2. 平均單價
3. 最貴的商品名稱

## 練習 2:成績評分器
寫一個函式 `get_grade(score)`,回傳對應等第:
- 90 以上:A
- 80–89:B
- 70–79:C
- 60–69:D
- 60 以下:F

用 `for` 迴圈對一組分數清單印出每個人的等第。

## 練習 3:簡易記帳工具(整合練習)
用物件導向設計一個 `Wallet` 類別,具備:
- `add_income(amount, note)`:新增一筆收入
- `add_expense(amount, note)`:新增一筆支出(若餘額不足要拋出自訂例外 `InsufficientFundsError`)
- `get_balance()`:回傳目前餘額
- `get_history()`:回傳所有交易紀錄(list of dict)
- 把交易紀錄存成 JSON 檔,並能重新讀取回程式中

**驗收標準**:
- 至少包含 1 個自訂例外類別
- 至少包含 1 個繼承關係(例如 `SavingsWallet` 繼承 `Wallet`,提供自動計息)
- 使用 `try/except/finally` 處理可能的錯誤輸入
- 交易紀錄可持久化(存檔/讀檔)

## 練習 4:字串處理
給定一段英文段落,寫程式統計每個單字出現的次數(不分大小寫),並印出出現次數前 5 高的單字。這個技巧之後在 Module 4 做 Prompt 分析時會用到。

## 挑戰題(選做)
用 `requests` 套件呼叫一個公開的免費 API(例如 [Open-Meteo 天氣 API](https://open-meteo.com/),不需要金鑰),把回傳的 JSON 資料解析並印出台北未來 3 天的氣溫。這會是 Module 4 串接 ChatGPT API 的暖身練習。

---
完成後 → 前往 [Module 2｜SQL 資料庫](../02-sql-database/README.md)
