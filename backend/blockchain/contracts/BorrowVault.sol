// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IPriceOracle {
    function getTokenPrice(uint256 tokenId) external view returns (uint256);
}

/**
 * @title BorrowVault
 * @author Parco
 * @notice Collateral-based USDC lending using property tokens as collateral
 * @dev Handles collateral locking, LTV calculations, USDC issuance, and repayments
 * 
 * Flow:
 * 1. User locks property tokens as collateral
 * 2. System calculates max borrowable amount based on LTV
 * 3. User borrows USDC against collateral
 * 4. User repays USDC + interest to unlock collateral
 * 5. Liquidation possible if collateral ratio drops below threshold
 */
contract BorrowVault is AccessControl, ReentrancyGuard, Pausable, ERC1155Holder {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");

    IERC20 public immutable usdc;
    IERC1155 public immutable propertyToken;
    
    IPriceOracle public priceOracle;
    
    uint256 public constant PRECISION = 1e18;
    uint256 public constant BPS_PRECISION = 10000;
    
    uint256 public maxLtvBps = 5000;
    uint256 public liquidationThresholdBps = 7500;
    uint256 public liquidationPenaltyBps = 1000;
    uint256 public baseInterestRateBps = 800;
    uint256 public originationFeeBps = 100;
    
    address public treasury;
    
    uint256 public totalBorrowed;
    uint256 public totalCollateralValue;
    
    struct CollateralPosition {
        uint256 tokenId;
        uint256 amount;
        uint256 valueAtLock;
        uint256 lockedAt;
    }
    
    struct BorrowPosition {
        address borrower;
        uint256 principal;
        uint256 accruedInterest;
        uint256 interestRateBps;
        uint256 collateralValue;
        uint256 borrowedAt;
        uint256 lastInterestUpdate;
        bool isActive;
    }
    
    mapping(address => CollateralPosition[]) private _collateralPositions;
    mapping(address => uint256) private _totalLockedValue;
    mapping(address => BorrowPosition) private _borrowPositions;
    mapping(uint256 => uint256) private _tokenPrices;
    
    uint256 private _positionIdCounter;
    
    event CollateralLocked(
        address indexed user,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 value
    );
    
    event CollateralUnlocked(
        address indexed user,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 value
    );
    
    event USDCBorrowed(
        address indexed borrower,
        uint256 principal,
        uint256 originationFee,
        uint256 collateralValue,
        uint256 ltvBps
    );
    
    event USDCRepaid(
        address indexed borrower,
        uint256 principalRepaid,
        uint256 interestPaid,
        uint256 remainingPrincipal
    );
    
    event PositionLiquidated(
        address indexed borrower,
        address indexed liquidator,
        uint256 debtRepaid,
        uint256 collateralSeized,
        uint256 penalty
    );
    
    event TokenPriceUpdated(uint256 indexed tokenId, uint256 oldPrice, uint256 newPrice);
    event PriceOracleUpdated(address indexed oldOracle, address indexed newOracle);
    event ParametersUpdated(string paramName, uint256 oldValue, uint256 newValue);
    
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientCollateral(uint256 available, uint256 required);
    error InsufficientLockedCollateral();
    error ExceedsMaxLTV(uint256 requestedLtv, uint256 maxLtv);
    error NoActivePosition();
    error PositionAlreadyExists();
    error PositionNotLiquidatable(uint256 currentLtv, uint256 threshold);
    error InsufficientVaultBalance(uint256 available, uint256 requested);
    error InvalidParameter(string param);
    error TokenNotSupported(uint256 tokenId);
    error RepaymentExceedsDebt(uint256 payment, uint256 debt);
    
    constructor(
        address usdcAddress,
        address propertyTokenAddress,
        address defaultAdmin
    ) {
        if (usdcAddress == address(0)) revert ZeroAddress();
        if (propertyTokenAddress == address(0)) revert ZeroAddress();
        if (defaultAdmin == address(0)) revert ZeroAddress();
        
        usdc = IERC20(usdcAddress);
        propertyToken = IERC1155(propertyTokenAddress);
        treasury = defaultAdmin;
        
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ADMIN_ROLE, defaultAdmin);
        _grantRole(OPERATOR_ROLE, defaultAdmin);
        _grantRole(LIQUIDATOR_ROLE, defaultAdmin);
    }
    
    /**
     * @notice Lock property tokens as collateral
     * @param tokenId Property token ID to lock
     * @param amount Number of tokens to lock
     */
    function lockCollateral(
        uint256 tokenId,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        
        uint256 tokenPrice = getTokenPrice(tokenId);
        if (tokenPrice == 0) revert TokenNotSupported(tokenId);
        
        propertyToken.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        
        uint256 value = (amount * tokenPrice) / PRECISION;
        
        _collateralPositions[msg.sender].push(CollateralPosition({
            tokenId: tokenId,
            amount: amount,
            valueAtLock: value,
            lockedAt: block.timestamp
        }));
        
        _totalLockedValue[msg.sender] += value;
        totalCollateralValue += value;
        
        emit CollateralLocked(msg.sender, tokenId, amount, value);
    }
    
    /**
     * @notice Lock collateral on behalf of user (operator only)
     * @param user User whose tokens to lock
     * @param tokenId Property token ID to lock
     * @param amount Number of tokens to lock
     */
    function lockCollateralFor(
        address user,
        uint256 tokenId,
        uint256 amount
    ) external onlyRole(OPERATOR_ROLE) nonReentrant whenNotPaused {
        if (user == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        uint256 tokenPrice = getTokenPrice(tokenId);
        if (tokenPrice == 0) revert TokenNotSupported(tokenId);
        
        propertyToken.safeTransferFrom(user, address(this), tokenId, amount, "");
        
        uint256 value = (amount * tokenPrice) / PRECISION;
        
        _collateralPositions[user].push(CollateralPosition({
            tokenId: tokenId,
            amount: amount,
            valueAtLock: value,
            lockedAt: block.timestamp
        }));
        
        _totalLockedValue[user] += value;
        totalCollateralValue += value;
        
        emit CollateralLocked(user, tokenId, amount, value);
    }
    
    /**
     * @notice Unlock collateral after repaying loan
     * @param tokenId Property token ID to unlock
     * @param amount Number of tokens to unlock
     */
    function unlockCollateral(
        uint256 tokenId,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        
        BorrowPosition storage position = _borrowPositions[msg.sender];
        
        _updateAccruedInterest(msg.sender);
        
        uint256 tokenPrice = getTokenPrice(tokenId);
        uint256 unlockValue = (amount * tokenPrice) / PRECISION;
        
        uint256 totalDebt = position.principal + position.accruedInterest;
        if (position.isActive && totalDebt > 0) {
            uint256 newCollateralValue = _totalLockedValue[msg.sender] - unlockValue;
            uint256 newLtv = (totalDebt * BPS_PRECISION) / newCollateralValue;
            if (newLtv > maxLtvBps) {
                revert ExceedsMaxLTV(newLtv, maxLtvBps);
            }
        }
        
        _removeCollateral(msg.sender, tokenId, amount);
        
        _totalLockedValue[msg.sender] -= unlockValue;
        totalCollateralValue -= unlockValue;
        
        propertyToken.safeTransferFrom(address(this), msg.sender, tokenId, amount, "");
        
        emit CollateralUnlocked(msg.sender, tokenId, amount, unlockValue);
    }
    
    /**
     * @notice Unlock collateral for user (operator only, used after off-chain repayment)
     * @param user User whose collateral to unlock
     * @param tokenId Property token ID to unlock
     * @param amount Number of tokens to unlock
     */
    function unlockCollateralFor(
        address user,
        uint256 tokenId,
        uint256 amount
    ) external onlyRole(OPERATOR_ROLE) nonReentrant {
        if (user == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        uint256 tokenPrice = getTokenPrice(tokenId);
        uint256 unlockValue = (amount * tokenPrice) / PRECISION;
        
        _removeCollateral(user, tokenId, amount);
        
        _totalLockedValue[user] -= unlockValue;
        totalCollateralValue -= unlockValue;
        
        propertyToken.safeTransferFrom(address(this), user, tokenId, amount, "");
        
        emit CollateralUnlocked(user, tokenId, amount, unlockValue);
    }
    
    /**
     * @notice Borrow USDC against locked collateral
     * @param amount Amount of USDC to borrow (6 decimals)
     */
    function borrowUSDC(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        
        uint256 collateralValue = _totalLockedValue[msg.sender];
        if (collateralValue == 0) revert InsufficientCollateral(0, amount);
        
        BorrowPosition storage position = _borrowPositions[msg.sender];
        
        if (position.isActive) {
            _updateAccruedInterest(msg.sender);
        }
        
        uint256 currentDebt = position.principal + position.accruedInterest;
        uint256 newTotalDebt = currentDebt + amount;
        
        uint256 requestedLtv = (newTotalDebt * BPS_PRECISION) / collateralValue;
        if (requestedLtv > maxLtvBps) {
            revert ExceedsMaxLTV(requestedLtv, maxLtvBps);
        }
        
        uint256 vaultBalance = usdc.balanceOf(address(this));
        if (vaultBalance < amount) {
            revert InsufficientVaultBalance(vaultBalance, amount);
        }
        
        uint256 originationFee = (amount * originationFeeBps) / BPS_PRECISION;
        uint256 netAmount = amount - originationFee;
        
        if (!position.isActive) {
            position.borrower = msg.sender;
            position.interestRateBps = baseInterestRateBps;
            position.borrowedAt = block.timestamp;
            position.isActive = true;
        }
        
        position.principal += amount;
        position.collateralValue = collateralValue;
        position.lastInterestUpdate = block.timestamp;
        
        totalBorrowed += amount;
        
        if (originationFee > 0 && treasury != address(0)) {
            usdc.safeTransfer(treasury, originationFee);
        }
        
        usdc.safeTransfer(msg.sender, netAmount);
        
        emit USDCBorrowed(msg.sender, amount, originationFee, collateralValue, requestedLtv);
    }
    
    /**
     * @notice Issue USDC loan on behalf of user (operator only)
     * @dev Used when payment is sent via Stripe Payouts off-chain
     * @param borrower Address of the borrower
     * @param amount Principal amount being borrowed (6 decimals)
     * @param interestRateBps Annual interest rate in basis points
     */
    function issueLoan(
        address borrower,
        uint256 amount,
        uint256 interestRateBps
    ) external onlyRole(OPERATOR_ROLE) nonReentrant {
        if (borrower == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        uint256 collateralValue = _totalLockedValue[borrower];
        if (collateralValue == 0) revert InsufficientCollateral(0, amount);
        
        BorrowPosition storage position = _borrowPositions[borrower];
        
        if (position.isActive) {
            _updateAccruedInterest(borrower);
        }
        
        uint256 currentDebt = position.principal + position.accruedInterest;
        uint256 newTotalDebt = currentDebt + amount;
        
        uint256 requestedLtv = (newTotalDebt * BPS_PRECISION) / collateralValue;
        if (requestedLtv > maxLtvBps) {
            revert ExceedsMaxLTV(requestedLtv, maxLtvBps);
        }
        
        if (!position.isActive) {
            position.borrower = borrower;
            position.borrowedAt = block.timestamp;
            position.isActive = true;
        }
        
        position.principal += amount;
        position.interestRateBps = interestRateBps;
        position.collateralValue = collateralValue;
        position.lastInterestUpdate = block.timestamp;
        
        totalBorrowed += amount;
        
        emit USDCBorrowed(borrower, amount, 0, collateralValue, requestedLtv);
    }
    
    /**
     * @notice Repay USDC loan
     * @param amount Amount of USDC to repay (6 decimals)
     */
    function repayUSDC(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        
        BorrowPosition storage position = _borrowPositions[msg.sender];
        if (!position.isActive) revert NoActivePosition();
        
        _updateAccruedInterest(msg.sender);
        
        uint256 totalDebt = position.principal + position.accruedInterest;
        if (amount > totalDebt) {
            revert RepaymentExceedsDebt(amount, totalDebt);
        }
        
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        
        uint256 interestPayment;
        uint256 principalPayment;
        
        if (amount <= position.accruedInterest) {
            interestPayment = amount;
            position.accruedInterest -= amount;
        } else {
            interestPayment = position.accruedInterest;
            principalPayment = amount - interestPayment;
            position.accruedInterest = 0;
            position.principal -= principalPayment;
        }
        
        totalBorrowed -= principalPayment;
        
        if (position.principal == 0 && position.accruedInterest == 0) {
            position.isActive = false;
        }
        
        if (interestPayment > 0 && treasury != address(0)) {
            usdc.safeTransfer(treasury, interestPayment);
        }
        
        emit USDCRepaid(msg.sender, principalPayment, interestPayment, position.principal);
    }
    
    /**
     * @notice Record repayment made off-chain (operator only)
     * @dev Used when payment is processed via Stripe
     * @param borrower Address of the borrower
     * @param principalPaid Principal amount repaid
     * @param interestPaid Interest amount repaid
     */
    function recordRepayment(
        address borrower,
        uint256 principalPaid,
        uint256 interestPaid
    ) external onlyRole(OPERATOR_ROLE) nonReentrant {
        if (borrower == address(0)) revert ZeroAddress();
        
        BorrowPosition storage position = _borrowPositions[borrower];
        if (!position.isActive) revert NoActivePosition();
        
        _updateAccruedInterest(borrower);
        
        if (interestPaid > position.accruedInterest) {
            position.accruedInterest = 0;
        } else {
            position.accruedInterest -= interestPaid;
        }
        
        if (principalPaid > position.principal) {
            position.principal = 0;
        } else {
            position.principal -= principalPaid;
        }
        
        totalBorrowed -= principalPaid;
        
        if (position.principal == 0 && position.accruedInterest == 0) {
            position.isActive = false;
        }
        
        emit USDCRepaid(borrower, principalPaid, interestPaid, position.principal);
    }
    
    /**
     * @notice Liquidate an undercollateralized position
     * @param borrower Address of the borrower to liquidate
     */
    function liquidate(address borrower) external onlyRole(LIQUIDATOR_ROLE) nonReentrant {
        BorrowPosition storage position = _borrowPositions[borrower];
        if (!position.isActive) revert NoActivePosition();
        
        _updateAccruedInterest(borrower);
        
        uint256 currentCollateralValue = _getCurrentCollateralValue(borrower);
        uint256 totalDebt = position.principal + position.accruedInterest;
        
        uint256 currentLtv = (totalDebt * BPS_PRECISION) / currentCollateralValue;
        if (currentLtv < liquidationThresholdBps) {
            revert PositionNotLiquidatable(currentLtv, liquidationThresholdBps);
        }
        
        uint256 penalty = (totalDebt * liquidationPenaltyBps) / BPS_PRECISION;
        uint256 totalToRecover = totalDebt + penalty;
        
        CollateralPosition[] storage collaterals = _collateralPositions[borrower];
        uint256 valueRecovered = 0;
        
        for (uint256 i = 0; i < collaterals.length && valueRecovered < totalToRecover; i++) {
            CollateralPosition storage col = collaterals[i];
            uint256 tokenPrice = getTokenPrice(col.tokenId);
            uint256 currentValue = (col.amount * tokenPrice) / PRECISION;
            
            if (currentValue > 0) {
                uint256 amountToSeize;
                if (valueRecovered + currentValue <= totalToRecover) {
                    amountToSeize = col.amount;
                    valueRecovered += currentValue;
                } else {
                    uint256 valueNeeded = totalToRecover - valueRecovered;
                    amountToSeize = (valueNeeded * PRECISION) / tokenPrice;
                    if (amountToSeize > col.amount) amountToSeize = col.amount;
                    valueRecovered += (amountToSeize * tokenPrice) / PRECISION;
                }
                
                if (amountToSeize > 0) {
                    propertyToken.safeTransferFrom(address(this), treasury, col.tokenId, amountToSeize, "");
                    col.amount -= amountToSeize;
                }
            }
        }
        
        _totalLockedValue[borrower] = 0;
        for (uint256 i = 0; i < collaterals.length; i++) {
            if (collaterals[i].amount > 0) {
                uint256 tokenPrice = getTokenPrice(collaterals[i].tokenId);
                _totalLockedValue[borrower] += (collaterals[i].amount * tokenPrice) / PRECISION;
            }
        }
        
        totalBorrowed -= position.principal;
        totalCollateralValue -= currentCollateralValue;
        totalCollateralValue += _totalLockedValue[borrower];
        
        position.principal = 0;
        position.accruedInterest = 0;
        position.isActive = false;
        
        emit PositionLiquidated(borrower, msg.sender, totalDebt, valueRecovered, penalty);
    }
    
    function _updateAccruedInterest(address user) internal {
        BorrowPosition storage position = _borrowPositions[user];
        if (!position.isActive || position.principal == 0) return;
        
        uint256 timeElapsed = block.timestamp - position.lastInterestUpdate;
        if (timeElapsed == 0) return;
        
        uint256 interest = (position.principal * position.interestRateBps * timeElapsed) / (BPS_PRECISION * 365 days);
        position.accruedInterest += interest;
        position.lastInterestUpdate = block.timestamp;
    }
    
    function _removeCollateral(address user, uint256 tokenId, uint256 amount) internal {
        CollateralPosition[] storage positions = _collateralPositions[user];
        uint256 remaining = amount;
        
        for (uint256 i = 0; i < positions.length && remaining > 0; i++) {
            if (positions[i].tokenId == tokenId && positions[i].amount > 0) {
                if (positions[i].amount >= remaining) {
                    positions[i].amount -= remaining;
                    remaining = 0;
                } else {
                    remaining -= positions[i].amount;
                    positions[i].amount = 0;
                }
            }
        }
        
        if (remaining > 0) revert InsufficientLockedCollateral();
    }
    
    function _getCurrentCollateralValue(address user) internal view returns (uint256) {
        CollateralPosition[] storage positions = _collateralPositions[user];
        uint256 totalValue = 0;
        
        for (uint256 i = 0; i < positions.length; i++) {
            if (positions[i].amount > 0) {
                uint256 tokenPrice = getTokenPrice(positions[i].tokenId);
                totalValue += (positions[i].amount * tokenPrice) / PRECISION;
            }
        }
        
        return totalValue;
    }
    
    /**
     * @notice Get current token price
     * @param tokenId Token ID to get price for
     * @return Price in USDC with PRECISION decimals
     */
    function getTokenPrice(uint256 tokenId) public view returns (uint256) {
        if (address(priceOracle) != address(0)) {
            return priceOracle.getTokenPrice(tokenId);
        }
        return _tokenPrices[tokenId];
    }
    
    /**
     * @notice Set token price (admin only, used when no oracle)
     * @param tokenId Token ID
     * @param price Price in USDC with PRECISION decimals
     */
    function setTokenPrice(uint256 tokenId, uint256 price) external onlyRole(OPERATOR_ROLE) {
        uint256 oldPrice = _tokenPrices[tokenId];
        _tokenPrices[tokenId] = price;
        emit TokenPriceUpdated(tokenId, oldPrice, price);
    }
    
    /**
     * @notice Set price oracle
     * @param oracle Address of the price oracle
     */
    function setPriceOracle(address oracle) external onlyRole(ADMIN_ROLE) {
        address oldOracle = address(priceOracle);
        priceOracle = IPriceOracle(oracle);
        emit PriceOracleUpdated(oldOracle, oracle);
    }
    
    /**
     * @notice Set maximum LTV
     * @param newMaxLtvBps New max LTV in basis points
     */
    function setMaxLTV(uint256 newMaxLtvBps) external onlyRole(ADMIN_ROLE) {
        if (newMaxLtvBps > 9000) revert InvalidParameter("maxLtvBps");
        uint256 oldValue = maxLtvBps;
        maxLtvBps = newMaxLtvBps;
        emit ParametersUpdated("maxLtvBps", oldValue, newMaxLtvBps);
    }
    
    /**
     * @notice Set liquidation threshold
     * @param newThresholdBps New threshold in basis points
     */
    function setLiquidationThreshold(uint256 newThresholdBps) external onlyRole(ADMIN_ROLE) {
        if (newThresholdBps <= maxLtvBps || newThresholdBps > 9500) revert InvalidParameter("liquidationThresholdBps");
        uint256 oldValue = liquidationThresholdBps;
        liquidationThresholdBps = newThresholdBps;
        emit ParametersUpdated("liquidationThresholdBps", oldValue, newThresholdBps);
    }
    
    /**
     * @notice Set base interest rate
     * @param newRateBps New rate in basis points
     */
    function setBaseInterestRate(uint256 newRateBps) external onlyRole(ADMIN_ROLE) {
        if (newRateBps > 5000) revert InvalidParameter("baseInterestRateBps");
        uint256 oldValue = baseInterestRateBps;
        baseInterestRateBps = newRateBps;
        emit ParametersUpdated("baseInterestRateBps", oldValue, newRateBps);
    }
    
    /**
     * @notice Set treasury address
     * @param newTreasury New treasury address
     */
    function setTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        treasury = newTreasury;
    }
    
    /**
     * @notice Deposit USDC into vault for lending (admin/treasury)
     * @param amount Amount to deposit
     */
    function depositLiquidity(uint256 amount) external onlyRole(ADMIN_ROLE) nonReentrant {
        if (amount == 0) revert ZeroAmount();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
    }
    
    /**
     * @notice Withdraw excess USDC from vault (admin/treasury)
     * @param amount Amount to withdraw
     */
    function withdrawLiquidity(uint256 amount) external onlyRole(ADMIN_ROLE) nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 available = usdc.balanceOf(address(this));
        if (available < amount) revert InsufficientVaultBalance(available, amount);
        usdc.safeTransfer(treasury, amount);
    }
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    function getBorrowPosition(address user) external view returns (
        uint256 principal,
        uint256 accruedInterest,
        uint256 interestRateBps,
        uint256 collateralValue,
        uint256 currentLtv,
        bool isActive
    ) {
        BorrowPosition storage position = _borrowPositions[user];
        
        uint256 pendingInterest = 0;
        if (position.isActive && position.principal > 0) {
            uint256 timeElapsed = block.timestamp - position.lastInterestUpdate;
            pendingInterest = (position.principal * position.interestRateBps * timeElapsed) / (BPS_PRECISION * 365 days);
        }
        
        uint256 totalInterest = position.accruedInterest + pendingInterest;
        uint256 totalDebt = position.principal + totalInterest;
        uint256 currentCollValue = _getCurrentCollateralValue(user);
        
        uint256 ltv = 0;
        if (currentCollValue > 0) {
            ltv = (totalDebt * BPS_PRECISION) / currentCollValue;
        }
        
        return (
            position.principal,
            totalInterest,
            position.interestRateBps,
            currentCollValue,
            ltv,
            position.isActive
        );
    }
    
    function getCollateralPositions(address user) external view returns (
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        uint256[] memory values
    ) {
        CollateralPosition[] storage positions = _collateralPositions[user];
        uint256 count = 0;
        
        for (uint256 i = 0; i < positions.length; i++) {
            if (positions[i].amount > 0) count++;
        }
        
        tokenIds = new uint256[](count);
        amounts = new uint256[](count);
        values = new uint256[](count);
        
        uint256 j = 0;
        for (uint256 i = 0; i < positions.length && j < count; i++) {
            if (positions[i].amount > 0) {
                tokenIds[j] = positions[i].tokenId;
                amounts[j] = positions[i].amount;
                values[j] = (positions[i].amount * getTokenPrice(positions[i].tokenId)) / PRECISION;
                j++;
            }
        }
        
        return (tokenIds, amounts, values);
    }
    
    function getTotalLockedValue(address user) external view returns (uint256) {
        return _getCurrentCollateralValue(user);
    }
    
    function getMaxBorrowable(address user) external view returns (uint256) {
        uint256 collateralValue = _getCurrentCollateralValue(user);
        if (collateralValue == 0) return 0;
        
        BorrowPosition storage position = _borrowPositions[user];
        uint256 currentDebt = position.principal + position.accruedInterest;
        
        if (position.isActive && position.principal > 0) {
            uint256 timeElapsed = block.timestamp - position.lastInterestUpdate;
            uint256 pendingInterest = (position.principal * position.interestRateBps * timeElapsed) / (BPS_PRECISION * 365 days);
            currentDebt += pendingInterest;
        }
        
        uint256 maxDebt = (collateralValue * maxLtvBps) / BPS_PRECISION;
        
        if (currentDebt >= maxDebt) return 0;
        return maxDebt - currentDebt;
    }
    
    function getVaultStats() external view returns (
        uint256 _totalBorrowed,
        uint256 _totalCollateralValue,
        uint256 availableLiquidity,
        uint256 _maxLtvBps,
        uint256 _liquidationThresholdBps,
        uint256 _baseInterestRateBps
    ) {
        return (
            totalBorrowed,
            totalCollateralValue,
            usdc.balanceOf(address(this)),
            maxLtvBps,
            liquidationThresholdBps,
            baseInterestRateBps
        );
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl, ERC1155Holder)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
