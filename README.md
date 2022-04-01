# Cos Space Contract

## Introduction

[CosSpace]: A contract to mint, transfer, and store the properties of space

[LandControllerV1]: A contract to check if space exists or overlaps before minting and batch minting

[WhitelistV1]: A contract to generate random order of tokens and check if user is in whitelist


## Install
```shell
npm install
```

## Compile Smart Contract
```shell
npx hardhat compile
```

## Unit Test

#### 1. Set up your environment with a .env file. Refer to .env_sample for an example

```shell
INFURA_PROJECT_ID="${infura project id}"
RINKEBY_PRIVATE_KEY="${private key of account on rinkeby testnet}"
MAINNET_PRIVATE_KEY="${private key of account on mainnet}"
SUBSCRIPTION_ID=${chainlink subscription id}
ETHERSCAN_API_KEY="${api key of etherscan}"
COINMARKETCAP_API_KEY="${api key of coinmarketcap}"
```
#### 2. Run test

```shell
npx hardhat test
```

## Local deploy
```shell
npx hardhat node
npx hardhat run scripts/deploy.js
```

## Deploy to Rinkeby Network
```shell
npx hardhat run scripts/deploy.js --network rinkeby
```

## Others
```shell
npx hardhat help
```