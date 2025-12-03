import { ethers, Contract, Provider, Wallet, JsonRpcProvider } from 'ethers';
import PropertyTokenABI from '../../backend/blockchain/contracts/PropertyToken.json';
import PropertyVaultABI from '../../backend/blockchain/contracts/PropertyVault.json';

const POLYGON_USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const POLYGON_USDC_DECIMALS = 6;

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
  usdcAddress?: string;
}

class EVMClient {
  private provider: JsonRpcProvider;
  private signer: Wallet | null = null;
  private propertyToken: Contract;
  private propertyVault: Contract;
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

  getProvider(): Provider {
    return this.provider;
  }

  getSignerAddress(): string | null {
    return this.signer ? this.signer.address : null;
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
  });

  console.log(`EVM client initialized for ${network}`);
  if (operatorPrivateKey) {
    console.log(`Operator address: ${evmClient.getSignerAddress()}`);
  } else {
    console.log('Running in read-only mode (no operator key)');
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

export { EVMClient, getAlchemyRpcUrl };
export type { EVMConfig };
