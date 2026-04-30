// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Demo Tokenized Asset (dASSET)
/// @notice Demo ERC-20 for Arbitrum Sepolia — real on-chain balances for Nox shielding demos.
contract DemoAsset is ERC20, Ownable {
    mapping(address minter => bool) public isMinter;

    constructor(address initialOwner, string memory name_, string memory symbol_) ERC20(name_, symbol_) Ownable(initialOwner) {}

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function setMinter(address minter, bool allowed) external onlyOwner {
        isMinter[minter] = allowed;
    }

    /// @notice Owner or registered minter (e.g. faucet) can mint test balances.
    function mint(address to, uint256 amount) external {
        require(msg.sender == owner() || isMinter[msg.sender], "DemoAsset: not minter");
        _mint(to, amount);
    }
}
