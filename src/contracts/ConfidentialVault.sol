// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Nox, euint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Confidential group vault.
///         Anyone can create a fundraising room for any ERC-20 token.
///         Total raised per room is public; individual contributions are encrypted —
///         only the contributor can decrypt their receipt via iExec TEE.
contract ConfidentialVault {
    using SafeERC20 for IERC20;

    struct Room {
        string name;
        address owner;
        address token;
        uint256 goal;
        uint256 totalRaised;
        bool active;
    }

    uint256 public roomCount;

    mapping(uint256 => Room) public rooms;
    /// @dev Encrypted contribution receipt: roomId → contributor → euint256 handle.
    ///      Only the contributor can decrypt via iExec TEE (Nox.allow).
    mapping(uint256 => mapping(address => euint256)) private _contributions;
    mapping(uint256 => mapping(address => bool)) private _hasContributed;

    event RoomCreated(uint256 indexed roomId, address indexed owner, address token, string name, uint256 goal);
    event Contributed(uint256 indexed roomId, address indexed contributor);
    event Withdrawn(uint256 indexed roomId, address indexed owner, uint256 amount);

    /// @notice Create a fundraising room for any ERC-20 token.
    function createRoom(string calldata name, address token, uint256 goal) external returns (uint256 roomId) {
        require(token != address(0), "Token required");
        require(goal > 0, "Goal must be > 0");
        roomId = roomCount++;
        rooms[roomId] = Room({name: name, owner: msg.sender, token: token, goal: goal, totalRaised: 0, active: true});
        emit RoomCreated(roomId, msg.sender, token, name, goal);
    }

    /// @notice Contribute tokens to a room.
    ///         Your contribution amount is stored as an encrypted Nox handle —
    ///         only you can decrypt it via iExec TEE.
    function contribute(uint256 roomId, uint256 amount) external {
        Room storage r = rooms[roomId];
        require(r.active, "Room closed");
        require(amount > 0, "Amount must be > 0");

        IERC20(r.token).safeTransferFrom(msg.sender, address(this), amount);
        r.totalRaised += amount;

        // Encrypt contribution amount as a Nox handle and grant only msg.sender the right to decrypt.
        euint256 encAmount = Nox.toEuint256(amount);
        if (!_hasContributed[roomId][msg.sender]) {
            _contributions[roomId][msg.sender] = encAmount;
            _hasContributed[roomId][msg.sender] = true;
        } else {
            _contributions[roomId][msg.sender] = Nox.add(_contributions[roomId][msg.sender], encAmount);
        }
        Nox.allowThis(_contributions[roomId][msg.sender]);
        Nox.allow(_contributions[roomId][msg.sender], msg.sender);

        emit Contributed(roomId, msg.sender);
    }

    /// @notice Room owner withdraws raised funds.
    function withdraw(uint256 roomId, uint256 amount) external {
        Room storage r = rooms[roomId];
        require(r.active, "Room closed");
        require(msg.sender == r.owner, "Not room owner");
        require(r.totalRaised >= amount, "Insufficient balance");
        r.totalRaised -= amount;
        IERC20(r.token).safeTransfer(msg.sender, amount);
        emit Withdrawn(roomId, msg.sender, amount);
    }

    /// @notice Returns the encrypted contribution receipt for a contributor.
    ///         The returned bytes32 handle can only be decrypted by the contributor via iExec TEE.
    function getContributionHandle(uint256 roomId, address contributor) external view returns (euint256) {
        require(_hasContributed[roomId][contributor], "No contribution found");
        return _contributions[roomId][contributor];
    }

    function hasContributed(uint256 roomId, address contributor) external view returns (bool) {
        return _hasContributed[roomId][contributor];
    }

    /// @notice Batch read: returns info for rooms [from, from+count).
    function getRooms(uint256 from, uint256 count) external view returns (Room[] memory result) {
        uint256 total = roomCount;
        uint256 end = from + count > total ? total : from + count;
        result = new Room[](end > from ? end - from : 0);
        for (uint256 i = from; i < end; i++) {
            result[i - from] = rooms[i];
        }
    }
}
