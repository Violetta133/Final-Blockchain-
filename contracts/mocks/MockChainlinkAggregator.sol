// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../../interfaces/IChainlinkFeed.sol";

contract MockChainlinkAggregator is IChainlinkFeed {
    int256 public mockPrice;
    uint256 public mockUpdatedAt;
    uint8 public mockDecimals;
    uint80 public mockRoundId;
    uint80 public mockAnsweredInRound;

    constructor(int256 price_, uint8 decimals_) {
        mockPrice = price_;
        mockDecimals = decimals_;
        mockUpdatedAt = block.timestamp;
        mockRoundId = 1;
        mockAnsweredInRound = 1;
    }

    function setPrice(int256 price_) external {
        mockPrice = price_;
        mockUpdatedAt = block.timestamp;
        mockRoundId++;
        mockAnsweredInRound = mockRoundId;
    }

    function setUpdatedAt(uint256 updatedAt_) external {
        mockUpdatedAt = updatedAt_;
    }

    function setStale(uint256 secondsAgo) external {
        mockUpdatedAt = block.timestamp - secondsAgo;
    }

    function setRound(uint80 roundId_, uint80 answeredInRound_) external {
        mockRoundId = roundId_;
        mockAnsweredInRound = answeredInRound_;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (mockRoundId, mockPrice, mockUpdatedAt, mockUpdatedAt, mockAnsweredInRound);
    }

    function decimals() external view returns (uint8) {
        return mockDecimals;
    }

    function description() external pure returns (string memory) {
        return "GFTI / USD";
    }
}
