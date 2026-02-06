// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IRewardToken {
    function mint(address to, uint256 amount) external;
}

contract ArtMarketplace is ERC721, Ownable {
    uint256 private _tokenIds;

    IRewardToken public rewardToken;

    struct ArtPiece {
        uint256 tokenId;
        string title;
        string description;
        string imageURI;
        address payable artist;
        uint256 price;
        bool forSale;
        uint256 createdAt;
    }

    mapping(uint256 => ArtPiece) public artPieces;
    mapping(address => uint256[]) public artistWorks;
    mapping(address => uint256) public totalSales;

    uint256 public platformFeePercent = 2; // 2% platform fee
    uint256 public rewardTokensPerETH = 100; // 100 reward tokens per 1 ETH spent

    event ArtMinted(uint256 indexed tokenId, address indexed artist, string title, uint256 price);
    event ArtPurchased(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price);
    event ArtListedForSale(uint256 indexed tokenId, uint256 price);
    event ArtRemovedFromSale(uint256 indexed tokenId);
    event RewardTokensIssued(address indexed user, uint256 amount);

    constructor(address _rewardTokenAddress)
        ERC721("ArtChain Gallery", "ARTG")
        Ownable(msg.sender)
    {
        rewardToken = IRewardToken(_rewardTokenAddress);
    }

    function mintArt(
        string memory _title,
        string memory _description,
        string memory _imageURI,
        uint256 _price
    ) public returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_price > 0, "Price must be greater than 0");

        _tokenIds += 1;
        uint256 newTokenId = _tokenIds;

        _safeMint(msg.sender, newTokenId);

        artPieces[newTokenId] = ArtPiece({
            tokenId: newTokenId,
            title: _title,
            description: _description,
            imageURI: _imageURI,
            artist: payable(msg.sender),
            price: _price,
            forSale: true,
            createdAt: block.timestamp
        });

        artistWorks[msg.sender].push(newTokenId);

        emit ArtMinted(newTokenId, msg.sender, _title, _price);
        emit ArtListedForSale(newTokenId, _price);

        return newTokenId;
    }

    function purchaseArt(uint256 _tokenId) public payable {
        ArtPiece storage art = artPieces[_tokenId];

        require(art.forSale, "Art is not for sale");
        require(msg.value >= art.price, "Insufficient payment");
        require(ownerOf(_tokenId) != msg.sender, "Cannot buy your own art");

        address payable seller = art.artist;
        uint256 salePrice = art.price;

        // Calculate platform fee (kept in contract balance)
        uint256 platformFee = (salePrice * platformFeePercent) / 100;
        uint256 artistPayment = salePrice - platformFee;

        // Transfer NFT to buyer
        _transfer(seller, msg.sender, _tokenId);

        // Update art piece data
        art.forSale = false;
        art.artist = payable(msg.sender);

        // Transfer payments
        seller.transfer(artistPayment);

        // Track sales
        totalSales[seller] += salePrice;

        // Issue reward tokens based on ETH spent
        uint256 rewardAmount = (msg.value * rewardTokensPerETH) / 1 ether;
        if (rewardAmount > 0) {
            rewardToken.mint(msg.sender, rewardAmount);
            emit RewardTokensIssued(msg.sender, rewardAmount);
        }

        emit ArtPurchased(_tokenId, msg.sender, seller, salePrice);

        // Refund extra
        if (msg.value > salePrice) {
            payable(msg.sender).transfer(msg.value - salePrice);
        }
    }

    function listArtForSale(uint256 _tokenId, uint256 _price) public {
        require(ownerOf(_tokenId) == msg.sender, "Not the owner");
        require(_price > 0, "Price must be greater than 0");

        artPieces[_tokenId].price = _price;
        artPieces[_tokenId].forSale = true;

        emit ArtListedForSale(_tokenId, _price);
    }

    function removeArtFromSale(uint256 _tokenId) public {
        require(ownerOf(_tokenId) == msg.sender, "Not the owner");

        artPieces[_tokenId].forSale = false;

        emit ArtRemovedFromSale(_tokenId);
    }

    function getArtPiece(uint256 _tokenId) public view returns (ArtPiece memory) {
        return artPieces[_tokenId];
    }

    function getArtistWorks(address _artist) public view returns (uint256[] memory) {
        return artistWorks[_artist];
    }

    function getAllArtPieces() public view returns (ArtPiece[] memory) {
        uint256 totalSupply = _tokenIds;
        ArtPiece[] memory allArt = new ArtPiece[](totalSupply);

        for (uint256 i = 1; i <= totalSupply; i++) {
            allArt[i - 1] = artPieces[i];
        }
        return allArt;
    }

    function getAvailableArt() public view returns (ArtPiece[] memory) {
        uint256 totalSupply = _tokenIds;
        uint256 availableCount = 0;

        for (uint256 i = 1; i <= totalSupply; i++) {
            if (artPieces[i].forSale) availableCount++;
        }

        ArtPiece[] memory availableArt = new ArtPiece[](availableCount);
        uint256 idx = 0;

        for (uint256 i = 1; i <= totalSupply; i++) {
            if (artPieces[i].forSale) {
                availableArt[idx] = artPieces[i];
                idx++;
            }
        }

        return availableArt;
    }

    function withdrawPlatformFees() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }

    function updatePlatformFee(uint256 _newFeePercent) public onlyOwner {
        require(_newFeePercent <= 10, "Fee cannot exceed 10%");
        platformFeePercent = _newFeePercent;
    }

    function updateRewardRate(uint256 _newRate) public onlyOwner {
        rewardTokensPerETH = _newRate;
    }
}
