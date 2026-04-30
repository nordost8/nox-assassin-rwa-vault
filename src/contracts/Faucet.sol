// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {DemoAsset} from "./DemoAsset.sol";

/// @notice Rate-limited faucet for dASSET; must be enabled as minter on `DemoAsset`.
contract Faucet {
    DemoAsset public immutable asset;
    uint256 public constant DRIP_AMOUNT = 1_000 ether;
    uint256 public constant COOLDOWN_SECONDS = 1 hours;

    mapping(address => uint256) public lastClaimAt;

    error CooldownActive(uint256 nextClaimAt);
    error ZeroAsset();

    constructor(DemoAsset asset_) {
        if (address(asset_) == address(0)) revert ZeroAsset();
        asset = asset_;
    }

    function claim() external {
        uint256 last = lastClaimAt[msg.sender];
        uint256 next = last + COOLDOWN_SECONDS;
        if (last != 0 && block.timestamp < next) {
            revert CooldownActive(next);
        }
        lastClaimAt[msg.sender] = block.timestamp;
        asset.mint(msg.sender, DRIP_AMOUNT);
    }
}
