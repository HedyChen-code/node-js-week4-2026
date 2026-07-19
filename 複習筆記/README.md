# Week 4 健身房 Admin 登入系統 複習筆記（索引）

> 主題：用 Express middleware + bcrypt + JWT，實作註冊、登入、取得個人資料三支 API，並用 JWT 保護需要登入的路由。
> 這套筆記幫你在提交後回顧：這次在學什麼、學到哪些知識點、程式怎麼跑。

## 一句話總結

> 登入的本質是「用 bcrypt 驗密碼 → 用 JWT 發一張有期限的通行證 → 之後每次請求靠 middleware 驗這張通行證」，密碼永遠只存 hash、身分資訊放在 token 裡。

## 三份筆記怎麼看

| 檔案 | 內容 | 什麼時候看 |
|---|---|---|
| [01-總覽與流程圖.md](./01-總覽與流程圖.md) | 作業全貌、專案結構、登入/驗證的資料流圖 | **想快速回憶整體全貌**時 |
| [02-知識點速查.md](./02-知識點速查.md) | bcrypt、JWT、middleware、Express 語法 | **寫程式忘記語法**時查 |
| [03-我的錯誤筆記.md](./03-我的錯誤筆記.md) | 這次踩過的坑 + 正確寫法 | **下次寫類似作業前**先掃一遍避雷 |

## 操作流程（怎麼跑這份作業）

```
1. npm install
2. cp .env.example .env      # 設定 JWT_SECRET
3. npm start                 # 起 server，開 http://localhost:3000/docs 看 Swagger
4. npm test                  # 16 項 Jest 測試，全過才算完成
```

> 最重要的提醒：**Swagger UI（/docs）是這週唯一的 API 規格來源**，寫每支 API 前先去看它的 request / response schema。
