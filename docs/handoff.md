# Handoff：EMS 分散式製造 Digital Twin Demo Site（Web3D + 浮動 Dashboard）

> 版本 v0.1 · 2026-10-30 · 給 Claude Code 實作用
> 性質：**Demo / 展示用**，全部假資料，不接真實設備。目的是讓客戶「一眼看懂分散式製造 + 物流 + 產線如何連成一張圖」。

---

## 0. 一句話目標

一個純前端網站：從**全球據點地圖**一路縮放到**單一 SMT 線的機台**，3D 場景裡貨物、板子、AGV 在動，畫面上方浮著可拖曳的 dashboard 面板，即時顯示由瀏覽器端模擬器產生的 PQM 與物流數據，並能「注入事件」（某廠機台故障、港口塞港）看到產能被重新分配。

## 1. 範圍

### 要做
- 四層視角（L0–L3，見 §4），滑順轉場
- 瀏覽器端離散事件模擬器（seeded，可重播），產生假的生產與物流事件
- 浮動 dashboard（可拖曳、縮放、收合、釘選），內容跟著目前選取的據點／線／機台切換
- 情境注入面板：3–4 個預設劇本（§5.4）
- 資產管線腳本：下載 → 轉換 → 最佳化 → 產生 `ATTRIBUTION.json`
- App 內 Credits 頁（CC-BY 授權要求）

### 不做
- 後端、資料庫、登入
- 真實 CFX／Modbus 接入（但事件 schema 要長得像 IPC-CFX，之後可替換資料源）
- 物理模擬、碰撞
- 行動版完整體驗（平板以上可用即可；手機只要不壞）

## 2. 技術選型（建議，可調）

| 層 | 選擇 | 理由 |
|---|---|---|
| 建置 | Vite + TypeScript | 單頁、靜態輸出 |
| 3D | three.js（vanilla，不用 R3F） | 控制 instancing／LOD 較直接 |
| GLB 載入 | `GLTFLoader` + `MeshoptDecoder` + `KTX2Loader` | SimReady GLB 用 meshopt + webp |
| 相機 | `camera-controls` | 平滑 fly-to |
| 圖表 | uPlot（時序）+ 少量手刻 SVG（gauge、sparkline） | 輕、快 |
| 面板 | 自刻 floating panel（pointer events），不引 UI 框架 | 面板就是 demo 的主角之一，要可控 |
| 模擬 | 自寫 discrete-event sim，跑在 Web Worker | 不卡主執行緒 |
| 部署 | Cloudflare Pages（靜態） | GLB 放 R2 或同 repo `public/assets` |

**設計系統**：這是產品畫面 mockup，用自己的一套 token（深色 control-room 風），**不要**套 imitator 的報告樣式。

## 3. 故事設定（假資料的世界觀）

三個據點 + 兩個倉儲節點，示範「就近生產、跨廠調度」：

| 代號 | 地點（虛構廠名） | 角色 | 3D 內容 |
|---|---|---|---|
| TW-HQ | 台灣桃園 | NPI、高階主板 SMT、全球調度中心 | 2 條 SMT 線 + 原料倉 |
| TH-01 | 泰國 | 量產 SMT | 4 條 SMT 線 + 成品倉 |
| MX-01 | 墨西哥 | FATP／CTO，貼近北美客戶 | 組裝線 + 出貨倉 |
| HUB-SG | 新加坡 | 區域物流樞紐 | 只在 L0 顯示 |
| HUB-LA | 美西 | 北美配送中心 | 只在 L0 顯示 |

產品：3 個虛構 SKU（伺服器主板、電源控制板、邊緣運算模組），各自有 BOM 與途程（哪些據點能做）。

## 4. 視角層級

### L0 全球視角
- 簡化地球或平面世界地圖（自己用 GeoJSON 畫海岸線，不要用需授權的地圖圖磚）
- 據點用發光柱體，高度＝當前 UPH，顏色＝OEE 狀態
- 航線／空運線用 arc + 流動粒子，粒子密度＝在途量
- 面板：全球 KPI（總產出、準交率、在途天數、各廠 OEE）

### L1 廠區視角
- 廠房外殼（程式產生：地板、牆、柱、屋頂半透明），內部分區：收料區、原料倉、SMT 區、成品倉、出貨月台
- 倉儲區：貨架 + 棧板 + 紙箱（instanced）、AGV／堆高機沿路徑移動
- 面板：倉儲水位、收發貨、AGV 任務、各線狀態卡片

### L2 產線視角（SMT 線）
- 典型線段：Loader → 錫膏印刷 → SPI → 貼片機 ×2 → 回焊爐 → AOI → Unloader
- 板子在輸送帶上移動（instanced 小方塊，加 PCB 綠色貼圖）
- 每台機台頂部有狀態燈（綠／黃／紅／藍=換線）
- 面板：該線 CT 分解、UPH 趨勢、良率、Top 3 異常

### L3 機台卡片
- 點選機台 → 相機 fly-to + 外框高亮 + 浮動「機台卡」：狀態、當前工單、CT、近 1 小時告警、假的 SPC 圖
- 卡片可「釘選」留在畫面上，切換視角後仍保留

## 5. 模擬器與假資料

### 5.1 原則
- **確定性**：`seed + scenario` 決定一切，同樣輸入同樣輸出（展示時可重播）
- **時間倍率**：1× / 10× / 60× / 暫停
- 在 Web Worker 執行，每個 tick 用 `postMessage` 送出狀態快照；主執行緒只負責畫

### 5.2 事件 schema（仿 IPC-CFX 命名，方便日後換成真資料）

```ts
type SimEvent =
  | { type: 'WorkStarted';     ts: number; site: string; line: string; station: string; unitId: string; sku: string }
  | { type: 'WorkCompleted';   ts: number; site: string; line: string; station: string; unitId: string; result: 'Pass'|'Fail'; ctSec: number }
  | { type: 'FaultOccurred';   ts: number; site: string; line: string; station: string; code: string; severity: 1|2|3 }
  | { type: 'FaultCleared';    ts: number; site: string; line: string; station: string; code: string }
  | { type: 'MaterialsLoaded'; ts: number; site: string; line: string; station: string; partNo: string; qty: number }
  | { type: 'UnitsDeparted';   ts: number; site: string; to: string; mode: 'Sea'|'Air'|'Truck'; qty: number; sku: string; eta: number }
  | { type: 'UnitsArrived';    ts: number; site: string; from: string; qty: number; sku: string }
  | { type: 'AgvTask';         ts: number; site: string; agvId: string; from: string; to: string; state: 'Assigned'|'Moving'|'Done' };
```

### 5.3 衍生指標（主執行緒或 worker 內滾動計算）
- PQM：CT、UPH、FPY、OEE（A×P×Q）
- 物流：在途量、ETA、準交率、倉儲水位、AGV 利用率
- 每個指標都要有 1 小時滾動視窗，dashboard 的 sparkline 用它

### 5.4 情境劇本（注入面板一鍵觸發）
1. **TH-01 回焊爐故障**：Line 3 停 2 小時 → 泰國產出下降 → 調度把一部分工單轉給 TW-HQ → 空運量上升、成本指標變紅
2. **塞港**：新加坡樞紐延誤 5 天 → 北美準交率下降 → MX-01 成品倉水位下降
3. **新品導入（NPI）**：TW-HQ 換線，貼片機進入換線狀態（藍燈）→ 良率爬坡曲線
4. **需求暴增**：某 SKU 訂單 ×2 → 三廠同時拉高，倉儲水位與 AGV 利用率飆升

每個劇本要在畫面上有明顯的「因 → 果」視覺連動（例如紅燈機台 → 線面板變紅 → 全球柱體變矮 → 航線粒子變多）。這是 demo 的核心賣點。

## 6. 浮動 Dashboard 規格

- 面板元件：`<FloatPanel title pinned collapsed x y w h>`，可拖曳標題列、右下角縮放、雙擊收合
- 面板佈局存 `localStorage`（try/catch 包起來，失敗就用預設佈局）
- 預設佈局：左上全域 KPI、右側上下文面板（跟著選取物件換內容）、下方時間軸 + 情境注入
- 面板與 3D 物件之間畫一條細引線（leader line），讓觀眾知道面板在講哪台機器
- 所有數字用 tabular-nums，變化時短暫閃爍
- 顏色語意固定：綠＝正常、黃＝警告、紅＝停機／異常、藍＝換線／計畫停機、灰＝離線

## 7. 3D 資產盤點與取得計畫

### 7.1 結論

**沒有一個免費可商用的來源能單獨湊齊 EMS 場景。** 物流倉儲類資產夠用；**SMT 機台（印刷機、貼片機、回焊爐、AOI）在免費可商用的來源中幾乎找不到**，建議用程式產生（§7.4）。

### 7.2 可用來源

| 來源 | 授權 | 格式 | 可拿來做什麼 | 備註 |
|---|---|---|---|---|
| [codepawl/simready-glb](https://huggingface.co/datasets/codepawl/simready-glb)（NVIDIA SimReady 轉檔） | CC BY 4.0（原作 NVIDIA） | GLB（meshopt + webp） | 紙箱 100+ 款、圍欄、安全門、垃圾桶、空壓機、各類工業道具 | 社群轉檔，10/29 修過兩輪 bug，要抽查；面數高，要減面 |
| [projectsim/industrial-parts-and-packaging](https://huggingface.co/datasets/projectsim/industrial-parts-and-packaging) | CC BY 4.0 | USD + **GLB** | 50 款棧板貨架（pallet racking） | 直接有 GLB，倉儲區主力 |
| [Kenney Conveyor Kit](https://kenney-assets.itch.io/conveyor-kit) | CC0 | 下載後確認（Kenney 通常含 GLB/FBX/OBJ） | 60+ 件輸送帶、工廠、倉儲模組 | 低面數、單一色票貼圖，**輸送帶首選** |
| [3dmodelscc0 Industrial Pack](https://3dmodelscc0.itch.io/free-cc0-industrial-3d-models) | CC0 | 下載後確認（RAR） | 油壓拖板車、平台推車、電箱、工作燈、線軸 | 寫實風，12 件 |
| Vertiv/simready-assets | CC BY 4.0 | USD（需自轉 GLB） | 機櫃、配電、空調 | 若 demo 要帶機房／廠務可用 |
| Robotiq、Standard Bots SimReady | CC BY 4.0 | USD（需自轉） | 夾爪、協作手臂（FATP 段點綴） | UR／FANUC 授權未確認，**先不用** |

### 7.3 不要用的來源
- **imagine.io PhysicalAI-SimReady-Assets、Lightwheel**：CC BY-NC，不可商用
- **SketchUp 3D Warehouse**（例如「Basic SMT Assembly Line」）：授權禁止單獨散布模型檔，網站直接提供 GLB 下載有疑慮
- **Needle USD runtime**：PolyForm Noncommercial
- CGTrader 等付費站的 PCB 產線模型：要付費且授權各異，demo 階段不碰

### 7.4 缺口：SMT 機台改用程式產生

做一個 `MachineFactory`，用參數產生風格化機台，**比找模型更快，而且風格一致**：

- 基礎：圓角機殼（`RoundedBoxGeometry`）+ 前方觀察窗（半透明）+ 頂部三色燈塔 + 側面操作 HMI 面板（小平面 + canvas 貼圖顯示假畫面）
- 各機種參數差異：

| 機種 | 尺寸感 | 特徵 |
|---|---|---|
| Loader／Unloader | 窄、高 | 料匣架 |
| 錫膏印刷機 | 中 | 頂部刮刀橫桿動畫 |
| SPI／AOI | 中、矮 | 頂部相機頭來回移動 |
| 貼片機 | 長、寬 | 前方 feeder 排（instanced 小料盤）、內部龍門頭動畫 |
| 回焊爐 | 很長、扁 | 側面溫區色條（由藍到紅），表面熱暈 shader |

- 一律加上 `userData.stationId`，給點選與資料綁定用
- 配色走自己的設計系統，不模仿任何真實廠牌外觀與 logo

**廠房外殼、地板標線、走道、月台、貨車**也一律程式產生。

### 7.5 資產管線（`scripts/assets/`）

1. `manifest.yaml`：列出每個要用的資產（來源 URL、授權、原作者、在場景中的用途）
2. `fetch.py`：依 manifest 下載（HF 用 `huggingface_hub`；itch.io 手動下載後放 `raw/`）
3. `convert.py`：USD → GLB（`usd-core` + 自寫 mesh 輸出，或 Blender headless）；已是 GLB 的跳過
4. `optimize.sh`：`gltf-transform` → dedup、prune、weld、**simplify（目標每件 ≤ 20k 三角面）**、meshopt、貼圖縮到 512–1024 px webp
5. `attribution.py`：從 manifest 產生 `public/ATTRIBUTION.json`，app 的 Credits 頁讀它

**第一步先跑盤點**：抓 `codepawl/simready-glb` 的 `thumbs/metadata.jsonl` 與 `manifest.jsonl`，依 category 列出所有與倉儲、工廠、物流相關的資產（棧板、推車、貨架、托盤、塑膠箱、工具、工作台、安全標誌、照明），輸出成 `asset-inventory.md` 附縮圖，**給我挑過再進 manifest**。這一步我在對話環境裡抓不到完整清單，所以交給你。

## 8. 效能預算

- 同畫面可見三角面 ≤ 1.5M（中階筆電內顯要能 ≥ 45 fps）
- 重複物件（紙箱、棧板、板子、料盤）一律 `InstancedMesh`
- L0 不載入任何廠內資產；進入 L1 才 lazy load 該廠資產
- 首屏（L0）傳輸 ≤ 5 MB；單一廠資產包 ≤ 25 MB
- 提供「低畫質」開關：關陰影、關後處理、降 pixel ratio

## 9. 專案結構（建議）

```
/src
  /scene        # three.js 場景、相機、各層 view
  /machines     # MachineFactory（程式產生 SMT 機台）
  /building     # 廠房、倉儲、路徑
  /sim          # worker、事件 schema、劇本、指標計算
  /ui           # FloatPanel、圖表、注入面板、Credits
  /data         # 據點、SKU、BOM、途程、路徑（靜態 JSON）
/public/assets  # 最佳化後的 GLB
/public/ATTRIBUTION.json
/scripts/assets # 資產管線
```

## 10. 里程碑

| 階段 | 內容 | 驗收 |
|---|---|---|
| P0 | 資產盤點 `asset-inventory.md` + manifest 草稿 | 我挑完清單 |
| P1 | L2 單條 SMT 線：程式產生機台 + 輸送帶 + 板子流動 + 一個浮動面板（假數字） | 單線畫面可展示 |
| P2 | 模擬器 worker + 事件 schema + PQM 指標，面板改吃模擬資料 | 時間倍率、暫停、重播一致 |
| P3 | L1 廠區（倉儲、AGV 路徑）+ L3 機台卡 + 釘選 | 點選 → fly-to → 卡片 |
| P4 | L0 全球視角 + 航線粒子 + 跨廠調度邏輯 | 三廠同時跑 |
| P5 | 四個情境劇本 + 因果連動視覺 + Credits 頁 + 部署 | 劇本 1 從觸發到全球指標變化 ≤ 10 秒（60× 下） |

每個階段結束都要能部署成可點開的網址，不要等到最後才整合。

## 11. 待我決定的事

- 三個據點的實際國家要不要換（目前：台灣／泰國／墨西哥）
- 是否要帶一個「機房／廠務」場景（用 Vertiv 資產）
- 品牌名稱與 logo（demo 是否掛公司名）
- 部署網域

## 12. 參考

- SimReady 資產與授權：https://huggingface.co/blog/nvidia/simready-central-assets-robotics-ai-factories
- SimReady GLB 轉檔流程與 three.js 載入：https://huggingface.co/datasets/codepawl/simready-glb
- 瀏覽器直讀 USD 的比較（結論：預轉 GLB）：https://huggingface.co/datasets/cfahlgren1/simready-usd-web-viewers
- CAD→USD 與 connection points 規範：https://github.com/NVIDIA-Omniverse/aif-pipeline-samples
