# NEXUS / simreadyornot

依照 [docs/handoff.md](docs/handoff.md) 製作的分散式製造數位孿生展示。純前端、繁體中文介面，所有事件與數據均為模擬資料。

## 開發

Node.js 24、npm 11。直接使用目前 checkout；雲端工作環境已隔離，無需建立 worktree。

```sh
npm ci
npm run dev -- --port 5173
```

```sh
npm test                 # 8 個模擬器測試
npm run build            # 型別檢查 + GitHub Pages 靜態網站 → dist/
npm run build:review     # 可直接開啟的單檔 HTML → dist-review/index.html
npm run test:browser     # Chromium 瀏覽器測試；先啟動開發伺服器並建立 review build
```

瀏覽器測試預設使用 `/usr/bin/chromium`，可用 `CHROMIUM_PATH` 指定其他已安裝的 Chromium。截圖輸出至 `/workspace/artifacts`；獨立 HTML 測試只提供一份文件，封鎖所有額外網路請求；受管理瀏覽器封鎖 file: 導航，因此無法在此驗證雙擊開檔。

## 展示操作

- L0 全球網絡 → 點據點進入 L1 廠區 → 點產線進入 L2 → 點機台進入 L3。
- 廠區畫面隱藏全球 KPI 欄，專注模型；「展開場景」可收起右側資訊欄。資訊欄預設停靠，不互相覆蓋；雙擊標題收合，◇ 釘選機台卡。原料倉／成品倉按鈕可近看 SimReady 模型。
- 1× / 10× / 60×、暫停、修改 seed 與重播。相同 seed 與相同虛擬時間的事件注入會產生相同結果。
- 四種劇本可疊加；重播會清除劇本並重設模擬器。初始數分鐘為實際模擬暖機期，產量從零開始。
- 右上「資產與授權」顯示本版出處。九種倉儲及配套設備使用 NVIDIA SimReady GLB；SMT 機台、AMR、PCB 與廠房由 Blender 補足。模型隨網站提供，不需執行時連線外部模型服務。

## GitHub Pages

`.github/workflows/pages.yml` 在推送至 `main` 或手動執行時，先跑模擬器測試與建置，再部署 `dist/`。在 repository 的 **Settings → Pages → Source** 選擇 **GitHub Actions**。建置採相對資產路徑，適用 `/simreadyornot/` 專案子目錄。

網站網址：https://clarencechien.github.io/simreadyornot/ 。推送 main 後由 GitHub Actions 自動建置與部署；部署狀態可在 repository 的 Actions 頁面查看。

## 實作與限制

詳見 [docs/implementation.md](docs/implementation.md)、[asset-inventory.md](asset-inventory.md)。模型管線位於 `scripts/assets/`，來源與授權見 `public/ATTRIBUTION.json`。單檔 HTML 將 Worker、程式、樣式與 Credits 全部內嵌，可離線開啟。

重建 SimReady 資產：`python3 scripts/assets/fetch.py` → `python3 scripts/assets/prepare_simready.py` → `node scripts/assets/audit.mjs`。日常 `npm ci` / 建置使用已保存的最佳化 GLB，不需重新下載。
