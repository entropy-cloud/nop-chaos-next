from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path


IMPORT_RE = re.compile(r'import(?:\s+[^\"\']+from\s+)?[\"\'](\./[^\"\']+)[\"\']')
EXPORT_FROM_RE = re.compile(r'export\s*\{[^}]*\}\s*from\s*[\"\'](\./[^\"\']+)[\"\']')
NAMED_IMPORT_RE = re.compile(r'import\s*\{([^}]*)\}\s*from\s*[\"\'](\./[^\"\']+)[\"\']')
DEFAULT_IMPORT_RE = re.compile(r'import\s+([A-Za-z_$][\w$]*)\s+from\s+[\"\'](\./[^\"\']+)[\"\']')
NAMESPACE_IMPORT_RE = re.compile(r'import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+[\"\'](\./[^\"\']+)[\"\']')
EXPORT_NAMED_RE = re.compile(r'export\s*\{([^}]*)\}(?!\s*from)')
EXPORT_DECL_RE = re.compile(r'export\s+(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)')
EXPORT_DEFAULT_RE = re.compile(r'export\s+default\b')


def classify_chunk(name: str) -> str:
  if name.startswith('page-'):
    return 'page'
  if name.startswith('vendor-'):
    return 'vendor'
  if name.startswith('pkg-'):
    return 'workspace'
  if name in {'shell-core', 'index'}:
    return 'host'
  if name.startswith('rolldown-runtime'):
    return 'runtime'
  return 'other'


def normalize_import(source: str) -> str:
  return Path(source).name


def parse_symbol_list(raw: str) -> list[str]:
  symbols = []
  for part in raw.split(','):
    token = part.strip()
    if not token:
      continue
    if ' as ' in token:
      token = token.split(' as ', 1)[1].strip()
    symbols.append(token)
  return symbols


def parse_chunk(path: Path) -> dict:
  text = path.read_text(encoding='utf-8', errors='replace')
  imports = [normalize_import(item) for item in IMPORT_RE.findall(text)]
  exports_from = [normalize_import(item) for item in EXPORT_FROM_RE.findall(text)]
  imported_symbols: dict[str, list[str]] = defaultdict(list)

  for raw_symbols, source in NAMED_IMPORT_RE.findall(text):
    imported_symbols[normalize_import(source)].extend(parse_symbol_list(raw_symbols))

  for symbol, source in DEFAULT_IMPORT_RE.findall(text):
    imported_symbols[normalize_import(source)].append(f'default:{symbol}')

  for symbol, source in NAMESPACE_IMPORT_RE.findall(text):
    imported_symbols[normalize_import(source)].append(f'namespace:{symbol}')

  exported_symbols = []
  for raw_symbols in EXPORT_NAMED_RE.findall(text):
    exported_symbols.extend(parse_symbol_list(raw_symbols))
  exported_symbols.extend(EXPORT_DECL_RE.findall(text))
  if EXPORT_DEFAULT_RE.search(text):
    exported_symbols.append('default')

  size = path.stat().st_size
  return {
    'name': path.name,
    'stem': path.stem,
    'size': size,
    'imports': sorted(set(imports + exports_from)),
    'imported_symbols': {key: sorted(set(value)) for key, value in imported_symbols.items()},
    'exports': sorted(set(exported_symbols)),
    'line_count': text.count('\n') + 1,
  }


def render_top(title: str, rows: list[tuple[str, int]], limit: int = 15) -> list[str]:
  lines = [title]
  for name, value in rows[:limit]:
    lines.append(f'  {name}: {value}')
  return lines


def main() -> int:
  parser = argparse.ArgumentParser(description='Analyze apps/main built chunk graph')
  parser.add_argument(
    '--dist',
    default='apps/main/dist/assets',
    help='Path to built assets directory'
  )
  parser.add_argument(
    '--json',
    default='',
    help='Optional path to write JSON report'
  )
  parser.add_argument(
    '--focus',
    default='',
    help='Chunk stem or filename substring to inspect in detail'
  )
  args = parser.parse_args()

  dist = Path(args.dist)
  if not dist.exists():
    raise SystemExit(f'Assets directory not found: {dist}')

  chunk_files = sorted(path for path in dist.glob('*.js') if not path.name.endswith('.js.gz'))
  chunks = {path.name: parse_chunk(path) for path in chunk_files}

  reverse_imports: dict[str, list[str]] = defaultdict(list)
  import_counts = Counter()

  for chunk in chunks.values():
    for target in chunk['imports']:
      if target in chunks:
        reverse_imports[target].append(chunk['name'])
      import_counts[target] += 1

  suspicious_pages = []
  tiny_chunks = []

  for chunk in chunks.values():
    chunk_type = classify_chunk(chunk['stem'])
    dependents = reverse_imports.get(chunk['name'], [])
    dependent_types = Counter(classify_chunk(Path(name).stem) for name in dependents)

    chunk['type'] = chunk_type
    chunk['dependents'] = sorted(dependents)
    chunk['dependent_types'] = dict(sorted(dependent_types.items()))

    if chunk_type == 'page':
      if dependent_types.get('vendor', 0) > 0 or dependent_types.get('workspace', 0) > 0 or dependent_types.get('host', 0) > 0:
        suspicious_pages.append(chunk)

    if chunk['size'] < 1024 and chunk['imports']:
      tiny_chunks.append(chunk)

  largest = sorted(((chunk['name'], chunk['size']) for chunk in chunks.values()), key=lambda item: item[1], reverse=True)
  most_depended = sorted(((name, len(reverse_imports.get(name, []))) for name in chunks), key=lambda item: item[1], reverse=True)
  most_imports = sorted(((chunk['name'], len(chunk['imports'])) for chunk in chunks.values()), key=lambda item: item[1], reverse=True)

  report_lines = []
  report_lines.extend(render_top('Largest chunks', largest))
  report_lines.append('')
  report_lines.extend(render_top('Most depended-on chunks', most_depended))
  report_lines.append('')
  report_lines.extend(render_top('Chunks importing most other chunks', most_imports))
  report_lines.append('')

  report_lines.append('Suspicious page chunks used as shared runtime')
  if suspicious_pages:
    for chunk in sorted(suspicious_pages, key=lambda item: (-len(item['dependents']), -item['size'])):
      report_lines.append(
        f"  {chunk['name']}: size={chunk['size']} dependents={len(chunk['dependents'])} dependent_types={chunk['dependent_types']}"
      )
      for dependent in chunk['dependents'][:20]:
        report_lines.append(f'    - {dependent}')
  else:
    report_lines.append('  none')

  report_lines.append('')
  report_lines.append('Tiny chunks (<1KB) that still import other chunks')
  for chunk in sorted(tiny_chunks, key=lambda item: item['name'])[:80]:
    report_lines.append(f"  {chunk['name']}: imports={chunk['imports']}")

  if args.focus:
    report_lines.append('')
    report_lines.append(f'Focus analysis for: {args.focus}')
    focused = [chunk for chunk in chunks.values() if args.focus in chunk['name'] or args.focus in chunk['stem']]

    if not focused:
      report_lines.append('  no matching chunk found')
    else:
      for chunk in focused:
        report_lines.append(f"  chunk: {chunk['name']}")
        report_lines.append(f"    type: {chunk['type']}")
        report_lines.append(f"    size: {chunk['size']}")
        report_lines.append(f"    exports: {chunk['exports'][:80]}")
        report_lines.append(f"    imports: {chunk['imports']}")
        report_lines.append(f"    dependents: {chunk['dependents'][:60]}")
        report_lines.append('    imported by symbol usage:')
        for dependent_name in chunk['dependents'][:80]:
          dependent = chunks.get(dependent_name)
          if not dependent:
            continue
          symbols = dependent['imported_symbols'].get(chunk['name'], [])
          report_lines.append(f'      - {dependent_name}: {symbols[:40]}')

  text_report = '\n'.join(report_lines)
  print(text_report)

  if args.json:
    output = {
      'chunks': list(chunks.values()),
      'largest': largest,
      'most_depended': most_depended,
      'most_imports': most_imports,
      'suspicious_pages': [chunk['name'] for chunk in suspicious_pages],
      'tiny_chunks': [chunk['name'] for chunk in tiny_chunks],
    }
    Path(args.json).write_text(json.dumps(output, indent=2), encoding='utf-8')

  return 0


if __name__ == '__main__':
  raise SystemExit(main())
