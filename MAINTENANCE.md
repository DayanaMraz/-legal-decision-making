# Maintenance Guide

This guide helps maintainers and contributors keep the DigitalCourt project up-to-date, well-documented, and ready for future enhancements.

## Table of Contents

- [Overview](#overview)
- [Version Management](#version-management)
- [Updating Dependencies](#updating-dependencies)
- [Adding New Examples](#adding-new-examples)
- [Documentation Updates](#documentation-updates)
- [Testing Strategy](#testing-strategy)
- [Release Process](#release-process)
- [Troubleshooting](#troubleshooting)

## Overview

DigitalCourt is built on the following tech stack:

- **Smart Contracts**: Solidity 0.8.28
- **Development Framework**: Hardhat
- **FHE Library**: @fhevm/solidity and @fhevm/hardhat-plugin
- **Testing**: Hardhat with Chai matchers
- **Frontend**: Next.js 14 (optional component)
- **TypeScript**: For automation and testing

### Key Dependencies

| Package | Purpose | Update Frequency |
|---------|---------|------------------|
| @fhevm/solidity | FHE operations | Check monthly |
| @fhevm/hardhat-plugin | FHEVM testing | Check monthly |
| hardhat | Development environment | Check quarterly |
| @openzeppelin/contracts | Security libraries | Check monthly |
| ethers | Blockchain interaction | Check quarterly |

## Version Management

### Semantic Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (x.0.0): Breaking changes to contracts or API
- **MINOR** (0.x.0): New features, backward compatible
- **PATCH** (0.0.x): Bug fixes, documentation updates

### Version File

Update version in `package.json`:

```json
{
  "version": "1.0.0"
}
```

## Updating Dependencies

### Checking for Updates

```bash
# Check outdated packages
npm outdated

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix
```

### Update Process

#### 1. Minor Updates (Safe)

```bash
# Update to latest minor/patch versions
npm update

# Test everything
npm test
npm run compile
```

#### 2. Major Updates (Careful)

```bash
# Update specific package
npm install @fhevm/solidity@latest

# Check breaking changes in changelog
# Update code if needed
# Run full test suite
npm test
```

#### 3. FHEVM Updates

FHEVM updates may require contract changes:

```bash
# Update FHEVM packages
npm install @fhevm/solidity@latest @fhevm/hardhat-plugin@latest

# Check migration guide: https://docs.zama.ai/fhevm
# Update contracts for new API
# Update tests for new patterns
npm run compile
npm test
```

#### 4. OpenZeppelin Updates

```bash
# Update OpenZeppelin contracts
npm install @openzeppelin/contracts@latest

# Review changelog: https://github.com/OpenZeppelin/openzeppelin-contracts/releases
# Check for breaking changes in Ownable, ReentrancyGuard
# Update imports if needed
```

### Testing After Updates

```bash
# 1. Clean build artifacts
rm -rf artifacts/ cache/ typechain/

# 2. Recompile
npm run compile

# 3. Run all tests
npm test

# 4. Check test coverage
npm run test:coverage

# 5. Test deployment
npx hardhat run scripts/deploy.js --network localhost
```

## Adding New Examples

To add a new FHEVM example to this project:

### 1. Create Contract

```bash
# Create new contract file
touch contracts/MyNewExample.sol
```

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@fhevm/solidity/lib/FHE.sol";

/// @title MyNewExample
/// @notice Brief description of what this example demonstrates
contract MyNewExample {
    // Implementation
}
```

### 2. Create Test File

```bash
# Create test file
touch test/MyNewExample.test.ts
```

```typescript
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

describe("MyNewExample", function () {
    // Tests
});
```

### 3. Update Automation Scripts

Edit `scripts/create-fhevm-example.ts`:

```typescript
const EXAMPLES_MAP: Record<string, ExampleConfig> = {
  // ... existing examples
  'my-new-example': {
    contract: 'contracts/MyNewExample.sol',
    test: 'test/MyNewExample.test.ts',
    description: 'Description of the example',
    category: 'Category Name',
  },
};
```

Edit `scripts/generate-docs.ts`:

```typescript
const DOCS_CONFIG: Record<string, DocsConfig> = {
  // ... existing configs
  'my-new-example': {
    title: 'My New Example Title',
    description: 'Detailed description...',
    contract: 'contracts/MyNewExample.sol',
    test: 'test/MyNewExample.test.ts',
    output: 'docs/my-new-example.md',
    category: 'Category Name',
  },
};
```

### 4. Generate Documentation

```bash
# Generate docs for new example
npx ts-node scripts/generate-docs.ts --example my-new-example

# Or regenerate all docs
npx ts-node scripts/generate-docs.ts --all
```

### 5. Test Example Generation

```bash
# Test the example generator
npx ts-node scripts/create-fhevm-example.ts my-new-example ./test-output
cd test-output
npm install
npm test
```

## Documentation Updates

### Updating Existing Documentation

1. **Contract Documentation**:
   - Add JSDoc comments to all public functions
   - Include `@notice`, `@dev`, `@param`, `@return` tags
   - Document security considerations

2. **Test Documentation**:
   - Add comments explaining test scenarios
   - Include `@chapter` tags for categorization
   - Document edge cases and anti-patterns

3. **README Updates**:
   - Keep installation instructions current
   - Update deployment addresses after redeployment
   - Add new features to feature list

### Regenerating Documentation

```bash
# Regenerate all GitBook docs
npx ts-node scripts/generate-docs.ts --all

# Regenerate specific example
npx ts-node scripts/generate-docs.ts --example digital-court

# Initialize new SUMMARY.md
npx ts-node scripts/generate-docs.ts --init
```

### Documentation Checklist

- [ ] Contract comments updated
- [ ] Test descriptions clear
- [ ] README.md reflects current state
- [ ] SMART_CONTRACT_GUIDE.md updated with new patterns
- [ ] ARCHITECTURE.md updated if structure changed
- [ ] GitBook docs regenerated
- [ ] SUMMARY.md includes new examples

## Testing Strategy

### Test Categories

Maintain comprehensive coverage across:

1. **Unit Tests**: Individual function testing
2. **Integration Tests**: Full workflow testing
3. **Security Tests**: Access control, reentrancy
4. **FHE Pattern Tests**: Encryption, operations, decryption
5. **Edge Cases**: Boundary conditions, error handling

### Adding New Tests

```typescript
describe("New Feature", function () {
  beforeEach(async function () {
    // Setup
  });

  it("should handle normal case", async function () {
    // Test normal operation
  });

  it("should revert on invalid input", async function () {
    // Test error cases
  });

  it("should maintain security constraints", async function () {
    // Test security
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/DigitalCourt.test.ts

# Run with gas reporting
REPORT_GAS=true npm test

# Run with coverage
npm run test:coverage

# Run on different network
npx hardhat test --network sepolia
```

### Test Maintenance

- **Monthly**: Run full test suite
- **After dependency updates**: Full test suite
- **Before releases**: Full test suite + coverage report
- **After contract changes**: Affected tests + regression tests

## Release Process

### Pre-Release Checklist

- [ ] All tests passing
- [ ] Documentation up-to-date
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Contracts compiled without warnings
- [ ] Security audit completed (for major releases)
- [ ] Deployment tested on testnet

### Creating a Release

#### 1. Update Version

```bash
# Update package.json version
npm version patch|minor|major
```

#### 2. Update CHANGELOG

```markdown
## [1.1.0] - 2025-12-XX

### Added
- New feature X
- Enhanced documentation

### Changed
- Updated dependency Y to version Z

### Fixed
- Bug fix for issue #123
```

#### 3. Tag Release

```bash
git add .
git commit -m "Release v1.1.0"
git tag -a v1.1.0 -m "Release version 1.1.0"
git push origin main --tags
```

#### 4. Deploy to Testnet

```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Verify contract
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

#### 5. Create GitHub Release

1. Go to GitHub Releases
2. Draft new release
3. Select tag v1.1.0
4. Add release notes from CHANGELOG
5. Publish release

### Post-Release

- Update README with new contract address
- Announce in Discord/Twitter
- Update documentation site
- Monitor for issues

## Troubleshooting

### Common Issues

#### Compilation Errors

**Problem**: Contracts fail to compile

```bash
# Solution: Clean and rebuild
rm -rf artifacts/ cache/ typechain/
npm run compile
```

#### Test Failures After Update

**Problem**: Tests fail after dependency update

```bash
# Solution: Check breaking changes
# 1. Read changelog of updated package
# 2. Update test imports if needed
# 3. Update contract code for new API
# 4. Regenerate types
npm run compile
```

#### FHEVM Plugin Issues

**Problem**: FHEVM mock not working

```bash
# Solution: Ensure correct plugin version
npm install @fhevm/hardhat-plugin@latest

# Check hardhat.config.js has:
require("@fhevm/hardhat-plugin");
```

#### TypeScript Errors

**Problem**: TypeScript compilation errors

```bash
# Solution: Regenerate TypeChain types
npx hardhat typechain
npm run compile
```

### Getting Help

1. **Documentation**: Check [FHEVM docs](https://docs.zama.ai/fhevm)
2. **Community**: Ask in [Zama Discord](https://discord.com/invite/zama)
3. **Issues**: Search [GitHub issues](https://github.com/zama-ai/fhevm/issues)
4. **Forum**: Post in [Zama Community Forum](https://www.zama.ai/community)

## Continuous Improvement

### Regular Maintenance Tasks

#### Weekly
- [ ] Check for security advisories
- [ ] Review open issues
- [ ] Monitor Discord for common questions

#### Monthly
- [ ] Check for dependency updates
- [ ] Review and update documentation
- [ ] Analyze test coverage
- [ ] Update roadmap

#### Quarterly
- [ ] Major dependency updates
- [ ] Security audit
- [ ] Performance review
- [ ] Documentation overhaul

### Performance Monitoring

Track key metrics:

- **Gas Costs**: Monitor and optimize
- **Test Execution Time**: Keep under 2 minutes
- **Build Time**: Keep under 30 seconds
- **Coverage**: Maintain > 90%

### Community Engagement

- Respond to issues within 48 hours
- Review pull requests within 1 week
- Update documentation based on feedback
- Share learnings and best practices

## Automation Scripts

### Available Scripts

```json
{
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "test:coverage": "hardhat coverage",
    "deploy:local": "hardhat run scripts/deploy.js --network localhost",
    "deploy:sepolia": "hardhat run scripts/deploy.js --network sepolia",
    "generate:example": "ts-node scripts/create-fhevm-example.ts",
    "generate:docs": "ts-node scripts/generate-docs.ts --all",
    "clean": "hardhat clean && rm -rf typechain/"
  }
}
```

### Using Automation

```bash
# Create new example
npm run generate:example digital-court ./my-project

# Generate all documentation
npm run generate:docs

# Clean and rebuild
npm run clean
npm run compile
```

## Conclusion

Regular maintenance ensures:

- ✅ Security vulnerabilities addressed
- ✅ Documentation stays current
- ✅ Code quality remains high
- ✅ Community stays engaged
- ✅ Project remains competitive

For questions or suggestions, please open an issue or reach out in the Zama Discord community.

---

**Last Updated**: December 2025
**Maintainers**: DigitalCourt Team
**License**: MIT
