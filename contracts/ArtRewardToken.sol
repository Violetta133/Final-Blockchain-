// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ArtRewardToken is ERC20, Ownable {
    address public marketplace;

    event TokensMinted(address indexed to, uint256 amount);

    constructor() ERC20("ArtChain Reward Token", "ARTR") Ownable(msg.sender) {
        // Initial supply for testing purposes
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function setMarketplace(address _marketplace) public onlyOwner {
        require(_marketplace != address(0), "Invalid marketplace address");
        marketplace = _marketplace;
    }

    function mint(address to, uint256 amount) public {
        require(msg.sender == marketplace || msg.sender == owner(), "Only marketplace or owner can mint");
        require(to != address(0), "Cannot mint to zero address");

        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}
