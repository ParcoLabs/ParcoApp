import { ethers, type ContractFactory, type Contract } from 'ethers';
import { readFileSync } from 'fs';
import { join } from 'path';

export class BlockchainConfigError extends Error {
  public statusCode = 412;
  constructor(message: string) {
    super(message);
    this.name = 'BlockchainConfigError';
  }
}

function loadArtifact(contractName: string): { abi: any[]; bytecode: string } {
  const artifactPath = join(
    process.cwd(),
    'artifacts',
    'contracts',
    `${contractName}.sol`,
    `${contractName}.json`
  );
  try {
    const raw = readFileSync(artifactPath, 'utf-8');
    const artifact = JSON.parse(raw);
    return { abi: artifact.abi, bytecode: artifact.bytecode };
  } catch {
    throw new BlockchainConfigError(
      `Contract artifact not found for ${contractName}. Run 'npx hardhat compile' first.`
    );
  }
}

function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    throw new BlockchainConfigError(
      'RPC_URL environment variable is not set. Configure it to interact with the blockchain.'
    );
  }
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getDeployer(): ethers.Wallet {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new BlockchainConfigError(
      'DEPLOYER_PRIVATE_KEY environment variable is not set. Configure it to sign blockchain transactions.'
    );
  }
  return new ethers.Wallet(privateKey, getProvider());
}

export interface DeployResult {
  tokenAddress: string;
  registryAddress: string;
  deployTxHash: string;
  registryTxHash: string;
}

export async function deployRestrictedToken(params: {
  name: string;
  symbol: string;
  allowlistRequired?: boolean;
  lockupEndsAt?: number;
}): Promise<DeployResult> {
  const deployer = getDeployer();

  const registryArtifact = loadArtifact('AllowlistRegistry');
  const registryFactory = new ethers.ContractFactory(
    registryArtifact.abi,
    registryArtifact.bytecode,
    deployer
  );
  const registry = await registryFactory.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  const registryTxHash = registry.deploymentTransaction()?.hash ?? '';

  const tokenArtifact = loadArtifact('RestrictedToken');
  const tokenFactory = new ethers.ContractFactory(
    tokenArtifact.abi,
    tokenArtifact.bytecode,
    deployer
  );
  const token = await tokenFactory.deploy(params.name, params.symbol, registryAddress);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  const deployTxHash = token.deploymentTransaction()?.hash ?? '';

  if (params.allowlistRequired === false) {
    const tx = await (token as any).setAllowlistRequired(false);
    await tx.wait();
  }

  if (params.lockupEndsAt) {
    const tx = await (token as any).setGlobalLockupEndsAt(params.lockupEndsAt);
    await tx.wait();
  }

  return { tokenAddress, registryAddress, deployTxHash, registryTxHash };
}

export async function registrySetAllowed(params: {
  registryAddress: string;
  investorAddress: string;
  allowed: boolean;
}): Promise<string> {
  const deployer = getDeployer();
  const artifact = loadArtifact('AllowlistRegistry');
  const registry = new ethers.Contract(params.registryAddress, artifact.abi, deployer);
  const tx = await registry.setAllowed(params.investorAddress, params.allowed);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function registryBatchSetAllowed(params: {
  registryAddress: string;
  investorAddresses: string[];
  allowed: boolean;
}): Promise<string> {
  const deployer = getDeployer();
  const artifact = loadArtifact('AllowlistRegistry');
  const registry = new ethers.Contract(params.registryAddress, artifact.abi, deployer);
  const tx = await registry.batchSetAllowed(params.investorAddresses, params.allowed);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function tokenMint(params: {
  tokenAddress: string;
  to: string;
  amount: string;
}): Promise<string> {
  const deployer = getDeployer();
  const artifact = loadArtifact('RestrictedToken');
  const token = new ethers.Contract(params.tokenAddress, artifact.abi, deployer);
  const tx = await token.mint(params.to, ethers.parseEther(params.amount));
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function tokenSetAllowlistRequired(params: {
  tokenAddress: string;
  required: boolean;
}): Promise<string> {
  const deployer = getDeployer();
  const artifact = loadArtifact('RestrictedToken');
  const token = new ethers.Contract(params.tokenAddress, artifact.abi, deployer);
  const tx = await token.setAllowlistRequired(params.required);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function tokenSetLockupEndsAt(params: {
  tokenAddress: string;
  lockupEndsAt: number;
}): Promise<string> {
  const deployer = getDeployer();
  const artifact = loadArtifact('RestrictedToken');
  const token = new ethers.Contract(params.tokenAddress, artifact.abi, deployer);
  const tx = await token.setGlobalLockupEndsAt(params.lockupEndsAt);
  const receipt = await tx.wait();
  return receipt.hash;
}
