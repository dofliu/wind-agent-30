# Setup

## 環境需求

- Python 3.11+
- Windows / macOS / Linux

## 安裝

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

## 版本鎖定說明

`pymodbus` 3.x 與 2.x 的 API 有破壞性變更（例如 `unit=` 改為 `slave=`），
本專案鎖定版本以確保可重現。**不要自行升級 pymodbus。**
詳見 Day 3 與 Day 9。

## 啟動虛擬風機

```bash
python simulator/simulator.py
```

預設監聽 `127.0.0.1:5020`。暫存器映射見 `simulator/register_map.yaml`。

## 設定 MCP Server

（Day 4 補完）

## 常見問題

（Day 9、Day 27 累積）
