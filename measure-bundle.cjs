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

console.log('\n--- Core Runtime Files (Always Loaded) ---');
const coreFiles = jsFiles.filter(file =>
  file.name.includes('host-entry') ||
  file.name.includes('shell-core') ||
  file.name.includes('host-shell-runtime') ||
  file.name.includes('host-app-runtime') ||
  file.name.includes('rolldown-runtime') ||
  file.name.includes('vendor-misc') ||
  file.name.includes('vendor-react-json-view') ||
  file.name.includes('host-config-runtime')
);

console.log(`Core files: ${coreFiles.length}`);
console.log(`Core size: ${(coreFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB (${(coreFiles.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(2)} KB)`);

coreFiles.forEach(file => {
  console.log(`  - ${file.name}: ${file.sizeKB.toFixed(2)} KB`);
});

console.log('\n--- AMIS Files (Lazy Loaded) ---');
amisFiles.forEach(file => {
  console.log(`  - ${file.name}: ${file.sizeKB.toFixed(2)} KB`);
});

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
    },
    core: {
      count: coreFiles.length,
      size: coreFiles.reduce((sum, f) => sum + f.size, 0)
    }
  }
};

fs.writeFileSync('bundle-analysis.json', JSON.stringify(result, null, 2));
console.log('\nAnalysis saved to bundle-analysis.json');
