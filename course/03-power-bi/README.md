# Module 3｜Power BI 視覺化分析(第 4 週)

## 🎯 學習目標
- 理解 Power BI 的核心工作流程:取得資料 → 清理轉換 → 建模 → 視覺化 → 發佈
- 能用 Power Query 清理髒資料
- 能建立資料表關聯與撰寫基礎 DAX 量值
- 能設計一份具互動性的儀表板

## 1. Power BI 是什麼、為什麼要學

Power BI 是微軟的商業智慧(BI)工具,用來把原始資料(Excel、CSV、資料庫)轉換成互動式報表與儀表板。在 AI/資料應用場景中,Power BI 常用來:
- 監控系統使用量(例如 Module 6 LINE Bot 的對話量趨勢)
- 呈現業務指標(營收、轉換率)給非技術主管看
- 快速做探索性資料分析(EDA),先於寫程式分析

**取得方式**:
- Windows:安裝 [Power BI Desktop](https://powerbi.microsoft.com/desktop/)(免費)
- macOS/Linux:改用瀏覽器版 [Power BI Service](https://app.powerbi.com/)(功能較少但可完成本課程練習),或在虛擬機/雲端 Windows 環境安裝 Desktop 版

## 2. 取得資料與 Power Query(資料清理)

Power BI 可連接 Excel、CSV、SQL Server、Web API 等多種來源。匯入後點選「轉換資料」進入 **Power Query 編輯器**,這是清理資料最關鍵的階段:

常見清理操作:
- **移除重複列 / 移除空白列**
- **變更資料型別**(文字轉數字、字串轉日期)
- **分割欄位**(例如把「姓名(職稱)」拆成兩欄)
- **合併查詢(Merge Queries)**:類似 SQL 的 JOIN,把兩個資料表依鍵值合併
- **樞紐 / 取消樞紐(Pivot / Unpivot)**:把「寬表」轉成「長表」,方便建立視覺化(例如把「Jan/Feb/Mar 各為一欄」轉成「月份、數值」兩欄)

> 💡 Power Query 產生的每一步操作都會被記錄成「M 語言」腳本,資料來源更新後可以重新整理,不用手動重做一次。

## 3. 資料建模(Data Modeling)

匯入多張表後,要在「模型檢視」建立表格之間的關聯(類似 SQL 的外鍵),常見架構是 **星型 schema(Star Schema)**:
- **事實表(Fact Table)**:紀錄交易/事件的表,通常列數最多(例如「訂單明細」)
- **維度表(Dimension Table)**:描述屬性的表(例如「產品」「客戶」「日期」)

```
        Dim_Product          Dim_Date
              \                  /
               \                /
              Fact_Orders(事實表)
                /
        Dim_Customer
```

這跟 Module 2 學的正規化資料庫設計思路相通,但 BI 建模通常會刻意「反正規化」一些維度表,讓查詢更快、更好理解。

## 4. DAX 基礎(Data Analysis Expressions)

DAX 是 Power BI 用來寫「計算欄位(Calculated Column)」與「量值(Measure)」的公式語言。

```dax
// 計算欄位:每列都會計算一次,存在資料表裡
Total Price = Orders[Quantity] * Orders[UnitPrice]

// 量值:依當前篩選情境動態聚合,效能較好,是 Power BI 的核心武器
Total Revenue = SUM(Orders[Total Price])

Average Order Value = DIVIDE([Total Revenue], DISTINCTCOUNT(Orders[OrderID]))

// 時間智慧函式:計算去年同期營收
Revenue LY = CALCULATE([Total Revenue], SAMEPERIODLASTYEAR(Dim_Date[Date]))

// 成長率
Revenue Growth % = DIVIDE([Total Revenue] - [Revenue LY], [Revenue LY])
```

**量值 vs 計算欄位** 是初學者最常搞混的概念:
- 計算欄位:逐列計算,結果存進資料表,佔用記憶體
- 量值:不存資料,依報表當下的篩選(年份、地區等)即時運算,效能更好、更靈活 —— **能用量值就不用計算欄位**

## 5. 視覺化圖表選型原則

| 想呈現的問題 | 建議圖表 |
|---|---|
| 隨時間變化的趨勢 | 折線圖(Line Chart) |
| 類別之間的比較 | 長條圖(Bar/Column Chart) |
| 部分佔整體的比例 | 圓餅圖 / 環圈圖(謹慎使用,類別超過 5 個就不易讀) |
| 兩個數值變數的關係 | 散佈圖(Scatter Plot) |
| 地理分布 | 地圖(Map) |
| 單一關鍵指標(KPI) | 卡片(Card)/ KPI 視覺效果 |
| 多維度交叉分析 | 矩陣(Matrix)/ 樞紐表 |

**設計原則**:
- 一張報表聚焦 1 個核心問題,不要塞太多圖表
- 用顏色一致性引導閱讀(例如所有圖表都用同一色階代表同一產品線)
- 加上篩選器(Slicer)讓使用者自行探索,而不是每個情境都做一張圖

## 6. 建立互動式儀表板

1. 在報表頁面拖拉欄位到畫布,選擇對應的視覺效果類型
2. 用「篩選器(Slicer)」讓使用者可依日期、地區、產品類別篩選
3. 設定「互動效果」:點一張圖的資料點,其他圖表會自動連動篩選(預設開啟,可在格式設定調整)
4. 用「書籤(Bookmark)」做多情境切換(例如「本月」vs「本年」兩個檢視)
5. 加上「工具提示頁(Tooltip Page)」,滑鼠停留時顯示更豐富的細節圖表

## 7. 發佈與分享

- Power BI Desktop 完成報表後,點「發佈」上傳到 Power BI Service(需要 Power BI 帳號,個人版免費額度足夠練習)
- 可設定「排程重新整理」,讓資料來源更新後報表自動同步(需資料閘道,企業版功能)
- 可用「發佈到網頁」產生公開連結分享(注意:此方式資料是公開的,勿用於機密資料)

## 📁 練習資料集

建議直接使用 Module 2 產生的 `bookstore.db`,或用以下公開資料集練習:
- [Kaggle 開放資料集](https://www.kaggle.com/datasets)
- [台灣政府資料開放平台](https://data.gov.tw/)
- Power BI 官方內建範例資料集(在 Power BI Desktop「取得資料」→「範例」)

## 📖 延伸資源
- [Microsoft Learn：Power BI 官方免費教學](https://learn.microsoft.com/zh-tw/power-bi/)
- [SQLBI](https://www.sqlbi.com/) — DAX 進階教學(英文,業界公認最權威)
- [Power BI 社群論壇](https://community.fabric.microsoft.com/t5/Power-BI/ct-p/powerbi)

## ✅ 完成本模組後
做完 [`exercises.md`](./exercises.md),前往 [Module 4｜ChatGPT API 串接](../04-chatgpt-api/README.md)。
