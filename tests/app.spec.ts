import { test, expect } from "@playwright/test"
import { waitForI18n } from "./utils"

test.describe("nop-chaos-next 框架增强功能测试", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[type="email"]', "test@example.com")
    await page.fill('input[type="password"]', "password123")
    await page.click('button:has-text("登录")')
    await page.waitForURL("/", { timeout: 5000 })
    await waitForI18n(page)
    await expect(page.locator("h1")).toBeVisible()
  })

  test("首页加载 - 玻璃拟态主题", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("h1")).toContainText("仪表盘")

    // 检查玻璃拟态样式
    const cards = page.locator(".glass-card")
    await expect(cards.first()).toBeVisible()
  })

  test("订单管理 - 点击行打开Tab页", async ({ page }) => {
    await page.goto("/orders")
    await waitForI18n(page)

    await expect(page.getByRole("heading", { name: "订单管理" })).toBeVisible()

    // 点击第一行订单
    await page.click("tr:has-text('ORD-2024-001')")

    // 验证跳转到详情页
    await expect(page).toHaveURL(/\/orders\/detail\/1/)
    await expect(page.getByRole("heading", { name: /订单详情/ })).toBeVisible()
  })

  test("订单管理 - Drawer新增订单", async ({ page }) => {
    await page.goto("/orders")
    await waitForI18n(page)

    // 点击新建订单按钮
    await page.click("button:has-text('新建订单')")

    // 验证Drawer打开
    await expect(page.getByRole("heading", { name: "新建订单" })).toBeVisible()

    // 填写表单
    await page.fill("input[placeholder*='客户名称']", "测试客户")
    await page.fill("input[type='email']", "test@example.com")

    // 提交
    await page.click("button:has-text('创建订单')")

    // 验证成功提示
    await expect(page.locator("text=订单创建成功")).toBeVisible()
  })

  test("主题切换 - 亮/暗模式", async ({ page }) => {
    await page.goto("/")
    await waitForI18n(page)

    const html = page.locator("html")
    const initialClass = (await html.getAttribute("class")) || ""

    // 点击主题切换按钮打开 Dialog
    await page.click('[data-testid="theme-toggle"]')

    // 等待 Dialog 内容出现（中文界面）
    await page.waitForSelector("text=显示模式", { timeout: 5000 })
    await page.waitForTimeout(300)

    // 选择对应的模式
    const targetMode = initialClass.includes("dark") ? "浅色" : "深色"
    await page.getByRole("button", { name: targetMode, exact: false }).click()
    await page.waitForTimeout(500)

    const newClass = (await html.getAttribute("class")) || ""
    expect(newClass).not.toBe(initialClass)
  })

  test("主题风格切换 - 玻璃拟态", async ({ page }) => {
    await page.goto("/")
    await waitForI18n(page)

    // 点击主题按钮打开 Dialog
    await page.click('[data-testid="theme-toggle"]')
    await page.waitForSelector("text=视觉风格", { timeout: 5000 })
    await page.waitForTimeout(300)

    // 在 Dialog 中选择玻璃拟态风格
    await page.getByRole("button", { name: "玻璃拟态", exact: false }).click()
    await page.waitForTimeout(500)

    // 验证玻璃拟态样式
    const cards = page.locator(".glass-card")
    await expect(cards.first()).toBeVisible()
  })

  test("多标签页功能 - Tab页管理", async ({ page }) => {
    await page.goto("/")

    // 导航到订单管理
    await page.click("text=订单管理")
    await page.waitForTimeout(500)

    // 验证Tab页添加
    const tabBar = page.locator(".flex.h-10")
    await expect(tabBar).toContainText("订单管理")

    // 点击订单行打开明细Tab
    await page.click("tr:has-text('ORD-2024-001')")
    await page.waitForTimeout(500)

    // 验证新Tab页
    await expect(tabBar).toContainText("订单详情")
  })

  test("流程图模块 - ReactFlow", async ({ page }) => {
    await page.goto("/flow")
    await waitForI18n(page)

    await expect(page.locator(".react-flow")).toBeVisible()
    await expect(page.locator(".react-flow__node").first()).toBeVisible()

    // 测试重置按钮
    await page.click("button:has-text('重置')")
    await expect(page.locator(".react-flow__node").first()).toBeVisible()
  })

  test("统计图表模块 - Recharts", async ({ page }) => {
    await page.goto("/chart")
    await waitForI18n(page)

    await expect(page.getByRole("heading", { name: "折线图" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "柱状图" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "饼图" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "面积图" })).toBeVisible()
  })

  test("AI 对话模块", async ({ page }) => {
    await page.goto("/ai")
    await waitForI18n(page)

    await expect(page.getByRole("heading", { name: "AI 助手" })).toBeVisible()

    const input = page.getByPlaceholder("输入消息...")
    await input.fill("你好")
    await page.keyboard.press("Enter")

    await page.waitForTimeout(600)
    await expect(page.getByText("你好", { exact: true })).toBeVisible()
  })

  test("复杂布局模块", async ({ page }) => {
    await page.goto("/layout")
    await waitForI18n(page)

    await expect(page.getByRole("tab", { name: "网格布局" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "侧边栏布局" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "仪表盘布局" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "表单布局" })).toBeVisible()
  })

  test("设置页面", async ({ page }) => {
    await page.goto("/settings")
    await waitForI18n(page)

    await expect(page.getByRole("heading", { name: "个人信息" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "系统配置" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "关于系统" })).toBeVisible()
  })

  test("仪表盘统计卡片", async ({ page }) => {
    await page.goto("/")
    await waitForI18n(page)

    await expect(page.locator("text=用户总数")).toBeVisible()
    await expect(page.locator("text=订单数量")).toBeVisible()
    await expect(page.locator("text=总收入")).toBeVisible()
    await expect(page.locator("text=活跃度")).toBeVisible()
  })

  test("插件演示页面 - 自动加载验证", async ({ page }) => {
    await page.goto("/plugin-demo")
    await waitForI18n(page)
    await page.waitForTimeout(3000)

    await expect(
      page.getByRole("heading", { name: "插件演示模块" })
    ).toBeVisible({ timeout: 10000 })
    await expect(page.locator("text=共享依赖")).toBeVisible({ timeout: 5000 })
    await expect(page.locator("text=SystemJS 加载")).toBeVisible({
      timeout: 5000,
    })
  })
})
