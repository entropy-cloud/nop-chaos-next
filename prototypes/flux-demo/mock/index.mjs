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

const products = [
  {
    id: 1,
    name: '无线蓝牙耳机',
    price: 299.0,
    category: 'electronics',
    status: 'active',
    description: '主动降噪，长续航',
    createdAt: '2025-06-01',
  },
  {
    id: 2,
    name: '机械键盘 87 键',
    price: 459.5,
    category: 'electronics',
    status: 'active',
    description: '红轴，热插拔',
    createdAt: '2025-06-03',
  },
  {
    id: 3,
    name: 'A4 打印纸 (5 包/箱)',
    price: 120.0,
    category: 'office',
    status: 'active',
    description: '70g 高白',
    createdAt: '2025-06-04',
  },
  {
    id: 4,
    name: '人体工学椅',
    price: 899.0,
    category: 'office',
    status: 'disabled',
    description: '网布透气，可后仰',
    createdAt: '2025-06-07',
  },
  {
    id: 5,
    name: '北欧风地毯 1.6×2.3m',
    price: 358.0,
    category: 'home',
    status: 'active',
    description: '可机洗',
    createdAt: '2025-06-09',
  },
  {
    id: 6,
    name: '智能台灯',
    price: 199.9,
    category: 'home',
    status: 'active',
    description: '无极调光，USB 充电',
    createdAt: '2025-06-10',
  },
  {
    id: 7,
    name: '便携 SSD 1TB',
    price: 689.0,
    category: 'electronics',
    status: 'active',
    description: 'Type-C，1050MB/s',
    createdAt: '2025-06-12',
  },
  {
    id: 8,
    name: '白板贴 90×120cm',
    price: 69.0,
    category: 'office',
    status: 'disabled',
    description: '磁性，可擦写',
    createdAt: '2025-06-14',
  },
  {
    id: 9,
    name: '显示器增高架',
    price: 159.0,
    category: 'office',
    status: 'active',
    description: '金属，承重 20kg',
    createdAt: '2025-06-15',
  },
  {
    id: 10,
    name: '便携咖啡杯 350ml',
    price: 89.0,
    category: 'home',
    status: 'active',
    description: '钛钢，真空保温',
    createdAt: '2025-06-16',
  },
  {
    id: 11,
    name: 'USB-C 拓展坞 7合1',
    price: 129.0,
    category: 'electronics',
    status: 'active',
    description: 'HDMI 4K，PD 100W',
    createdAt: '2025-06-17',
  },
  {
    id: 12,
    name: '加湿器 4L',
    price: 199.0,
    category: 'home',
    status: 'active',
    description: '静音，恒湿',
    createdAt: '2025-06-18',
  },
  {
    id: 13,
    name: '桌面收纳盒 3 层',
    price: 79.0,
    category: 'office',
    status: 'active',
    description: '抽屉式，透明',
    createdAt: '2025-06-19',
  },
  {
    id: 14,
    name: '蓝牙音箱 防水',
    price: 249.0,
    category: 'electronics',
    status: 'active',
    description: 'IPX7，12h 续航',
    createdAt: '2025-06-20',
  },
  {
    id: 15,
    name: '护眼台灯 LED',
    price: 329.0,
    category: 'home',
    status: 'disabled',
    description: '无频闪，国 AA 级',
    createdAt: '2025-06-21',
  },
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
  let items = arr.slice();
  // keyword 过滤（产品名称模糊匹配，用于验证查询表单/空态）
  if (q.keyword) {
    const kw = String(q.keyword).toLowerCase();
    items = items.filter((i) => String(i.name || '').toLowerCase().includes(kw));
  }
  const total = items.length;
  // 标准服务端分页：按 page/perPage 切片（flux loadAction 翻页会带参数重新请求）
  const page = Math.max(1, parseInt(q.page) || 1);
  const perPage = Math.max(1, parseInt(q.perPage) || 10);
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
        // 剔除 flux 提交携带的表单元数据（$form/$slot 等 $ 开头字段），只存业务字段
        const clean = Object.fromEntries(
          Object.entries(body).filter(([k]) => !k.startsWith('$')),
        );
        Object.assign(record, clean);
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
const handleProducts = createCrudRoutes('products', products);

// 批量删除：DELETE /api/mock/products/batch?ids=1,2,3
function handleProductsBatch(req, res, q) {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname !== '/api/mock/products/batch' || req.method !== 'DELETE') return false;
  const ids = String(q.ids || '')
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n));
  for (const id of ids) {
    const idx = products.findIndex((p) => p.id === id);
    if (idx >= 0) products.splice(idx, 1);
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ status: 0, msg: '批量删除成功', data: { deleted: ids.length } }));
  return true;
}

export default async function mockMiddleware(req, res, next) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;

  if (!path.startsWith('/api/mock/')) return next();

  const q = Object.fromEntries(url.searchParams);

  try {
    if (handleProductsBatch(req, res, q)) return;

    await handleUsers(req, res, () => {}, url, q);
    if (res.writableEnded) return;

    await handleRoles(req, res, () => {}, url, q);
    if (res.writableEnded) return;

    await handleArticles(req, res, () => {}, url, q);
    if (res.writableEnded) return;

    await handleProducts(req, res, () => {}, url, q);
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
