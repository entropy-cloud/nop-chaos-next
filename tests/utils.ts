import type { Page } from "@playwright/test"

export async function waitForI18n(page: Page) {
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(1000)

  try {
    await page.evaluate(async () => {
      const i18n = (window as any).i18next
      if (i18n) {
        if (i18n.isInitialized) {
          await i18n.changeLanguage("zh-CN")
        } else {
          i18n.on("initialized", () => {
            i18n.changeLanguage("zh-CN")
          })
        }
      }
    })
  } catch (e) {
    console.log("Failed to set language:", e)
  }

  await page.waitForTimeout(500)
}
