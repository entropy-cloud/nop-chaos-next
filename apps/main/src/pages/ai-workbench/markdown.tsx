import type { ReactNode } from 'react'

export type MarkdownBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; code: string }

export function renderInlineMarkdown(text: string): ReactNode[] {
  const segments = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
  return segments.map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return <strong key={`${segment}-${index}`} className="font-semibold text-foreground">{segment.slice(2, -2)}</strong>
    }

    return <span key={`${segment}-${index}`}>{segment}</span>
  })
}

export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    if (trimmed.startsWith('```')) {
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index])
        index += 1
      }
      blocks.push({ type: 'code', code: codeLines.join('\n') })
      index += 1
      continue
    }

    if (/^-\s+/.test(trimmed)) {
      const items: string[] = []
      while (index < lines.length && /^-\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^-\s+/, ''))
        index += 1
      }
      blocks.push({ type: 'list', ordered: false, items })
      continue
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = []
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''))
        index += 1
      }
      blocks.push({ type: 'list', ordered: true, items })
      continue
    }

    const paragraphLines: string[] = []
    while (index < lines.length) {
      const current = lines[index].trim()
      if (!current || current.startsWith('```') || /^-\s+/.test(current) || /^\d+\.\s+/.test(current)) {
        break
      }
      paragraphLines.push(current)
      index += 1
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') })
  }

  return blocks
}

export function renderMarkdownBlocks(content: string) {
  return parseMarkdownBlocks(content).map((block, index) => {
    if (block.type === 'code') {
      return (
        <pre key={`code-${index}`} className="overflow-x-auto rounded-2xl border border-[hsl(var(--border))] bg-slate-950/90 px-4 py-3 text-[12px] text-slate-100">
          <code>{block.code}</code>
        </pre>
      )
    }

    if (block.type === 'list') {
      const Tag = block.ordered ? 'ol' : 'ul'
      return (
        <Tag key={`list-${index}`} className={block.ordered ? 'list-decimal space-y-2 pl-5' : 'list-disc space-y-2 pl-5'}>
          {block.items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </Tag>
      )
    }

    return (
      <p key={`paragraph-${index}`} className="leading-6">
        {renderInlineMarkdown(block.text)}
      </p>
    )
  })
}

export function aiWorkbenchTestUtils() {
  return {
    parseMarkdownBlocks
  }
}
