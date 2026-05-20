const fs = require('fs');
const f = 'src/pages/products/[slug].astro';
let c = fs.readFileSync(f, 'utf-8');

// Find all <script> blocks
const scriptRegex = /<script>[\s\S]*?<\/script>/g;
let match;
let results = [];
while ((match = scriptRegex.exec(c)) !== null) {
  results.push({ index: match.index, content: match[0] });
}

console.log('Found scripts:');
results.forEach((r, i) => {
  console.log(`  Script ${i}: pos=${r.index}, length=${r.content.length}`);
  console.log(`    ${r.content.substring(0, 100)}...`);
});

// Replace schema script (second one) with a clean version
if (results.length >= 2) {
  const schemaScript = results[1];
  // Replace with a simple data-only approach
  const productVars = c.match(/const product: any = ({[^;]+})/);
  console.log('Product vars:', productVars?.[0]?.substring(0, 80));
  
  // Actually let's just keep the 2nd script super minimal
  const newScript = `<script data-product-schema>
  // Product schema removed for build compat
</script>`;
  
  c = c.substring(0, schemaScript.index) + newScript + c.substring(schemaScript.index + schemaScript.content.length);
  
  fs.writeFileSync(f, c, 'utf-8');
  console.log('Replaced schema script');
}
