// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract AllowlistRegistry is Ownable {
    mapping(address => bool) private _allowed;

    event AllowlistUpdated(address indexed account, bool allowed);

    constructor() Ownable(msg.sender) {}

    function setAllowed(address account, bool allowed) external onlyOwner {
        _allowed[account] = allowed;
        emit AllowlistUpdated(account, allowed);
    }

    function batchSetAllowed(address[] calldata accounts, bool allowed) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            _allowed[accounts[i]] = allowed;
            emit AllowlistUpdated(accounts[i], allowed);
        }
    }

    function isAllowed(address account) external view returns (bool) {
        return _allowed[account];
    }
}
