---
name: corpus-enricher
description: 供應端 (Corpus-Enricher)：負責挖掘多源真值數據，進行語境精煉與語料庫標準化。
---

# Corpus-Enricher (Mining & Refinement Engine) v13.1

## 0. 核心限制與節流規則 (CRITICAL)
**【最高優先級：執行任何採礦任務前必須閱讀】**

### A. 負載與併發控制 (Single Queue)
- **單一隊列**：每次僅限處理 **1 部** 影片。嚴格禁止並行 (Parallel) 抓取或寫入，以防止 SQLite 資料庫發生 `database is locked` 錯誤。
- **資料庫路徑**：`Corpus_Data/my_corpus_vault.db`。
- **腳本路徑**：所有執行腳本必須位於 `.gemini/skills/corpus-enricher/bin/`。

### B. 精煉門禁 (Quality Gate)
- **字數限制**：所有寫入 `master_sentences` 表的句子，其長度必須 **$\ge$ 5 個單字**。不符標者應在入庫前由精煉腳本自動濾除。
- **清洗規則**：必須去除 Filler words (um, ah) 與 YouTube 頻道廣告詞。

## 1. 採礦執行工具 (Mining Engine Architecture)
- **【憲法級限制：429 熔斷與24小時鎖定 (Constitutional Circuit Breaker & 24h Lockout)】**：
  - 不論使用主方案還是備援方案，只要收到 `429 Too Many Requests` 錯誤或連續 2 次抓取失敗，所有程式必須**立即暫停 (Halt)**，絕對禁止繞過機制或繼續請求。
  - **24小時強制冷卻**：系統將寫入 `.daemon_lockout` 鎖定檔。在 24 小時內，任何 Agent 嚴禁重啟抓取任務，並須在使用者要求時回報剩餘的鎖定時間。

- **[Primary] 官方主線方案 (Daemon Miner Script)**：
  - **預設狀態**：**啟動 (Active)**
  - **執行方式**：這是一支全自動的 Python 背景守護進程，使用第三方套件 (`youtube-transcript-api`) 抓取字幕，並由演算法完成標點修復與 SQLite 入庫，完全繞過 LLM 以避免超時與同質化。
  - **智慧冷卻機制**：每次成功抓取後，強制隨機冷卻 **45 至 75 秒**，以降低遭 YouTube 封鎖 IP 的機率。
  - **啟動指令**：`python3 /mnt/c/Users/qwfgh/Projects/.gemini/skills/corpus-enricher/bin/daemon_miner.py &`

- **[Backup] 備援方案 (LLM MCP 抓取)**：
  - **預設狀態**：**關閉 (Disabled)**
  - **啟用條件**：除非使用者修改此技能檔案並明確指示切換至備援方案，否則嚴禁呼叫。
  - **【🚨 若啟用此方案之災難防禦 (CRITICAL SOP)】**：
    - **禁止大腦運算**：絕對禁止任何 Agent 或子代理使用 LLM 進行標點符號修復。
    - **標準安全工作流**：使用 `youtube_get_transcript` 獲取後，必須無損落地至 `tmp_transcript_raw.txt`，再由專用腳本切分，最後透過絕對路徑 `/mnt/c/Users/qwfgh/Projects/.gemini/skills/corpus-enricher/bin/ingest_mcp_transcript.py` 入庫。
- **資料庫檢查**：`python3 .gemini/skills/corpus-enricher/bin/main_pipeline.py` 可查看當前庫存統計。
- **Level 6 提取**：`python3 .gemini/skills/corpus-enricher/bin/extract_lv6.py`。
- **資料入庫**：抓取後必須整合至 `master_sentences` 表。

## 2. 語料庫蒸餾與優化 (Corpus Distillation & Optimization)
- **觸發條件**：當使用者要求「優化語料庫」、「清理雜訊」、「執行蒸餾」或任何涉及語料清洗的任務時。
- **大管家標準作業程序 (Distillation SOP)**：
  1. **載入計畫書**：大管家必須優先尋找並使用 `read_file` 讀取 `.gemini/plan/[Pending]_corpus_distillation.md`。
  2. **嚴格調度與監控 (Monitor-Only)**：大管家將計畫書重新命名為 `[Running]_corpus_distillation.md`，並嚴格遵循計畫書內的路標 (Phase 1 -> Phase 4) 依序呼叫腳本執行。每完成一步必須在計畫書中打勾 `[x]`。
  3. **【🚨 算力保護與禁止代打 (No AI Override)】**：大管家的核心職責**僅限於排程、監控與打勾**。蒸餾任務本身是交由本地算力與腳本完成。若腳本執行失敗、或本地模型 (如 `llama-server`) 發生連線錯誤/OOM，大管家**絕對禁止**親自動用 API 算力（自己的 Context 或 Token）去代為處理或評分語料。若發生錯誤，必須立即將狀態變更為 `[Paused-Fixing]`，中止進程，並等待使用者手動排除。
  4. **永續循環設計 (Self-Resetting Plan)**：當執行到最後一個階段（Phase 4），大管家必須主動清除計畫書內所有已打勾的狀態（將 `[x]` 恢復為 `[ ]`），並將檔名改回 `[Pending]_corpus_distillation.md`，以確保下一次觸發蒸餾技能時，計畫書處於乾淨的初始狀態，避免出現「已執行過而無法再次執行」的邏輯死鎖。
