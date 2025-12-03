// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IPropertyToken {
    function mint(address to, uint256 tokenId, uint256 amount, bytes calldata data) external;
}

/**
 * @title PropertyVault
 * @author Parco
 * @notice USDC vault for property token purchases
 * @dev Handles USDC deposits, withdrawals, and property token minting
 * 
 * Flow:
 * 1. User deposits USDC → balance credited
 * 2. User purchases property → USDC deducted, ERC-1155 tokens minted
 * 3. User can withdraw unused USDC anytime
 */
contract PropertyVault is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    IERC20 public immutable usdc;
    IPropertyToken public propertyToken;

    mapping(address => uint256) private _balances;
    mapping(address => uint256) private _lockedBalances;

    uint256 public totalDeposits;
    uint256 public platformFeesBps;
    address public feeRecipient;
    address public treasury;

    event Deposited(address indexed user, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed user, uint256 amount, uint256 newBalance);
    event PropertyPurchased(
        address indexed buyer,
        uint256 indexed propertyId,
        uint256 tokenAmount,
        uint256 usdcSpent,
        uint256 platformFee
    );
    event PropertyTokenUpdated(address indexed oldToken, address indexed newToken);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event PlatformFeesUpdated(uint256 oldFee, uint256 newFee);
    event BalanceLocked(address indexed user, uint256 amount);
    event BalanceUnlocked(address indexed user, uint256 amount);

    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance(uint256 available, uint256 requested);
    error InsufficientLockedBalance(uint256 locked, uint256 requested);
    error PropertyTokenNotSet();
    error TreasuryNotSet();
    error InvalidFee(uint256 fee);

    /**
     * @notice Initialize the vault
     * @param usdcAddress Address of the USDC token contract
     * @param defaultAdmin Address that will receive admin roles
     */
    constructor(address usdcAddress, address defaultAdmin) {
        if (usdcAddress == address(0)) revert ZeroAddress();
        if (defaultAdmin == address(0)) revert ZeroAddress();

        usdc = IERC20(usdcAddress);
        feeRecipient = defaultAdmin;
        treasury = defaultAdmin;
        platformFeesBps = 100;

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ADMIN_ROLE, defaultAdmin);
        _grantRole(OPERATOR_ROLE, defaultAdmin);
    }

    /**
     * @notice Deposit USDC into the vault
     * @param amount Amount of USDC to deposit (6 decimals)
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        
        _balances[msg.sender] += amount;
        totalDeposits += amount;

        emit Deposited(msg.sender, amount, _balances[msg.sender]);
    }

    /**
     * @notice Deposit USDC on behalf of another user (admin/operator only)
     * @param user User to credit the deposit to
     * @param amount Amount of USDC to deposit
     */
    function depositFor(address user, uint256 amount) external onlyRole(OPERATOR_ROLE) nonReentrant whenNotPaused {
        if (user == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        
        _balances[user] += amount;
        totalDeposits += amount;

        emit Deposited(user, amount, _balances[user]);
    }

    /**
     * @notice Withdraw USDC from the vault
     * @param amount Amount of USDC to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        
        uint256 available = _balances[msg.sender] - _lockedBalances[msg.sender];
        if (available < amount) revert InsufficientBalance(available, amount);

        _balances[msg.sender] -= amount;
        totalDeposits -= amount;

        usdc.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount, _balances[msg.sender]);
    }

    /**
     * @notice Purchase property tokens using vault balance
     * @param buyer Address of the buyer (must have sufficient balance)
     * @param propertyId ID of the property token to mint
     * @param tokenAmount Number of property tokens to mint
     * @param usdcCost Total USDC cost for the purchase
     * @dev Only callable by OPERATOR_ROLE (backend service)
     */
    function purchaseProperty(
        address buyer,
        uint256 propertyId,
        uint256 tokenAmount,
        uint256 usdcCost
    ) external onlyRole(OPERATOR_ROLE) nonReentrant whenNotPaused {
        if (buyer == address(0)) revert ZeroAddress();
        if (tokenAmount == 0) revert ZeroAmount();
        if (usdcCost == 0) revert ZeroAmount();
        if (address(propertyToken) == address(0)) revert PropertyTokenNotSet();
        if (treasury == address(0)) revert TreasuryNotSet();

        uint256 available = _balances[buyer] - _lockedBalances[buyer];
        if (available < usdcCost) revert InsufficientBalance(available, usdcCost);

        uint256 platformFee = (usdcCost * platformFeesBps) / 10000;
        uint256 netProceeds = usdcCost - platformFee;

        _balances[buyer] -= usdcCost;
        totalDeposits -= usdcCost;

        if (platformFee > 0 && feeRecipient != address(0)) {
            usdc.safeTransfer(feeRecipient, platformFee);
        }

        usdc.safeTransfer(treasury, netProceeds);

        propertyToken.mint(buyer, propertyId, tokenAmount, "");

        emit PropertyPurchased(buyer, propertyId, tokenAmount, usdcCost, platformFee);
    }

    /**
     * @notice Lock a portion of user's balance (for pending transactions)
     * @param user User whose balance to lock
     * @param amount Amount to lock
     */
    function lockBalance(address user, uint256 amount) external onlyRole(OPERATOR_ROLE) {
        if (user == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        uint256 available = _balances[user] - _lockedBalances[user];
        if (available < amount) revert InsufficientBalance(available, amount);

        _lockedBalances[user] += amount;
        emit BalanceLocked(user, amount);
    }

    /**
     * @notice Unlock a portion of user's balance
     * @param user User whose balance to unlock
     * @param amount Amount to unlock
     */
    function unlockBalance(address user, uint256 amount) external onlyRole(OPERATOR_ROLE) {
        if (user == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (_lockedBalances[user] < amount) revert InsufficientLockedBalance(_lockedBalances[user], amount);

        _lockedBalances[user] -= amount;
        emit BalanceUnlocked(user, amount);
    }

    /**
     * @notice Set the PropertyToken contract address
     * @param tokenAddress Address of the PropertyToken contract
     */
    function setPropertyToken(address tokenAddress) external onlyRole(ADMIN_ROLE) {
        if (tokenAddress == address(0)) revert ZeroAddress();
        
        address oldToken = address(propertyToken);
        propertyToken = IPropertyToken(tokenAddress);
        
        emit PropertyTokenUpdated(oldToken, tokenAddress);
    }

    /**
     * @notice Set the platform fee recipient
     * @param recipient Address to receive platform fees
     */
    function setFeeRecipient(address recipient) external onlyRole(ADMIN_ROLE) {
        if (recipient == address(0)) revert ZeroAddress();
        
        address oldRecipient = feeRecipient;
        feeRecipient = recipient;
        
        emit FeeRecipientUpdated(oldRecipient, recipient);
    }

    /**
     * @notice Set the platform fee in basis points (100 = 1%)
     * @param feeBps Fee in basis points (max 1000 = 10%)
     */
    function setPlatformFee(uint256 feeBps) external onlyRole(ADMIN_ROLE) {
        if (feeBps > 1000) revert InvalidFee(feeBps);
        
        uint256 oldFee = platformFeesBps;
        platformFeesBps = feeBps;
        
        emit PlatformFeesUpdated(oldFee, feeBps);
    }

    /**
     * @notice Set the treasury address for property sale proceeds
     * @param newTreasury Address to receive property purchase proceeds
     */
    function setTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        
        address oldTreasury = treasury;
        treasury = newTreasury;
        
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @notice Pause all vault operations
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause vault operations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Emergency withdraw stuck tokens (admin only)
     * @param token Address of the token to withdraw
     * @param to Address to send tokens to
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }

    function balanceOf(address user) external view returns (uint256) {
        return _balances[user];
    }

    function lockedBalanceOf(address user) external view returns (uint256) {
        return _lockedBalances[user];
    }

    function availableBalanceOf(address user) external view returns (uint256) {
        return _balances[user] - _lockedBalances[user];
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
