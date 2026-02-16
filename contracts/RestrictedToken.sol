// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./AllowlistRegistry.sol";

contract RestrictedToken is ERC20, Ownable, Pausable {
    AllowlistRegistry public registry;
    bool public allowlistRequired;
    uint256 public globalLockupEndsAt;

    event RegistryUpdated(address indexed newRegistry);
    event AllowlistRequiredUpdated(bool required);
    event GlobalLockupUpdated(uint256 endsAt);

    constructor(
        string memory name_,
        string memory symbol_,
        address registryAddress
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        registry = AllowlistRegistry(registryAddress);
        allowlistRequired = true;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    function setAllowlistRequired(bool required) external onlyOwner {
        allowlistRequired = required;
        emit AllowlistRequiredUpdated(required);
    }

    function setGlobalLockupEndsAt(uint256 endsAt) external onlyOwner {
        globalLockupEndsAt = endsAt;
        emit GlobalLockupUpdated(endsAt);
    }

    function setRegistry(address newRegistry) external onlyOwner {
        registry = AllowlistRegistry(newRegistry);
        emit RegistryUpdated(newRegistry);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _update(address from, address to, uint256 value) internal override {
        require(!paused(), "RestrictedToken: paused");

        bool isMint = from == address(0);
        bool isBurn = to == address(0);

        if (!isMint && !isBurn && allowlistRequired) {
            require(registry.isAllowed(from), "RestrictedToken: sender not allowlisted");
            require(registry.isAllowed(to), "RestrictedToken: recipient not allowlisted");
        }

        if (!isMint && globalLockupEndsAt > block.timestamp) {
            revert("RestrictedToken: global lockup active");
        }

        super._update(from, to, value);
    }
}
