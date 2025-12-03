# Parco Property Token Contracts

ERC-1155 smart contracts for tokenized real estate on Polygon.

## Architecture

Following industry best practices (RealT, Lofty, Parcl), we use a **single ERC-1155 contract** where:
- Each `tokenId` represents a unique property
- All properties are managed within the same contract
- Metadata URIs are dynamic per tokenId

## Contract: PropertyToken.sol

### Features
- **ERC-1155 Multi-Token Standard**: Multiple property types in one contract
- **Access Control**: Role-based permissions (Admin, Minter, Compliance)
- **Supply Tracking**: Max and current supply per property
- **Compliance Hooks**: Blocklist and transfer restrictions (placeholder for KYC/AML)
- **Pausable**: Emergency stop functionality
- **Reentrancy Guard**: Protection against reentrancy attacks

### Roles
- `DEFAULT_ADMIN_ROLE`: Can grant/revoke other roles
- `ADMIN_ROLE`: Can create properties, update URIs, manage supply, pause/unpause
- `MINTER_ROLE`: Can mint tokens (issuance)
- `BURNER_ROLE`: Can burn tokens (redemptions)
- `COMPLIANCE_ROLE`: Can manage blocklist and compliance settings

### Key Functions

#### Property Management
```solidity
function createProperty(uint256 tokenId, uint256 propertyMaxSupply, string calldata tokenUri)
function setTokenURI(uint256 tokenId, string calldata newUri)
function setMaxSupply(uint256 tokenId, uint256 newMaxSupply)
```

#### Minting/Burning
```solidity
function mint(address to, uint256 tokenId, uint256 amount, bytes calldata data)
function mintBatch(address to, uint256[] calldata tokenIds, uint256[] calldata amounts, bytes calldata data)
function burn(address from, uint256 tokenId, uint256 amount)
function burnBatch(address from, uint256[] calldata tokenIds, uint256[] calldata amounts)
```

#### Compliance
```solidity
function setBlocklist(address account, bool blocked)
function setComplianceEnabled(bool enabled)
```

#### View Functions
```solidity
function propertyExists(uint256 tokenId) returns (bool)
function maxSupply(uint256 tokenId) returns (uint256)
function remainingSupply(uint256 tokenId) returns (uint256)
function totalSupply(uint256 tokenId) returns (uint256)  // from ERC1155Supply
function isBlocklisted(address account) returns (bool)
```

## Installation

```bash
cd backend/blockchain
npm install
```

## Compile

```bash
npm run compile
```

## Deploy

1. Configure network in `hardhat.config.js`
2. Set environment variables:
   - `PRIVATE_KEY`: Deployer wallet private key
   - `POLYGON_RPC_URL`: Polygon RPC endpoint
   - `POLYGONSCAN_API_KEY`: For contract verification

3. Deploy:
```bash
npx hardhat run scripts/deploy.js --network polygon
```

## Metadata

Property metadata follows OpenSea standards. See `metadata/property-template.json` for the structure.

Host metadata on IPFS or a reliable CDN and set the URI when creating properties:
```javascript
// tokenId should match your off-chain propertyId
await propertyToken.createProperty(
  1,                                    // tokenId
  10000,                                // max supply
  "ipfs://QmXxx.../1.json"              // metadata URI
);
```

## Integration with Backend

1. Import the ABI from `contracts/PropertyToken.json`
2. Use ethers.js or viem to interact:

```typescript
import { ethers } from 'ethers';
import PropertyTokenABI from './contracts/PropertyToken.json';

const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, PropertyTokenABI.abi, signer);

// Create a property
await contract.createProperty(propertyId, maxSupply, metadataUri);

// Mint tokens to a user
await contract.mint(userAddress, propertyId, amount, "0x");
```

## Security Considerations

- Contract is pausable in case of emergency
- Only authorized roles can mint/burn tokens
- Compliance hooks allow future KYC/AML integration
- Max supply prevents over-minting
- Reentrancy guards on all state-changing functions

## License

MIT
