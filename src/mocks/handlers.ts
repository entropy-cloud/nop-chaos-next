import { http, HttpResponse, delay } from "msw"
import type { User, Order, ChartData } from "@/types"
import type { MenuResponse } from "@/types/menu"

const users: User[] = [
  {
    id: 1,
    name: "张三",
    email: "zhangsan@example.com",
    role: "admin",
    createdAt: "2024-01-01",
  },
  {
    id: 2,
    name: "李四",
    email: "lisi@example.com",
    role: "user",
    createdAt: "2024-01-02",
  },
  {
    id: 3,
    name: "王五",
    email: "wangwu@example.com",
    role: "user",
    createdAt: "2024-01-03",
  },
]

const orders: Order[] = [
  {
    id: 1,
    orderNo: "ORD-001",
    customer: "张三",
    amount: 1200,
    status: "completed",
    createdAt: "2024-01-01",
  },
  {
    id: 2,
    orderNo: "ORD-002",
    customer: "李四",
    amount: 3500,
    status: "processing",
    createdAt: "2024-01-02",
  },
  {
    id: 3,
    orderNo: "ORD-003",
    customer: "王五",
    amount: 800,
    status: "pending",
    createdAt: "2024-01-03",
  },
  {
    id: 4,
    orderNo: "ORD-004",
    customer: "赵六",
    amount: 2100,
    status: "completed",
    createdAt: "2024-01-04",
  },
  {
    id: 5,
    orderNo: "ORD-005",
    customer: "钱七",
    amount: 500,
    status: "cancelled",
    createdAt: "2024-01-05",
  },
]

const lineChartData: ChartData[] = [
  { name: "1月", value: 4000 },
  { name: "2月", value: 3000 },
  { name: "3月", value: 2000 },
  { name: "4月", value: 2780 },
  { name: "5月", value: 1890 },
  { name: "6月", value: 2390 },
]

const barChartData: ChartData[] = [
  { name: "产品A", value: 4000 },
  { name: "产品B", value: 3000 },
  { name: "产品C", value: 2000 },
  { name: "产品D", value: 2780 },
  { name: "产品E", value: 1890 },
]

const pieChartData: ChartData[] = [
  { name: "直接访问", value: 400 },
  { name: "邮件营销", value: 300 },
  { name: "联盟广告", value: 200 },
  { name: "视频广告", value: 278 },
  { name: "搜索引擎", value: 189 },
]

const mockMenus: MenuResponse = {
  menus: [
    {
      id: "dashboard",
      title: "仪表盘",
      labelKey: "menu.dashboard",
      path: "/",
      icon: "LayoutDashboard",
      page: {
        type: "builtin",
        componentName: "Dashboard",
      },
      meta: {
        order: 1,
        closable: false,
      },
    },
    {
      id: "system",
      title: "系统管理",
      labelKey: "menu.system",
      path: "/system",
      icon: "Settings",
      children: [
        {
          id: "system-users",
          title: "用户管理",
          labelKey: "menu.systemUsers",
          path: "/system/users",
          icon: "Users",
          page: {
            type: "builtin",
            componentName: "UserManagement",
          },
          meta: {
            order: 1,
          },
        },
        {
          id: "system-roles",
          title: "角色管理",
          labelKey: "menu.systemRoles",
          path: "/system/roles",
          icon: "Shield",
          page: {
            type: "builtin",
            componentName: "RoleManagement",
          },
          meta: {
            order: 2,
          },
        },
        {
          id: "system-permissions",
          title: "权限设置",
          labelKey: "menu.systemPermissions",
          path: "/system/permissions",
          icon: "Lock",
          page: {
            type: "builtin",
            componentName: "PermissionManagement",
          },
          meta: {
            order: 3,
          },
        },
      ],
      meta: {
        order: 2,
      },
    },
    {
      id: "analytics",
      title: "数据分析",
      labelKey: "menu.analytics",
      path: "/analytics",
      icon: "BarChart3",
      children: [
        {
          id: "analytics-reports",
          title: "报表中心",
          labelKey: "menu.analyticsReports",
          path: "/analytics/reports",
          icon: "FileText",
          page: {
            type: "builtin",
            componentName: "ReportCenter",
          },
          meta: {
            order: 1,
          },
        },
        {
          id: "analytics-export",
          title: "数据导出",
          labelKey: "menu.analyticsExport",
          path: "/analytics/export",
          icon: "Download",
          page: {
            type: "builtin",
            componentName: "DataExport",
          },
          meta: {
            order: 2,
          },
        },
        {
          id: "analytics-overview",
          title: "统计概览",
          labelKey: "menu.analyticsOverview",
          path: "/analytics/overview",
          icon: "BarChart",
          page: {
            type: "builtin",
            componentName: "StatisticsOverview",
          },
          meta: {
            order: 3,
          },
        },
      ],
      meta: {
        order: 3,
      },
    },
    {
      id: "flow",
      title: "流程图",
      labelKey: "menu.flow",
      path: "/flow",
      icon: "GitBranch",
      page: {
        type: "builtin",
        componentName: "FlowEditor",
      },
      meta: {
        order: 4,
      },
    },
    {
      id: "chart",
      title: "统计图表",
      labelKey: "menu.chart",
      path: "/chart",
      icon: "BarChart3",
      page: {
        type: "builtin",
        componentName: "ChartDemo",
      },
      meta: {
        order: 5,
      },
    },
    {
      id: "ai",
      title: "AI 集成",
      labelKey: "menu.ai",
      path: "/ai",
      icon: "Bot",
      page: {
        type: "builtin",
        componentName: "AIChat",
      },
      meta: {
        order: 6,
      },
    },
    {
      id: "orders",
      title: "订单管理",
      labelKey: "menu.orders",
      path: "/orders",
      icon: "Database",
      page: {
        type: "builtin",
        componentName: "OrderManagement",
      },
      meta: {
        order: 7,
      },
    },
    {
      id: "crud",
      title: "CRUD 演示",
      labelKey: "menu.crud",
      path: "/crud",
      icon: "LayoutGrid",
      page: {
        type: "builtin",
        componentName: "CrudDemo",
      },
      meta: {
        order: 8,
      },
    },
    {
      id: "layout",
      title: "复杂布局",
      labelKey: "menu.layout",
      path: "/layout",
      icon: "LayoutGrid",
      page: {
        type: "builtin",
        componentName: "LayoutDemo",
      },
      meta: {
        order: 9,
      },
    },
    {
      id: "plugin-demo",
      title: "插件演示",
      labelKey: "menu.pluginDemo",
      path: "/plugin-demo",
      icon: "Puzzle",
      badge: "New",
      page: {
        type: "plugin",
        moduleId: "plugin-demo",
        componentPath: "/plugin-demo.system.js",
      },
      meta: {
        order: 10,
      },
    },
    {
      id: "settings",
      title: "设置",
      labelKey: "menu.settings",
      path: "/settings",
      icon: "Settings",
      page: {
        type: "builtin",
        componentName: "Settings",
      },
      meta: {
        order: 11,
      },
    },
  ],
  version: "1.0.0",
  timestamp: Date.now(),
}

export const handlers = [
  http.get("/api/menus", async () => {
    await delay(100)
    return HttpResponse.json(mockMenus)
  }),

  http.post("/api/auth/login", async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as { email: string; password: string }

    const mockUser = {
      id: 1,
      name: "测试用户",
      email: body.email,
      role: "admin",
    }

    const mockToken = "mock-jwt-token-" + Date.now()

    return HttpResponse.json({
      user: mockUser,
      token: mockToken,
      success: true,
    })
  }),

  http.get("/api/users", async () => {
    await delay(200)
    return HttpResponse.json({ data: users, success: true })
  }),

  http.get("/api/users/:id", async ({ params }) => {
    await delay(100)
    const user = users.find((u) => u.id === Number(params.id))
    if (!user) {
      return HttpResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      )
    }
    return HttpResponse.json({ data: user, success: true })
  }),

  http.post("/api/users", async ({ request }) => {
    await delay(100)
    const body = await request.json()
    const newUser: User = {
      id: users.length + 1,
      ...(body as Omit<User, "id" | "createdAt">),
      createdAt: new Date().toISOString().split("T")[0],
    }
    users.push(newUser)
    return HttpResponse.json({ data: newUser, success: true })
  }),

  http.get("/api/orders", async ({ request }) => {
    await delay(200)
    const url = new URL(request.url)
    const page = Number(url.searchParams.get("page")) || 1
    const pageSize = Number(url.searchParams.get("pageSize")) || 10
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return HttpResponse.json({
      data: orders.slice(start, end),
      total: orders.length,
      page,
      pageSize,
    })
  }),

  http.get("/api/orders/:id", async ({ params }) => {
    await delay(100)
    const order = orders.find((o) => o.id === Number(params.id))
    if (!order) {
      return HttpResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      )
    }
    return HttpResponse.json({ data: order, success: true })
  }),

  http.get("/api/orders/:orderId/items", async () => {
    await delay(100)
    const items = [
      { id: 1, orderId: 1, productName: "产品 A", quantity: 2, price: 300 },
      { id: 2, orderId: 1, productName: "产品 B", quantity: 1, price: 600 },
    ]
    return HttpResponse.json({ data: items, success: true })
  }),

  http.get("/api/charts/line", async () => {
    await delay(100)
    return HttpResponse.json({ data: lineChartData, success: true })
  }),

  http.get("/api/charts/bar", async () => {
    await delay(100)
    return HttpResponse.json({ data: barChartData, success: true })
  }),

  http.get("/api/charts/pie", async () => {
    await delay(100)
    return HttpResponse.json({ data: pieChartData, success: true })
  }),

  http.get("/api/charts/area", async () => {
    await delay(100)
    return HttpResponse.json({ data: lineChartData, success: true })
  }),
]
