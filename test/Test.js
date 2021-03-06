const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CHEF", function () {
  it("", async function () {
    const [owner, bob, carol, david, erin] = await ethers.getSigners();

    const rewardPerBlock = ethers.utils.parseEther("10");
    const startBlock = 10;
    const endBlock = 100;

    let currentBlockNumber;

    /// /////////////////////////////////////////////// KING TOKEN TO STAKE
    const KingToken = await ethers.getContractFactory("MockERC20");
    const KingTokenContract = await KingToken.deploy(
      "KING",
      "KING",
      ethers.utils.parseEther("1000")
    );
    await KingTokenContract.deployed();
    console.log("KingTokenContract deployed to:", KingTokenContract.address);

    /// /////////////////////////////////////////////// DAI TOKEN TO GIVE REWARD
    const DAIToken = await ethers.getContractFactory("MockERC20");
    const DAITokenContract = await DAIToken.deploy(
      "DAI",
      "DAI",
      ethers.utils.parseEther("1000")
    );
    await DAITokenContract.deployed();
    console.log("DAITokenContract deployed to:", DAITokenContract.address);

    const BNBToken = await ethers.getContractFactory("MockERC20");
    const BNBTokenContract = await BNBToken.deploy(
      "WBNB",
      "WBNB",
      ethers.utils.parseEther("1000")
    );
    await BNBTokenContract.deployed();
    console.log("BNBTokenContract deployed to:", BNBTokenContract.address);

    const CakeToken = await ethers.getContractFactory("MockERC20");
    const CakeTokenContract = await CakeToken.deploy(
      "CAKE",
      "CAKE",
      ethers.utils.parseEther("1000")
    );
    await CakeTokenContract.deployed();
    console.log("CakeTokenContract deployed to:", CakeTokenContract.address);

    /// /////////////////////////////////////////////// DATA STORAGE CONTRACT
    const ChefStorage = await ethers.getContractFactory("DataStorage");
    const ChefStorageContract = await ChefStorage.deploy();
    await ChefStorageContract.deployed();

    console.log(
      "ChefStorageContract deployed to:",
      ChefStorageContract.address
    );

    /// /////////////////////////////////////////////// MANAGER CONTRACT
    const ChefManager = await ethers.getContractFactory("Manager");
    const ChefManagerContract = await ChefManager.deploy(
      KingTokenContract.address
    );
    await ChefManagerContract.deployed();

    console.log(
      "ChefManagerContract deployed to:",
      ChefManagerContract.address
    );

    /// /////////////////////////////////////////////// SETUP
    await ChefManagerContract.setPoolManagerDataStorage(
      ChefStorageContract.address
    );

    /// /////////////////////////////////////////////// CHARGE MANAGER POOL BY DAI TOKEN
    const userDAIBalance = await DAITokenContract.balanceOf(owner.address);

    await DAITokenContract.approve(ChefManagerContract.address, userDAIBalance);
    await DAITokenContract.transfer(
      ChefManagerContract.address,
      userDAIBalance
    );

    /// /////////////////////////////////////////////// NOW CREATE DAI POOL AND MINE 5 BLOCKS

    await ChefManagerContract.createPool(
      DAITokenContract.address,
      rewardPerBlock,
      startBlock,
      endBlock
    );

    for (let i = 0; i < 5; i++) {
      ethers.provider.send("evm_mine");
    }

    /// /////////////////////////////////////////////// DEPOSIT

    const _poolID = await ChefStorageContract.getPoolIDByPoolAddress(
      DAITokenContract.address
    );

    for (const thisUser of [bob, carol, david, erin]) {
      await KingTokenContract.connect(thisUser).mintTokens(
        ethers.utils.parseEther("1000")
      );

      await KingTokenContract.connect(thisUser).approve(
        ChefManagerContract.address,
        ethers.utils.parseEther("1000")
      );
      await ChefManagerContract.connect(thisUser).deposit(
        ethers.utils.parseEther("1000"),
        _poolID
      );

      currentBlockNumber = await ethers.provider.getBlockNumber();
      console.log(
        `user pending rewards in block number ${currentBlockNumber} is :`,
        (
          await ChefManagerContract.connect(thisUser).getUserPendingRewards(
            _poolID
          )
        ).toString()
      );
    }

    /// /////////////////////////////////////////////// CHECK USER PENDING REWARDS AFTER 1 BLOCK
    /// /////////////////////////////////////////////// 10 REWARD PER BLOCK / 4 USERS , SO 2.5 REWARDS PER USER IN ONE BLOCK

    for (let i = 0; i < 1; i++) {
      ethers.provider.send("evm_mine");
    }

    currentBlockNumber = await ethers.provider.getBlockNumber();
    console.log(
      `user pending rewards in block number ${currentBlockNumber} is :`,
      (
        await ChefManagerContract.connect(erin).getUserPendingRewards(_poolID)
      ).toString()
    );

    /// /////////////////////////////////////////////// USERS CAN WITHDRAW !

    for (let i = 0; i < 5; i++) {
      ethers.provider.send("evm_mine");
    }

    for (const thisUser of [bob, carol, david, erin]) {
      await ChefManagerContract.connect(thisUser).withdraw(
        ethers.utils.parseEther("1000"),
        _poolID
      );

      currentBlockNumber = await ethers.provider.getBlockNumber();
      console.log(
        `user pending rewards in block number ${currentBlockNumber} is :`,
        (
          await ChefManagerContract.connect(thisUser).getUserPendingRewards(
            _poolID
          )
        ).toString()
      );
      console.log(
        `user rewards in block number ${currentBlockNumber} is :`,
        (await DAITokenContract.balanceOf(thisUser.address)).toString()
      );
    }
  });
});
