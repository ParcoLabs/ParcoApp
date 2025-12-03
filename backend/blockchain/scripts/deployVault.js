const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying PropertyVault with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
  
  console.log("USDC Address:", USDC_ADDRESS);
  console.log("Admin Address:", deployer.address);

  const PropertyVault = await hre.ethers.getContractFactory("PropertyVault");
  const propertyVault = await PropertyVault.deploy(USDC_ADDRESS, deployer.address);

  await propertyVault.waitForDeployment();
  const vaultAddress = await propertyVault.getAddress();

  console.log("");
  console.log("PropertyVault deployed to:", vaultAddress);
  console.log("");
  console.log("Next steps:");
  console.log("1. Deploy PropertyToken contract (if not already deployed)");
  console.log("2. Call setPropertyToken(propertyTokenAddress) on the vault");
  console.log("3. Grant OPERATOR_ROLE to your backend wallet");
  console.log("4. Verify contract on Polygonscan:");
  console.log(`   npx hardhat verify --network polygon ${vaultAddress} ${USDC_ADDRESS} ${deployer.address}`);

  return vaultAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
