const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
require('dotenv').config()

let CosSpaceFactory;
let cosSpace;
let baseURI = "https://mondrian-dev.web.app/api/v1/metadata/token/"

describe("CosSpace Contract Test", function () {
 
  let owner;
  let addr1;
  let addr2;
  let addrs;
  
  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    CosSpaceFactory = await hre.ethers.getContractFactory("CosSpace");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // deploy contract
    cosSpace = await CosSpaceFactory.deploy();

    await cosSpace.setBaseURI(baseURI);
  });

  describe("Authorization", function () {
    it("Should set baseURI fail if not owner", async function () {
      await expect (
        cosSpace.connect(addr1).setBaseURI(baseURI)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should fail if want to renounce ownership", async function () {
      await expect (
        cosSpace.renounceOwnership()
      ).to.be.revertedWith("Not allowed");
    });

    it("Should fail if want to mint token directly", async function () {
      await expect (
        cosSpace.mintToken(addr1.address, 1)
      ).to.be.revertedWith("Not controller");
    });

    it("Should fail if want to burn token directly", async function () {
      await expect (
        cosSpace.burnToken(1)
      ).to.be.revertedWith("Not controller");
    });

    it("Should fail if want to check if token exist directly", async function () {
      await expect (
        cosSpace.exists(1)
      ).to.be.revertedWith("Not controller");
    });
  });
});
