# 三好關卡（3good-quest）

好玩優先的**線上單機**遊戲：**你寫台詞，AI 當爆點導演**。

不是跟 AI 聊天。每一幕你寫下要說的話／要做的事，AI 生成現場後果、群組反應氣泡，並結算「做好事／說好話／存好心」與四給成就。

適合 [三好 AI 創新應用競賽](https://3goodai.fgu.edu.tw/) 社會組 B 類（AI 數位應用實作）。

## 開源聲明

本專案以 **MIT License** 釋出：任何人皆可使用、修改、散佈與商用，只要保留版權與授權聲明。

- 遊戲劇情、錨點、分數規則皆為**原創內容**。
- **API Key 與雲端費用由部署者自備**；請勿把金鑰寫進程式碼或 commit 到 Git。

## AI 怎麼用（核心玩法）

1. 讀情境  
2. **玩家創作行動原文**（必要）  
3. 呼叫 `/api/direct`：AI 輸出後果標題、敘事、群組吐槽、三好分數、四給解鎖  
4. 通關時再用 AI 做導演剪輯短評  

無 API Key／被限流時走「快速導演」（關鍵字對齊預寫錨點），關卡仍可玩完。

## 功能

- 第一關：發表會搶功風波（多結局；可挑戰四給全開）
- AI 導演爆點 + 群組反應 UI
- 三好計分板 + 四給收集板
- 免入；`localStorage` 進度
- IP 速率限制，降低金鑰被刷風險

## 快速開始

```bash
npm install
cp .env.example .env.local
# 編輯 .env.local，填入 OPENAI_API_KEY（建議；不填也能玩）
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。

### 環境變數

見 [`.env.example`](.env.example)。

## 腳本

```bash
npm run dev
npm run build
npm run start
```

## 授權

[MIT](./LICENSE)
