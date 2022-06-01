const {ethers} = require("hardhat");
const {BTS_NFT_CONTRACT_ADDRESS} = require("../constants");

const main = async () => {
    // deploy the fakeNftMarketplace first
    const fakeNftMarketplaceContractFactory = await ethers.getContractFactory("FakeNftMarketplace");
    const fakeNftMarketplace = await fakeNftMarketplaceContractFactory.deploy();
    await fakeNftMarketplace.deployed();
    console.log("FakeNftMarketplace Contract deployed to:", fakeNftMarketplace.address);

    // now deploy the BtsDAO contract
    const btsDAOContractFactory = await ethers.getContractFactory("BtsDAO");

    const btsDAOContract = await btsDAOContractFactory.deploy(
        fakeNftMarketplace.address,
        BTS_NFT_CONTRACT_ADDRESS,{
            // this makes sure your account has at least 0.05 ETH in your account
            value: ethers.utils.parseEther("0.05"),
        }
    );
    await btsDAOContract.deployed();
    console.log("BtsDAO Contract deployed to: ", btsDAOContract.address);

}

const runMain = async () => {
    try {
        await main();
        process.exit(0);
    }   catch(err) {
        console.error(err);
        process.exit(1);
    }
}

runMain();