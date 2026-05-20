const fs = require('fs');

const pages = {
  'src/pages/index.astro': { path: 'pages/index.astro', prefix: '../' },
  'src/pages/cart.astro': { path: 'pages/cart.astro', prefix: '../' },
  'src/pages/checkout.astro': { path: 'pages/checkout.astro', prefix: '../' },
  'src/pages/blog/index.astro': { path: 'pages/blog/index.astro', prefix: '../../' },
  'src/pages/blog/[slug].astro': { path: 'pages/blog/[slug].astro', prefix: '../../' },
  'src/pages/page/[slug].astro': { path: 'pages/page/[slug].astro', prefix: '../../' },
  'src/pages/order/success.astro': { path: 'pages/order/success.astro', prefix: '../../' },
  'src/pages/category/[slug].astro': { path: 'pages/category/[slug].astro', prefix: '../../' },
  'src/pages/products/[slug].astro': { path: 'pages/products/[slug].astro', prefix: '../../' },
};

for (const [file, info] of Object.entries(pages)) {
  if (!fs.existsSync(file)) {
    console.log(`Skipping ${file} (not found)`);
    continue;
  }
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(
    /from\s+['"][^'"]*Main\.astro['"]/g,
    `from '${info.prefix}layouts/Main.astro'`
  );
  content = content.replace(
    /from\s+['"][^'"]*lib\/config['"]/g,
    `from '${info.prefix}lib/config'`
  );
  fs.writeFileSync(file, content, 'utf-8');
  console.log(`Fixed: ${info.path} (prefix=${info.prefix})`);
}

// Verify
console.log('\nVerification:');
for (const [file] of Object.entries(pages)) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf-8');
  const mainMatch = content.match(/from\s+['"]([^'"]*Main\.astro)['"]/);
  const configMatch = content.match(/from\s+['"]([^'"]*lib\/config)['"]/);
  console.log(`  ${file}: Main=${mainMatch?.[1] || 'none'} Config=${configMatch?.[1] || 'none'}`);
}
