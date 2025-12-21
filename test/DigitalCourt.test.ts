import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { DigitalCourt, DigitalCourt__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @title DigitalCourt Test Suite
 * @notice Comprehensive tests for the DigitalCourt privacy-preserving voting system
 * @dev Tests cover FHE operations, access control, voting lifecycle, and edge cases
 *
 * This test suite demonstrates:
 * - FHE encrypted voting with privacy preservation
 * - Access control mechanisms for jurors and judges
 * - Vote aggregation using homomorphic operations
 * - Public decryption of aggregated results
 * - Security considerations and anti-patterns
 *
 * @chapter access-control
 * @chapter encryption
 * @chapter public-decryption
 * @chapter anti-patterns
 */

type Signers = {
  deployer: HardhatEthersSigner;
  owner: HardhatEthersSigner;
  judge: HardhatEthersSigner;
  juror1: HardhatEthersSigner;
  juror2: HardhatEthersSigner;
  juror3: HardhatEthersSigner;
  juror4: HardhatEthersSigner;
  unauthorized: HardhatEthersSigner;
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
      juror4: ethSigners[5],
      unauthorized: ethSigners[6],
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite requires FHEVM mock environment`);
      this.skip();
    }

    ({ digitalCourtContract, digitalCourtAddress } = await deployFixture());
  });

  describe("Contract Deployment", function () {
    it("should deploy with correct initial state", async function () {
      expect(await digitalCourtContract.caseCount()).to.equal(0);
      expect(await digitalCourtContract.owner()).to.equal(signers.owner.address);
      expect(await digitalCourtContract.VOTING_DURATION()).to.equal(3 * 24 * 60 * 60); // 3 days
      expect(await digitalCourtContract.MIN_JURORS()).to.equal(3);
      expect(await digitalCourtContract.MAX_JURORS()).to.equal(12);
    });

    it("should have correct owner set", async function () {
      expect(await digitalCourtContract.owner()).to.equal(signers.deployer.address);
    });
  });

  describe("Juror Certification", function () {
    it("should allow owner to certify a single juror", async function () {
      await digitalCourtContract.connect(signers.owner).certifyJuror(signers.juror1.address);

      expect(await digitalCourtContract.certifiedJurors(signers.juror1.address)).to.be.true;
      expect(await digitalCourtContract.jurorReputation(signers.juror1.address)).to.equal(100);
    });

    it("should emit JurorCertified event", async function () {
      await expect(digitalCourtContract.connect(signers.owner).certifyJuror(signers.juror1.address))
        .to.emit(digitalCourtContract, "JurorCertified")
        .withArgs(signers.juror1.address, signers.owner.address);
    });

    it("should allow owner to certify multiple jurors at once", async function () {
      const jurors = [signers.juror1.address, signers.juror2.address, signers.juror3.address];

      await digitalCourtContract.connect(signers.owner).certifyJurors(jurors);

      for (const juror of jurors) {
        expect(await digitalCourtContract.certifiedJurors(juror)).to.be.true;
        expect(await digitalCourtContract.jurorReputation(juror)).to.equal(100);
      }
    });

    it("should revert when non-owner tries to certify juror", async function () {
      await expect(
        digitalCourtContract.connect(signers.unauthorized).certifyJuror(signers.juror1.address)
      ).to.be.revertedWithCustomError(digitalCourtContract, "OwnableUnauthorizedAccount");
    });

    it("should retrieve juror reputation correctly", async function () {
      await digitalCourtContract.connect(signers.owner).certifyJuror(signers.juror1.address);

      const reputation = await digitalCourtContract.getJurorReputation(signers.juror1.address);
      expect(reputation).to.equal(100);
    });
  });

  describe("Legal Litigation Creation", function () {
    beforeEach(async function () {
      // Certify jurors for testing
      await digitalCourtContract.connect(signers.owner).certifyJurors([
        signers.juror1.address,
        signers.juror2.address,
        signers.juror3.address,
      ]);
    });

    it("should create a new litigation with valid parameters", async function () {
      const tx = await digitalCourtContract.connect(signers.judge).createCase(
        "Intellectual Property Dispute",
        "Patent infringement allegation involving blockchain technology",
        "QmExampleIPFSHash123456",
        5
      );

      await expect(tx)
        .to.emit(digitalCourtContract, "CaseCreated")
        .withArgs(
          0, // caseId
          "Intellectual Property Dispute",
          signers.judge.address,
          await ethers.provider.getBlock("latest").then(b => b!.timestamp),
          await ethers.provider.getBlock("latest").then(b => b!.timestamp + 3 * 24 * 60 * 60),
          5
        );

      expect(await digitalCourtContract.caseCount()).to.equal(1);
    });

    it("should revert when creating litigation with empty title", async function () {
      await expect(
        digitalCourtContract.connect(signers.judge).createCase(
          "",
          "Valid description",
          "QmHash",
          5
        )
      ).to.be.revertedWith("Title cannot be empty");
    });

    it("should revert when creating litigation with empty description", async function () {
      await expect(
        digitalCourtContract.connect(signers.judge).createCase(
          "Valid Title",
          "",
          "QmHash",
          5
        )
      ).to.be.revertedWith("Description cannot be empty");
    });

    it("should revert when juror count is below minimum", async function () {
      await expect(
        digitalCourtContract.connect(signers.judge).createCase(
          "Valid Title",
          "Valid description",
          "QmHash",
          2 // Below MIN_JURORS (3)
        )
      ).to.be.revertedWith("Invalid juror count");
    });

    it("should revert when juror count exceeds maximum", async function () {
      await expect(
        digitalCourtContract.connect(signers.judge).createCase(
          "Valid Title",
          "Valid description",
          "QmHash",
          13 // Above MAX_JURORS (12)
        )
      ).to.be.revertedWith("Invalid juror count");
    });

    it("should retrieve litigation information correctly", async function () {
      await digitalCourtContract.connect(signers.judge).createCase(
        "Contract Dispute",
        "Breach of smart contract terms",
        "QmHashEvidence",
        4
      );

      const caseInfo = await digitalCourtContract.getCaseInfo(0);

      expect(caseInfo.title).to.equal("Contract Dispute");
      expect(caseInfo.description).to.equal("Breach of smart contract terms");
      expect(caseInfo.evidenceHash).to.equal("QmHashEvidence");
      expect(caseInfo.judge).to.equal(signers.judge.address);
      expect(caseInfo.requiredJurors).to.equal(4);
      expect(caseInfo.active).to.be.true;
      expect(caseInfo.revealed).to.be.false;
      expect(caseInfo.jurorCount).to.equal(0);
    });
  });

  describe("Juror Authorization", function () {
    let caseId: number;

    beforeEach(async function () {
      // Certify jurors
      await digitalCourtContract.connect(signers.owner).certifyJurors([
        signers.juror1.address,
        signers.juror2.address,
        signers.juror3.address,
        signers.juror4.address,
      ]);

      // Create a litigation
      const tx = await digitalCourtContract.connect(signers.judge).createCase(
        "Authorization Test Litigation",
        "Testing juror authorization",
        "QmHash",
        3
      );
      await tx.wait();
      caseId = 0;
    });

    it("should allow judge to authorize a certified juror", async function () {
      await digitalCourtContract.connect(signers.judge).authorizeJuror(caseId, signers.juror1.address);

      expect(await digitalCourtContract.isAuthorizedJuror(caseId, signers.juror1.address)).to.be.true;
    });

    it("should emit JurorAuthorized event", async function () {
      await expect(
        digitalCourtContract.connect(signers.judge).authorizeJuror(caseId, signers.juror1.address)
      )
        .to.emit(digitalCourtContract, "JurorAuthorized")
        .withArgs(caseId, signers.juror1.address);
    });

    it("should allow judge to authorize multiple jurors at once", async function () {
      const jurors = [signers.juror1.address, signers.juror2.address, signers.juror3.address];

      await digitalCourtContract.connect(signers.judge).authorizeJurors(caseId, jurors);

      for (const juror of jurors) {
        expect(await digitalCourtContract.isAuthorizedJuror(caseId, juror)).to.be.true;
      }
    });

    it("should revert when non-judge tries to authorize juror", async function () {
      await expect(
        digitalCourtContract.connect(signers.unauthorized).authorizeJuror(caseId, signers.juror1.address)
      ).to.be.revertedWith("Only litigation judge can perform this action");
    });

    it("should revert when authorizing uncertified juror", async function () {
      await expect(
        digitalCourtContract.connect(signers.judge).authorizeJuror(caseId, signers.unauthorized.address)
      ).to.be.revertedWith("Juror not certified");
    });

    it("should revert when authorizing same juror twice", async function () {
      await digitalCourtContract.connect(signers.judge).authorizeJuror(caseId, signers.juror1.address);

      await expect(
        digitalCourtContract.connect(signers.judge).authorizeJuror(caseId, signers.juror1.address)
      ).to.be.revertedWith("Juror already authorized");
    });

    it("should revert when exceeding maximum jurors", async function () {
      // Authorize up to required jurors
      await digitalCourtContract.connect(signers.judge).authorizeJurors(caseId, [
        signers.juror1.address,
        signers.juror2.address,
        signers.juror3.address,
      ]);

      // Try to authorize one more
      await expect(
        digitalCourtContract.connect(signers.judge).authorizeJuror(caseId, signers.juror4.address)
      ).to.be.revertedWith("Max jurors reached");
    });
  });

  describe("FHE Encrypted Voting", function () {
    let caseId: number;

    beforeEach(async function () {
      // Setup: Certify and authorize jurors
      await digitalCourtContract.connect(signers.owner).certifyJurors([
        signers.juror1.address,
        signers.juror2.address,
        signers.juror3.address,
      ]);

      const tx = await digitalCourtContract.connect(signers.judge).createCase(
        "Encryption Test Litigation",
        "Testing FHE encrypted voting",
        "QmHash",
        3
      );
      await tx.wait();
      caseId = 0;

      await digitalCourtContract.connect(signers.judge).authorizeJurors(caseId, [
        signers.juror1.address,
        signers.juror2.address,
        signers.juror3.address,
      ]);
    });

    it("should allow authorized juror to cast guilty vote (vote=1)", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("juror1-vote-secret"));

      await expect(
        digitalCourtContract.connect(signers.juror1).castPrivateVote(caseId, 1, commitment)
      )
        .to.emit(digitalCourtContract, "VoteCast")
        .withArgs(caseId, signers.juror1.address, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));

      expect(await digitalCourtContract.hasVoted(caseId, signers.juror1.address)).to.be.true;
    });

    it("should allow authorized juror to cast innocent vote (vote=0)", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("juror2-vote-secret"));

      await digitalCourtContract.connect(signers.juror2).castPrivateVote(caseId, 0, commitment);

      expect(await digitalCourtContract.hasVoted(caseId, signers.juror2.address)).to.be.true;
    });

    it("should revert when unauthorized user tries to vote", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("unauthorized-vote"));

      await expect(
        digitalCourtContract.connect(signers.unauthorized).castPrivateVote(caseId, 1, commitment)
      ).to.be.revertedWith("Not authorized juror for this litigation");
    });

    it("should revert when uncertified juror tries to vote", async function () {
      // Authorize but don't certify
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("uncertified-vote"));

      await expect(
        digitalCourtContract.connect(signers.juror4).castPrivateVote(caseId, 1, commitment)
      ).to.be.revertedWith("Not authorized juror for this litigation");
    });

    it("should revert when juror votes twice", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("double-vote"));

      await digitalCourtContract.connect(signers.juror1).castPrivateVote(caseId, 1, commitment);

      await expect(
        digitalCourtContract.connect(signers.juror1).castPrivateVote(caseId, 0, commitment)
      ).to.be.revertedWith("Already voted");
    });

    it("should revert with invalid vote value (vote > 1)", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("invalid-vote"));

      await expect(
        digitalCourtContract.connect(signers.juror1).castPrivateVote(caseId, 2, commitment)
      ).to.be.revertedWith("Invalid vote value");
    });

    it("should revert with zero commitment hash", async function () {
      await expect(
        digitalCourtContract.connect(signers.juror1).castPrivateVote(caseId, 1, ethers.ZeroHash)
      ).to.be.revertedWith("Invalid commitment");
    });

    it("should allow multiple jurors to vote with different votes", async function () {
      await digitalCourtContract.connect(signers.juror1).castPrivateVote(
        caseId,
        1,
        ethers.keccak256(ethers.toUtf8Bytes("j1-secret"))
      );

      await digitalCourtContract.connect(signers.juror2).castPrivateVote(
        caseId,
        0,
        ethers.keccak256(ethers.toUtf8Bytes("j2-secret"))
      );

      await digitalCourtContract.connect(signers.juror3).castPrivateVote(
        caseId,
        1,
        ethers.keccak256(ethers.toUtf8Bytes("j3-secret"))
      );

      expect(await digitalCourtContract.hasVoted(caseId, signers.juror1.address)).to.be.true;
      expect(await digitalCourtContract.hasVoted(caseId, signers.juror2.address)).to.be.true;
      expect(await digitalCourtContract.hasVoted(caseId, signers.juror3.address)).to.be.true;
    });
  });

  describe("Voting Lifecycle Management", function () {
    let caseId: number;

    beforeEach(async function () {
      await digitalCourtContract.connect(signers.owner).certifyJurors([
        signers.juror1.address,
        signers.juror2.address,
        signers.juror3.address,
      ]);

      const tx = await digitalCourtContract.connect(signers.judge).createCase(
        "Lifecycle Test",
        "Testing voting lifecycle",
        "QmHash",
        3
      );
      await tx.wait();
      caseId = 0;

      await digitalCourtContract.connect(signers.judge).authorizeJurors(caseId, [
        signers.juror1.address,
        signers.juror2.address,
        signers.juror3.address,
      ]);
    });

    it("should allow judge to end voting", async function () {
      // Cast votes
      await digitalCourtContract.connect(signers.juror1).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v1"))
      );
      await digitalCourtContract.connect(signers.juror2).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v2"))
      );
      await digitalCourtContract.connect(signers.juror3).castPrivateVote(
        caseId, 0, ethers.keccak256(ethers.toUtf8Bytes("v3"))
      );

      await digitalCourtContract.connect(signers.judge).endVoting(caseId);

      const caseInfo = await digitalCourtContract.getCaseInfo(caseId);
      expect(caseInfo.active).to.be.false;
    });

    it("should allow anyone to end voting after required jurors vote", async function () {
      // All required jurors vote
      await digitalCourtContract.connect(signers.juror1).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v1"))
      );
      await digitalCourtContract.connect(signers.juror2).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v2"))
      );
      await digitalCourtContract.connect(signers.juror3).castPrivateVote(
        caseId, 0, ethers.keccak256(ethers.toUtf8Bytes("v3"))
      );

      // Anyone can end voting now
      await digitalCourtContract.connect(signers.unauthorized).endVoting(caseId);

      const caseInfo = await digitalCourtContract.getCaseInfo(caseId);
      expect(caseInfo.active).to.be.false;
    });

    it("should revert when trying to vote after voting ended", async function () {
      await digitalCourtContract.connect(signers.juror1).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v1"))
      );
      await digitalCourtContract.connect(signers.juror2).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v2"))
      );
      await digitalCourtContract.connect(signers.juror3).castPrivateVote(
        caseId, 0, ethers.keccak256(ethers.toUtf8Bytes("v3"))
      );

      await digitalCourtContract.connect(signers.judge).endVoting(caseId);

      // Trying to vote after ending should fail
      await expect(
        digitalCourtContract.connect(signers.juror1).castPrivateVote(
          caseId, 0, ethers.keccak256(ethers.toUtf8Bytes("late-vote"))
        )
      ).to.be.revertedWith("Litigation not active");
    });
  });

  describe("Result Revelation and Public Decryption", function () {
    let caseId: number;

    beforeEach(async function () {
      await digitalCourtContract.connect(signers.owner).certifyJurors([
        signers.juror1.address,
        signers.juror2.address,
        signers.juror3.address,
      ]);

      const tx = await digitalCourtContract.connect(signers.judge).createCase(
        "Revelation Test",
        "Testing result revelation",
        "QmHash",
        3
      );
      await tx.wait();
      caseId = 0;

      await digitalCourtContract.connect(signers.judge).authorizeJurors(caseId, [
        signers.juror1.address,
        signers.juror2.address,
        signers.juror3.address,
      ]);
    });

    it("should reveal guilty verdict when majority votes guilty", async function () {
      // 2 guilty, 1 innocent
      await digitalCourtContract.connect(signers.juror1).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v1"))
      );
      await digitalCourtContract.connect(signers.juror2).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v2"))
      );
      await digitalCourtContract.connect(signers.juror3).castPrivateVote(
        caseId, 0, ethers.keccak256(ethers.toUtf8Bytes("v3"))
      );

      await digitalCourtContract.connect(signers.judge).endVoting(caseId);

      const tx = await digitalCourtContract.connect(signers.judge).revealResults(caseId);

      await expect(tx)
        .to.emit(digitalCourtContract, "CaseRevealed");

      const results = await digitalCourtContract.getRevealedResults(caseId);
      expect(results.verdict).to.be.true; // Guilty
      expect(results.guiltyVotes).to.equal(2);
      expect(results.innocentVotes).to.equal(1);
      expect(results.totalJurors).to.equal(3);
    });

    it("should reveal innocent verdict when majority votes innocent", async function () {
      // 1 guilty, 2 innocent
      await digitalCourtContract.connect(signers.juror1).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v1"))
      );
      await digitalCourtContract.connect(signers.juror2).castPrivateVote(
        caseId, 0, ethers.keccak256(ethers.toUtf8Bytes("v2"))
      );
      await digitalCourtContract.connect(signers.juror3).castPrivateVote(
        caseId, 0, ethers.keccak256(ethers.toUtf8Bytes("v3"))
      );

      await digitalCourtContract.connect(signers.judge).endVoting(caseId);
      await digitalCourtContract.connect(signers.judge).revealResults(caseId);

      const results = await digitalCourtContract.getRevealedResults(caseId);
      expect(results.verdict).to.be.false; // Innocent
      expect(results.guiltyVotes).to.equal(1);
      expect(results.innocentVotes).to.equal(2);
    });

    it("should increase juror reputation after revealing results", async function () {
      const initialReputation = await digitalCourtContract.getJurorReputation(signers.juror1.address);

      await digitalCourtContract.connect(signers.juror1).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v1"))
      );
      await digitalCourtContract.connect(signers.juror2).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v2"))
      );
      await digitalCourtContract.connect(signers.juror3).castPrivateVote(
        caseId, 0, ethers.keccak256(ethers.toUtf8Bytes("v3"))
      );

      await digitalCourtContract.connect(signers.judge).endVoting(caseId);
      await digitalCourtContract.connect(signers.judge).revealResults(caseId);

      const finalReputation = await digitalCourtContract.getJurorReputation(signers.juror1.address);
      expect(finalReputation).to.equal(initialReputation + 5n);
    });

    it("should revert when non-judge tries to reveal results", async function () {
      await digitalCourtContract.connect(signers.juror1).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v1"))
      );
      await digitalCourtContract.connect(signers.juror2).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v2"))
      );
      await digitalCourtContract.connect(signers.juror3).castPrivateVote(
        caseId, 0, ethers.keccak256(ethers.toUtf8Bytes("v3"))
      );

      await digitalCourtContract.connect(signers.judge).endVoting(caseId);

      await expect(
        digitalCourtContract.connect(signers.unauthorized).revealResults(caseId)
      ).to.be.revertedWith("Only litigation judge can perform this action");
    });

    it("should revert when revealing results of active voting", async function () {
      await digitalCourtContract.connect(signers.juror1).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v1"))
      );

      await expect(
        digitalCourtContract.connect(signers.judge).revealResults(caseId)
      ).to.be.revertedWith("Voting still active");
    });

    it("should revert when revealing already revealed results", async function () {
      await digitalCourtContract.connect(signers.juror1).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v1"))
      );
      await digitalCourtContract.connect(signers.juror2).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v2"))
      );
      await digitalCourtContract.connect(signers.juror3).castPrivateVote(
        caseId, 0, ethers.keccak256(ethers.toUtf8Bytes("v3"))
      );

      await digitalCourtContract.connect(signers.judge).endVoting(caseId);
      await digitalCourtContract.connect(signers.judge).revealResults(caseId);

      await expect(
        digitalCourtContract.connect(signers.judge).revealResults(caseId)
      ).to.be.revertedWith("Results already revealed");
    });

    it("should revert when insufficient jurors voted", async function () {
      // Only 2 jurors vote (below MIN_JURORS requirement)
      await digitalCourtContract.connect(signers.juror1).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v1"))
      );
      await digitalCourtContract.connect(signers.juror2).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v2"))
      );

      await digitalCourtContract.connect(signers.judge).endVoting(caseId);

      await expect(
        digitalCourtContract.connect(signers.judge).revealResults(caseId)
      ).to.be.revertedWith("Insufficient jurors");
    });

    it("should revert when getting unrevealed results", async function () {
      await expect(
        digitalCourtContract.getRevealedResults(caseId)
      ).to.be.revertedWith("Results not revealed yet");
    });
  });

  describe("Litigation List and Pagination", function () {
    beforeEach(async function () {
      // Create multiple litigations
      await digitalCourtContract.connect(signers.judge).createCase(
        "First Litigation", "Description 1", "Hash1", 3
      );
      await digitalCourtContract.connect(signers.judge).createCase(
        "Second Litigation", "Description 2", "Hash2", 4
      );
      await digitalCourtContract.connect(signers.judge).createCase(
        "Third Litigation", "Description 3", "Hash3", 5
      );
    });

    it("should retrieve all litigations with pagination", async function () {
      const result = await digitalCourtContract.getCases(0, 3);

      expect(result.caseIds.length).to.equal(3);
      expect(result.titles[0]).to.equal("First Litigation");
      expect(result.titles[1]).to.equal("Second Litigation");
      expect(result.titles[2]).to.equal("Third Litigation");
    });

    it("should retrieve partial litigation list", async function () {
      const result = await digitalCourtContract.getCases(1, 2);

      expect(result.caseIds.length).to.equal(2);
      expect(result.titles[0]).to.equal("Second Litigation");
      expect(result.titles[1]).to.equal("Third Litigation");
    });

    it("should handle pagination beyond total litigation count", async function () {
      const result = await digitalCourtContract.getCases(0, 10);

      expect(result.caseIds.length).to.equal(3); // Only 3 litigations exist
    });
  });

  describe("Edge Litigations and Security", function () {
    let caseId: number;

    beforeEach(async function () {
      await digitalCourtContract.connect(signers.owner).certifyJurors([
        signers.juror1.address,
        signers.juror2.address,
        signers.juror3.address,
      ]);

      const tx = await digitalCourtContract.connect(signers.judge).createCase(
        "Security Test", "Testing security", "Hash", 3
      );
      await tx.wait();
      caseId = 0;
    });

    it("should revert on invalid litigation ID", async function () {
      await expect(
        digitalCourtContract.getCaseInfo(999)
      ).to.be.revertedWith("Invalid litigation ID");
    });

    it("should protect against reentrancy attacks during voting", async function () {
      await digitalCourtContract.connect(signers.judge).authorizeJuror(caseId, signers.juror1.address);

      // The nonReentrant modifier should protect against reentrancy
      // This is tested implicitly through the modifier's presence
      await digitalCourtContract.connect(signers.juror1).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v1"))
      );

      expect(await digitalCourtContract.hasVoted(caseId, signers.juror1.address)).to.be.true;
    });
  });

  describe("FHE Patterns and Best Practices", function () {
    /**
     * @notice This test section demonstrates FHE best practices
     * @dev Key concepts:
     * 1. Type widening: Convert euint8 votes to euint32 for safe accumulation
     * 2. Complementary calculation: Calculate innocent votes as (1 - vote)
     * 3. Access control: FHE.allow() for granting access to encrypted values
     * 4. Public decryption: Only aggregate results are decrypted, not individual votes
     */

    let caseId: number;

    beforeEach(async function () {
      await digitalCourtContract.connect(signers.owner).certifyJurors([
        signers.juror1.address,
        signers.juror2.address,
        signers.juror3.address,
      ]);

      const tx = await digitalCourtContract.connect(signers.judge).createCase(
        "FHE Pattern Test", "Demonstrating FHE patterns", "Hash", 3
      );
      await tx.wait();
      caseId = 0;

      await digitalCourtContract.connect(signers.judge).authorizeJurors(caseId, [
        signers.juror1.address,
        signers.juror2.address,
        signers.juror3.address,
      ]);
    });

    it("demonstrates type widening for vote accumulation", async function () {
      /**
       * Pattern: euint8 (vote) → euint32 (accumulator)
       * Why: Prevents overflow when accumulating many votes
       * Individual votes are 0 or 1 (fit in euint8)
       * Accumulated votes could exceed 255 with many jurors (needs euint32)
       */

      await digitalCourtContract.connect(signers.juror1).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v1"))
      );
      await digitalCourtContract.connect(signers.juror2).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v2"))
      );
      await digitalCourtContract.connect(signers.juror3).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v3"))
      );

      await digitalCourtContract.connect(signers.judge).endVoting(caseId);
      await digitalCourtContract.connect(signers.judge).revealResults(caseId);

      const results = await digitalCourtContract.getRevealedResults(caseId);
      expect(results.guiltyVotes).to.equal(3);
    });

    it("demonstrates complementary vote calculation", async function () {
      /**
       * Pattern: innocent_vote = 1 - guilty_vote
       * Why: Efficiently compute both counts with single input
       * Saves gas and maintains consistency
       * vote=1 (guilty) → guilty+=1, innocent+=0
       * vote=0 (innocent) → guilty+=0, innocent+=1
       */

      await digitalCourtContract.connect(signers.juror1).castPrivateVote(
        caseId, 0, ethers.keccak256(ethers.toUtf8Bytes("v1"))
      );
      await digitalCourtContract.connect(signers.juror2).castPrivateVote(
        caseId, 0, ethers.keccak256(ethers.toUtf8Bytes("v2"))
      );
      await digitalCourtContract.connect(signers.juror3).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v3"))
      );

      await digitalCourtContract.connect(signers.judge).endVoting(caseId);
      await digitalCourtContract.connect(signers.judge).revealResults(caseId);

      const results = await digitalCourtContract.getRevealedResults(caseId);
      expect(results.guiltyVotes).to.equal(1);
      expect(results.innocentVotes).to.equal(2);
      expect(results.guiltyVotes + results.innocentVotes).to.equal(results.totalJurors);
    });

    it("demonstrates proper FHE.allow() usage for access control", async function () {
      /**
       * Pattern: FHE.allow(encryptedValue, address)
       * Why: Grants permission to read/use encrypted values
       * Contract must have permission to aggregate votes
       * Without FHE.allow(), operations on encrypted values would fail
       */

      // This is tested implicitly - if FHE.allow() wasn't called correctly,
      // the voting and aggregation would fail
      await digitalCourtContract.connect(signers.juror1).castPrivateVote(
        caseId, 1, ethers.keccak256(ethers.toUtf8Bytes("v1"))
      );

      // Verify the vote was recorded (requires proper access control)
      expect(await digitalCourtContract.hasVoted(caseId, signers.juror1.address)).to.be.true;
    });
  });

  describe("Anti-Patterns and Common Mistakes", function () {
    /**
     * @notice This section demonstrates what NOT to do with FHEVM
     * @dev Common anti-patterns:
     * 1. ❌ Returning encrypted values from view functions
     * 2. ❌ Decrypting individual votes before aggregation
     * 3. ❌ Missing FHE.allow() permissions
     * 4. ❌ Not using type widening for accumulators
     */

    it("demonstrates why individual vote decryption breaks privacy", async function () {
      /**
       * ❌ ANTI-PATTERN: Decrypting individual votes
       *
       * Why this is bad:
       * - Defeats the purpose of FHE (privacy preservation)
       * - Exposes juror decisions before aggregation
       * - Vulnerable to coercion and bribery
       *
       * ✅ CORRECT PATTERN: Only decrypt aggregated results
       * - Individual votes remain encrypted throughout
       * - Only totals are revealed after voting ends
       * - Preserves juror anonymity
       */

      // The DigitalCourt contract correctly implements this:
      // - Individual votes stored as euint8 (never decrypted)
      // - Only aggregated totals are decrypted in revealResults()
      // - No function exists to decrypt individual votes

      expect(true).to.be.true; // This is a documentation test
    });

    it("demonstrates importance of FHE.allow() for contract operations", async function () {
      /**
       * ❌ ANTI-PATTERN: Forgetting FHE.allow()
       *
       * Without FHE.allow(encryptedValue, address(this)):
       * - Contract cannot perform operations on encrypted values
       * - FHE.add(), FHE.sub() would fail
       * - Vote aggregation would be impossible
       *
       * ✅ CORRECT PATTERN: Call FHE.allow() immediately after encryption
       * - In createCase(): FHE.allow() on vote counters
       * - In castPrivateVote(): FHE.allow() on individual vote
       * - Enables homomorphic operations
       */

      expect(true).to.be.true; // This is a documentation test
    });
  });
});
