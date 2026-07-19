---
title: Week 4 · 健身房 Admin 登入系統（JWT + bcrypt）
tags: Node.js, Week4, JWT, bcrypt, Express
---

# 📘 Week 4 · 健身房 Admin 登入系統（JWT + bcrypt）

> 主題：用 Express middleware + bcrypt + JWT，實作註冊、登入、取得個人資料三支 API，並用 JWT 保護需要登入的路由。
>
> 這份筆記幫你在提交後回顧：這週在學什麼、學到哪些知識點、程式怎麼跑。

**一句話總結**

> 登入的本質是「用 bcrypt 驗密碼 → 用 JWT 發一張有期限的通行證 → 之後每次請求靠 middleware 驗這張通行證」，密碼永遠只存 hash、身分資訊放在 token 裡。

**📑 目錄**

[TOC]

## 🚀 操作流程

```
1. npm install
2. cp .env.example .env      # 設定 JWT_SECRET
3. npm start                 # 起 server，開 http://localhost:3000/docs 看 Swagger
4. npm test                  # 16 項 Jest 測試，全過才算完成
```

> Swagger UI（/docs）是這週唯一的 API 規格來源，寫每支 API 前先去看它的 request / response schema。

---

# 🗺️ 總覽與流程圖

## 一、這份作業在做什麼？

幫健身房後台加上**登入系統**：實作註冊、登入、取得個人資料三支 API，並用 JWT 保護「要登入才能看」的路由。

使用者註冊時把密碼用 bcrypt 加密後存起來；登入時比對密碼、成功就簽發一張有期限的 JWT token；之後要存取受保護的資源，就靠一個 middleware 守門員驗證這張 token。

## 二、教學目的

| 目的 | 說明 |
|---|---|
| 理解 middleware 機制 | 用 `(req, res, next)` 寫守門員，把資料掛到 `req` 傳給後面 |
| 密碼安全 | 用 bcrypt 做單向 hash，明碼絕不落地；驗證用 `bcrypt.compare()` |
| 無狀態身分驗證 | 用 JWT 簽發／驗證 token，理解 payload、secret、有效期 |
| Express app 組裝 | middleware、router、404、錯誤處理的掛載順序與 4 參數 error handler |
| 防帳號探測 | 帳號不存在與密碼錯誤回同一種錯誤訊息 |

## 三、專案結構分析

```
node-js-week4-2026-main/
├── server.js                  # 啟動點：require app 後 app.listen（負責「啟動」）
├── app.js                     # 組裝點：掛 middleware、router、404、error handler
├── middlewares/
│   └── verifyToken.js         # 任務一：JWT 守門員 middleware
├── routes/
│   └── auth.js                # 任務二～四：register / login / me 三支 API
├── fixtures/
│   ├── users.json             # 預填一個 hash 好的管理員（不改）
│   └── swagger.json           # API 規格文件（不改）
└── test.js                    # Jest + supertest，16 項驗收（不改）
```

**關鍵架構決策：**  
`server.js`（啟動）和 `app.js`（組裝）分開，是為了讓 `test.js` 能用 supertest 直接戳 `app`，不用真的佔用 port。  
所以 `app.js` 只 `module.exports = app`，不呼叫 `app.listen()`。

## 四、整體運作流程圖

**(A) 啟動與組裝流程**

```
npm start
   │
   ▼
┌────────────────────────────────────┐
│  // server.js                      │
│  const app = require('./app')      │
│  app.listen(3000)  ← 開始聽 port   │
└────────────────────────────────────┘
   │
   ▼
┌────────────────────────────────────┐
│  // app.js 依序掛載(順序很重要)   │
│  1. cors()                         │
│  2. express.json()                 │
│  3. /docs  Swagger UI              │
│  4. /auth  router                  │
│  5. 404 守門員                     │
│  6. error handler(4 參數,放最後) │
└────────────────────────────────────┘
```

**(B) 一次登入請求的資料流（POST /auth/login）**

```
Client: POST /auth/login  { email, password }
   │
   ▼
┌────────────────────────────────────┐
│  // middleware 管線                │
│  cors() → express.json() 解析 body │
└────────────────────────────────────┘
   │
   ▼
┌────────────────────────────────────┐
│  // /auth router → /login handler  │
│  1. users.find 找 email            │
│  2. bcrypt.compare 比對密碼        │
│  3. jwt.sign 簽發 token(30d)      │
└────────────────────────────────────┘
   │
   ▼
200  { status:'success', token }
```

**(C) 存取受保護路由的資料流（GET /auth/me）**

```
Client: GET /auth/me
        Authorization: Bearer <token>
   │
   ▼
┌────────────────────────────────────┐
│  // verifyToken 守門員             │
│  1. 檢查是否為 'Bearer <token>'    │
│  2. jwt.verify 驗 token            │
│  3. req.user = decoded  ← 掛資料   │
│  4. next()  ← 放行                 │
└────────────────────────────────────┘
   │
   ▼
┌────────────────────────────────────┐
│  // /me handler                    │
│  從 req.user 取 id/email 回傳      │
└────────────────────────────────────┘
   │
   ▼
200  { status:'success', user }
```

> **關鍵觀念：**  
> token 是「無狀態」的通行證——server 不記誰登入了，每次靠 `jwt.verify` 當場驗，驗過就從 token 裡的 payload 知道你是誰。

## 五、任務對照表

| 任務 | 檔案 | 內容 | 核心 API / 概念 |
|---|---|---|---|
| 一 | `middlewares/verifyToken.js` | JWT 守門員，驗 Bearer token | `jwt.verify`、`req.user`、`next()` |
| 二 | `routes/auth.js` | POST /register 註冊 | `bcrypt.hash`、`Array.some`、201/400 |
| 三 | `routes/auth.js` | POST /login 登入 | `bcrypt.compare`、`jwt.sign`、401 |
| 四 | `routes/auth.js` | GET /me（受保護） | 掛 `verifyToken`、讀 `req.user` |
| 五 | `app.js` | 組裝 app | 掛載順序、404、4 參數 error handler |

---

# 📖 知識點速查

## 1. bcrypt.hash 加密密碼

```js
const hash = await bcrypt.hash(password, 12); // 12 = salt rounds
```

- 單向加密，明碼絕不進資料庫；是 async，一定要 `await`。

## 2. bcrypt.compare 驗證密碼

```js
const ok = await bcrypt.compare(password, user.password); // boolean
```

- 比對明碼與存的 hash；忘記 `await` 會拿到 Promise（永遠 truthy）而判斷錯。

## 3. jwt.sign 簽發 token

```js
const payload = { id: user.id, email: user.email };
const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
```

- 三參數：`(payload, secret, options)`；`iat`、`exp` 由套件自動加，不用自己寫。

> ⚠️ `expiresIn` 要放進第三個參數的 options 物件（`{ expiresIn }`），不是獨立參數。

## 4. jwt.verify 驗證 token

```js
try {
  req.user = jwt.verify(token, process.env.JWT_SECRET);
  next();
} catch (error) {
  return res.status(401).json({ status: 'false', message: 'Token 無效或已過期' });
}
```

- 成功回傳 decoded payload；失敗會 throw，要包 `try/catch`；驗過手動掛 `req.user` 並 `next()`。

## 5. 解析 Authorization header

```js
const authHeader = req.headers.authorization; // 'Bearer eyJhbGci...'
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return res.status(401).json({ status: 'false', message: '請先登入' });
}
const token = authHeader.split(' ')[1];
```

> ⚠️ 是 `'Bearer '`（含結尾空格），不是 `'Bear '`。

## 6. Express middleware 與 next()

```js
const mw = (req, res, next) => { /* 做事 */ next(); };
router.get('/me', verifyToken, (req, res) => { /* ... */ });
```

- 靠 `next()` 交棒；不 `next()` 又不回應，請求會卡住。

## 7. 錯誤處理 middleware（4 參數）

```js
app.use((err, req, res, next) => {
  res.status(500).json({ err: err.name, message: err.message });
});
```

- 一定要 4 個參數、放最後；`express.json()` 遇壞 JSON 丟的 `SyntaxError` 會被它接住。

## 8. app 掛載順序

```js
app.use(cors());
app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
app.use('/auth', authRouter);
app.use((req, res) => res.status(404).json({ /* ... */ }));
app.use((err, req, res, next) => { /* ... */ });
```

- 順序即執行順序：body 解析在路由前，404 在路由後，error handler 最後。

## 9. 陣列查找：find 與 some

```js
const user = users.find(u => u.email === email);   // 元素 或 undefined
const exists = users.some(u => u.email === email);  // boolean
```

## 10. 常用狀態碼

| 碼 | 意義 | 用在 |
|---|---|---|
| 200 | OK | 登入成功、取得個人資料 |
| 201 | Created | 註冊成功 |
| 400 | Bad Request | 缺欄位、email 已存在 |
| 401 | Unauthorized | 帳密錯誤、token 無效/沒帶 |
| 500 | Server Error | error handler 兜底 |

---

# 🐛 我的錯誤筆記

## 錯誤總表

| # | 坑 | 錯誤寫法 | 正確寫法 |
|---|---|---|---|
| 1 | `jwt.sign` 參數放錯 | `jwt.sign(payload, secret, iat, expiresIn)` | `jwt.sign(payload, secret, { expiresIn })` |
| 2 | async 忘了加 | `router.post('/login', (req, res) =>` | `router.post('/login', async (req, res) =>` |
| 3 | 註冊判斷式邏輯反了 | `!users.some(u => u.email === email)` | `users.some(u => u.email === email)` |
| 4 | Bearer 少字母 | `authHeader.startsWith('Bear ')` | `authHeader.startsWith('Bearer ')` |
| 5 | `iat` 當成裸變數 | `iat,` | `iat: req.user.iat` |
| 6 | token 過期欄位取錯 | `exp: req.user.expiresIn` | `exp: req.user.exp` |
| 7 | `nextId++` 位置害 id 跳號 | 先 `nextId++` 再當 id | `id: nextId++` |
| 8 | 方法／屬性打錯字 | `.josn`、`teq.body`、`.status({...})`、`toekn` | `.json`、`req.body`、`.json({...})`、`token` |
| 9 | `gh auth switch` 用錯參數 | `gh auth switch HedyChen-code` | `gh auth switch --user HedyChen-code` |

## 逐項說明

**1. `jwt.sign` 的第三個參數是 options 物件**

只有三個參數 `(payload, secret, options)`，`expiresIn` 放進 options；`iat`、`exp` 套件自動加，不用自己傳。

**2. 用了 await 就一定要 async**

`register`、`login` 都有 `await bcrypt.xxx`，handler 忘了 `async` 會語法錯誤。看到 `await` 先回頭確認外層是 `async`。

**3. `some` 前面不該加 `!`**

`some(...)` 回傳「email 是否已存在」，已存在要擋（回 400），所以條件就是 `some(...)` 為 true。加 `!` 邏輯整個反過來。

**4. `'Bearer '` 少一個 er 全盤皆錯**

少了 `er` 會讓所有正確 token 被判定格式錯誤，連「帶有效 token」的測試都失敗。字串比對要一字不差。

**5 & 6. `req.user` 是 decoded payload，欄位要對**

`iat,` 是引用一個沒宣告的變數 → ReferenceError（整支 API 500），要寫 `iat: req.user.iat`。過期欄位叫 `exp` 不是 `expiresIn`（後者只是 `jwt.sign` 的參數名，不會進 payload）。

**7. `id: nextId++` 一步到位**

`nextId` 起始 2（管理員佔 id 1）。先 `nextId++` 再當 id 會跳號變 3。用 `id: nextId++`（先取值再遞增）。

**8. 純打錯字（沒觀念問題，就是累）**

`.josn`→`.json`、`teq.body`→`req.body`、`.status({...})`→`.json({...})`、`toekn`→`token`。寫完趁手感還在自己讀一遍，比事後 debug 快。

**9. `gh auth switch` 用旗標不用位置參數**

用 `--user`（或 `-u`）指定：`gh auth switch --user HedyChen-code`；`-- user`（有空格）會被當旗標結束而報錯。兩個帳號時直接 `gh auth switch` 跳選單最穩。

## 給自己的提醒

> - 看到 `await` 先確認 `async`。
> - 判斷式（尤其加不加 `!`）寫完，念一遍「這條成立時我要做什麼」。
> - 累了寫的 code，跑測試前先自己讀過一遍抓錯字。
