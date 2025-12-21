#!/usr/bin/env ts-node

/**
 * create-fhevm-example - CLI tool to generate standalone FHEVM example repositories
 *
 * This script creates a new FHEVM example project based on the DigitalCourt template,
 * demonstrating privacy-preserving jury voting with Fully Homomorphic Encryption.
 *
 * @chapter automation
 *
 * Usage: ts-node scripts/create-fhevm-example.ts <example-name> [output-dir]
 *
 * Example: ts-node scripts/create-fhevm-example.ts privacy-voting ./my-privacy-voting
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Color codes for terminal output
enum Color {
  Reset = '\x1b[0m',
  Green = '\x1b[32m',
  Blue = '\x1b[34m',
  Yellow = '\x1b[33m',
  Red = '\x1b[31m',
  Cyan = '\x1b[36m',
}

function log(message: string, color: Color = Color.Reset): void {
  console.log(`${color}${message}${Color.Reset}`);
}

function error(message: string): never {
  log(`❌ Error: ${message}`, Color.Red);
  process.exit(1);
}

function success(message: string): void {
  log(`✅ ${message}`, Color.Green);
}

function info(message: string): void {
  log(`ℹ️  ${message}`, Color.Blue);
}

function warning(message: string): void {
  log(`⚠️  ${message}`, Color.Yellow);
}

// Example configuration interface
interface ExampleConfig {
  contract: string;
  test: string;
  description: string;
  category: string;
}

// Available FHEVM examples
const EXAMPLES_MAP: Record<string, ExampleConfig> = {
  'digital-court': {
    contract: 'contracts/DigitalCourt.sol',
    test: 'test/DigitalCourt.test.ts',
    description: 'Privacy-preserving jury voting system with FHE encrypted votes',
    category: 'Advanced Examples',
  },
  'privacy-voting': {
    contract: 'contracts/DigitalCourt.sol',
    test: 'test/DigitalCourt.test.ts',
    description: 'Confidential voting mechanism using FHEVM for anonymous jury decisions',
    category: 'Privacy Patterns',
  },
};

/**
 * Copy directory recursively, excluding unnecessary files
 */
function copyDirectoryRecursive(source: string, destination: string, excludeDirs: string[] = []): void {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const items = fs.readdirSync(source);

  items.forEach(item => {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);
    const stat = fs.statSync(sourcePath);

    if (stat.isDirectory()) {
      // Skip specified directories
      const defaultExclude = ['node_modules', 'artifacts', 'cache', 'coverage', 'types', 'dist', '.next', 'out'];
      if ([...defaultExclude, ...excludeDirs].includes(item)) {
        return;
      }
      copyDirectoryRecursive(sourcePath, destPath, excludeDirs);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  });
}

/**
 * Extract contract name from Solidity file
 */
function getContractName(contractPath: string): string | null {
  const content = fs.readFileSync(contractPath, 'utf-8');
  const match = content.match(/^\s*contract\s+(\w+)(?:\s+is\s+|\s*\{)/m);
  return match ? match[1] : null;
}

/**
 * Update deployment script for the specific contract
 */
function updateDeployScript(outputDir: string, contractName: string): void {
  const deployScriptPath = path.join(outputDir, 'scripts', 'deploy.js');

  const deployScript = `const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying ${contractName}...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance));

  // Deploy ${contractName}
  const ${contractName} = await ethers.getContractFactory("${contractName}");
  const ${contractName.toLowerCase()} = await ${contractName}.deploy();

  await ${contractName.toLowerCase()}.waitForDeployment();

  const address = await ${contractName.toLowerCase()}.getAddress();
  console.log("${contractName} deployed to:", address);

  // Save deployment info
  const deployment = {
    contract: "${contractName}",
    address: address,
    deployer: deployer.address,
    network: network.name,
    timestamp: new Date().toISOString(),
  };

  console.log("\\nDeployment completed successfully!");
  console.log(JSON.stringify(deployment, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`;

  fs.writeFileSync(deployScriptPath, deployScript);
  success('Updated deploy.js');
}

/**
 * Update package.json with example-specific information
 */
function updatePackageJson(outputDir: string, exampleName: string, description: string): void {
  const packageJsonPath = path.join(outputDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  packageJson.name = `fhevm-example-${exampleName}`;
  packageJson.description = description;
  packageJson.version = '1.0.0';
  packageJson.keywords = ['fhevm', 'fhe', 'privacy', 'blockchain', 'zama', exampleName];
  packageJson.repository = {
    type: 'git',
    url: `https://github.com/yourusername/fhevm-example-${exampleName}.git`
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  success('Updated package.json');
}

/**
 * Generate comprehensive README for the example
 */
function generateReadme(exampleName: string, description: string, contractName: string): string {
  return `# FHEVM Example: ${exampleName}

> ${description}

This example demonstrates privacy-preserving smart contracts using Fully Homomorphic Encryption (FHE) on the Ethereum blockchain with Zama's FHEVM.

## 🎯 What You'll Learn

- **FHE Encryption**: How to encrypt sensitive data on-chain
- **Homomorphic Operations**: Performing computations on encrypted data
- **Access Control**: Managing permissions for encrypted values
- **Public Decryption**: Revealing aggregated results while preserving individual privacy
- **Type Widening**: Safe accumulation of encrypted values
- **Best Practices**: FHE patterns and anti-patterns

## 📋 Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Package manager
- **Basic Solidity knowledge**
- **Understanding of blockchain concepts**

## 🚀 Quick Start

### 1. Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/yourusername/fhevm-example-${exampleName}.git
cd fhevm-example-${exampleName}

# Install dependencies
npm install
\`\`\`

### 2. Environment Setup

Create a \`.env.local\` file:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit \`.env.local\` with your configuration:

\`\`\`env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
SEPOLIA_PRIVATE_KEY=your_private_key_here
\`\`\`

### 3. Compile Contracts

\`\`\`bash
npm run compile
\`\`\`

### 4. Run Tests

\`\`\`bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
\`\`\`

## 📁 Project Structure

\`\`\`
.
├── contracts/              # Smart contracts
│   └── ${contractName}.sol
├── test/                   # Test files
│   └── ${contractName}.test.ts
├── scripts/                # Deployment scripts
│   └── deploy.js
├── docs/                   # Documentation
├── .env.example            # Environment template
├── hardhat.config.js       # Hardhat configuration
├── package.json            # Dependencies
└── README.md               # This file
\`\`\`

## 🔑 Key Concepts Demonstrated

### 1. FHE Encryption
\`\`\`solidity
euint8 encryptedValue = FHE.asEuint8(plainValue);
FHE.allow(encryptedValue, address(this));
\`\`\`

### 2. Homomorphic Operations
\`\`\`solidity
euint32 sum = FHE.add(encryptedA, encryptedB);
euint32 diff = FHE.sub(encryptedA, encryptedB);
\`\`\`

### 3. Public Decryption
\`\`\`solidity
uint32 result = FHE.decrypt(encryptedValue);
\`\`\`

### 4. Access Control
\`\`\`solidity
FHE.allow(encryptedValue, authorizedAddress);
\`\`\`

## 🧪 Testing

The test suite includes:

- ✅ **Unit Tests**: Individual function testing
- ✅ **Integration Tests**: Full workflow testing
- ✅ **Edge Cases**: Boundary conditions
- ✅ **Security Tests**: Access control and reentrancy
- ✅ **FHE Pattern Tests**: Best practices validation

Run specific test suites:

\`\`\`bash
# Run specific test file
npx hardhat test test/${contractName}.test.ts

# Run with gas reporting
REPORT_GAS=true npm test

# Run on specific network
npx hardhat test --network localhost
\`\`\`

## 🚢 Deployment

### Local Network

\`\`\`bash
# Start local node
npx hardhat node

# Deploy (in another terminal)
npx hardhat run scripts/deploy.js --network localhost
\`\`\`

### Sepolia Testnet

\`\`\`bash
# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Verify on Etherscan (optional)
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
\`\`\`

### Zama Devnet (for FHE testing)

\`\`\`bash
npx hardhat run scripts/deploy.js --network zama
\`\`\`

## 📚 Documentation

- **Contract Guide**: See [SMART_CONTRACT_GUIDE.md](./SMART_CONTRACT_GUIDE.md)
- **Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Contributing**: See [CONTRIBUTING.md](./CONTRIBUTING.md)
- **FHEVM Docs**: [https://docs.zama.ai/fhevm](https://docs.zama.ai/fhevm)

## 🔒 Security Considerations

- **Private Keys**: Never commit private keys or secrets
- **Access Control**: Always validate permissions
- **FHE Patterns**: Follow best practices for encrypted operations
- **Testing**: Comprehensive test coverage before deployment

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- [Zama](https://zama.ai) for FHEVM technology
- [OpenZeppelin](https://openzeppelin.com) for security libraries
- [Hardhat](https://hardhat.org) for development environment

## 📞 Support

- **Zama Community**: [https://www.zama.ai/community](https://www.zama.ai/community)
- **Discord**: [https://discord.com/invite/zama](https://discord.com/invite/zama)
- **Documentation**: [https://docs.zama.ai](https://docs.zama.ai)

---

**Built with ❤️ using [FHEVM](https://github.com/zama-ai/fhevm) by Zama**
`;
}

/**
 * Create standalone FHEVM example
 */
function createExample(exampleName: string, outputDir: string): void {
  const rootDir = process.cwd();

  // Check if example exists
  if (!EXAMPLES_MAP[exampleName]) {
    error(`Unknown example: ${exampleName}\n\nAvailable examples:\n${Object.keys(EXAMPLES_MAP).map(k => `  - ${k}: ${EXAMPLES_MAP[k].description}`).join('\n')}`);
  }

  const example = EXAMPLES_MAP[exampleName];
  const contractPath = path.join(rootDir, example.contract);
  const testPath = path.join(rootDir, example.test);

  // Validate paths exist
  if (!fs.existsSync(contractPath)) {
    error(`Contract not found: ${example.contract}`);
  }
  if (!fs.existsSync(testPath)) {
    error(`Test not found: ${example.test}`);
  }

  info(`Creating FHEVM example: ${exampleName}`);
  info(`Output directory: ${outputDir}`);

  // Step 1: Copy entire project as template
  log('\n📋 Step 1: Copying project template...', Color.Cyan);
  if (fs.existsSync(outputDir)) {
    error(`Output directory already exists: ${outputDir}`);
  }

  // Exclude frontend and unnecessary directories
  copyDirectoryRecursive(rootDir, outputDir, ['pages', '.github', '.git', 'docs']);
  success('Project template copied');

  // Step 2: Extract contract name
  log('\n📄 Step 2: Processing contract...', Color.Cyan);
  const contractName = getContractName(contractPath);
  if (!contractName) {
    error('Could not extract contract name from contract file');
  }
  success(`Contract identified: ${contractName}`);

  // Step 3: Update configuration files
  log('\n⚙️  Step 3: Updating configuration...', Color.Cyan);
  updateDeployScript(outputDir, contractName);
  updatePackageJson(outputDir, exampleName, example.description);
  success('Configuration updated');

  // Step 4: Generate README
  log('\n📝 Step 4: Generating README...', Color.Cyan);
  const readme = generateReadme(exampleName, example.description, contractName);
  fs.writeFileSync(path.join(outputDir, 'README.md'), readme);
  success('README.md generated');

  // Step 5: Clean up frontend-specific files
  log('\n🧹 Step 5: Cleaning up...', Color.Cyan);
  const filesToRemove = [
    'next.config.js',
    'next-env.d.ts',
    'vercel.json',
    'courthouse-server.js',
  ];

  filesToRemove.forEach(file => {
    const filePath = path.join(outputDir, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  success('Cleanup complete');

  // Step 6: Create minimal docs structure
  log('\n📚 Step 6: Creating documentation structure...', Color.Cyan);
  const docsDir = path.join(outputDir, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const summaryContent = `# Table of Contents

## Getting Started
- [Introduction](README.md)
- [Quick Start](DEPLOYMENT_GUIDE.md)

## Documentation
- [Smart Contract Guide](SMART_CONTRACT_GUIDE.md)
- [Architecture](ARCHITECTURE.md)
- [Contributing](CONTRIBUTING.md)

## Advanced
- [FHE Tutorial](HELLO_FHEVM_TUTORIAL.md)
`;

  fs.writeFileSync(path.join(docsDir, 'SUMMARY.md'), summaryContent);
  success('Documentation structure created');

  // Final summary
  log('\n' + '='.repeat(70), Color.Green);
  success(`FHEVM example "${exampleName}" created successfully!`);
  log('='.repeat(70), Color.Green);

  log('\n📦 Next steps:', Color.Yellow);
  log(`  cd ${path.relative(process.cwd(), outputDir)}`);
  log('  npm install');
  log('  npm run compile');
  log('  npm test');
  log('');
  log('📖 Documentation:', Color.Yellow);
  log('  - README.md for quick start guide');
  log('  - SMART_CONTRACT_GUIDE.md for contract details');
  log('  - ARCHITECTURE.md for system design');
  log('');
  log('🚀 Deployment:', Color.Yellow);
  log('  npx hardhat run scripts/deploy.js --network sepolia');

  log('\n🎉 Happy coding with FHEVM!', Color.Cyan);
}

/**
 * Main execution
 */
function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    log('╔════════════════════════════════════════════════════════════╗', Color.Cyan);
    log('║          FHEVM Example Generator - DigitalCourt            ║', Color.Cyan);
    log('╚════════════════════════════════════════════════════════════╝', Color.Cyan);
    log('\nUsage: ts-node scripts/create-fhevm-example.ts <example-name> [output-dir]\n');
    log('Available examples:', Color.Yellow);
    log('');
    Object.entries(EXAMPLES_MAP).forEach(([name, info]) => {
      log(`  📦 ${name}`, Color.Green);
      log(`     ${info.description}`, Color.Reset);
      log(`     Category: ${info.category}`, Color.Blue);
      log('');
    });
    log('Examples:', Color.Yellow);
    log('  ts-node scripts/create-fhevm-example.ts digital-court ./my-voting-system');
    log('  ts-node scripts/create-fhevm-example.ts privacy-voting ./privacy-demo\n');
    process.exit(0);
  }

  const exampleName = args[0];
  const outputDir = args[1] || path.join(process.cwd(), '..', `fhevm-example-${exampleName}`);

  createExample(exampleName, outputDir);
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { createExample, EXAMPLES_MAP };
