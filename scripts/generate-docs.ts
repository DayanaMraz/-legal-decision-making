#!/usr/bin/env ts-node

/**
 * generate-docs - Generates GitBook-formatted documentation from contracts and tests
 *
 * This script automatically extracts documentation from Solidity contracts and TypeScript tests,
 * then generates GitBook-compatible markdown files with proper formatting.
 *
 * @chapter automation
 *
 * Usage: ts-node scripts/generate-docs.ts [options]
 *
 * Options:
 *   --all           Generate documentation for all examples
 *   --example NAME  Generate documentation for specific example
 *   --output DIR    Specify output directory (default: docs/)
 *
 * Examples:
 *   ts-node scripts/generate-docs.ts --all
 *   ts-node scripts/generate-docs.ts --example digital-court
 */

import * as fs from 'fs';
import * as path from 'path';

// Color codes for terminal output
enum Color {
  Reset = '\x1b[0m',
  Green = '\x1b[32m',
  Blue = '\x1b[34m',
  Yellow = '\x1b[33m',
  Red = '\x1b[31m',
  Cyan = '\x1b[36m',
  Magenta = '\x1b[35m',
}

function log(message: string, color: Color = Color.Reset): void {
  console.log(`${color}${message}${Color.Reset}`);
}

function success(message: string): void {
  log(`✅ ${message}`, Color.Green);
}

function info(message: string): void {
  log(`ℹ️  ${message}`, Color.Blue);
}

function error(message: string): never {
  log(`❌ Error: ${message}`, Color.Red);
  process.exit(1);
}

function warning(message: string): void {
  log(`⚠️  ${message}`, Color.Yellow);
}

// Documentation configuration interface
interface DocsConfig {
  title: string;
  description: string;
  contract: string;
  test: string;
  output: string;
  category: string;
  chapter?: string;
}

// Example configurations for documentation generation
const DOCS_CONFIG: Record<string, DocsConfig> = {
  'digital-court': {
    title: 'DigitalCourt - Privacy-Preserving Jury Voting',
    description: 'This example demonstrates a complete privacy-preserving jury voting system using FHEVM. It showcases encrypted voting, homomorphic aggregation, and public decryption of results while maintaining individual vote privacy.',
    contract: 'contracts/DigitalCourt.sol',
    test: 'test/DigitalCourt.test.ts',
    output: 'docs/digital-court.md',
    category: 'Advanced Examples',
    chapter: 'privacy-patterns',
  },
};

/**
 * Read file content safely
 */
function readFile(filePath: string): string {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    error(`File not found: ${filePath}`);
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

/**
 * Extract contract name from Solidity source
 */
function getContractName(content: string): string {
  const match = content.match(/^\s*contract\s+(\w+)(?:\s+is\s+|\s*\{)/m);
  return match ? match[1] : 'Contract';
}

/**
 * Extract description from contract comments
 */
function extractDescription(content: string): string {
  // Try to extract from multi-line comment
  const multiLineMatch = content.match(/\/\*\*[\s\S]*?@title\s+(.+?)[\s\S]*?\*\//);
  if (multiLineMatch) return multiLineMatch[1].trim();

  // Try @notice tag
  const noticeMatch = content.match(/@notice\s+(.+)/);
  if (noticeMatch) return noticeMatch[1].trim();

  // Try first comment
  const commentMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/);
  if (commentMatch) return commentMatch[1].trim();

  return '';
}

/**
 * Extract key features from contract
 */
function extractFeatures(contractContent: string): string[] {
  const features: string[] = [];

  // Extract struct definitions
  const structs = contractContent.match(/struct\s+(\w+)/g);
  if (structs) {
    structs.forEach(s => {
      const name = s.replace('struct ', '');
      features.push(`**${name}** data structure`);
    });
  }

  // Extract FHE operations
  if (contractContent.includes('FHE.asEuint')) features.push('**FHE Encryption** of values');
  if (contractContent.includes('FHE.add')) features.push('**Homomorphic Addition** on encrypted data');
  if (contractContent.includes('FHE.sub')) features.push('**Homomorphic Subtraction** on encrypted data');
  if (contractContent.includes('FHE.decrypt')) features.push('**Public Decryption** of aggregated results');
  if (contractContent.includes('FHE.allow')) features.push('**Access Control** for encrypted values');

  // Extract OpenZeppelin features
  if (contractContent.includes('Ownable')) features.push('**Ownable** access control');
  if (contractContent.includes('ReentrancyGuard')) features.push('**ReentrancyGuard** security');

  return features;
}

/**
 * Extract test statistics from test file
 */
function extractTestStats(testContent: string): { total: number; categories: string[] } {
  const describes = testContent.match(/describe\(["'](.+?)["']/g) || [];
  const its = testContent.match(/it\(["'](.+?)["']/g) || [];

  const categories = describes.map(d => d.replace(/describe\(["']/, '').replace(/["']$/, ''));

  return {
    total: its.length,
    categories: categories,
  };
}

/**
 * Generate GitBook-formatted markdown documentation
 */
function generateGitBookMarkdown(config: DocsConfig, contractContent: string, testContent: string): string {
  const contractName = getContractName(contractContent);
  const description = config.description || extractDescription(contractContent);
  const features = extractFeatures(contractContent);
  const testStats = extractTestStats(testContent);

  let markdown = `# ${config.title}\n\n`;
  markdown += `${description}\n\n`;

  // Key Features section
  if (features.length > 0) {
    markdown += `## 🎯 Key Features\n\n`;
    features.forEach(feature => {
      markdown += `- ${feature}\n`;
    });
    markdown += `\n`;
  }

  // FHE Concepts section
  markdown += `## 📚 FHEVM Concepts Demonstrated\n\n`;
  markdown += `This example demonstrates the following FHEVM concepts:\n\n`;
  markdown += `1. **Access Control** - Using \`FHE.allow()\` to grant permissions\n`;
  markdown += `2. **Encryption** - Converting plaintext to encrypted values with \`FHE.asEuint*()\`\n`;
  markdown += `3. **Homomorphic Operations** - Computing on encrypted data without decryption\n`;
  markdown += `4. **Public Decryption** - Revealing aggregated results only\n`;
  markdown += `5. **Type Widening** - Safe accumulation using larger encrypted types\n`;
  markdown += `6. **Complementary Calculation** - Efficient dual-value computation\n\n`;

  // Setup instructions
  markdown += `## 🚀 Quick Start\n\n`;
  markdown += `{% hint style="info" %}\n`;
  markdown += `To run this example correctly, make sure the files are placed in the following directories:\n\n`;
  markdown += `- \`.sol\` file → \`<your-project-root-dir>/contracts/\`\n`;
  markdown += `- \`.ts\` file → \`<your-project-root-dir>/test/\`\n\n`;
  markdown += `This ensures Hardhat can compile and test your contracts as expected.\n`;
  markdown += `{% endhint %}\n\n`;

  markdown += `### Installation\n\n`;
  markdown += `\`\`\`bash\n`;
  markdown += `npm install\n`;
  markdown += `npm run compile\n`;
  markdown += `npm test\n`;
  markdown += `\`\`\`\n\n`;

  // Test coverage
  markdown += `## 🧪 Test Coverage\n\n`;
  markdown += `This example includes comprehensive tests:\n\n`;
  markdown += `- **Total Tests**: ${testStats.total}+\n`;
  markdown += `- **Test Categories**: ${testStats.categories.length}\n\n`;

  if (testStats.categories.length > 0) {
    markdown += `**Test Suites**:\n`;
    testStats.categories.forEach(cat => {
      markdown += `- ${cat}\n`;
    });
    markdown += `\n`;
  }

  // Code tabs
  markdown += `## 📝 Implementation\n\n`;
  markdown += `{% tabs %}\n\n`;

  // Contract tab
  markdown += `{% tab title="${contractName}.sol" %}\n\n`;
  markdown += `\`\`\`solidity\n`;
  markdown += contractContent;
  markdown += `\n\`\`\`\n\n`;
  markdown += `{% endtab %}\n\n`;

  // Test tab
  const testFileName = path.basename(config.test);
  markdown += `{% tab title="${testFileName}" %}\n\n`;
  markdown += `\`\`\`typescript\n`;
  markdown += testContent;
  markdown += `\n\`\`\`\n\n`;
  markdown += `{% endtab %}\n\n`;

  markdown += `{% endtabs %}\n\n`;

  // Architecture section
  markdown += `## 🏗️ Architecture\n\n`;
  markdown += `### Contract Structure\n\n`;
  markdown += `The ${contractName} contract implements:\n\n`;
  markdown += `1. **State Management** - Secure storage of encrypted data\n`;
  markdown += `2. **Access Control** - Role-based permission system\n`;
  markdown += `3. **FHE Operations** - Homomorphic encryption and computation\n`;
  markdown += `4. **Event Logging** - Transparent activity tracking\n\n`;

  // Security section
  markdown += `## 🔒 Security Considerations\n\n`;
  markdown += `This implementation follows security best practices:\n\n`;
  markdown += `- ✅ **OpenZeppelin Libraries** - Industry-standard security patterns\n`;
  markdown += `- ✅ **Reentrancy Protection** - Guards against reentrancy attacks\n`;
  markdown += `- ✅ **Access Control** - Role-based permissions\n`;
  markdown += `- ✅ **Input Validation** - Comprehensive parameter checks\n`;
  markdown += `- ✅ **FHE Privacy** - Individual data never exposed\n\n`;

  // Additional resources
  markdown += `## 📖 Additional Resources\n\n`;
  markdown += `- [FHEVM Documentation](https://docs.zama.ai/fhevm)\n`;
  markdown += `- [Zama Community](https://www.zama.ai/community)\n`;
  markdown += `- [GitHub Repository](https://github.com/zama-ai/fhevm)\n`;
  markdown += `- [Discord Community](https://discord.com/invite/zama)\n\n`;

  // License
  markdown += `## 📄 License\n\n`;
  markdown += `This example is licensed under the MIT License.\n\n`;
  markdown += `---\n\n`;
  markdown += `**Built with ❤️ using [FHEVM](https://github.com/zama-ai/fhevm) by Zama**\n`;

  return markdown;
}

/**
 * Update or create SUMMARY.md for GitBook
 */
function updateSummary(exampleName: string, config: DocsConfig, outputDir: string): void {
  const summaryPath = path.join(outputDir, 'SUMMARY.md');

  let summary = '';
  if (fs.existsSync(summaryPath)) {
    summary = fs.readFileSync(summaryPath, 'utf-8');
  } else {
    info('Creating new SUMMARY.md');
    summary = `# Table of Contents\n\n`;
  }

  const outputFileName = path.basename(config.output);
  const linkText = config.title;
  const link = `- [${linkText}](${outputFileName})`;

  // Check if already in summary
  if (summary.includes(outputFileName)) {
    warning('Entry already exists in SUMMARY.md');
    return;
  }

  // Add to appropriate category
  const categoryHeader = `## ${config.category}`;
  let updatedSummary: string;

  if (summary.includes(categoryHeader)) {
    // Add under existing category
    const lines = summary.split('\n');
    const categoryIndex = lines.findIndex(line => line.trim() === categoryHeader);

    // Find insertion point (after category header and description)
    let insertIndex = categoryIndex + 1;
    while (insertIndex < lines.length && !lines[insertIndex].startsWith('##')) {
      if (lines[insertIndex].trim() === '' || lines[insertIndex].startsWith('#')) {
        break;
      }
      insertIndex++;
    }

    lines.splice(insertIndex, 0, link);
    updatedSummary = lines.join('\n');
  } else {
    // Add new category
    updatedSummary = summary.trim() + `\n\n${categoryHeader}\n\n${link}\n`;
  }

  fs.writeFileSync(summaryPath, updatedSummary);
  success('Updated SUMMARY.md');
}

/**
 * Generate documentation for a specific example
 */
function generateDocs(exampleName: string, outputDir: string): void {
  const config = DOCS_CONFIG[exampleName];

  if (!config) {
    error(`Unknown example: ${exampleName}\n\nAvailable examples:\n${Object.keys(DOCS_CONFIG).map(k => `  - ${k}`).join('\n')}`);
  }

  log(`\n${'='.repeat(70)}`, Color.Cyan);
  info(`Generating documentation for: ${config.title}`);
  log(`${'='.repeat(70)}\n`, Color.Cyan);

  // Read contract and test files
  log('📖 Reading source files...', Color.Blue);
  const contractContent = readFile(config.contract);
  const testContent = readFile(config.test);
  success('Source files loaded');

  // Generate GitBook markdown
  log('✍️  Generating markdown...', Color.Blue);
  const markdown = generateGitBookMarkdown(config, contractContent, testContent);
  success('Markdown generated');

  // Write output file
  log('💾 Writing documentation...', Color.Blue);
  const outputPath = path.join(outputDir, path.basename(config.output));

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, markdown);
  success(`Documentation written: ${path.basename(config.output)}`);

  // Update SUMMARY.md
  log('📑 Updating SUMMARY.md...', Color.Blue);
  updateSummary(exampleName, config, outputDir);

  log('\n' + '='.repeat(70), Color.Green);
  success(`Documentation for "${config.title}" generated successfully!`);
  log('='.repeat(70) + '\n', Color.Green);
}

/**
 * Generate documentation for all examples
 */
function generateAllDocs(outputDir: string): void {
  log('\n' + '╔' + '═'.repeat(68) + '╗', Color.Cyan);
  log('║' + ' '.repeat(15) + 'Generating All Documentation' + ' '.repeat(25) + '║', Color.Cyan);
  log('╚' + '═'.repeat(68) + '╝\n', Color.Cyan);

  let successCount = 0;
  let errorCount = 0;

  const examples = Object.keys(DOCS_CONFIG);
  log(`Found ${examples.length} example(s) to process\n`, Color.Blue);

  for (const exampleName of examples) {
    try {
      generateDocs(exampleName, outputDir);
      successCount++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log(`❌ Failed to generate docs for ${exampleName}: ${errorMessage}`, Color.Red);
      errorCount++;
    }
  }

  log('\n' + '='.repeat(70), Color.Green);
  log(`\n📊 Summary:`, Color.Cyan);
  log(`  ✅ Successfully generated: ${successCount}`, Color.Green);
  if (errorCount > 0) {
    log(`  ❌ Failed: ${errorCount}`, Color.Red);
  }
  log(`  📁 Output directory: ${outputDir}`, Color.Blue);
  log('\n' + '='.repeat(70) + '\n', Color.Green);
}

/**
 * Create initial SUMMARY.md structure
 */
function initializeSummary(outputDir: string): void {
  const summaryPath = path.join(outputDir, 'SUMMARY.md');

  if (fs.existsSync(summaryPath)) {
    warning('SUMMARY.md already exists, skipping initialization');
    return;
  }

  const summary = `# Table of Contents

## Getting Started
- [Introduction](../README.md)
- [Quick Start](../DEPLOYMENT_GUIDE.md)

## Core Documentation
- [Smart Contract Guide](../SMART_CONTRACT_GUIDE.md)
- [Architecture Overview](../ARCHITECTURE.md)
- [Frontend Integration](../FRONTEND_GUIDE.md)

## Examples

### Advanced Examples
<!-- Example documentation will be added here -->

### Privacy Patterns
<!-- Privacy pattern examples will be added here -->

## Learning Resources
- [FHEVM Tutorial](../HELLO_FHEVM_TUTORIAL.md)
- [Contributing Guide](../CONTRIBUTING.md)

## External Resources
- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Zama Community](https://www.zama.ai/community)
- [GitHub Repository](https://github.com/zama-ai/fhevm)
`;

  fs.writeFileSync(summaryPath, summary);
  success('SUMMARY.md initialized');
}

/**
 * Main execution
 */
function main(): void {
  const args = process.argv.slice(2);

  // Default output directory
  let outputDir = path.join(process.cwd(), 'docs');

  // Parse arguments
  let mode: 'help' | 'all' | 'example' | 'init' = 'help';
  let exampleName = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      mode = 'help';
      break;
    } else if (arg === '--all') {
      mode = 'all';
    } else if (arg === '--example') {
      mode = 'example';
      exampleName = args[++i];
    } else if (arg === '--output') {
      outputDir = args[++i];
    } else if (arg === '--init') {
      mode = 'init';
    }
  }

  // Execute based on mode
  if (mode === 'help' || (mode === 'example' && !exampleName)) {
    log('╔════════════════════════════════════════════════════════════════╗', Color.Cyan);
    log('║         FHEVM Documentation Generator - DigitalCourt           ║', Color.Cyan);
    log('╚════════════════════════════════════════════════════════════════╝', Color.Cyan);
    log('\nUsage: ts-node scripts/generate-docs.ts [options]\n');
    log('Options:', Color.Yellow);
    log('  --all              Generate documentation for all examples');
    log('  --example NAME     Generate documentation for specific example');
    log('  --output DIR       Specify output directory (default: docs/)');
    log('  --init             Initialize SUMMARY.md structure');
    log('  --help, -h         Show this help message\n');
    log('Available examples:', Color.Yellow);
    Object.entries(DOCS_CONFIG).forEach(([name, config]) => {
      log(`  📦 ${name}`, Color.Green);
      log(`     ${config.title}`, Color.Reset);
      log(`     Category: ${config.category}`, Color.Blue);
    });
    log('\nExamples:', Color.Yellow);
    log('  ts-node scripts/generate-docs.ts --all');
    log('  ts-node scripts/generate-docs.ts --example digital-court');
    log('  ts-node scripts/generate-docs.ts --init --output ./docs\n');
    process.exit(0);
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    success(`Created output directory: ${outputDir}`);
  }

  if (mode === 'init') {
    initializeSummary(outputDir);
  } else if (mode === 'all') {
    generateAllDocs(outputDir);
  } else if (mode === 'example') {
    generateDocs(exampleName, outputDir);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { generateDocs, generateAllDocs, DOCS_CONFIG };
