import { ethers, Contract, Provider, Wallet, JsonRpcProvider } from 'ethers';
import PropertyTokenABI from '../../backend/blockchain/contracts/PropertyToken.json';
import PropertyVaultABI from '../../backend/blockchain/contracts/PropertyVault.json';
import BorrowVaultABI from '../../backend/blockchain/contracts/BorrowVault.json';

const POLYGON_USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const POLYGON_USDC_DECIMALS = 6;
const PRECISION = BigInt('1000000000000000000');

const USDC_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

interface EVMConfig {
  rpcUrl: string;
  privateKey?: string;
  propertyTokenAddress: string;
  propertyVaultAddress: string;
  borrowVaultAddress?: string;
  usdcAddress?: string;
}

interface BorrowPositionInfo {
  principal: string;
  accruedInterest: string;
  interestRateBps: number;
  collateralValue: string;
  currentLtv: number;
  isActive: boolean;
}

interface CollateralInfo {
  tokenIds: number[];
  amounts: number[];
  values: string[];
}

interface VaultStats {
  totalBorrowed: string;
  totalCollateralValue: string;
  availableLiquidity: string;
  maxLtvBps: number;
  liquidationThresholdBps: number;
  baseInterestRateBps: number;
}

class EVMClient {
  private provider: JsonRpcProvider;
  private signer: Wallet | null = null;
  private propertyToken: Contract;
  private propertyVault: Contract;
  private borrowVault: Contract | null = null;
  private usdc: Contract;
  private config: EVMConfig;

  constructor(config: EVMConfig) {
    this.config = config;
    this.provider = new JsonRpcProvider(config.rpcUrl);
    
    if (config.privateKey) {
      this.signer = new Wallet(config.privateKey, this.provider);
    }

    const signerOrProvider = this.signer || this.provider;
    
    this.propertyToken = new Contract(
      config.propertyTokenAddress,
      PropertyTokenABI.abi,
      signerOrProvider
    );

    this.propertyVault = new Contract(
      config.propertyVaultAddress,
      PropertyVaultABI.abi,
      signerOrProvider
    );

    if (config.borrowVaultAddress) {
      this.borrowVault = new Contract(
        config.borrowVaultAddress,
        BorrowVaultABI.abi,
        signerOrProvider
      );
    }

    this.usdc = new Contract(
      config.usdcAddress || POLYGON_USDC_ADDRESS,
      USDC_ABI,
      signerOrProvider
    );
  }

  async getVaultBalance(userAddress: string): Promise<{
    total: string;
    locked: string;
    available: string;
  }> {
    const [total, locked, available] = await Promise.all([
      this.propertyVault.balanceOf(userAddress),
      this.propertyVault.lockedBalanceOf(userAddress),
      this.propertyVault.availableBalanceOf(userAddress),
    ]);

    return {
      total: ethers.formatUnits(total, POLYGON_USDC_DECIMALS),
      locked: ethers.formatUnits(locked, POLYGON_USDC_DECIMALS),
      available: ethers.formatUnits(available, POLYGON_USDC_DECIMALS),
    };
  }

  async getTokenBalance(userAddress: string, tokenId: number): Promise<string> {
    const balance = await this.propertyToken.balanceOf(userAddress, tokenId);
    return balance.toString();
  }

  async getTokenBalances(userAddress: string, tokenIds: number[]): Promise<Map<number, string>> {
    const addresses = tokenIds.map(() => userAddress);
    const balances = await this.propertyToken.balanceOfBatch(addresses, tokenIds);
    
    const result = new Map<number, string>();
    tokenIds.forEach((tokenId, index) => {
      result.set(tokenId, balances[index].toString());
    });
    
    return result;
  }

  async getPropertyInfo(tokenId: number): Promise<{
    exists: boolean;
    maxSupply: string;
    totalSupply: string;
    remainingSupply: string;
    uri: string;
  }> {
    const exists = await this.propertyToken.propertyExists(tokenId);
    
    if (!exists) {
      return {
        exists: false,
        maxSupply: '0',
        totalSupply: '0',
        remainingSupply: '0',
        uri: '',
      };
    }

    const [maxSupply, totalSupply, remainingSupply, uri] = await Promise.all([
      this.propertyToken.maxSupply(tokenId),
      this.propertyToken.totalSupply(tokenId),
      this.propertyToken.remainingSupply(tokenId),
      this.propertyToken.uri(tokenId),
    ]);

    return {
      exists: true,
      maxSupply: maxSupply.toString(),
      totalSupply: totalSupply.toString(),
      remainingSupply: remainingSupply.toString(),
      uri,
    };
  }

  async depositUSDC(amount: string): Promise<{ txHash: string; blockNumber: number }> {
    if (!this.signer) {
      throw new Error('Signer required for transactions');
    }

    const amountWei = ethers.parseUnits(amount, POLYGON_USDC_DECIMALS);

    const allowance = await this.usdc.allowance(
      await this.signer.getAddress(),
      this.config.propertyVaultAddress
    );

    if (allowance < amountWei) {
      const approveTx = await this.usdc.approve(
        this.config.propertyVaultAddress,
        ethers.MaxUint256
      );
      await approveTx.wait();
    }

    const tx = await this.propertyVault.deposit(amountWei);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async depositUSDCFor(
    userAddress: string,
    amount: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    if (!this.signer) {
      throw new Error('Signer required for transactions');
    }

    const amountWei = ethers.parseUnits(amount, POLYGON_USDC_DECIMALS);

    const allowance = await this.usdc.allowance(
      await this.signer.getAddress(),
      this.config.propertyVaultAddress
    );

    if (allowance < amountWei) {
      const approveTx = await this.usdc.approve(
        this.config.propertyVaultAddress,
        ethers.MaxUint256
      );
      await approveTx.wait();
    }

    const tx = await this.propertyVault.depositFor(userAddress, amountWei);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async withdrawUSDC(amount: string): Promise<{ txHash: string; blockNumber: number }> {
    if (!this.signer) {
      throw new Error('Signer required for transactions');
    }

    const amountWei = ethers.parseUnits(amount, POLYGON_USDC_DECIMALS);
    const tx = await this.propertyVault.withdraw(amountWei);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async mintPropertyTokens(
    buyerAddress: string,
    propertyId: number,
    tokenAmount: number,
    usdcCost: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    if (!this.signer) {
      throw new Error('Signer required for transactions');
    }

    const usdcCostWei = ethers.parseUnits(usdcCost, POLYGON_USDC_DECIMALS);

    const tx = await this.propertyVault.purchaseProperty(
      buyerAddress,
      propertyId,
      tokenAmount,
      usdcCostWei
    );
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async createProperty(
    tokenId: number,
    maxSupply: number,
    metadataUri: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    if (!this.signer) {
      throw new Error('Signer required for transactions');
    }

    const tx = await this.propertyToken.createProperty(tokenId, maxSupply, metadataUri);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async lockBalance(
    userAddress: string,
    amount: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    if (!this.signer) {
      throw new Error('Signer required for transactions');
    }

    const amountWei = ethers.parseUnits(amount, POLYGON_USDC_DECIMALS);
    const tx = await this.propertyVault.lockBalance(userAddress, amountWei);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async unlockBalance(
    userAddress: string,
    amount: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    if (!this.signer) {
      throw new Error('Signer required for transactions');
    }

    const amountWei = ethers.parseUnits(amount, POLYGON_USDC_DECIMALS);
    const tx = await this.propertyVault.unlockBalance(userAddress, amountWei);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async getUSDCBalance(address: string): Promise<string> {
    const balance = await this.usdc.balanceOf(address);
    return ethers.formatUnits(balance, POLYGON_USDC_DECIMALS);
  }

  async isBlocklisted(address: string): Promise<boolean> {
    return await this.propertyToken.isBlocklisted(address);
  }

  private ensureBorrowVault(): Contract {
    if (!this.borrowVault) {
      throw new Error('BorrowVault not configured. Set BORROW_VAULT_ADDRESS environment variable.');
    }
    return this.borrowVault;
  }

  async lockCollateral(
    userAddress: string,
    tokenId: number,
    amount: number
  ): Promise<{ txHash: string; blockNumber: number }> {
    if (!this.signer) {
      throw new Error('Signer required for transactions');
    }

    const borrowVault = this.ensureBorrowVault();
    const tx = await borrowVault.lockCollateralFor(userAddress, tokenId, amount);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async unlockCollateral(
    userAddress: string,
    tokenId: number,
    amount: number
  ): Promise<{ txHash: string; blockNumber: number }> {
    if (!this.signer) {
      throw new Error('Signer required for transactions');
    }

    const borrowVault = this.ensureBorrowVault();
    const tx = await borrowVault.unlockCollateralFor(userAddress, tokenId, amount);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async issueLoan(
    borrowerAddress: string,
    amount: string,
    interestRateBps: number
  ): Promise<{ txHash: string; blockNumber: number }> {
    if (!this.signer) {
      throw new Error('Signer required for transactions');
    }

    const borrowVault = this.ensureBorrowVault();
    const amountWei = ethers.parseUnits(amount, POLYGON_USDC_DECIMALS);
    
    const tx = await borrowVault.issueLoan(borrowerAddress, amountWei, interestRateBps);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async recordRepayment(
    borrowerAddress: string,
    principalPaid: string,
    interestPaid: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    if (!this.signer) {
      throw new Error('Signer required for transactions');
    }

    const borrowVault = this.ensureBorrowVault();
    const principalWei = ethers.parseUnits(principalPaid, POLYGON_USDC_DECIMALS);
    const interestWei = ethers.parseUnits(interestPaid, POLYGON_USDC_DECIMALS);
    
    const tx = await borrowVault.recordRepayment(borrowerAddress, principalWei, interestWei);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async setTokenPrice(
    tokenId: number,
    priceUsdc: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    if (!this.signer) {
      throw new Error('Signer required for transactions');
    }

    const borrowVault = this.ensureBorrowVault();
    const priceWithPrecision = ethers.parseUnits(priceUsdc, 18);
    
    const tx = await borrowVault.setTokenPrice(tokenId, priceWithPrecision);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async getBorrowPosition(userAddress: string): Promise<BorrowPositionInfo> {
    const borrowVault = this.ensureBorrowVault();
    
    const [principal, accruedInterest, interestRateBps, collateralValue, currentLtv, isActive] = 
      await borrowVault.getBorrowPosition(userAddress);

    return {
      principal: ethers.formatUnits(principal, POLYGON_USDC_DECIMALS),
      accruedInterest: ethers.formatUnits(accruedInterest, POLYGON_USDC_DECIMALS),
      interestRateBps: Number(interestRateBps),
      collateralValue: ethers.formatUnits(collateralValue, POLYGON_USDC_DECIMALS),
      currentLtv: Number(currentLtv),
      isActive,
    };
  }

  async getCollateralPositions(userAddress: string): Promise<CollateralInfo> {
    const borrowVault = this.ensureBorrowVault();
    
    const [tokenIds, amounts, values] = await borrowVault.getCollateralPositions(userAddress);

    return {
      tokenIds: tokenIds.map((id: bigint) => Number(id)),
      amounts: amounts.map((amt: bigint) => Number(amt)),
      values: values.map((val: bigint) => ethers.formatUnits(val, POLYGON_USDC_DECIMALS)),
    };
  }

  async getTotalLockedValue(userAddress: string): Promise<string> {
    const borrowVault = this.ensureBorrowVault();
    const value = await borrowVault.getTotalLockedValue(userAddress);
    return ethers.formatUnits(value, POLYGON_USDC_DECIMALS);
  }

  async getMaxBorrowable(userAddress: string): Promise<string> {
    const borrowVault = this.ensureBorrowVault();
    const maxBorrow = await borrowVault.getMaxBorrowable(userAddress);
    return ethers.formatUnits(maxBorrow, POLYGON_USDC_DECIMALS);
  }

  async getBorrowVaultStats(): Promise<VaultStats> {
    const borrowVault = this.ensureBorrowVault();
    
    const [totalBorrowed, totalCollateralValue, availableLiquidity, maxLtvBps, liquidationThresholdBps, baseInterestRateBps] = 
      await borrowVault.getVaultStats();

    return {
      totalBorrowed: ethers.formatUnits(totalBorrowed, POLYGON_USDC_DECIMALS),
      totalCollateralValue: ethers.formatUnits(totalCollateralValue, POLYGON_USDC_DECIMALS),
      availableLiquidity: ethers.formatUnits(availableLiquidity, POLYGON_USDC_DECIMALS),
      maxLtvBps: Number(maxLtvBps),
      liquidationThresholdBps: Number(liquidationThresholdBps),
      baseInterestRateBps: Number(baseInterestRateBps),
    };
  }

  async getTokenPrice(tokenId: number): Promise<string> {
    const borrowVault = this.ensureBorrowVault();
    const price = await borrowVault.getTokenPrice(tokenId);
    return ethers.formatUnits(price, 18);
  }

  getProvider(): Provider {
    return this.provider;
  }

  getSignerAddress(): string | null {
    return this.signer ? this.signer.address : null;
  }

  hasBorrowVault(): boolean {
    return this.borrowVault !== null;
  }
}

function getAlchemyRpcUrl(apiKey: string, network: 'polygon' | 'polygon-amoy' = 'polygon'): string {
  const networkMap = {
    'polygon': 'polygon-mainnet',
    'polygon-amoy': 'polygon-amoy',
  };
  return `https://${networkMap[network]}.g.alchemy.com/v2/${apiKey}`;
}

let evmClient: EVMClient | null = null;

export function initializeEVMClient(): EVMClient {
  const alchemyApiKey = process.env.ALCHEMY_API_KEY;
  const operatorPrivateKey = process.env.OPERATOR_PRIVATE_KEY;
  const propertyTokenAddress = process.env.PROPERTY_TOKEN_ADDRESS;
  const propertyVaultAddress = process.env.PROPERTY_VAULT_ADDRESS;
  const borrowVaultAddress = process.env.BORROW_VAULT_ADDRESS;
  const network = (process.env.POLYGON_NETWORK || 'polygon-amoy') as 'polygon' | 'polygon-amoy';

  if (!alchemyApiKey) {
    throw new Error('ALCHEMY_API_KEY environment variable is required');
  }
  if (!propertyTokenAddress) {
    throw new Error('PROPERTY_TOKEN_ADDRESS environment variable is required');
  }
  if (!propertyVaultAddress) {
    throw new Error('PROPERTY_VAULT_ADDRESS environment variable is required');
  }

  const rpcUrl = getAlchemyRpcUrl(alchemyApiKey, network);

  evmClient = new EVMClient({
    rpcUrl,
    privateKey: operatorPrivateKey,
    propertyTokenAddress,
    propertyVaultAddress,
    borrowVaultAddress,
  });

  console.log(`EVM client initialized for ${network}`);
  if (operatorPrivateKey) {
    console.log(`Operator address: ${evmClient.getSignerAddress()}`);
  } else {
    console.log('Running in read-only mode (no operator key)');
  }
  if (borrowVaultAddress) {
    console.log(`BorrowVault configured at: ${borrowVaultAddress}`);
  } else {
    console.log('BorrowVault not configured (lending disabled)');
  }

  return evmClient;
}

export function getEVMClient(): EVMClient {
  if (!evmClient) {
    return initializeEVMClient();
  }
  return evmClient;
}

export async function depositUSDC(amount: string): Promise<{ txHash: string; blockNumber: number }> {
  return getEVMClient().depositUSDC(amount);
}

export async function mintPropertyTokens(
  buyerAddress: string,
  propertyId: number,
  tokenAmount: number,
  usdcCost: string
): Promise<{ txHash: string; blockNumber: number }> {
  return getEVMClient().mintPropertyTokens(buyerAddress, propertyId, tokenAmount, usdcCost);
}

export async function getVaultBalance(userAddress: string): Promise<{
  total: string;
  locked: string;
  available: string;
}> {
  return getEVMClient().getVaultBalance(userAddress);
}

export async function getTokenBalance(userAddress: string, tokenId: number): Promise<string> {
  return getEVMClient().getTokenBalance(userAddress, tokenId);
}

export async function lockCollateral(
  userAddress: string,
  tokenId: number,
  amount: number
): Promise<{ txHash: string; blockNumber: number }> {
  return getEVMClient().lockCollateral(userAddress, tokenId, amount);
}

export async function unlockCollateral(
  userAddress: string,
  tokenId: number,
  amount: number
): Promise<{ txHash: string; blockNumber: number }> {
  return getEVMClient().unlockCollateral(userAddress, tokenId, amount);
}

export async function issueLoan(
  borrowerAddress: string,
  amount: string,
  interestRateBps: number
): Promise<{ txHash: string; blockNumber: number }> {
  return getEVMClient().issueLoan(borrowerAddress, amount, interestRateBps);
}

export async function recordRepayment(
  borrowerAddress: string,
  principalPaid: string,
  interestPaid: string
): Promise<{ txHash: string; blockNumber: number }> {
  return getEVMClient().recordRepayment(borrowerAddress, principalPaid, interestPaid);
}

export async function getBorrowPosition(userAddress: string): Promise<BorrowPositionInfo> {
  return getEVMClient().getBorrowPosition(userAddress);
}

export async function getCollateralPositions(userAddress: string): Promise<CollateralInfo> {
  return getEVMClient().getCollateralPositions(userAddress);
}

export async function getMaxBorrowable(userAddress: string): Promise<string> {
  return getEVMClient().getMaxBorrowable(userAddress);
}

export async function setTokenPrice(tokenId: number, priceUsdc: string): Promise<{ txHash: string; blockNumber: number }> {
  return getEVMClient().setTokenPrice(tokenId, priceUsdc);
}

export { EVMClient, getAlchemyRpcUrl };
export type { EVMConfig, BorrowPositionInfo, CollateralInfo, VaultStats };
