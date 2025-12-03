// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PropertyToken
 * @author Parco Labs
 * @notice ERC-1155 contract for tokenized real estate properties
 * @dev Each tokenId represents a unique property. All properties are managed
 *      within this single contract following industry standards (RealT, Lofty, Parcl).
 *
 * Key Features:
 * - One contract, multiple properties (tokenId = propertyId)
 * - Admin-only minting and burning
 * - Per-token URI metadata
 * - Supply tracking per tokenId
 * - Compliance hook placeholder for transfer restrictions
 * - Pausable for emergency stops
 */
contract PropertyToken is ERC1155, ERC1155Supply, AccessControl, Pausable, ReentrancyGuard {
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    string public name = "Parco Property Tokens";
    string public symbol = "PARCO";

    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => bool) private _propertyExists;
    mapping(uint256 => uint256) private _maxSupply;
    
    mapping(address => bool) private _blocklist;
    bool public complianceEnabled = false;

    event PropertyCreated(uint256 indexed tokenId, uint256 maxSupply, string uri);
    event PropertyMinted(uint256 indexed tokenId, address indexed to, uint256 amount);
    event PropertyBurned(uint256 indexed tokenId, address indexed from, uint256 amount);
    event PropertyURIUpdated(uint256 indexed tokenId, string newUri);
    event MaxSupplyUpdated(uint256 indexed tokenId, uint256 newMaxSupply);
    event AddressBlocklistUpdated(address indexed account, bool blocked);
    event ComplianceToggled(bool enabled);

    error PropertyDoesNotExist(uint256 tokenId);
    error PropertyAlreadyExists(uint256 tokenId);
    error ExceedsMaxSupply(uint256 tokenId, uint256 requested, uint256 available);
    error BlocklistedAddress(address account);
    error ZeroAddress();
    error ZeroAmount();
    error InvalidMaxSupply();

    constructor(address defaultAdmin) ERC1155("") {
        if (defaultAdmin == address(0)) revert ZeroAddress();
        
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, defaultAdmin);
        _grantRole(BURNER_ROLE, defaultAdmin);
        _grantRole(COMPLIANCE_ROLE, defaultAdmin);
    }

    /**
     * @notice Creates a new property token type
     * @param tokenId Unique identifier for the property (should match off-chain propertyId)
     * @param propertyMaxSupply Maximum number of tokens that can be minted for this property
     * @param tokenUri Metadata URI for this property
     */
    function createProperty(
        uint256 tokenId,
        uint256 propertyMaxSupply,
        string calldata tokenUri
    ) external onlyRole(ADMIN_ROLE) {
        if (_propertyExists[tokenId]) revert PropertyAlreadyExists(tokenId);
        if (propertyMaxSupply == 0) revert InvalidMaxSupply();

        _propertyExists[tokenId] = true;
        _maxSupply[tokenId] = propertyMaxSupply;
        _tokenURIs[tokenId] = tokenUri;

        emit PropertyCreated(tokenId, propertyMaxSupply, tokenUri);
    }

    /**
     * @notice Mints property tokens to a recipient
     * @param to Recipient address
     * @param tokenId Property token ID
     * @param amount Number of tokens to mint
     * @param data Additional data (passed to receiver hook)
     */
    function mint(
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes calldata data
    ) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (!_propertyExists[tokenId]) revert PropertyDoesNotExist(tokenId);
        
        uint256 currentSupply = totalSupply(tokenId);
        uint256 propertyMaxSupply = _maxSupply[tokenId];
        if (currentSupply + amount > propertyMaxSupply) {
            revert ExceedsMaxSupply(tokenId, amount, propertyMaxSupply - currentSupply);
        }

        _mint(to, tokenId, amount, data);
        
        emit PropertyMinted(tokenId, to, amount);
    }

    /**
     * @notice Batch mints property tokens to a recipient
     * @param to Recipient address
     * @param tokenIds Array of property token IDs
     * @param amounts Array of amounts to mint
     * @param data Additional data (passed to receiver hook)
     */
    function mintBatch(
        address to,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        bytes calldata data
    ) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (!_propertyExists[tokenIds[i]]) revert PropertyDoesNotExist(tokenIds[i]);
            if (amounts[i] == 0) revert ZeroAmount();
            
            uint256 currentSupply = totalSupply(tokenIds[i]);
            uint256 propertyMaxSupply = _maxSupply[tokenIds[i]];
            if (currentSupply + amounts[i] > propertyMaxSupply) {
                revert ExceedsMaxSupply(tokenIds[i], amounts[i], propertyMaxSupply - currentSupply);
            }
        }

        _mintBatch(to, tokenIds, amounts, data);
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            emit PropertyMinted(tokenIds[i], to, amounts[i]);
        }
    }

    /**
     * @notice Burns property tokens from an address
     * @param from Address to burn from
     * @param tokenId Property token ID
     * @param amount Number of tokens to burn
     */
    function burn(
        address from,
        uint256 tokenId,
        uint256 amount
    ) external onlyRole(BURNER_ROLE) whenNotPaused nonReentrant {
        if (from == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (!_propertyExists[tokenId]) revert PropertyDoesNotExist(tokenId);

        _burn(from, tokenId, amount);
        
        emit PropertyBurned(tokenId, from, amount);
    }

    /**
     * @notice Batch burns property tokens from an address
     * @param from Address to burn from
     * @param tokenIds Array of property token IDs
     * @param amounts Array of amounts to burn
     */
    function burnBatch(
        address from,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) external onlyRole(BURNER_ROLE) whenNotPaused nonReentrant {
        if (from == address(0)) revert ZeroAddress();
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (!_propertyExists[tokenIds[i]]) revert PropertyDoesNotExist(tokenIds[i]);
            if (amounts[i] == 0) revert ZeroAmount();
        }

        _burnBatch(from, tokenIds, amounts);
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            emit PropertyBurned(tokenIds[i], from, amounts[i]);
        }
    }

    /**
     * @notice Updates the metadata URI for a property
     * @param tokenId Property token ID
     * @param newUri New metadata URI
     */
    function setTokenURI(
        uint256 tokenId,
        string calldata newUri
    ) external onlyRole(ADMIN_ROLE) {
        if (!_propertyExists[tokenId]) revert PropertyDoesNotExist(tokenId);
        
        _tokenURIs[tokenId] = newUri;
        
        emit PropertyURIUpdated(tokenId, newUri);
        emit URI(newUri, tokenId);
    }

    /**
     * @notice Updates the maximum supply for a property
     * @param tokenId Property token ID
     * @param newMaxSupply New maximum supply (must be >= current supply)
     */
    function setMaxSupply(
        uint256 tokenId,
        uint256 newMaxSupply
    ) external onlyRole(ADMIN_ROLE) {
        if (!_propertyExists[tokenId]) revert PropertyDoesNotExist(tokenId);
        if (newMaxSupply < totalSupply(tokenId)) revert InvalidMaxSupply();
        
        _maxSupply[tokenId] = newMaxSupply;
        
        emit MaxSupplyUpdated(tokenId, newMaxSupply);
    }

    /**
     * @notice Adds or removes an address from the blocklist
     * @param account Address to update
     * @param blocked Whether the address should be blocked
     */
    function setBlocklist(
        address account,
        bool blocked
    ) external onlyRole(COMPLIANCE_ROLE) {
        _blocklist[account] = blocked;
        emit AddressBlocklistUpdated(account, blocked);
    }

    /**
     * @notice Enables or disables compliance checks
     * @param enabled Whether compliance should be enabled
     */
    function setComplianceEnabled(bool enabled) external onlyRole(COMPLIANCE_ROLE) {
        complianceEnabled = enabled;
        emit ComplianceToggled(enabled);
    }

    /**
     * @notice Pauses all token transfers
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses all token transfers
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Returns the metadata URI for a specific property
     * @param tokenId Property token ID
     * @return Metadata URI string
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        if (!_propertyExists[tokenId]) revert PropertyDoesNotExist(tokenId);
        return _tokenURIs[tokenId];
    }

    /**
     * @notice Returns whether a property exists
     * @param tokenId Property token ID
     * @return Boolean indicating if property exists
     */
    function propertyExists(uint256 tokenId) external view returns (bool) {
        return _propertyExists[tokenId];
    }

    /**
     * @notice Returns the maximum supply for a property
     * @param tokenId Property token ID
     * @return Maximum token supply
     */
    function maxSupply(uint256 tokenId) external view returns (uint256) {
        return _maxSupply[tokenId];
    }

    /**
     * @notice Returns the remaining mintable supply for a property
     * @param tokenId Property token ID
     * @return Remaining mintable tokens
     */
    function remainingSupply(uint256 tokenId) external view returns (uint256) {
        if (!_propertyExists[tokenId]) return 0;
        return _maxSupply[tokenId] - totalSupply(tokenId);
    }

    /**
     * @notice Checks if an address is blocklisted
     * @param account Address to check
     * @return Boolean indicating if address is blocked
     */
    function isBlocklisted(address account) external view returns (bool) {
        return _blocklist[account];
    }

    /**
     * @dev Compliance hook - called before any token transfer
     *      Override this to add KYC/AML checks, transfer restrictions, etc.
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override(ERC1155, ERC1155Supply) whenNotPaused {
        if (complianceEnabled) {
            if (from != address(0) && _blocklist[from]) revert BlocklistedAddress(from);
            if (to != address(0) && _blocklist[to]) revert BlocklistedAddress(to);
        }
        
        super._update(from, to, ids, values);
    }

    /**
     * @dev Required override for AccessControl
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
