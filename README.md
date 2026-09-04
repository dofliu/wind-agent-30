# wind-agent-30

> An industrial AI agent for wind turbine O&M — from Modbus / OPC UA data acquisition
> to traceable, SOP-grounded fault diagnosis. Built in 30 days.

**2026 iThome 鐵人賽 · Claude AI 組**
系列名稱：《當 AI Agent 走進風機現場：Claude × MCP × 工業維運的 30 天》

---

## 這個專案在回答一個問題

維修人員站在 3 號風機前問：

> **「這台現在怎麼了？我接下來該做什麼？」**

第 1 天，Agent 答不出來。它不知道 PLC 數值、不懂 Alarm 的意義、沒讀過 SOP、
不知道哪些動作不該碰，也不知道自己講的話有沒有依據。

第 30 天，同一個問題，Agent 能完整回答：
讀設備 → 理解狀態 → 找 SOP → 分析 Alarm → 引用依據 → 提出建議 →
**並明確說出哪些事它不會做。**

## 核心設計原則

### Read-only by default

比起「Agent 能做什麼」，工業現場更需要先講清楚**它絕對不該做什麼**。

本專案所有對設備的存取預設唯讀。任何寫入路徑都必須通過白名單，
且需要人類工程師二次確認。這不是限制，這是工業 AI 的前提。

### 分層職責

| 層 | 角色 | 對應目錄 |
|---|---|---|
| Claude | Agent Runtime | — |
| MCP | hands（碰真實世界） | `mcp-server/` |
| RAG | memory（知道過去與規範） | `rag/` |
| Skill | procedure（固定流程） | `skill/` |
| 領域知識 | expertise（判斷什麼合理） | `docs/` |
| **人類工程師** | **authority（誰有權決定）** | `mcp-server/safety.py` |

### 沒有評測就沒有工程

檢索效果一律以 Golden Set 量化（Recall@K / MRR），見 `evaluation/`。
本專案不接受「看起來還不錯」作為結論。

---

## 目錄結構

```
wind-agent-30/
├─ simulator/          Modbus 虛擬風機
├─ mcp-server/         MCP tools 與安全閘
│  ├─ tools/
│  └─ safety.py        白名單、唯讀閘、二次確認
├─ rag/                切塊、BM25、向量、混合檢索
├─ evaluation/         Golden Set 與評測腳本
├─ skill/              診斷流程封裝
├─ deployment/         可攜式部署與環境還原
├─ examples/           End-to-End 診斷案例
├─ docs/               架構文件與領域知識
└─ scripts/            輔助腳本
```

## 快速開始

```bash
git clone https://github.com/<your-account>/wind-agent-30.git
cd wind-agent-30
python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python simulator/simulator.py                   # 啟動虛擬風機
```

MCP server 設定方式見 `docs/setup.md`。

---

## 30 天進度

每天更新一列。**「Agent 多了什麼」答不出來的那天，那篇就不該存在。**

| Day | 主題 | Agent 多了什麼 | Tag |
|---|---|---|---|
| 01 | 問題與架構 | — | `day01-architecture` |
| 02 | Claude / MCP / PLC 的角色 | — | `day02-roles` |
| 03 | 可重現的工控環境 | 別人跑得起來 | `day03-env` |
| 04 | 第一個 MCP Server | 會呼叫工具 | `day04-first-mcp` |
| 05 | Modbus 虛擬風機 | 有設備可讀 | `day05-simulator` |
| 06 | `get_turbine_status` | 讀得到即時值 | `day06-read` |
| 07 | 工業資料契約 | 知道 80 是什麼單位 | `day07-data-contract` |
| 08 | Tool granularity | 工具切得剛好 | `day08-granularity` |
| 09 | 錯誤處理 | 斷線時不會亂猜 | `day09-failure` |
| 10 | Modbus vs OPC UA | 懂協定語意差異 | `day10-protocol` |
| 11 | **Read-only 安全閘** | 知道什麼不能做 | `day11-safety` |
| 12 | Data ≠ Knowledge | — | `day12-gap` |
| 13 | **Alarm ≠ Root Cause** | — | `day13-rootcause` |
| 14 | SOP chunking | 文件可被檢索 | `day14-chunking` |
| 15 | BM25 | 查得到 Alarm Code | `day15-bm25` |
| 16 | 向量檢索的工業盲點 | 知道自己會漏什麼 | `day16-blindspot` |
| 17 | Hybrid + RRF | 語意與代碼兼顧 | `day17-hybrid` |
| 18 | Rerank | 對的文件排第一 | `day18-rerank` |
| 19 | **Golden Set 評測** | 效果可被量化 | `day19-eval` |
| 20 | `explain_alarm` | 回答有依據可追溯 | `day20-citation` |
| 21 | Skill 與 MCP 的分界 | — | `day21-boundary` |
| 22 | 診斷 Skill 封裝 | 流程可重複執行 | `day22-skill` |
| 23 | Grounding 與拒答 | 不知道時會說不知道 | `day23-grounding` |
| 24 | **End-to-End 診斷** | 全鏈路打通 | `day24-e2e` |
| 25 | 感測值與 SOP 衝突 | 矛盾時會升級給人 | `day25-conflict` |
| 26 | 主動告警 | 會主動通知工程師 | `day26-alert` |
| 27 | 可攜式部署 | 換台電腦還能跑 | `day27-deploy` |
| 28 | 多人課堂部署 | 20 人同時能用 | `day28-classroom` |
| 29 | 十個坑 | — | `day29-pitfalls` |
| 30 | **回答 Day 1 的問題** | 完整回答 | `day30-final` |

---

## 資料性質聲明

本專案所有公開資料均為**自建模擬資料（Synthetic / Simulated Data）**
或可公開取得之語料，不含任何未公開的實驗資料、廠商專有手冊或營運方資料。

所有效能數值（Recall、MRR、Latency、Ranking、觸發率）皆為實際執行結果，
未使用推估值。圖表均標示資料性質。

## 授權

- **程式碼**：Apache License 2.0，見 [LICENSE](LICENSE)
- **文件與資料集**：另行標示，見各目錄說明

## 引用

本專案支援標準引用格式，見 [CITATION.cff](CITATION.cff)。

## 補助

見 [NOTICE](NOTICE)。
