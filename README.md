# 三好關卡（3good-quest）

好玩優先的**線上單機**情境選擇遊戲：遇上麻煩事 → 跟夥伴「小好」聊聊 → 做出選擇 → 累積「做好事／說好話／存好心」，並收集四給成就（信心、歡喜、希望、方便）。

適合 [三好 AI 創新應用競賽](https://3goodai.fgu.edu.tw/) 社會組 B 類（AI 數位應用實作）展示與延伸開發。

## 開源聲明

本專案以 **MIT License** 釋出：任何人皆可使用、修改、散佈與商用，只要保留版權與授權聲明。

- 遊戲劇情、知識卡、角色「小好」皆為**原創內容**。
- **API Key 與雲端費用由部署者自備**；請勿把金鑰寫進程式碼或 commit 到 Git。

## 功能

- 第一關：發表會搶功風波（多結局；可挑戰四給全開）
- 三好計分板 + 四給收集板
- 可自由對話的 AI 夥伴「小好」（後端代理）
- 無 API Key／額度用盡時自動降級為內建短回覆，關卡仍可玩完
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
