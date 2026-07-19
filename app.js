const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const authRouter = require('./routes/auth');
const swaggerDoc = require('./fixtures/swagger.json');

const app = express();

// ───────────────────────────────────────────────────────────
// TODO 任務五：將 middleware、router、守門員依序掛上 app
// ───────────────────────────────────────────────────────────
// 1. cors()
// 2. express.json()
// 3. Swagger UI /docs（已預先提供如下，同學不需調整）
// 4. /auth router
// 5. 404 守門員（無此路由資訊）
// 6. 錯誤處理守門員（⚠️ 4 個參數、最後一個）
//    回傳 status 500，body 包含兩個欄位：
//    - err：錯誤的類別名稱（例如 'SyntaxError'）
//    - message：錯誤訊息
//
// ⚠️ **最後不需呼叫 app.listen()** — 這個部分交由 server.js 負責（分離「組裝」跟「啟動」，這樣 test.js 可以 supertest 直接戳 app、不佔 port）。

app.use(cors());
app.use(express.json());

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
app.use('/auth', authRouter);

app.use((req, res) => res.status(404).json( {status: 'false', message: '此路由不存在' }) );

app.use((err, req, res, next) => {
  const errBody = {
    err: err.name,
    message: err.message
  };

  res.status(500).json(errBody);
})

module.exports = app;
