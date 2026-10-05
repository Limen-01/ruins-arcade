# 遺跡閃避遊戲

這是以 Phaser 3、嚴格 TypeScript 與 Vite 製作的本機五階段閃避遊戲。依序挑戰弩箭、落雷、獸首火焰、地面火焰、混合機關。每關由有限波次組成；生存時間就是成績。關卡持續到角色死亡，之後保留本關時間並進入下一關。第五關死亡後顯示五關總生存時間。

## 執行

需要 Node.js 20.19 以上。依序執行：

```powershell
npm ci
npm run dev
```

在 Vite 顯示的本機網址開啟遊戲。觸控放開一次移動一格；桌面可用方向鍵或 WASD。遊戲可暫停，音效與震動可分別切換。

## 驗證與正式版預覽

```powershell
npm run typecheck
npm test
npm run build
npm run preview -- --port 4173
```

保持預覽伺服器執行，再開另一個終端機：

```powershell
npm run test:browser -- --reporter=list
```

正式版的 service worker 會快取必要檔案供離線重載。本機瀏覽器測試涵蓋快取後離線重載；實體手機手感、硬體震動與行動瀏覽器仍須人工驗收。

## GitHub Pages

推送到 `main` 後，[Pages 工作流程](.github/workflows/pages.yml)會以 `/ruins-arcade/` 為正式 base path，使用鎖定依賴執行規則測試與型別檢查，建置 `dist` 並部署靜態成品。可在本機用相同路徑驗證：

```powershell
npm run build:pages
npm run preview:pages
```

開啟 `http://127.0.0.1:4173/ruins-arcade/`。Manifest、service worker、離線資產清單與所有素材皆以部署 scope 的相對路徑解析。

最新版規格為 [v1.7 生存時間與交疊攻擊修訂](docs/REVISION_V1_7.md)。[產品規格](docs/PRODUCT_SPEC.md)與[架構](docs/ARCHITECTURE.md)保留舊版內容；衝突處以最新版修訂為準。[進度與證據](docs/PROGRESS.md)記錄驗證結果。
