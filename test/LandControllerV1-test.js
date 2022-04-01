const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

let CosSpaceFactory;
let cosSpace;
let LandControllerV1Factory;
let landControllerV1;
let baseURI = "https://mondrian-dev.web.app/api/v1/metadata/token/"

function getXY(tokenId) {
  let x = Math.floor((tokenId-1)%10000/2000)*40 + (tokenId-1)%40 + 1; 
  let y = Math.floor((tokenId-1)/10000)*50 + Math.floor((tokenId-1)%2000/40) + 1;
  return {x, y}
}

function getTokenId(x, y) {
  return Math.floor((y-1)/50) * 10000 + Math.floor((x-1)/40) * 2000 +  (y-1)%50 * 40  + (x-1)%40 + 1;
}

async function checkTokenProperty(to, tokenIds, w, h) {
  for(let i = 0; i < tokenIds.length; i++) {
    let tokenId = tokenIds[i];
    if(w == 1 && h == 1) {
      w = 0;
      h = 0;
    }
    //check result
    expect(await cosSpace.ownerOf(tokenId)).to.equal(to);
    expect((await cosSpace.tokenRect(tokenId)).width).to.equal(w);
    expect((await cosSpace.tokenRect(tokenId)).height).to.equal(h);
    expect(await cosSpace.tokenURI(tokenId)).to.equal(baseURI + tokenId);
  
    //check rectOrigin
    expect(await cosSpace.rectOrigin(tokenId)).to.equal(0);
    if(w>1 || h>1) {
      const {x, y} = getXY(tokenId);
      for(let i=x; i<x+w; i++) {
        for(let j=y; j<y+h; j++) {
          if(i==x && j==y) {
            continue;
          }
          expect(await cosSpace.rectOrigin(getTokenId(i,j))).to.equal(tokenId);
          await expect (
            cosSpace.ownerOf(getTokenId(i,j))
          ).to.be.revertedWith("ERC721: owner query for nonexistent token");
        }
      }
    }
  }
}

describe("LandControllerV1 Contract Test", function () {
 
  let owner;
  let addr1;
  let addr2;
  let addrs;
  let mintTokens = [1,2,3,4,41,42,43,44,81,82,83,84];
  
  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // deploy contract
    CosSpaceFactory = await hre.ethers.getContractFactory("contracts/CosSpace.sol:CosSpace");
    cosSpace = await CosSpaceFactory.deploy();

    // deploy contract
    LandControllerV1Factory = await ethers.getContractFactory("contracts/LandControllerV1.sol:LandControllerV1");
    landControllerV1 = await LandControllerV1Factory.deploy(cosSpace.address);

    //set controller to cosSpace
    await cosSpace.setController(landControllerV1.address);

    await cosSpace.setBaseURI(baseURI);
  });

  describe("Authorization", function () {
    it("Should batch mint fail if not owner", async function () {
      await expect (
        landControllerV1.connect(addr1).batchMint(addr1.address, mintTokens, 1, 1)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should mint fail if not mintable address", async function () {
      await expect (
        landControllerV1.mint(addr1.address, mintTokens, 1, 1)
      ).to.be.revertedWith("Not minter");
    });
  });

  describe("Mint Token", function () {
    it("Should batch mint fail if token ID is invalid", async function () {
      await expect (
        landControllerV1.batchMint(addr1.address, [0], 1, 1)
      ).to.be.revertedWith("Incorrect token id");

      await expect (
        landControllerV1.batchMint(addr1.address, [20001], 1, 1)
      ).to.be.revertedWith("Out of land boundary");
    });

    it("Should mint fail if token has already mined", async function () {
      // Mint tokens to addr1
      await landControllerV1.batchMint(addr1.address, mintTokens, 1, 1);
      // Mint tokens to addr2
      await expect (
        landControllerV1.batchMint(addr2.address, mintTokens, 1, 1)
      ).to.be.revertedWith("Not available");
    });

    it("Should mint succcess and property of token is correct", async function () {
      let to = addr1.address

      //mint should success
      await landControllerV1.batchMint(to, [9527], 1, 1);
      //check width, height and rect origin
      await checkTokenProperty(to, [9527], 1, 1);

      await landControllerV1.batchMint(addr1.address, [1], 1, 1);
      await checkTokenProperty(addr1.address, [1], 1, 1);

      await landControllerV1.batchMint(addr1.address, [20000], 1, 1);
      await checkTokenProperty(addr1.address, [20000], 1, 1);

      await landControllerV1.batchMint(addr1.address, [11961], 1, 1);
      await checkTokenProperty(addr1.address, [11961], 1, 1);

      await landControllerV1.batchMint(addr1.address, [8040], 1, 1);
      await checkTokenProperty(addr1.address, [8040], 1, 1);

      await landControllerV1.batchMint(addr1.address, [2], 1, 2);
      await checkTokenProperty(addr1.address, [2], 1, 2);

      await landControllerV1.batchMint(addr1.address, [83], 3, 3);
      await checkTokenProperty(addr1.address, [83], 3, 3);
    });

    it("Should mint fail if token is out of bounds", async function () {
      await expect (
        landControllerV1.batchMint(addr1.address, [19999], 1, 2)
      ).to.be.revertedWith("Out of land boundary");

      await expect (
        landControllerV1.batchMint(addr1.address, [11962], 1, 2)
      ).to.be.revertedWith("Out of land boundary");

      await expect (
        landControllerV1.batchMint(addr1.address, [8039], 3, 1)
      ).to.be.revertedWith("Out of land boundary");  
    });

    it("Should mint multiple tokens success", async function () {
      let mintTokens = [1, 11961, 8040, 20000];
      await landControllerV1.batchMint(addr1.address, mintTokens, 1, 1);
      await checkTokenProperty(addr1.address, mintTokens, 1, 1);

      mintTokens = [83, 92, 443, 452];
      await landControllerV1.batchMint(addr1.address, mintTokens, 9, 9);
      await checkTokenProperty(addr1.address, mintTokens, 9, 9);
    });

    it("Should mint multiple tokens fail", async function () {
      let mintTokens = [2, 19999, 11962, 8039]
      await expect (
        landControllerV1.batchMint(addr1.address, mintTokens, 1, 2)
      ).to.be.revertedWith("Out of land boundary");
      await expect (
        checkTokenProperty(addr1.address, [2], 1, 2)
      ).to.be.revertedWith("ERC721: owner query for nonexistent token")

      mintTokens = [83, 84, 85]
      await expect (
        landControllerV1.batchMint(addr1.address, mintTokens, 3, 1)
      ).to.be.revertedWith("Not available"); 
    });
  });
});
