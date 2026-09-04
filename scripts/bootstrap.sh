#!/usr/bin/env bash
# wind-agent-30 目錄骨架建立腳本
# 用法：在 repo 根目錄執行  bash scripts/bootstrap.sh
set -e

for d in simulator mcp-server mcp-server/tools rag evaluation skill deployment examples docs; do
    mkdir -p "$d"
    touch "$d/.gitkeep"
    echo "created  $d"
done

cat > simulator/README.md << 'INNER'
# simulator

Modbus 虛擬風機。Day 5 建立。

- `simulator.py` 主程式
- `register_map.yaml` 暫存器映射（位址 / 名稱 / 單位 / 換算）
INNER

cat > mcp-server/README.md << 'INNER'
# mcp-server

MCP tools 與安全閘。Day 4, 6-9, 11 建立。

- `server.py` MCP server 進入點
- `tools/` 各工具實作
- `safety.py` 白名單、唯讀閘、二次確認

**所有設備存取預設唯讀。**
INNER

cat > rag/README.md << 'INNER'
# rag

檢索模組。Day 14-18 建立。

- `chunking.py` SOP 切塊
- `bm25_index.py` 關鍵詞檢索
- `vector_index.py` 語意檢索
- `hybrid.py` RRF 融合 + rerank
INNER

cat > evaluation/README.md << 'INNER'
# evaluation

Golden Set 與量化評測。Day 19 建立。

- `golden_set.jsonl` 測試集（至少 20 題）
- `eval.py` Recall@K / MRR 計算

**所有數值必須實際執行取得，不得推估。**
INNER

cat > skill/README.md << 'INNER'
# skill

診斷流程封裝。Day 22 建立。
INNER

cat > deployment/README.md << 'INNER'
# deployment

可攜式部署與環境還原。Day 27-28 建立。
INNER

cat > examples/README.md << 'INNER'
# examples

End-to-End 診斷案例。Day 24-25 建立。

每個案例包含完整輸入、逐步輸出與最終建議。
INNER

echo ""
echo "骨架建立完成。下一步："
echo "  git add ."
echo "  git commit -m 'chore: scaffold project structure'"
