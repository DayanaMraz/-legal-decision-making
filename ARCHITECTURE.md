# DigitalCourt Architecture Documentation

## Overview

DigitalCourt is a privacy-preserving jury voting system leveraging Fully Homomorphic Encryption (FHE) on the Ethereum blockchain. This document describes the system architecture, key components, and design patterns.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface Layer                   │
│  (Next.js Frontend with ethers.js Web3 Integration)      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ Smart Contract Interaction
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Smart Contract Layer (Solidity)             │
│  ┌─────────────────────────────────────────────────────┐│
│  │          DigitalCourt Core Contract                 ││
│  │  • Case Management                                  ││
│  │  • Juror Authorization & Certification              ││
│  │  • FHE Encrypted Voting                             ││
│  │  • Result Aggregation & Revelation                  ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │          FHE Libraries (TFHE, FHELib)               ││
│  │  • Encryption/Decryption Operations                 ││
│  │  • Homomorphic Arithmetic                           ││
│  │  • Access Control Management                        ││
│  └─────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │    OpenZeppelin Security Libraries                  ││
│  │  • Ownable: Owner-based access control              ││
│  │  • ReentrancyGuard: Protection against reentrancy   ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                       │
                       │ RPC Calls
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Blockchain Layer                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Sepolia Testnet (Ethereum Testnet)               │   │
│  │ Contract: 0x6af32dc352959fDf6C19C8Cf4f128dcCe... │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Zama Devnet (FHEVM Testnet)                      │   │
│  │ For FHE operation testing and validation         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Smart Contract (DigitalCourt.sol)

The main smart contract implementing the privacy-preserving jury voting system.

#### Key Data Structures

```solidity
struct JurorVote {
    euint8 encryptedVote;        // FHE encrypted vote (0=innocent, 1=guilty)
    bool hasVoted;               // Vote cast flag
    uint256 timestamp;           // Voting timestamp
    bytes32 commitment;          // Commitment hash for duplicate prevention
}

struct LegalCase {
    string title;                // Case title
    string description;          // Case description
    string evidenceHash;         // IPFS hash of evidence
    address judge;               // Judge/case creator address
    uint256 startTime;           // Voting period start
    uint256 endTime;             // Voting period end (3 days)
    uint256 requiredJurors;      // Required number of jurors (3-12)
    euint32 encryptedGuiltyVotes;     // FHE encrypted guilty vote total
    euint32 encryptedInnocentVotes;   // FHE encrypted innocent vote total
    bool active;                 // Case active status
    bool revealed;               // Results revealed status
    bool verdict;                // Final verdict (true=guilty, false=innocent)
    mapping(address => JurorVote) jurorVotes;
    address[] jurors;            // List of voting jurors
    mapping(address => bool) authorizedJurors;  // Authorized juror mapping
}
```

#### Key Functions

| Function | Access | Description |
|----------|--------|-------------|
| `createCase` | External | Create a new litigation |
| `castPrivateVote` | Authorized Juror | Cast FHE encrypted vote |
| `revealResults` | Judge | Decrypt and reveal final verdict |
| `certifyJuror` | Owner | Certify a juror as eligible |
| `authorizeJuror` | Judge | Authorize juror for specific case |
| `endVoting` | Judge or Public | Terminate voting period |
| `getCaseInfo` | Public | Retrieve case details |
| `getRevealedResults` | Public | Get decrypted results |

### 2. FHE Libraries (TFHE.sol, FHELib.sol)

Provides cryptographic primitives for Fully Homomorphic Encryption.

#### Key Operations

- **Encryption**: Convert plaintext values to encrypted handles (euint8, euint32)
- **Homomorphic Arithmetic**: FHE.add(), FHE.sub() on encrypted values
- **Decryption**: Convert encrypted results back to plaintext (only by authorized parties)
- **Access Control**: FHE.allow() grants permissions for encrypted value operations

#### Critical FHE Patterns

1. **Type Widening** - Convert euint8 votes to euint32 for accumulation
2. **Complementary Calculation** - Compute innocent votes as (1 - guilty vote)
3. **Access Control** - FHE.allow() enables contract operations on encrypted data
4. **Selective Decryption** - Only aggregate results are decrypted, not individual votes

### 3. Frontend (Next.js)

User interface for case creation, voting, and result viewing.

#### Key Pages

- **Home (`pages/index.js`)**: Case listing and navigation
- **Create Case**: Case creation form
- **Voting Interface**: FHE vote encryption and casting
- **Results Display**: Verdict and vote tally viewing

#### Technologies

- **Framework**: Next.js 14
- **Web3 Library**: ethers.js v6.8
- **State Management**: React hooks
- **Wallet Integration**: MetaMask / Web3 providers

## Data Flow

### 1. Case Creation Flow

```
Judge
  │
  └─→ createCase(title, description, evidence, jurorCount)
        │
        └─→ Create LegalCase struct
        └─→ Initialize FHE vote accumulators (0)
        └─→ FHE.allow(accumulators, address(this))
        └─→ Emit CaseCreated event
```

### 2. Juror Authorization Flow

```
Judge
  │
  └─→ authorizeJurors(caseId, [juror1, juror2, ...])
        │
        ├─→ Verify jurors are certified
        ├─→ Check jurors not already authorized
        ├─→ Mark jurors as authorized
        └─→ Emit JurorAuthorized events
```

### 3. Voting Flow

```
Juror
  │
  └─→ castPrivateVote(caseId, vote, commitment)
        │
        ├─→ Verify authorization and certification
        ├─→ Verify not already voted
        ├─→ Encrypt vote: FHE.asEuint8(vote)
        ├─→ Grant access: FHE.allow(encryptedVote, address(this))
        ├─→ Type widen and accumulate:
        │     encryptedGuiltyVotes = FHE.add(..., vote32)
        │     encryptedInnocentVotes = FHE.add(..., (1 - vote32))
        ├─→ Store vote record
        └─→ Emit VoteCast event
```

### 4. Result Revelation Flow

```
Judge
  │
  └─→ revealResults(caseId)
        │
        ├─→ Verify voting ended
        ├─→ Verify results not already revealed
        ├─→ Decrypt vote totals:
        │     guiltyVotes = FHE.decrypt(encryptedGuiltyVotes)
        │     innocentVotes = FHE.decrypt(encryptedInnocentVotes)
        ├─→ Determine verdict: (guiltyVotes > innocentVotes)
        ├─→ Update juror reputation (+5 per participant)
        └─→ Emit CaseRevealed event
```

## Security Architecture

### Access Control

1. **Role-Based Access Control**
   - Owner: System administrator, juror certification
   - Judge: Case creation, juror authorization, result revelation
   - Authorized Jurors: Vote casting for assigned cases
   - Public: Case information and result viewing

2. **Modifiers**
   - `onlyOwner`: Restricts to contract owner
   - `onlyJudge(caseId)`: Restricts to case judge
   - `onlyAuthorizedJuror(caseId)`: Restricts to certified, authorized jurors
   - `votingActive(caseId)`: Ensures voting period is active

3. **Reentrancy Protection**
   - `nonReentrant` modifier on `castPrivateVote` prevents re-entrance attacks

### Privacy Mechanisms

1. **Homomorphic Encryption**
   - Individual votes encrypted end-to-end
   - Votes remain encrypted during aggregation
   - Computation performed on encrypted data (no decryption needed)

2. **Vote Secrecy**
   - Individual votes never decrypted
   - Only aggregated totals revealed
   - Prevents vote coercion and bribery

3. **Commitment Scheme**
   - Jurors provide commitment hash with vote
   - Prevents duplicate voting
   - Enables later verification

### Vulnerability Mitigations

| Vulnerability | Mitigation |
|---------------|-----------|
| Reentrancy | `ReentrancyGuard` on critical functions |
| Double Voting | Commitment hash + `hasVoted` flag |
| Unauthorized Access | Role-based modifiers + certification |
| Overflow/Underflow | Type widening + Solidity 0.8.28 checks |
| Privacy Breach | Selective decryption (only aggregates) |

## FHE Implementation Details

### Encryption Strategy

```solidity
// Individual vote encryption
euint8 encryptedVote = FHE.asEuint8(vote);  // 0 or 1
FHE.allow(encryptedVote, address(this));     // Contract access

// Type widening for accumulation
euint32 vote32 = FHE.asEuint32(encryptedVote);
euint32 guiltyAccumulator = FHE.asEuint32(0);
euint32 guiltyAccumulator = FHE.add(guiltyAccumulator, vote32);
```

### Homomorphic Operations

```solidity
// Add encrypted values
euint32 sum = FHE.add(encryptedA, encryptedB);

// Subtract encrypted values
euint32 diff = FHE.sub(encryptedA, encryptedB);

// Conditional operations
euint32 result = FHE.ifThenElse(condition, trueVal, falseVal);
```

### Decryption Strategy

```solidity
// Only aggregate results are decrypted
uint32 totalGuiltyVotes = FHE.decrypt(encryptedGuiltyVotes);

// Individual votes remain encrypted throughout
// This preserves privacy of individual decisions
```

## Deployment Architecture

### Network Configuration

```javascript
// Hardhat networks
hardhat        // Local testing (FHEVM mock)
localhost      // Local node
sepolia        // Ethereum Sepolia Testnet (production)
zama           // Zama FHEVM Devnet (FHE testing)
```

### Contract Deployment

1. **Compilation**: Solidity → EVM bytecode
2. **Verification**: Contract source verification on block explorer
3. **Configuration**: Initialize with owner address
4. **Interaction**: Web3 integration for frontend

## Performance Considerations

### Gas Optimization

- FHE operations are computationally intensive
- Vote accumulation uses type widening to minimize operations
- Complementary calculation reduces encrypted value manipulations
- Batch operations reduce transaction overhead

### Scalability

- Jury size limited to 3-12 participants
- Single case per litigation (no complex nested data)
- Batch authorization of jurors
- Pagination support for case listing

## Testing Strategy

### Test Coverage

| Category | Tests | Focus |
|----------|-------|-------|
| Deployment | 3 | Initial state verification |
| Certification | 5 | Juror eligibility management |
| Case Creation | 5 | Litigation initialization |
| Authorization | 7 | Juror assignment |
| Voting | 8 | FHE vote casting |
| Lifecycle | 4 | Voting period management |
| Results | 8 | Decryption and revelation |
| Edge Cases | 5 | Boundary conditions |
| FHE Patterns | 4 | Cryptographic correctness |
| Anti-patterns | 2 | Security best practices |

### Test Execution

```bash
# Run all tests
npm test

# Run specific suite
npm test -- --grep "Voting"

# With coverage report
npm run test:coverage
```

## Development Workflow

### Local Development

1. Install dependencies: `npm install`
2. Set up environment: `cp .env.example .env.local`
3. Compile contracts: `npm run compile`
4. Run tests: `npm test`
5. Start local node: `npx hardhat node`
6. Deploy locally: `npm run deploy:local`

### Testnet Deployment

1. Configure environment variables
2. Run tests on Sepolia testnet
3. Deploy to testnet: `npm run deploy:sepolia`
4. Verify on block explorer
5. Test frontend integration

## Future Enhancements

1. **Scalability**
   - Larger jury pools
   - Multiple concurrent cases
   - Batch voting optimization

2. **Features**
   - Appeal mechanism
   - Judge recusal
   - Juror scoring system
   - Evidence upload integration

3. **Security**
   - Formal verification
   - Multi-signature requirements
   - Time-locked reveals

4. **UX**
   - Mobile optimization
   - Real-time notifications
   - Case progress tracking

## References

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Hardhat Documentation](https://hardhat.org)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
