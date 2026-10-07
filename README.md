# 三好關卡（3good-quest）

好玩優先的**線上單機築牌**遊戲：用卡牌澄清誤會，打完一波由 **AI 煉卡師**鍛造新卡，選進牌庫，越打牌組越長。

適合 [三好 AI 創新應用競賽](https://3goodai.fgu.edu.tw/) 社會組 B 類。

## 怎麼玩

1. 每波出現一個「威脅」（搶功、洗版、冷戰…）
2. 花費「專注」打出手牌：做好事／說好話／存好心／四給
3. 對弱點出牌有加成；威脅清零前不要讓「混亂」爆掉
4. 清波後 AI 煉一張新卡 → **加入牌庫或略過**（這就是築牌）
5. 打完所有波次通關；收集四給

## AI 做什麼

AI 是**煉卡師**，不是聊天機器人。  
API：`POST /api/forge`（依本波出牌、威脅、已解鎖四給生成新卡）。  
無 API Key／被限流時改用規則煉卡，仍可完整遊玩。

## 開源聲明

**MIT License**。金鑰請放環境變數，不要 commit。

## 快速開始

```bash
npm install
cp .env.example .env.local
# 選填 OPENAI_API_KEY
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

## 授權

[MIT](./LICENSE)
