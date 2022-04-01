const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require('merkletreejs')
const keccak256 = require('keccak256')
const { soliditySha3 } = require("web3-utils");
const hre = require("hardhat");

describe("WhitelistV1 Contract Test", function () {

  let CosSpaceFactory;
  let cosSpace;
  let WhitelistV1Factory;
  let whitelistV1;
  let accounts;
  let merkleRoot;
  let proof = [];
  let startTime = Math.round(new Date().getTime()/1000);
  let endTime = startTime + 86400;
  let whitelistTokens = [];
  let randomWordsNum;

  before(async function () {
    //get all accounts and create merkle tree
    accounts = await hre.ethers.getSigners();
    const leaves = accounts.map(x => soliditySha3(x.address));
    leaves.pop(); //remove first address from whitelist to test
    const tree = new MerkleTree(leaves, keccak256, { sort: true });
    merkleRoot = tree.getHexRoot();
    accounts.forEach((account) => {
        const leaf = keccak256(account.address)
        proof.push(tree.getHexProof(leaf));
    })
    for(let i=1; i<= accounts.length; i++) {
      whitelistTokens.push(i);
    }
    randomWordsNum = Math.floor(whitelistTokens.length/16) + 1;
  });

  beforeEach(async function () {
    // deploy contract
    CosSpaceFactory = await hre.ethers.getContractFactory("contracts/CosSpace.sol:CosSpace");
    cosSpace = await CosSpaceFactory.deploy();

    // deploy contract
    LandControllerV1Factory = await ethers.getContractFactory("contracts/LandControllerV1.sol:LandControllerV1");
    landControllerV1 = await LandControllerV1Factory.deploy(cosSpace.address);

    // deploy contract
    WhitelistV1Factory = await ethers.getContractFactory("contracts/WhitelistV1.sol:WhitelistV1");
    whitelistV1 = await WhitelistV1Factory.deploy(
      landControllerV1.address,
      274, //subscriptionId
      "0x6168499c0cFfCaCD319c818142124B7A15E857ab", //vrfCoordinator
      "0x01be23585060835e02b77ef475b0cc51aa1e0709", //link
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc" //keyHash
    );
  });

  describe("Authorization", function () {
    it("Should create random numbers fail if not owner", async function () {
      await expect (
        whitelistV1.connect(accounts[1]).generateRandomWords(10)
      ).to.be.revertedWith("Ownable: caller is not the owner")

      await expect (
        whitelistV1.connect(accounts[1]).requestRandomWords(10, 250000)
      ).to.be.revertedWith("Ownable: caller is not the owner")
    });

    it("Should create whitelist fail if not owner", async function () {
      await whitelistV1.generateRandomWords(randomWordsNum);
      await expect (
        whitelistV1.connect(accounts[1]).createWhitelist(1, 1, 1, 0, startTime, endTime, merkleRoot, whitelistTokens)
      ).to.be.revertedWith("Ownable: caller is not the owner")
    });

    it("Should update whitelist fail if not owner", async function () {
      await whitelistV1.generateRandomWords(randomWordsNum);
      whitelistV1.createWhitelist(1, 1, 1, 0, startTime, endTime, merkleRoot, whitelistTokens)
      
      await expect (
        whitelistV1.connect(accounts[1]).updateWhitelistEndTime(1, startTime)
      ).to.be.revertedWith("Ownable: caller is not the owner")

      await expect (
        whitelistV1.connect(accounts[1]).updateWhitelistStartTime(1, endTime)
      ).to.be.revertedWith("Ownable: caller is not the owner")
    });

    it("Should fail if want to access token", async function () {
      expect(whitelistV1.whitelistTokens).to.be.an('undefined');
    });

    it("Should fail if want to access random seeds", async function () {
      expect(whitelistV1.randomSeeds).to.be.an('undefined');
    });
  });

  describe("Generate Random Number", function () {
    it("Should create 10 random numbers", async function () {
      await whitelistV1.generateRandomWords(randomWordsNum);
      const numberOfSeed = await whitelistV1.getRandomSeedListLength();
      expect(numberOfSeed).to.equal(randomWordsNum*16);
    });

    it("Should create whitelist fail if not enough random seed", async function () {
      await expect (
        whitelistV1.createWhitelist(1, 1, 1, 0, startTime, endTime, merkleRoot, whitelistTokens)
      ).to.be.revertedWith("Insufficient random seeds")
    });
  });

  describe("Create Whitelist", function () {
    it("Should create whitelist fail if space width or height is zero", async function () {
      await whitelistV1.generateRandomWords(randomWordsNum);
      await expect (
        whitelistV1.createWhitelist(1, 0, 1, 0, startTime, endTime, merkleRoot, whitelistTokens)
      ).to.be.revertedWith("Incorrect width or height");
      await expect (
        whitelistV1.createWhitelist(1, 1, 0, 0, startTime, endTime, merkleRoot, whitelistTokens)
      ).to.be.revertedWith("Incorrect width or height");
    });
    it("Should create whitelist fail if pass listId created before", async function () {
      await whitelistV1.generateRandomWords(randomWordsNum);
      await whitelistV1.createWhitelist(1, 1, 1, 0, startTime, endTime, merkleRoot, whitelistTokens);
      await expect (
        whitelistV1.createWhitelist(1, 1, 1, 0, startTime, endTime, merkleRoot, whitelistTokens)
      ).to.be.revertedWith("listId exists");
    });
    it("Should create whitelist success", async function () {
      await whitelistV1.generateRandomWords(randomWordsNum);
      await whitelistV1.createWhitelist(1, 1, 1, 0, startTime, endTime, merkleRoot, whitelistTokens);
      await whitelistV1.createWhitelist(2, 2, 2, 0, startTime, endTime, merkleRoot, whitelistTokens);
      const list1 = await whitelistV1.whitelistList(1);
      expect(list1.merkleRoot).to.equal(merkleRoot);
      const list2 = await whitelistV1.whitelistList(2);
      expect(list2.width).to.equal(2);
    });
  });

  describe("Mint with CosSpace", function () {
    it("Should mint fail without setting mitable address", async function () {
      await whitelistV1.generateRandomWords(randomWordsNum);
      await whitelistV1.createWhitelist(1, 1, 1, 0, startTime, endTime, merkleRoot, whitelistTokens);
      await expect (
        whitelistV1.connect(accounts[2]).mint(1, proof[2])
      ).to.be.revertedWith("Not minter");
    });
  });

  describe("Whitelist Mint", function () {
    beforeEach(async function (){
      await whitelistV1.generateRandomWords(randomWordsNum);
      await whitelistV1.createWhitelist(1, 1, 1, 0, startTime, endTime, merkleRoot, whitelistTokens);  
      await landControllerV1.setMinter(whitelistV1.address);
      await cosSpace.setController(landControllerV1.address);
    })

    it("Should mint fail if event not started", async function () {
      await whitelistV1.updateWhitelistStartTime(1, endTime);
      await expect (
        whitelistV1.connect(accounts[2]).mint(1, proof[2])
      ).to.be.revertedWith("Session not started")
    });

    it("Should mint fail if event is over", async function () {
      await whitelistV1.updateWhitelistEndTime(1, startTime);
      await expect (
        whitelistV1.connect(accounts[2]).mint(1, proof[2])
      ).to.be.revertedWith("Session end")
    });

    it("Should mint fail if not in whitelist", async function () {
      await expect (
        whitelistV1.connect(accounts[accounts.length - 1]).mint(1, proof[0])
      ).to.be.revertedWith("Invalid merkle proof")
    });

    it("Should mint success", async function () {
      await whitelistV1.connect(accounts[1]).mint(1, proof[1]);
      const addr1Balance = await cosSpace.balanceOf(accounts[1].address);
      expect(addr1Balance).to.equal(1);
    });
  })
});
