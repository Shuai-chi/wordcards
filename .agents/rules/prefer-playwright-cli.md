# Prefer Playwright CLI over Manual Browser Testing

當需要驗證網頁功能或進行測試時，**必須優先使用 Playwright CLI (例如：`npx playwright test`)** 來執行既有的測試套件。

## 為什麼要這樣做？
1. **加快驗證速度**：直接執行測試腳本比手動透過工具打開瀏覽器、導覽、點擊來得快很多。
2. **節省 Token**：手動控制瀏覽器會產生大量的截圖和事件日誌，消耗極大量不必要的 Token 資源。
3. **穩定性與重現性**：既有的 Playwright 測試內建了完善的 `waitFor` 機制，能夠穩定且準確地驗證 UI 狀態。

## 執行方式
不需要呼叫 `browser_subagent` 或其他手動控制瀏覽器的工具，直接利用 `run_command` 工具於終端機執行：
```bash
npx playwright test
```
如果有特定情境未涵蓋在既有測試中，應考慮新增 Playwright 測試案例（放在 `tests/` 目錄），而不是手動驅動瀏覽器。
