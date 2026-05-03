# SRS Web App — Project Manifest

> [!NOTE]
> 此專案由 **Claude Code** 與 **Gemini CLI** 共同管理。
> 根目錄共享規則請見 `../AGENTS.md`。

## 專案概覽

SRS 詞卡網頁應用，由 React + Vite 建構。與根目錄的 `Corpus_Data/` 資料庫和 `SRS_Outputs/` 產出目錄連動。

## 關鍵結構

| 路徑 | 說明 |
|:---|:---|
| `src/` | React 原始碼 |
| `public/` | 靜態資源 |
| `package.json` | Node 相依性 (npm) |
| `../Corpus_Data/` | 語料庫 DB (外部依賴) |
| `../SRS_Outputs/` | CSV 產出 (外部依賴) |

## 開發指令

- `npm run dev` — 啟動開發伺服器
- `npm run build` — 建置 production 版本
- `npm run preview` — 預覽 production build

## 雙工具注意事項

- Code gen 請使用前端框架最佳實踐，不引入多餘依賴
- 不要直接修改根目錄的 `CLAUDE.md` 或 `.gemini/GEMINI.md`
- MCP 伺服器在 `../youtube-mcp/`，如需操作請在根目錄啟動
