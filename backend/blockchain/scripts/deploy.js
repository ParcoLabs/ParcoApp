const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying PropertyToken with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  const PropertyToken = await hre.ethers.getContractFactory("PropertyToken");
  const propertyToken = await PropertyToken.deploy(deployer.address);

  await propertyToken.waitForDeployment();
  const address = await propertyToken.getAddress();

  console.log("PropertyToken deployed to:", address);
  console.log("");
  console.log("Deployment complete!");
  console.log("Contract Address:", address);
  console.log("Admin Address:", deployer.address);
  console.log("");
  console.log("Next steps:");
  console.log("1. Verify contract on Polygonscan:");
  console.log(`   npx hardhat verify --network polygon ${address} ${deployer.address}`);
  console.log("2. Update your backend with the contract address");
  console.log("3. Create properties using createProperty(tokenId, maxSupply, uri)");

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
