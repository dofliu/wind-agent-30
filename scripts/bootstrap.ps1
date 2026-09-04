# wind-agent-30 目錄骨架建立腳本
# 用法：在 repo 根目錄執行  powershell -ExecutionPolicy Bypass -File scripts\bootstrap.ps1

$dirs = @(
    "simulator",
    "mcp-server",
    "mcp-server/tools",
    "rag",
    "evaluation",
    "skill",
    "deployment",
    "examples",
    "docs",
    "scripts"
)

foreach ($d in $dirs) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d -Force | Out-Null
        Write-Host "created  $d"
    }
    $keep = Join-Path $d ".gitkeep"
    if (-not (Test-Path $keep)) {
        New-Item -ItemType File -Path $keep -Force | Out-Null
    }
}

# 各目錄的用途說明
$readmes = @{
    "simulator"   = "# simulator`n`nModbus 虛擬風機。Day 5 建立。`n`n- ``simulator.py`` 主程式`n- ``register_map.yaml`` 暫存器映射（位址 / 名稱 / 單位 / 換算）"
    "mcp-server"  = "# mcp-server`n`nMCP tools 與安全閘。Day 4, 6-9, 11 建立。`n`n- ``server.py`` MCP server 進入點`n- ``tools/`` 各工具實作`n- ``safety.py`` 白名單、唯讀閘、二次確認`n`n**所有設備存取預設唯讀。**"
    "rag"         = "# rag`n`n檢索模組。Day 14-18 建立。`n`n- ``chunking.py`` SOP 切塊`n- ``bm25_index.py`` 關鍵詞檢索`n- ``vector_index.py`` 語意檢索`n- ``hybrid.py`` RRF 融合 + rerank"
    "evaluation"  = "# evaluation`n`nGolden Set 與量化評測。Day 19 建立。`n`n- ``golden_set.jsonl`` 測試集（至少 20 題）`n- ``eval.py`` Recall@K / MRR 計算`n`n**所有數值必須實際執行取得，不得推估。**"
    "skill"       = "# skill`n`n診斷流程封裝。Day 22 建立。"
    "deployment"  = "# deployment`n`n可攜式部署與環境還原。Day 27-28 建立。"
    "examples"    = "# examples`n`nEnd-to-End 診斷案例。Day 24-25 建立。`n`n每個案例包含完整輸入、逐步輸出與最終建議。"
}

foreach ($k in $readmes.Keys) {
    $path = Join-Path $k "README.md"
    if (-not (Test-Path $path)) {
        Set-Content -Path $path -Value $readmes[$k] -Encoding UTF8
        Write-Host "created  $path"
    }
}

Write-Host ""
Write-Host "骨架建立完成。下一步：" -ForegroundColor Green
Write-Host "  git add ."
Write-Host "  git commit -m 'chore: scaffold project structure'"
