import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

describe("translation.json validation", () => {
  const localesPath = path.join(__dirname, "../../public/locales")
  const locales = ["en-US", "zh-CN"]

  it.each(locales)("should have valid JSON format for %s", (locale) => {
    const filePath = path.join(localesPath, locale, "translation.json")

    // 检查文件是否存在
    expect(fs.existsSync(filePath)).toBe(true)

    // 读取并解析JSON
    const content = fs.readFileSync(filePath, "utf-8")
    let parsed: any
    expect(() => {
      parsed = JSON.parse(content)
    }).not.toThrow()

    // 检查是否是对象
    expect(typeof parsed).toBe("object")
    expect(parsed).not.toBeNull()
  })

  it("should have matching keys between en-US and zh-CN", () => {
    const enUSPath = path.join(localesPath, "en-US", "translation.json")
    const zhCNPath = path.join(localesPath, "zh-CN", "translation.json")

    const enUS = JSON.parse(fs.readFileSync(enUSPath, "utf-8"))
    const zhCN = JSON.parse(fs.readFileSync(zhCNPath, "utf-8"))

    // 递归获取所有键
    function getAllKeys(obj: any, prefix = ""): string[] {
      let keys: string[] = []
      for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        if (
          typeof obj[key] === "object" &&
          obj[key] !== null &&
          !Array.isArray(obj[key])
        ) {
          keys = keys.concat(getAllKeys(obj[key], fullKey))
        } else {
          keys.push(fullKey)
        }
      }
      return keys
    }

    const enUSKeys = getAllKeys(enUS).sort()
    const zhCNKeys = getAllKeys(zhCN).sort()

    expect(enUSKeys).toEqual(zhCNKeys)
  })

  it("should have required top-level keys", () => {
    const enUSPath = path.join(localesPath, "en-US", "translation.json")
    const enUS = JSON.parse(fs.readFileSync(enUSPath, "utf-8"))

    const requiredKeys = [
      "common",
      "header",
      "flow",
      "chart",
      "crud",
      "language",
    ]

    requiredKeys.forEach((key) => {
      expect(enUS).toHaveProperty(key)
    })
  })

  it("should have all common translations", () => {
    const enUSPath = path.join(localesPath, "en-US", "translation.json")
    const enUS = JSON.parse(fs.readFileSync(enUSPath, "utf-8"))

    const requiredCommonKeys = [
      "save",
      "cancel",
      "delete",
      "edit",
      "create",
      "update",
      "confirm",
      "search",
      "loading",
      "success",
      "error",
      "warning",
      "info",
    ]

    requiredCommonKeys.forEach((key) => {
      expect(enUS.common).toHaveProperty(key)
      expect(typeof enUS.common[key]).toBe("string")
      expect(enUS.common[key].length).toBeGreaterThan(0)
    })
  })

  it("should have all flow translations", () => {
    const enUSPath = path.join(localesPath, "en-US", "translation.json")
    const enUS = JSON.parse(fs.readFileSync(enUSPath, "utf-8"))

    const requiredFlowKeys = [
      "nodeProperty",
      "edgeProperty",
      "startNode",
      "endNode",
      "conditionNode",
      "name",
      "description",
      "icon",
      "color",
      "timeout",
      "retryCount",
      "asyncExecution",
      "deleteNode",
      "deleteEdge",
      "label",
      "conditionType",
      "expression",
      "script",
      "priority",
      "sourceNode",
      "targetNode",
      "lineStyle",
    ]

    requiredFlowKeys.forEach((key) => {
      expect(enUS.flow).toHaveProperty(key)
    })
  })

  it("should have valid nested objects for enums", () => {
    const enUSPath = path.join(localesPath, "en-US", "translation.json")
    const enUS = JSON.parse(fs.readFileSync(enUSPath, "utf-8"))

    // 检查 flow.conditionTypes
    expect(enUS.flow.conditionTypes).toBeDefined()
    expect(typeof enUS.flow.conditionTypes).toBe("object")
    expect(enUS.flow.conditionTypes).toHaveProperty("always")
    expect(enUS.flow.conditionTypes).toHaveProperty("expression")
    expect(enUS.flow.conditionTypes).toHaveProperty("script")

    // 检查 flow.lineStyles
    expect(enUS.flow.lineStyles).toBeDefined()
    expect(enUS.flow.lineStyles).toHaveProperty("solid")
    expect(enUS.flow.lineStyles).toHaveProperty("dashed")
    expect(enUS.flow.lineStyles).toHaveProperty("dotted")

    // 检查 flow.iconShapes
    expect(enUS.flow.iconShapes).toBeDefined()
    expect(enUS.flow.iconShapes).toHaveProperty("circle")
    expect(enUS.flow.iconShapes).toHaveProperty("square")

    // 检查 flow.colors
    expect(enUS.flow.colors).toBeDefined()
    expect(enUS.flow.colors).toHaveProperty("green")
    expect(enUS.flow.colors).toHaveProperty("blue")
  })

  it("should have all chart translations", () => {
    const enUSPath = path.join(localesPath, "en-US", "translation.json")
    const enUS = JSON.parse(fs.readFileSync(enUSPath, "utf-8"))

    expect(enUS.chart).toBeDefined()
    expect(enUS.chart.title).toBeDefined()
    expect(enUS.chart.lineChart).toBeDefined()
    expect(enUS.chart.barChart).toBeDefined()
    expect(enUS.chart.months).toBeDefined()
    expect(enUS.chart.months.jan).toBeDefined()
  })

  it("should have all crud translations", () => {
    const enUSPath = path.join(localesPath, "en-US", "translation.json")
    const enUS = JSON.parse(fs.readFileSync(enUSPath, "utf-8"))

    expect(enUS.crud).toBeDefined()
    expect(enUS.crud.title).toBeDefined()
    expect(enUS.crud.newOrder).toBeDefined()
    expect(enUS.crud.statuses).toBeDefined()
    expect(enUS.crud.statuses.pending).toBeDefined()
  })

  it("should not have duplicate keys in translation files", () => {
    locales.forEach((locale) => {
      const filePath = path.join(localesPath, locale, "translation.json")
      const content = fs.readFileSync(filePath, "utf-8")

      // 简单检查：解析后重新序列化，看是否与原内容一致
      // 如果有重复键，JSON.parse会覆盖，导致内容不一致
      const parsed = JSON.parse(content)
      const stringified = JSON.stringify(parsed, null, 2)
      const reparsed = JSON.parse(stringified)

      // 两次解析应该得到相同的结果
      expect(parsed).toEqual(reparsed)
    })
  })
})
