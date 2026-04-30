// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984.sol";
import {ERC20ToERC7984Wrapper} from "@iexec-nox/nox-confidential-contracts/contracts/token/extensions/ERC20ToERC7984Wrapper.sol";

/// @title Confidential wrapper for DemoAsset
/// @notice Wraps dASSET into confidential ERC-7984 via iExec Nox (1:1 decimals).
contract ConfidentialDemoAsset is ERC20ToERC7984Wrapper {
    constructor(IERC20 underlying_, string memory name_, string memory symbol_)
        ERC7984(name_, symbol_, "")
        ERC20ToERC7984Wrapper(underlying_)
    {}
}
