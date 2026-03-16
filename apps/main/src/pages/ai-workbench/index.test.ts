import { describe, expect, it } from 'vitest'
import { aiWorkbenchTestUtils } from './index'

describe('aiWorkbenchTestUtils.parseMarkdownBlocks', () => {
  it('parses unordered lists, ordered lists, and code blocks', () => {
    const { parseMarkdownBlocks } = aiWorkbenchTestUtils()
    const blocks = parseMarkdownBlocks('以下是建议：\n\n- 第一项\n- 第二项\n\n1. 步骤一\n2. 步骤二\n\n```txt\nhello\nworld\n```')

    expect(blocks).toEqual([
      { type: 'paragraph', text: '以下是建议：' },
      { type: 'list', ordered: false, items: ['第一项', '第二项'] },
      { type: 'list', ordered: true, items: ['步骤一', '步骤二'] },
      { type: 'code', code: 'hello\nworld' }
    ])
  })
})
