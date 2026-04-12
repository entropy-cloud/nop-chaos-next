# 包体积测量方法

## 方法1: 浏览器 DevTools 测量

### 步骤

1. 启动开发服务器
```bash
pnpm dev
```

2. 打开浏览器 DevTools → Network 标签

3. 勾选 "Disable cache" 和 "Preserve log"

4. 刷新页面，等待完全加载

5. 在 Network 标签中筛选 `*.js` 文件

6. 右键点击，选择 "Save all as HAR with content"

7. 使用脚本分析 HAR 文件

### 分析脚本

```typescript
// analyze-bundle.js
const fs = require('fs');
const har = JSON.parse(fs.readFileSync('network-activity.har', 'utf-8'));

const jsEntries = har.log.entries
  .filter(entry => entry.request.url.endsWith('.js'))
  .map(entry => ({
    url: entry.request.url,
    size: entry.response.content.size,
    encodedSize: entry.response.content.encodedSize || entry.response.content.size,
    name: entry.request.url.split('/').pop()
  }));

const totalSize = jsEntries.reduce((sum, entry) => sum + entry.size, 0);
const totalEncodedSize = jsEntries.reduce((sum, entry) => sum + entry.encodedSize, 0);

console.log(`Total JS files: ${jsEntries.length}`);
console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Total encoded (gzip/brotli): ${(totalEncodedSize / 1024 / 1024).toFixed(2)} MB`);

const amisChunks = jsEntries.filter(entry => entry.name.includes('amis'));
console.log(`\nAMIS chunks: ${amisChunks.length}`);
console.log(`AMIS size: ${(amisChunks.reduce((sum, e) => sum + e.size, 0) / 1024 / 1024).toFixed(2)} MB`);

const vendorChunks = jsEntries.filter(entry => entry.name.includes('vendor'));
console.log(`\nVendor chunks: ${vendorChunks.length}`);
console.log(`Vendor size: ${(vendorChunks.reduce((sum, e) => sum + e.size, 0) / 1024 / 1024).toFixed(2)} MB`);
```

### 运行分析

```bash
node analyze-bundle.js
```

## 方法2: WebPageTest 测量

### 步骤

1. 访问 https://www.webpagetest.org/

2. 输入测试 URL（本地开发时需要 tunnelling）

3. 选择测试配置：
   - Browser: Chrome
   - Location: 任意
   - Connectivity: 4G (15 Mbps)
   - Number of Tests: 1

4. 点击 "Start Test"

5. 等待测试完成

6. 查看结果：
   - "Waterfall" 视图查看加载时序
   - "Requests" 表格查看所有资源大小
   - "Assets" 标签查看 JS/CSS 资源详情

### 关键指标

- **Total Weight**: 所有资源的总大小
- **JS Size**: 所有 JS 文件的总大小
- **CSS Size**: 所有 CSS 文件的总大小
- **Time to First Byte (TTFB)**: 首字节时间
- **Time to Interactive (TTI)**: 可交互时间
- **Largest Contentful Paint (LCP)**: 最大内容绘制

## 方法3: Lighthouse 测量

### 步骤

1. 打开 Chrome DevTools → Lighthouse 标签

2. 选择 "Navigation" 分析

3. 取消勾选所有选项，只勾选 "Performance"

4. 点击 "Analyze page load"

5. 等待分析完成

6. 查看结果：
   - "Performance" 分数
   - "Reduce unused JavaScript" 建议
   - "Reduce unused CSS" 建议
   - "Total blocking time"

### 关键指标

- **Performance Score**: 性能分数 (0-100)
- **Total Blocking Time**: 总阻塞时间
- **Cumulative Layout Shift (CLS)**: 累积布局偏移
- **Largest Contentful Paint (LCP)**: 最大内容绘制
- **Time to Interactive (TTI)**: 可交互时间

## 方法4: 构建输出分析

### 步骤

1. 运行构建
```bash
pnpm build
```

2. 分析构建输出
```bash
# 分析所有 chunks
python scripts/analyze-main-chunks.py

# 分析特定 chunks
python scripts/analyze-main-chunks.py --focus vendor-amis
python scripts/analyze-main-chunks.py --focus host-entry
```

3. 查看生成的 stats.html
```bash
# 如果使用了 --mode analyze
open apps/main/dist/stats.html
```

### 分析构建输出

从构建输出中提取关键数据：

```bash
# 提取所有 JS 文件大小
cd apps/main/dist/assets
ls -lh *.js | awk '{sum+=$5} END {print "Total size:", sum/1024/1024, "MB"}'

# 提取 AMIS 相关文件
ls -lh *amis*.js | awk '{sum+=$5} END {print "AMIS size:", sum/1024/1024, "MB"}'

# 提取非 AMIS 文件（基础包）
ls -lh *.js | grep -v amis | awk '{sum+=$5} END {print "Base size:", sum/1024/1024, "MB"}'
```

## 方法5: Bundle Analyzer

### 安装 rollup-plugin-visualizer

已在 `vite.config.ts` 中配置：

```typescript
analyze
  ? visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap'
    })
  : null
```

### 使用

```bash
# 构建并生成分析报告
pnpm build:analyze

# 查看报告
open apps/main/dist/stats.html
```

### 分析报告

- **Tree Map**: 查看每个 chunk 的大小和依赖关系
- **Sunburst**: 查看模块的层级结构
- **Network**: 查看 chunk 加载顺序

## 对比优化前后

### 步骤

1. **测量优化前**
   ```bash
   # 切换到优化前的分支
   git checkout <before-optimization-branch>

   # 构建
   pnpm build

   # 测量
   node measure-bundle.js > before.json
   ```

2. **测量优化后**
   ```bash
   # 切换到优化后的分支
   git checkout <after-optimization-branch>

   # 构建
   pnpm build

   # 测量
   node measure-bundle.js > after.json
   ```

3. **对比分析**
   ```javascript
   // compare-bundles.js
   const before = require('./before.json');
   const after = require('./after.json');

   const reduction = before.totalSize - after.totalSize;
   const percentage = (reduction / before.totalSize * 100).toFixed(2);

   console.log(`Before: ${(before.totalSize / 1024 / 1024).toFixed(2)} MB`);
   console.log(`After: ${(after.totalSize / 1024 / 1024).toFixed(2)} MB`);
   console.log(`Reduction: ${(reduction / 1024 / 1024).toFixed(2)} MB (${percentage}%)`);
   ```

## 实际测量脚本

### measure-bundle.js

```javascript
const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'apps/main/dist/assets');

const jsFiles = fs.readdirSync(distPath)
  .filter(file => file.endsWith('.js'))
  .map(file => {
    const filePath = path.join(distPath, file);
    const stats = fs.statSync(filePath);
    return {
      name: file,
      size: stats.size,
      sizeKB: stats.size / 1024,
      sizeMB: stats.size / 1024 / 1024
    };
  });

const totalSize = jsFiles.reduce((sum, file) => sum + file.size, 0);

const amisFiles = jsFiles.filter(file => file.name.includes('amis'));
const fluxFiles = jsFiles.filter(file => file.name.includes('flux'));
const vendorFiles = jsFiles.filter(file => file.name.includes('vendor'));
const hostFiles = jsFiles.filter(file => file.name.includes('host-'));
const pageFiles = jsFiles.filter(file => file.name.includes('page-'));

console.log('=== Bundle Size Analysis ===');
console.log(`\nTotal files: ${jsFiles.length}`);
console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Total size (KB): ${(totalSize / 1024).toFixed(2)} KB`);

console.log('\n--- By Category ---');
console.log(`AMIS files: ${amisFiles.length}`);
console.log(`AMIS size: ${(amisFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB`);

console.log(`\nFlux files: ${fluxFiles.length}`);
console.log(`Flux size: ${(fluxFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB`);

console.log(`\nVendor files: ${vendorFiles.length}`);
console.log(`Vendor size: ${(vendorFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB`);

console.log(`\nHost files: ${hostFiles.length}`);
console.log(`Host size: ${(hostFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB`);

console.log(`\nPage files: ${pageFiles.length}`);
console.log(`Page size: ${(pageFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB`);

console.log('\n--- Largest 10 Files ---');
const largestFiles = [...jsFiles].sort((a, b) => b.size - a.size).slice(0, 10);
largestFiles.forEach((file, index) => {
  console.log(`${index + 1}. ${file.name}: ${file.sizeMB.toFixed(2)} MB (${file.sizeKB.toFixed(2)} KB)`);
});

// 输出 JSON 供后续分析
const result = {
  totalSize,
  totalSizeMB: totalSize / 1024 / 1024,
  totalSizeKB: totalSize / 1024,
  files: jsFiles,
  categories: {
    amis: {
      count: amisFiles.length,
      size: amisFiles.reduce((sum, f) => sum + f.size, 0)
    },
    flux: {
      count: fluxFiles.length,
      size: fluxFiles.reduce((sum, f) => sum + f.size, 0)
    },
    vendor: {
      count: vendorFiles.length,
      size: vendorFiles.reduce((sum, f) => sum + f.size, 0)
    },
    host: {
      count: hostFiles.length,
      size: hostFiles.reduce((sum, f) => sum + f.size, 0)
    },
    page: {
      count: pageFiles.length,
      size: pageFiles.reduce((sum, f) => sum + f.size, 0)
    }
  }
};

fs.writeFileSync('bundle-analysis.json', JSON.stringify(result, null, 2));
console.log('\nAnalysis saved to bundle-analysis.json');
```

### 使用

```bash
cd c:/can/nop/nop-chaos-next
node measure-bundle.js
```

## 实际对比示例

### 优化前测量

```bash
# 1. 保存当前优化后的代码
git stash

# 2. 切换到优化前的代码
git checkout commit-before-optimization

# 3. 构建
pnpm build

# 4. 测量
node measure-bundle.js > before-measurement.txt
```

### 优化后测量

```bash
# 1. 恢复优化后的代码
git checkout main

# 2. 构建
pnpm build

# 3. 测量
node measure-bundle.js > after-measurement.txt
```

### 对比

```bash
# 对比两个测量结果
node compare-bundles.js before-measurement.txt after-measurement.txt
```

## 建议的测量流程

为了得到准确的优化效果，建议按照以下流程：

1. **建立基准**: 在一个稳定分支上测量优化前的数据
2. **实施优化**: 进行代码优化
3. **测量优化后**: 在优化后的代码上测量
4. **对比分析**: 对比两次测量结果
5. **验证**: 在浏览器中验证实际加载效果

这样才能得到准确、可信的优化数据。
