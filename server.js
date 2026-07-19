// 啟動點（老師寫好，學生不改）
// 讀 .env → load app → listen port
require('dotenv').config();
const app = require('./app');

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Server 啟動在 http://localhost:${port}`);
  console.log(`Swagger UI：http://localhost:${port}/docs`);
});
