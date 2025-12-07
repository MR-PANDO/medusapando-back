/**
 * Post-build script to apply patches to .medusa/server/node_modules
 *
 * The medusa build command creates a fresh copy of node_modules in .medusa/server/
 * which doesn't have the patches applied by patch-package during npm install.
 * This script manually applies the necessary patches after the build.
 */

const fs = require('fs');
const path = require('path');

const MEDUSA_SERVER_DIR = path.join(__dirname, '..', '.medusa', 'server');
const PATCHES_DIR = path.join(__dirname, '..', 'patches');

// Define the patches to apply
const patches = [
  {
    name: '@medusajs/promotion',
    targetFile: 'node_modules/@medusajs/promotion/dist/utils/compute-actions/build-promotion-rule-query-filter-from-context.js',
    // The fix: replace the problematic code block that returns raw SQL
    find: /if \(attributeValueMap\.size === 0\) \{[\s\S]*?const noRulesSubquery[\s\S]*?return \{[\s\S]*?\[.*?raw.*?\][\s\S]*?\};[\s\S]*?\}/,
    replace: `if (attributeValueMap.size === 0) {
        // PATCHED: Return null to skip pre-filtering when context has no attributes
        // This avoids the MikroORM raw() function bug that causes SQL syntax errors
        // The original code tried to use raw() with a function callback, but it gets
        // serialized incorrectly causing "improper qualified name" errors
        return null;
    }`
  }
];

console.log('🔧 Applying post-build patches...\n');

// Check if .medusa/server exists
if (!fs.existsSync(MEDUSA_SERVER_DIR)) {
  console.log('⚠️  .medusa/server directory not found. Skipping patches.');
  process.exit(0);
}

let patchesApplied = 0;
let patchesFailed = 0;

for (const patch of patches) {
  const targetPath = path.join(MEDUSA_SERVER_DIR, patch.targetFile);

  console.log(`📦 Patching ${patch.name}...`);

  if (!fs.existsSync(targetPath)) {
    console.log(`   ⚠️  Target file not found: ${patch.targetFile}`);
    console.log(`   Skipping this patch.\n`);
    continue;
  }

  try {
    let content = fs.readFileSync(targetPath, 'utf8');

    // Check if already patched
    if (content.includes('PATCHED: Return null to skip pre-filtering')) {
      console.log(`   ✅ Already patched.\n`);
      patchesApplied++;
      continue;
    }

    // Apply the patch
    if (patch.find && patch.replace) {
      const newContent = content.replace(patch.find, patch.replace);

      if (newContent === content) {
        console.log(`   ⚠️  Pattern not found. The file may have a different structure.`);
        console.log(`   Attempting direct file replacement...\n`);

        // Fallback: Try to find and replace the specific problematic section
        const alternativeFind = 'if (attributeValueMap.size === 0) {';
        if (content.includes(alternativeFind)) {
          // Find the block and replace it entirely
          const startIndex = content.indexOf(alternativeFind);
          const searchArea = content.slice(startIndex);

          // Find the closing brace of this if block
          let braceCount = 0;
          let endIndex = 0;
          let foundStart = false;

          for (let i = 0; i < searchArea.length; i++) {
            if (searchArea[i] === '{') {
              braceCount++;
              foundStart = true;
            } else if (searchArea[i] === '}') {
              braceCount--;
              if (foundStart && braceCount === 0) {
                endIndex = i + 1;
                break;
              }
            }
          }

          if (endIndex > 0) {
            const blockToReplace = searchArea.slice(0, endIndex);
            const replacement = `if (attributeValueMap.size === 0) {
        // PATCHED: Return null to skip pre-filtering when context has no attributes
        // This avoids the MikroORM raw() function bug that causes SQL syntax errors
        // The original code tried to use raw() with a function callback, but it gets
        // serialized incorrectly causing "improper qualified name" errors
        return null;
    }`;

            const finalContent = content.slice(0, startIndex) + replacement + content.slice(startIndex + endIndex);
            fs.writeFileSync(targetPath, finalContent, 'utf8');
            console.log(`   ✅ Patch applied successfully (fallback method).\n`);
            patchesApplied++;
            continue;
          }
        }

        patchesFailed++;
        continue;
      }

      fs.writeFileSync(targetPath, newContent, 'utf8');
      console.log(`   ✅ Patch applied successfully.\n`);
      patchesApplied++;
    }
  } catch (error) {
    console.log(`   ❌ Error applying patch: ${error.message}\n`);
    patchesFailed++;
  }
}

console.log('─'.repeat(50));
console.log(`\n📊 Summary: ${patchesApplied} patch(es) applied, ${patchesFailed} failed.\n`);

if (patchesFailed > 0) {
  console.log('⚠️  Some patches failed. Check the output above for details.');
  process.exit(1);
}

console.log('✅ All patches applied successfully!\n');
