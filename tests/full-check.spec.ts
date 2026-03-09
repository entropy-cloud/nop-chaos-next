import { test, expect } from "@playwright/test"
import { waitForI18n } from "./utils"

test.describe("完整功能验证", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[type="email"]', "test@example.com")
    await page.fill('input[type="password"]', "password123")
    await page.click('button:has-text("登录")')
    await page.waitForURL("/", { timeout: 10000 })
    await waitForI18n(page)
  })

  test("1. 首页加载和玻璃拟态样式", async ({ page }) => {
    // beforeEach已经处理了登录和导航，这里直接验证

    await expect(page.locator("h1")).toContainText("仪表盘")

    const cards = page.locator(".glass-card")
    await expect(cards.first()).toBeVisible()

    const html = page.locator("html")
    const htmlClass = (await html.getAttribute("class")) || ""
    expect(htmlClass).toContain("theme-glassmorphism")
  })

  test("2. 主题切换 - 亮/暗模式", async ({ page }) => {
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

    if (initialClass.includes("dark")) {
      expect(newClass).toContain("light")
    } else {
      expect(newClass).toContain("dark")
    }
  })

  test("3. 订单管理 - 列表显示", async ({ page }) => {
    await page.goto("/orders")
    await waitForI18n(page)

    await expect(page.getByRole("heading", { name: "订单管理" })).toBeVisible()
    await expect(page.locator("tr:has-text('ORD-2024-001')")).toBeVisible()
    await expect(page.locator("tr:has-text('ORD-2024-002')")).toBeVisible()
  })

  test("4. 订单管理 - 点击行打开详情", async ({ page }) => {
    await page.goto("/orders")
    await waitForI18n(page)

    await page.click("tr:has-text('ORD-2024-001')")
    await page.waitForTimeout(500)

    await expect(page).toHaveURL(/\/orders\/detail\/1/)
    await expect(page.getByRole("heading", { name: /订单详情/ })).toBeVisible()
    await expect(
      page.locator("p.font-medium").filter({ hasText: "ORD-2024-001" })
    ).toBeVisible()
  })

  test("5. 订单管理 - Drawer新增", async ({ page }) => {
    await page.goto("/orders")
    await waitForI18n(page)

    await page.click("button:has-text('新建订单')")
    await expect(page.getByRole("heading", { name: "新建订单" })).toBeVisible()

    await page.fill("input[placeholder*='客户名称']", "测试客户")
    await page.fill("input[type='email']", "test@example.com")
    await page.click("button:has-text('创建订单')")

    await expect(page.locator("text=订单创建成功")).toBeVisible()
  })

  test("6. 多标签页功能", async ({ page }) => {
    await page.goto("/")

    await page.click("text=订单管理")
    await page.waitForTimeout(500)

    const tabBar = page.locator(".flex.h-10")
    await expect(tabBar).toContainText("订单管理")

    await page.click("tr:has-text('ORD-2024-001')")
    await page.waitForTimeout(500)

    await expect(tabBar).toContainText("订单详情")
  })

  test("7. 流程图模块", async ({ page }) => {
    await page.goto("/flow")
    await waitForI18n(page)

    await expect(page.locator(".react-flow")).toBeVisible()
    await expect(page.locator(".react-flow__node").first()).toBeVisible()

    await page.click("button:has-text('重置')")
    await expect(page.locator(".react-flow__node").first()).toBeVisible()
  })

  test("8. 统计图表模块", async ({ page }) => {
    await page.goto("/chart")
    await waitForI18n(page)

    await expect(page.getByRole("heading", { name: "折线图" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "柱状图" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "饼图" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "面积图" })).toBeVisible()
  })

  test("9. AI 对话模块", async ({ page }) => {
    await page.goto("/ai")
    await waitForI18n(page)

    await expect(page.getByRole("heading", { name: "AI 助手" })).toBeVisible()

    const input = page.getByPlaceholder("输入消息...")
    await input.fill("你好")
    await page.keyboard.press("Enter")

    await page.waitForTimeout(600)
    await expect(page.getByText("你好", { exact: true })).toBeVisible()
  })

  test("10. 复杂布局模块", async ({ page }) => {
    await page.goto("/layout")
    await waitForI18n(page)

    await expect(page.getByRole("tab", { name: "网格布局" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "侧边栏布局" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "仪表盘布局" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "表单布局" })).toBeVisible()
  })

  test("11. 设置页面", async ({ page }) => {
    await page.goto("/settings")
    await waitForI18n(page)

    await expect(page.getByRole("heading", { name: "个人信息" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "系统配置" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "关于系统" })).toBeVisible()
  })

  test("12. 侧边栏导航", async ({ page }) => {
    await page.goto("/")
    await waitForI18n(page)

    await page.click("text=流程图")
    await page.waitForTimeout(500)
    await expect(page.locator(".react-flow")).toBeVisible()

    await page.click("text=统计图表")
    await page.waitForTimeout(500)
    await expect(page.getByRole("heading", { name: "折线图" })).toBeVisible()
  })

  test("13. 插件演示 - 自动加载验证", async ({ page }) => {
    await page.goto("/plugin-demo")
    await waitForI18n(page)
    await page.waitForTimeout(3000)

    await expect(
      page.getByRole("heading", { name: "插件演示模块" })
    ).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator("text=共享依赖")).toBeVisible({ timeout: 5000 })
    await expect(page.locator("text=SystemJS 加载")).toBeVisible({
      timeout: 5000,
    })
  })

  test("15. 主题风格切换", async ({ page }) => {
    await page.goto("/")
    await waitForI18n(page)

    const html = page.locator("html")

    await page.click('[data-testid="theme-toggle"]')
    await page.waitForSelector("text=视觉风格", { timeout: 5000 })
    await page.waitForTimeout(500)
    await page.getByRole("button", { name: "默认", exact: false }).click()
    await page.waitForTimeout(500)

    let htmlClass = (await html.getAttribute("class")) || ""
    expect(htmlClass).not.toContain("theme-glassmorphism")

    await page.keyboard.press("Escape")
    await page.waitForTimeout(300)

    await page.click('[data-testid="theme-toggle"]')
    await page.waitForSelector("text=视觉风格", { timeout: 5000 })
    await page.waitForTimeout(500)
    await page.getByRole("button", { name: "玻璃拟态", exact: false }).click()
    await page.waitForTimeout(500)

    htmlClass = (await html.getAttribute("class")) || ""
    expect(htmlClass).toContain("theme-glassmorphism")
  })
})
