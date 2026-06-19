// Flux Prototype Mock Server — Standard CRUD API
// Endpoints under /api/mock/*. Response shape: { status:0, msg, data }.
// Data lives in memory; resets on restart.

const users = [
  { id: 1, name: '张三', email: 'zhangsan@example.com', role: 'admin', status: 'active' },
  { id: 2, name: '李四', email: 'lisi@example.com', role: 'editor', status: 'active' },
  { id: 3, name: '王五', email: 'wangwu@example.com', role: 'viewer', status: 'disabled' },
  { id: 4, name: '赵六', email: 'zhaoliu@example.com', role: 'editor', status: 'active' },
  { id: 5, name: '孙七', email: 'sunqi@example.com', role: 'viewer', status: 'active' },
];

const roles = [
  { id: 1, name: '管理员', code: 'admin', description: '拥有所有权限' },
  { id: 2, name: '编辑者', code: 'editor', description: '可编辑内容' },
  { id: 3, name: '访客', code: 'viewer', description: '只读访问' },
];

const articles = [
  { id: 1, title: 'Flux 入门指南', category: '技术', status: 'published', createdAt: '2025-06-01' },
  { id: 2, title: '产品迭代计划', category: '产品', status: 'draft', createdAt: '2025-06-05' },
  { id: 3, title: '运营数据分析', category: '运营', status: 'published', createdAt: '2025-06-10' },
];

function send(res, data, msg = 'ok') {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ status: 0, msg, data }));
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function paginate(arr, q) {
  const items = arr.slice();
  const total = items.length;
  const page = Math.max(1, parseInt(q.page) || 1);
  const perPage = Math.max(1, parseInt(q.perPage) || parseInt(q.perPage) || 10);
  const start = (page - 1) * perPage;
  return { items: items.slice(start, start + perPage), total };
}

function nextId(arr) {
  return Math.max(0, ...arr.map((i) => i.id)) + 1;
}

function createCrudRoutes(name, collection) {
  const basePath = `/api/mock/${name}`;
  const itemPattern = new RegExp(`^/api/mock/${name}/(\\d+)$`);

  return async function handleCrud(req, res, next, url, q) {
    const method = req.method;
    const path = url.pathname;

    if (path === basePath) {
      if (method === 'GET') return send(res, paginate(collection, q));
      if (method === 'POST') {
        const body = await readBody(req);
        const id = nextId(collection);
        const record = { id, ...body };
        collection.push(record);
        return send(res, { id }, '创建成功');
      }
    }

    const match = path.match(itemPattern);
    if (match) {
      const id = parseInt(match[1]);
      const record = collection.find((i) => i.id === id);
      if (!record) {
        res.statusCode = 404;
        return send(res, null, `${name} ${id} not found`);
      }
      if (method === 'PUT') {
        const body = await readBody(req);
        Object.assign(record, body);
        return send(res, { id }, '更新成功');
      }
      if (method === 'DELETE') {
        const idx = collection.findIndex((i) => i.id === id);
        if (idx >= 0) collection.splice(idx, 1);
        return send(res, { id }, '删除成功');
      }
    }

    return next();
  };
}

const handleUsers = createCrudRoutes('users', users);
const handleRoles = createCrudRoutes('roles', roles);
const handleArticles = createCrudRoutes('articles', articles);

export default async function mockMiddleware(req, res, next) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;

  if (!path.startsWith('/api/mock/')) return next();

  const q = Object.fromEntries(url.searchParams);

  try {
    await handleUsers(req, res, () => {}, url, q);
    if (res.writableEnded) return;

    await handleRoles(req, res, () => {}, url, q);
    if (res.writableEnded) return;

    await handleArticles(req, res, () => {}, url, q);
    if (res.writableEnded) return;

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({ status: 404, msg: `Mock API not found: ${req.method} ${path}`, data: null }),
    );
  } catch (err) {
    console.error('[flux-mock] error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ status: 500, msg: String(err), data: null }));
  }
}
