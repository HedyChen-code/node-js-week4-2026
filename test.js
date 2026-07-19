// 測試檔（老師寫好，學生不改）
// 每個 test 用 jest.resetModules() 讓 app 重新載入 → 拿到 fresh users state
// 這樣多個 test 之間不會互相污染（register 新增過的 user 不會殘留到下個 test）

const request = require('supertest');

let app;

function loadFreshApp() {
  jest.resetModules();
  return require('./app');
}

// 測試用 JWT secret（對應 .env）— 確保 verifyToken 跑測試時有東西可驗
const OLD_ENV = process.env;
beforeAll(() => {
  process.env = { ...OLD_ENV, JWT_SECRET: 'test-secret-for-jest' };
});
afterAll(() => {
  process.env = OLD_ENV;
});

beforeEach(() => {
  app = loadFreshApp();
});

// ---------- 任務一：verifyToken 守門員 ----------
describe('任務一：verifyToken 守門員', () => {
  test('沒帶 Authorization header → 401', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.message).toBeDefined();
  });

  test('帶無效 token → 401', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  test('header 格式不對（沒有 Bearer 開頭）→ 401', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'eyJhbGciOiJIUzI1NiIs...');
    expect(res.status).toBe(401);
  });
});

// ---------- 任務二：POST /register ----------
describe('任務二：POST /auth/register', () => {
  test('新 email 註冊成功 → 201', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'amy@gym.com', password: '1q2w3e4r' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
  });

  test('缺欄位 → 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'amy@gym.com' });
    expect(res.status).toBe(400);
  });

  test('email 重複 → 400（leo@gym.com 已存在 fixtures）', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'leo@gym.com', password: '1q2w3e4r' });
    expect(res.status).toBe(400);
  });

  test('密碼必須 hash 存（register 後 login 能用 bcrypt.compare 對上）', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'newuser@gym.com', password: 'mypassword' });
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'newuser@gym.com', password: 'mypassword' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
  });
});

// ---------- 任務三：POST /login ----------
describe('任務三：POST /auth/login', () => {
  test('正確帳密 → 200 + token', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'leo@gym.com', password: '1q2w3e4r' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
  });

  test('密碼錯誤 → 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'leo@gym.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  test('email 不存在 → 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'ghost@gym.com', password: '1q2w3e4r' });
    expect(res.status).toBe(401);
  });
});

// ---------- 任務四：GET /me（受保護）----------
describe('任務四：GET /auth/me', () => {
  test('帶有效 token → 200 + user', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'leo@gym.com', password: '1q2w3e4r' });
    const token = loginRes.body.token;

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('leo@gym.com');
  });

  test('沒帶 token → 401', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });
});

// ---------- 任務五：app.js 整合 ----------
describe('任務五：app.js 整合', () => {
  test('回應含 CORS header', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'leo@gym.com', password: '1q2w3e4r' });
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });

  test('未註冊的路徑 → 404', async () => {
    const res = await request(app).get('/unknown');
    expect(res.status).toBe(404);
    expect(res.body.message).toBeDefined();
  });

  test('Swagger UI /docs/ → 200', async () => {
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/swagger/i);
  });

  // 驗錯誤處理守門員（4 參數）有裝且運作：
  // express.json() 遇到壞掉的 JSON body 會丟 SyntaxError，
  // Express 自動把 error 交給 4 參數的 error handler 處理。
  // 如果學生少寫 / 寫錯參數數，這個 test 會紅。
  test('壞掉的 JSON body → 錯誤處理守門員接住', async () => {
    const res = await request(app)
      .post('/auth/register')
      .set('Content-Type', 'application/json')
      .send('{invalid json');
    expect(res.status).toBe(500);
    expect(res.body.err).toBe('SyntaxError');
  });
});
