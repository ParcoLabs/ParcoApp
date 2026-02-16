import hre from "hardhat";

const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  const AllowlistRegistry = await ethers.getContractFactory("AllowlistRegistry");
  const registry = await AllowlistRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("AllowlistRegistry deployed to:", registryAddress);

  const RestrictedToken = await ethers.getContractFactory("RestrictedToken");
  const token = await RestrictedToken.deploy("Parco Property Token", "PPT", registryAddress);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("RestrictedToken deployed to:", tokenAddress);

  const isRequired = await token.allowlistRequired();
  console.log("Allowlist required:", isRequired);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
