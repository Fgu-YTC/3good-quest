# 三好關卡（3good-quest）

好玩優先的**線上單機**情境選擇遊戲。AI 夥伴「小好」是主線軍師：每一幕都要先請示 AI、取得推薦行動後才解鎖選項；通關時再由 AI 產出個人化結算短評。同時累積三好分數與四給成就。

適合 [三好 AI 創新應用競賽](https://3goodai.fgu.edu.tw/) 社會組 B 類（AI 數位應用實作）展示與延伸開發。

## 開源聲明

本專案以 **MIT License** 釋出：任何人皆可使用、修改、散佈與商用，只要保留版權與授權聲明。

- 遊戲劇情、知識卡、角色「小好」皆為**原創內容**。
- **API Key 與雲端費用由部署者自備**；請勿把金鑰寫進程式碼或 commit 到 Git。

## 功能

- **AI 主線**：每幕「請示小好 → 解鎖行動 → 選擇（可採納／可反抗建議）」
- **AI 結算短評**：依分數、四給、選擇摘要生成
- 第一關多結局；可挑戰四給全開
- 三好計分板 + 四給收集板
- 無 API Key／額度用盡時降級為內建軍師，關卡仍可玩完
- 免登入；進度存在瀏覽器 `localStorage`
- IP 速率限制，降低金鑰被刷風險

## 快速開始

```bash
npm install
cp .env.example .env.local
# 編輯 .env.local，填入 OPENAI_API_KEY（可選；不填也能玩關卡）
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。

### 環境變數

見 [`.env.example`](.env.example)。重點：

| 變數 | 說明 |
|------|------|
| `OPENAI_API_KEY` | 伺服器端金鑰（勿公開） |
| `OPENAI_BASE_URL` | 預設 OpenAI；可改相容端點 |
| `OPENAI_MODEL` | 預設 `gpt-4o-mini` |
| `RATE_LIMIT_PER_MINUTE` / `RATE_LIMIT_PER_DAY` | 防濫用 |

部署時請用平台 **Secrets／環境變數** 注入金鑰（Vercel、Cloud Run 等）。

## 腳本

```bash
npm run dev    # 開發
npm run build  # 建置
npm run start  # 正式模式
```

## 授權

[MIT](./LICENSE)
