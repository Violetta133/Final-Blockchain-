// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

interface IRawVRFConsumer {
    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external;
}

contract MockVRFCoordinatorV2Plus {
    uint256 public nextRequestId = 1;
    address public lastConsumer;

    event RandomWordsRequested(uint256 indexed requestId, address indexed consumer);

    function requestRandomWords(VRFV2PlusClient.RandomWordsRequest calldata)
        external
        returns (uint256 requestId)
    {
        requestId = nextRequestId++;
        lastConsumer = msg.sender;
        emit RandomWordsRequested(requestId, msg.sender);
    }

    function fulfill(address consumer, uint256 requestId, uint256 randomWord) external {
        uint256[] memory words = new uint256[](1);
        words[0] = randomWord;
        IRawVRFConsumer(consumer).rawFulfillRandomWords(requestId, words);
    }
}
