// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const readline = require('readline');
require('dotenv').config()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const question = (str) => new Promise(resolve => rl.question(str, resolve));

async function main() {
  if(!process.env.SUBSCRIPTION_ID) {
    console.log('please set SUBSCRIPTION_ID in env first')
    return;
  }
  console.log(`
    Deploy nft
    Network: [${hre.network.name}]
    Chainlink ID: [${process.env.SUBSCRIPTION_ID}]
    `)
    const confirm = await question("Is the above information about the nft accurate? [yes/NO]: ");
    if(confirm === 'yes') {
      let transaction, tx;
      // deploy NFT contract
      const CosSpaceFactory = await hre.ethers.getContractFactory("contracts/CosSpace.sol:CosSpace");
      const cosSpace = await CosSpaceFactory.deploy();
      await cosSpace.deployed();

      console.log("CosSpace deployed to:", cosSpace.address);

      // deploy controller contract
      const LandControllerV1Factory = await ethers.getContractFactory("contracts/LandControllerV1.sol:LandControllerV1");
      const landControllerV1 = await LandControllerV1Factory.deploy(cosSpace.address);
      await landControllerV1.deployed();

      console.log("LandControllerV1 deployed to:", landControllerV1.address);

      transaction = await cosSpace.setController(landControllerV1.address);  
      tx = await transaction.wait();
      console.log("set controller, tx hash:", tx.transactionHash);

      // deploy Whitelist contract
      const WhitelistV1Factory = await hre.ethers.getContractFactory("contracts/WhitelistV1.sol:WhitelistV1");
      let subscriptionId, vrfCoordinator, link, keyHash
      if(hre.network.name == "mainnet") {
        subscriptionId = process.env.SUBSCRIPTION_ID
        vrfCoordinator = "0x271682DEB8C4E0901D1a1550aD2e64D568E69909"
        link = "0x514910771af9ca656af840dff83e8264ecf986ca"
        keyHash = "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef"
      } else {
        subscriptionId = process.env.SUBSCRIPTION_ID
        vrfCoordinator = "0x6168499c0cFfCaCD319c818142124B7A15E857ab"
        link = "0x01be23585060835e02b77ef475b0cc51aa1e0709"
        keyHash = "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc" 
      }
      const whitelistV1 = await WhitelistV1Factory.deploy(
        landControllerV1.address,
        subscriptionId,
        vrfCoordinator,
        link,
        keyHash
      );
      await whitelistV1.deployed();
      
      console.log("WhitelistV1 deployed to:", whitelistV1.address);

      transaction = await landControllerV1.setMinter(whitelistV1.address);  
      tx = await transaction.wait();
      console.log("set minter, tx hash:", tx.transactionHash);  
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
