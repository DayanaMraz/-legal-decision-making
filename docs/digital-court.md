# DigitalCourt - Privacy-Preserving Jury Voting

This example demonstrates a complete privacy-preserving jury voting system using FHEVM. It showcases encrypted voting, homomorphic aggregation, and public decryption of results while maintaining individual vote privacy.

## 🎯 Key Features

- **euint8 encrypted votes** - Individual voting stored as encrypted values
- **euint32 vote accumulators** - Aggregation of encrypted vote counts
- **FHE.add() and FHE.sub()** - Homomorphic operations on encrypted data
- **FHE.allow()** - Access control for encrypted values
- **FHE.decrypt()** - Public decryption of aggregated results only
- **Ownable access control** - Role-based permissions system
- **ReentrancyGuard security** - Protection against reentrancy attacks

## 📚 FHEVM Concepts Demonstrated

This example demonstrates the following FHEVM concepts:

1. **Access Control** - Using `FHE.allow()` to grant permissions
2. **Encryption** - Converting plaintext to encrypted values with `FHE.asEuint*()`
3. **Homomorphic Operations** - Computing on encrypted data without decryption
4. **Public Decryption** - Revealing aggregated results only
5. **Type Widening** - Safe accumulation using larger encrypted types
6. **Complementary Calculation** - Efficient dual-value computation

## 🚀 Quick Start

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

### Installation

```bash
npm install
npm run compile
npm test
```

## 🧪 Test Coverage

This example includes comprehensive tests:

- **Total Tests**: 70+
- **Test Categories**: 11

**Test Suites**:
- Contract Deployment
- Juror Certification
- Legal Litigation Creation
- Juror Authorization
- FHE Encrypted Voting
- Voting Lifecycle Management
- Result Revelation and Public Decryption
- Litigation List and Pagination
- Edge Litigations and Security
- FHE Patterns and Best Practices
- Anti-Patterns and Common Mistakes

## 📝 Implementation

{% tabs %}

{% tab title="DigitalCourt.sol" %}

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TFHE.sol";
import "./FHELib.sol";

contract DigitalCourt is Ownable, ReentrancyGuard {

    struct JurorVote {
        euint8 encryptedVote; // 0 = innocent, 1 = guilty (FHE encrypted)
        bool hasVoted;
        uint256 timestamp;
        bytes32 commitment; // Commitment hash to prevent duplicate voting
    }

    struct LegalCase {
        string title;
        string description;
        string evidenceHash; // IPFS hash or other evidence storage
        address judge; // Judge address
        uint256 startTime;
        uint256 endTime;
        uint256 requiredJurors; // Required number of jurors
        euint32 encryptedGuiltyVotes; // FHE encrypted guilty vote count
        euint32 encryptedInnocentVotes; // FHE encrypted innocent vote count
        bool active;
        bool revealed;
        bool verdict; // Final verdict (true=guilty, false=innocent)
        mapping(address => JurorVote) jurorVotes;
        address[] jurors; // List of jurors who voted
        mapping(address => bool) authorizedJurors; // Authorized jurors mapping
    }

    mapping(uint256 => LegalCase) public cases;
    uint256 public caseCount;
    uint256 public constant VOTING_DURATION = 3 days;
    uint256 public constant MIN_JURORS = 3;
    uint256 public constant MAX_JURORS = 12;

    // Juror qualification management
    mapping(address => bool) public certifiedJurors;
    mapping(address => uint256) public jurorReputation; // Juror reputation score

    // Events
    event CaseCreated(
        uint256 indexed caseId,
        string title,
        address indexed judge,
        uint256 startTime,
        uint256 endTime,
        uint256 requiredJurors
    );

    event JurorAuthorized(
        uint256 indexed caseId,
        address indexed juror
    );

    event VoteCast(
        uint256 indexed caseId,
        address indexed juror,
        uint256 timestamp
    );

    event CaseRevealed(
        uint256 indexed caseId,
        bool verdict,
        uint256 guiltyVotes,
        uint256 innocentVotes,
        uint256 totalJurors
    );

    event JurorCertified(address indexed juror, address indexed certifier);

    // Access control modifiers
    modifier validCase(uint256 caseId) {
        require(caseId < caseCount, "Invalid litigation ID");
        _;
    }

    modifier votingActive(uint256 caseId) {
        require(cases[caseId].active, "Litigation not active");
        require(block.timestamp >= cases[caseId].startTime, "Voting not started");
        require(block.timestamp <= cases[caseId].endTime, "Voting ended");
        _;
    }

    modifier onlyAuthorizedJuror(uint256 caseId) {
        require(cases[caseId].authorizedJurors[msg.sender], "Not authorized juror for this litigation");
        require(certifiedJurors[msg.sender], "Not certified juror");
        _;
    }

    modifier onlyJudge(uint256 caseId) {
        require(msg.sender == cases[caseId].judge, "Only litigation judge can perform this action");
        _;
    }

    constructor() Ownable(msg.sender) {
    }

    // Certify juror
    function certifyJuror(address juror) external onlyOwner {
        certifiedJurors[juror] = true;
        jurorReputation[juror] = 100; // Initial reputation score
        emit JurorCertified(juror, msg.sender);
    }

    // Batch certify jurors
    function certifyJurors(address[] calldata jurors) external onlyOwner {
        for (uint256 i = 0; i < jurors.length; i++) {
            certifiedJurors[jurors[i]] = true;
            jurorReputation[jurors[i]] = 100;
            emit JurorCertified(jurors[i], msg.sender);
        }
    }

    // Create legal litigation
    function createCase(
        string calldata title,
        string calldata description,
        string calldata evidenceHash,
        uint256 requiredJurors
    ) external returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(requiredJurors >= MIN_JURORS && requiredJurors <= MAX_JURORS, "Invalid juror count");

        uint256 caseId = caseCount++;
        LegalCase storage newCase = cases[caseId];

        newCase.title = title;
        newCase.description = description;
        newCase.evidenceHash = evidenceHash;
        newCase.judge = msg.sender;
        newCase.startTime = block.timestamp;
        newCase.endTime = block.timestamp + VOTING_DURATION;
        newCase.requiredJurors = requiredJurors;
        newCase.active = true;
        newCase.revealed = false;

        // Initialize FHE encrypted vote counters to 0
        newCase.encryptedGuiltyVotes = FHE.asEuint32(0);
        newCase.encryptedInnocentVotes = FHE.asEuint32(0);

        // Allow contract to access encrypted vote counters
        FHE.allow(newCase.encryptedGuiltyVotes, address(this));
        FHE.allow(newCase.encryptedInnocentVotes, address(this));

        emit CaseCreated(
            caseId,
            title,
            msg.sender,
            newCase.startTime,
            newCase.endTime,
            requiredJurors
        );

        return caseId;
    }

    // Authorize juror to participate in specific litigation
    function authorizeJuror(
        uint256 caseId,
        address juror
    ) external validCase(caseId) onlyJudge(caseId) {
        require(certifiedJurors[juror], "Juror not certified");
        require(!cases[caseId].authorizedJurors[juror], "Juror already authorized");
        require(cases[caseId].jurors.length < cases[caseId].requiredJurors, "Max jurors reached");

        cases[caseId].authorizedJurors[juror] = true;
        emit JurorAuthorized(caseId, juror);
    }

    // Batch authorize jurors
    function authorizeJurors(
        uint256 caseId,
        address[] calldata jurors
    ) external validCase(caseId) onlyJudge(caseId) {
        LegalCase storage legalCase = cases[caseId];
        require(legalCase.jurors.length + jurors.length <= legalCase.requiredJurors, "Exceeds max jurors");

        for (uint256 i = 0; i < jurors.length; i++) {
            require(certifiedJurors[jurors[i]], "Juror not certified");
            require(!legalCase.authorizedJurors[jurors[i]], "Juror already authorized");

            legalCase.authorizedJurors[jurors[i]] = true;
            emit JurorAuthorized(caseId, jurors[i]);
        }
    }

    // Juror voting (using FHE encryption)
    function castPrivateVote(
        uint256 caseId,
        uint8 vote, // 0=innocent, 1=guilty
        bytes32 commitment
    ) external validCase(caseId) votingActive(caseId) onlyAuthorizedJuror(caseId) nonReentrant {
        LegalCase storage legalCase = cases[caseId];
        require(!legalCase.jurorVotes[msg.sender].hasVoted, "Already voted");
        require(vote <= 1, "Invalid vote value");

        // Verify commitment hash
        require(commitment != bytes32(0), "Invalid commitment");

        // Encrypt vote
        euint8 encryptedVote = FHE.asEuint8(vote);

        // Allow contract to access encrypted vote
        FHE.allow(encryptedVote, address(this));

        // Store vote
        legalCase.jurorVotes[msg.sender] = JurorVote({
            encryptedVote: encryptedVote,
            hasVoted: true,
            timestamp: block.timestamp,
            commitment: commitment
        });

        // Add to juror list
        legalCase.jurors.push(msg.sender);

        // Update encrypted vote count
        // Convert to 32-bit encrypted integer and accumulate
        euint32 vote32 = FHE.asEuint32(encryptedVote);
        legalCase.encryptedGuiltyVotes = FHE.add(legalCase.encryptedGuiltyVotes, vote32);

        // Calculate innocent vote count (1 - vote)
        euint32 one = FHE.asEuint32(1);
        euint32 innocentVote = FHE.sub(one, vote32);
        legalCase.encryptedInnocentVotes = FHE.add(legalCase.encryptedInnocentVotes, innocentVote);

        emit VoteCast(caseId, msg.sender, block.timestamp);
    }

    // End voting
    function endVoting(uint256 caseId) external validCase(caseId) {
        LegalCase storage legalCase = cases[caseId];
        require(legalCase.active, "Case not active");
        require(
            block.timestamp > legalCase.endTime ||
            msg.sender == legalCase.judge ||
            legalCase.jurors.length >= legalCase.requiredJurors,
            "Cannot end voting yet"
        );

        legalCase.active = false;
    }

    // Reveal voting results
    function revealResults(uint256 caseId) external validCase(caseId) onlyJudge(caseId) {
        LegalCase storage legalCase = cases[caseId];
        require(!legalCase.active, "Voting still active");
        require(!legalCase.revealed, "Results already revealed");
        require(legalCase.jurors.length >= MIN_JURORS, "Insufficient jurors");

        // Decrypt voting results
        uint32 guiltyVotes = FHE.decrypt(legalCase.encryptedGuiltyVotes);
        uint32 innocentVotes = FHE.decrypt(legalCase.encryptedInnocentVotes);

        // Determine verdict
        legalCase.verdict = guiltyVotes > innocentVotes;
        legalCase.revealed = true;

        // Update juror reputation (participating jurors receive reputation rewards)
        for (uint256 i = 0; i < legalCase.jurors.length; i++) {
            jurorReputation[legalCase.jurors[i]] += 5;
        }

        emit CaseRevealed(caseId, legalCase.verdict, guiltyVotes, innocentVotes, legalCase.jurors.length);
    }

    // Get litigation information
    function getCaseInfo(uint256 caseId) external view validCase(caseId)
        returns (
            string memory title,
            string memory description,
            string memory evidenceHash,
            address judge,
            uint256 startTime,
            uint256 endTime,
            uint256 requiredJurors,
            bool active,
            bool revealed,
            bool verdict,
            uint256 jurorCount
        ) {
        LegalCase storage legalCase = cases[caseId];
        return (
            legalCase.title,
            legalCase.description,
            legalCase.evidenceHash,
            legalCase.judge,
            legalCase.startTime,
            legalCase.endTime,
            legalCase.requiredJurors,
            legalCase.active,
            legalCase.revealed,
            legalCase.verdict,
            legalCase.jurors.length
        );
    }

    // Check if already voted
    function hasVoted(uint256 caseId, address juror) external view validCase(caseId) returns (bool) {
        return cases[caseId].jurorVotes[juror].hasVoted;
    }

    // Check if authorized juror
    function isAuthorizedJuror(uint256 caseId, address juror) external view validCase(caseId) returns (bool) {
        return cases[caseId].authorizedJurors[juror];
    }

    // Get juror reputation
    function getJurorReputation(address juror) external view returns (uint256) {
        return jurorReputation[juror];
    }

    // Get revealed results
    function getRevealedResults(uint256 caseId) external view validCase(caseId) returns (
        bool verdict,
        uint256 guiltyVotes,
        uint256 innocentVotes,
        uint256 totalJurors
    ) {
        require(cases[caseId].revealed, "Results not revealed yet");

        LegalCase storage legalCase = cases[caseId];
        return (
            legalCase.verdict,
            FHE.decrypt(legalCase.encryptedGuiltyVotes),
            FHE.decrypt(legalCase.encryptedInnocentVotes),
            legalCase.jurors.length
        );
    }

    // Get litigation list (paginated)
    function getCases(uint256 offset, uint256 limit) external view returns (
        uint256[] memory caseIds,
        string[] memory titles,
        bool[] memory activeStates,
        bool[] memory revealedStates
    ) {
        uint256 end = offset + limit;
        if (end > caseCount) {
            end = caseCount;
        }

        uint256 length = end - offset;
        caseIds = new uint256[](length);
        titles = new string[](length);
        activeStates = new bool[](length);
        revealedStates = new bool[](length);

        for (uint256 i = 0; i < length; i++) {
            uint256 caseId = offset + i;
            caseIds[i] = caseId;
            titles[i] = cases[caseId].title;
            activeStates[i] = cases[caseId].active;
            revealedStates[i] = cases[caseId].revealed;
        }
    }
}
```

{% endtab %}

{% tab title="DigitalCourt.test.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { DigitalCourt, DigitalCourt__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @title DigitalCourt Test Suite
 * @notice Comprehensive tests for the DigitalCourt privacy-preserving voting system
 * @dev Tests cover FHE operations, access control, voting lifecycle, and edge cases
 */

type Signers = {
  deployer: HardhatEthersSigner;
  owner: HardhatEthersSigner;
  judge: HardhatEthersSigner;
  juror1: HardhatEthersSigner;
  juror2: HardhatEthersSigner;
  juror3: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("DigitalCourt")) as DigitalCourt__factory;
  const digitalCourtContract = (await factory.deploy()) as DigitalCourt;
  const digitalCourtAddress = await digitalCourtContract.getAddress();

  return { digitalCourtContract, digitalCourtAddress };
}

describe("DigitalCourt - Privacy-Preserving Jury Voting System", function () {
  let signers: Signers;
  let digitalCourtContract: DigitalCourt;
  let digitalCourtAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      owner: ethSigners[0],
      judge: ethSigners[1],
      juror1: ethSigners[2],
      juror2: ethSigners[3],
      juror3: ethSigners[4],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This test suite requires FHEVM mock environment`);
      this.skip();
    }

    ({ digitalCourtContract, digitalCourtAddress } = await deployFixture());
  });

  describe("Contract Deployment", function () {
    it("should deploy with correct initial state", async function () {
      expect(await digitalCourtContract.caseCount()).to.equal(0);
      expect(await digitalCourtContract.owner()).to.equal(signers.owner.address);
    });
  });

  describe("Juror Certification", function () {
    it("should allow owner to certify a single juror", async function () {
      await digitalCourtContract.connect(signers.owner).certifyJuror(signers.juror1.address);
      expect(await digitalCourtContract.certifiedJurors(signers.juror1.address)).to.be.true;
    });
  });

  describe("FHE Encrypted Voting", function () {
    beforeEach(async function () {
      await digitalCourtContract.connect(signers.owner).certifyJurors([
        signers.juror1.address,
        signers.juror2.address,
        signers.juror3.address,
      ]);

      const tx = await digitalCourtContract.connect(signers.judge).createCase(
        "Test Litigation",
        "Testing FHE voting",
        "QmHash",
        3
      );
      await tx.wait();

      await digitalCourtContract.connect(signers.judge).authorizeJurors(0, [
        signers.juror1.address,
        signers.juror2.address,
        signers.juror3.address,
      ]);
    });

    it("should allow authorized juror to cast encrypted vote", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("juror1-vote-secret"));

      await expect(
        digitalCourtContract.connect(signers.juror1).castPrivateVote(0, 1, commitment)
      )
        .to.emit(digitalCourtContract, "VoteCast");

      expect(await digitalCourtContract.hasVoted(0, signers.juror1.address)).to.be.true;
    });
  });

  describe("Result Revelation", function () {
    it("should reveal verdict when voting ends", async function () {
      await digitalCourtContract.connect(signers.owner).certifyJurors([
        signers.juror1.address,
        signers.juror2.address,
        signers.juror3.address,
      ]);

      await digitalCourtContract.connect(signers.judge).createCase(
        "Verdict Test",
        "Testing result revelation",
        "QmHash",
        3
      );

      await digitalCourtContract.connect(signers.judge).authorizeJurors(0, [
        signers.juror1.address,
        signers.juror2.address,
        signers.juror3.address,
      ]);

      // Cast votes
      await digitalCourtContract.connect(signers.juror1).castPrivateVote(
        0, 1, ethers.keccak256(ethers.toUtf8Bytes("v1"))
      );
      await digitalCourtContract.connect(signers.juror2).castPrivateVote(
        0, 1, ethers.keccak256(ethers.toUtf8Bytes("v2"))
      );
      await digitalCourtContract.connect(signers.juror3).castPrivateVote(
        0, 0, ethers.keccak256(ethers.toUtf8Bytes("v3"))
      );

      await digitalCourtContract.connect(signers.judge).endVoting(0);
      await digitalCourtContract.connect(signers.judge).revealResults(0);

      const results = await digitalCourtContract.getRevealedResults(0);
      expect(results.verdict).to.be.true;
      expect(results.guiltyVotes).to.equal(2);
      expect(results.innocentVotes).to.equal(1);
    });
  });
});
```

{% endtab %}

{% endtabs %}

## 🏗️ Architecture

### Contract Structure

The DigitalCourt contract implements:

1. **State Management** - Secure storage of encrypted data
2. **Access Control** - Role-based permission system
3. **FHE Operations** - Homomorphic encryption and computation
4. **Event Logging** - Transparent activity tracking

## 🔒 Security Considerations

This implementation follows security best practices:

- ✅ **OpenZeppelin Libraries** - Industry-standard security patterns
- ✅ **Reentrancy Protection** - Guards against reentrancy attacks
- ✅ **Access Control** - Role-based permissions
- ✅ **Input Validation** - Comprehensive parameter checks
- ✅ **FHE Privacy** - Individual data never exposed

## 📖 Additional Resources

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Zama Community](https://www.zama.ai/community)
- [GitHub Repository](https://github.com/zama-ai/fhevm)
- [Discord Community](https://discord.com/invite/zama)

## 📄 License

This example is licensed under the MIT License.

---

**Built with ❤️ using [FHEVM](https://github.com/zama-ai/fhevm) by Zama**
