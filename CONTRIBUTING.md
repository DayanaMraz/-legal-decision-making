# Contributing to DigitalCourt

Thank you for your interest in contributing to DigitalCourt! We welcome contributions from developers of all experience levels. This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and constructive in all interactions
- Welcome diverse perspectives and experiences
- Focus on the code, not the person
- Help each other learn and grow

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- Basic understanding of Solidity and Hardhat
- Familiarity with Fully Homomorphic Encryption (FHE) concepts

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/yourusername/DigitalCourt.git
cd DigitalCourt

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Fill in your configuration (RPC URLs, private keys, etc.)
nano .env.local
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test test/DigitalCourt.test.ts

# Run with coverage
npm run test:coverage

# Run on specific network
npx hardhat test --network hardhat
npx hardhat test --network localhost
```

### Building the Project

```bash
# Compile contracts
npm run compile

# Generate TypeChain types
npm run typechain

# Build frontend (if applicable)
npm run build
```

## Development Workflow

### 1. Create a Feature Branch

```bash
# Create and checkout a new branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 2. Make Changes

Follow these guidelines:

- **Solidity Contracts**: Follow OpenZeppelin and community standards
- **Tests**: Write comprehensive tests for all new functionality
- **Comments**: Use JSDoc/TSDoc style comments explaining FHEVM concepts
- **Git Commits**: Write clear, descriptive commit messages

### 3. Test Your Changes

```bash
# Ensure tests pass
npm test

# Check code style
npm run lint

# Build successfully
npm run build
```

### 4. Submit Pull Request

- Push your branch to your fork
- Create a Pull Request to the main repository
- Provide a clear description of changes
- Reference any related issues
- Ensure CI/CD checks pass

## Code Standards

### Solidity Code

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/// @title DescriptiveTitle
/// @notice Clear description of what this contract does
/// @dev Technical implementation details for developers
contract ExampleContract {
    /// @notice Public function description
    /// @param paramName Parameter explanation
    /// @return returnValue Return value explanation
    function exampleFunction(uint256 paramName) external returns (bool) {
        // Implementation
    }
}
```

### TypeScript/JavaScript Code

```typescript
/**
 * @title Descriptive Function Title
 * @notice Clear explanation of functionality
 * @dev Technical implementation details
 * @param {Type} paramName - Parameter explanation
 * @returns {Type} Return value explanation
 * @example
 * const result = functionName(param);
 */
function functionName(paramName: Type): ReturnType {
    // Implementation
}
```

### Test File Structure

```typescript
describe("Feature Name", function () {
    // Setup and fixtures
    beforeEach(async function () {
        // Test setup
    });

    describe("Specific behavior", function () {
        it("should do something specific", async function () {
            // Arrange
            const input = "test";

            // Act
            const result = await functionUnderTest(input);

            // Assert
            expect(result).to.equal("expected");
        });
    });
});
```

## FHE-Specific Guidelines

When working with Fully Homomorphic Encryption features:

### 1. Type Widening Pattern

```solidity
// Convert smaller types to larger accumulators
euint8 vote = FHE.asEuint8(1);      // Individual vote
euint32 accumulator = FHE.asEuint32(vote); // Accumulation
```

### 2. Access Control Pattern

```solidity
// Always grant access after encryption
euint32 encrypted = FHE.asEuint32(value);
FHE.allow(encrypted, address(this));  // Allow contract operations
FHE.allow(encrypted, msg.sender);     // Allow user decryption
```

### 3. Complementary Calculation Pattern

```solidity
// Efficiently compute both outcomes from single input
euint32 guiltyVotes = vote32;
euint32 innocentVotes = FHE.sub(one, vote32); // 1 - vote
```

### 4. Decryption Strategy

```solidity
// Only decrypt aggregated results, never individual values
// This preserves privacy of individual decisions
uint32 totalGuiltyVotes = FHE.decrypt(encryptedGuiltyVotes);
```

## Documentation Guidelines

- Update relevant documentation when adding features
- Add inline comments for complex logic
- Include JSDoc/TSDoc comments with `@chapter` tags for categorization
- Write clear variable and function names
- Document security assumptions

## Testing Requirements

All contributions must include tests covering:

1. **Happy Path**: Normal operation with valid inputs
2. **Edge Cases**: Boundary conditions (min/max values, empty states)
3. **Error Cases**: Invalid inputs, unauthorized access
4. **Security**: Access control, reentrancy, state consistency
5. **FHE Operations**: Encryption, homomorphic operations, decryption

Example test structure:

```typescript
it("should handle voting correctly", async function () {
    // Arrange: Setup preconditions
    await authorizeJuror(caseId, juror);

    // Act: Execute the function being tested
    await castVote(caseId, vote);

    // Assert: Verify expected outcomes
    expect(hasVoted(caseId, juror)).to.be.true;
});
```

## Documentation Contributions

Documentation improvements are highly valued:

- Fix typos and improve clarity
- Add examples for complex concepts
- Document deployment procedures
- Add troubleshooting guides
- Improve FHE concept explanations

## Review Process

### What to Expect

1. **Initial Review**: Code style and completeness
2. **Technical Review**: Logic correctness and security
3. **FHE Review**: Proper FHE patterns and optimization
4. **Approval**: When all checks pass
5. **Merge**: Into the main branch

### Feedback

- Be open to feedback and suggestions
- Ask questions if feedback is unclear
- Iterate on improvements
- Thank reviewers for their time

## Reporting Issues

When reporting issues:

1. **Check existing issues** to avoid duplicates
2. **Provide clear reproduction steps**
3. **Include error messages and logs**
4. **Specify your environment** (OS, Node version, etc.)
5. **Include code samples** if applicable

## Security Considerations

When contributing security-related code:

1. **Never commit private keys or secrets**
2. **Follow OWASP guidelines**
3. **Consider attack vectors** (reentrancy, overflow, etc.)
4. **Add security tests**
5. **Document security assumptions**

## Performance Optimization

When optimizing code:

1. **Measure before and after** performance
2. **Document trade-offs** (code clarity vs. performance)
3. **Add benchmarks** if significant improvement
4. **Consider gas costs** for smart contracts

## Questions and Support

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and ideas
- **Zama Community**: [https://www.zama.ai/community](https://www.zama.ai/community)
- **Discord**: [https://discord.com/invite/zama](https://discord.com/invite/zama)

## License

By contributing to DigitalCourt, you agree that your contributions will be licensed under the MIT License.

## Additional Resources

- [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Hardhat Documentation](https://hardhat.org/getting-started)
- [OpenZeppelin Smart Contracts](https://docs.openzeppelin.com/contracts/)
- [Chai Testing Framework](https://www.chaijs.com/)

## Recognition

Contributors are recognized in:
- GitHub Contributors section
- Project documentation
- Regular contributor highlights

Thank you for making DigitalCourt better!
