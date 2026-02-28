import { ethers } from 'ethers';
import { logger } from '../observability';

export interface SignerProvider {
  name: string;
  getWallet(provider: ethers.JsonRpcProvider): ethers.Wallet | Promise<ethers.Wallet>;
}

class EnvKeySigner implements SignerProvider {
  name = 'env-key';

  getWallet(provider: ethers.JsonRpcProvider): ethers.Wallet {
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('DEPLOYER_PRIVATE_KEY not set in worker environment');
    }
    return new ethers.Wallet(privateKey, provider);
  }
}

class KMSPlaceholderSigner implements SignerProvider {
  name = 'kms-placeholder';

  getWallet(_provider: ethers.JsonRpcProvider): ethers.Wallet {
    throw new Error(
      'KMS signer not implemented. To integrate AWS KMS or GCP Cloud HSM, ' +
      'implement this class to derive an ethers.Wallet from your KMS key. ' +
      'See: https://docs.ethers.org/v6/api/providers/#Signer',
    );
  }
}

class FireblocksPlaceholderSigner implements SignerProvider {
  name = 'fireblocks-placeholder';

  getWallet(_provider: ethers.JsonRpcProvider): ethers.Wallet {
    throw new Error(
      'Fireblocks signer not implemented. To integrate Fireblocks, ' +
      'use the @fireblocks/fireblocks-web3-provider package and ' +
      'implement this class to return a compatible signer. ' +
      'See: https://developers.fireblocks.com/docs/ethereum-smart-contract-development',
    );
  }
}

const signers: Record<string, SignerProvider> = {
  'env-key': new EnvKeySigner(),
  'kms': new KMSPlaceholderSigner(),
  'fireblocks': new FireblocksPlaceholderSigner(),
};

export function getSignerProvider(): SignerProvider {
  const signerType = process.env.SIGNER_PROVIDER || 'env-key';
  const signer = signers[signerType];
  if (!signer) {
    throw new Error(`Unknown signer provider: ${signerType}. Available: ${Object.keys(signers).join(', ')}`);
  }
  logger.info({ signer: signer.name }, 'Using signer provider');
  return signer;
}

export { EnvKeySigner, KMSPlaceholderSigner, FireblocksPlaceholderSigner };
