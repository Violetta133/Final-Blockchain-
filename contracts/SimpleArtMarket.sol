// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// ✅ Interface MUST be outside the contract
interface IRewardToken {
    function mint(address to, uint256 amount) external;
}

contract SimpleArtMarket {
    // ====== Reward Token ======
    IRewardToken public rewardToken;      // ERC-20 token contract
    uint256 public rewardPerEth = 1000;    // 1000 tokens per 1 ETH => 100 ART = 0.1 ETH

    struct Art {
        string title;
        string imageURL;
        uint256 price;            
        address payable seller;
        address buyer;
        bool sold;
    }

    uint256 public artCount;
    mapping(uint256 => Art) private arts;

    uint256 public listingFee = 0.002 ether;
    address payable public owner;

    event ArtListed(uint256 indexed id, address indexed seller, uint256 price, string title);
    event ArtBought(uint256 indexed id, address indexed buyer, address indexed seller, uint256 price);

    event ListingFeeUpdated(uint256 newFee);
    event FeesWithdrawn(address to, uint256 amount);

    event RewardTokenSet(address token);
    event RewardRateSet(uint256 rewardPerEth);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = payable(msg.sender);
    }

    //Owner Settings
    function setListingFee(uint256 newFee) external onlyOwner {
        listingFee = newFee;
        emit ListingFeeUpdated(newFee);
    }

    function setRewardToken(address token) external onlyOwner {
        rewardToken = IRewardToken(token);
        emit RewardTokenSet(token);
    }

    function setRewardRate(uint256 newRate) external onlyOwner {
        rewardPerEth = newRate;
        emit RewardRateSet(newRate);
    }

    //List Art (paid listing fee) 
    function listArt(
        string calldata title,
        string calldata imageURL,
        uint256 priceWei
    ) external payable {
        require(msg.value >= listingFee, "Listing fee not paid");
        require(bytes(title).length > 0, "Empty title");
        require(bytes(imageURL).length > 0, "Empty imageURL");
        require(priceWei > 0, "Price must be > 0");

        artCount += 1;

        arts[artCount] = Art({
            title: title,
            imageURL: imageURL,
            price: priceWei,
            seller: payable(msg.sender),
            buyer: address(0),
            sold: false
        });

        emit ArtListed(artCount, msg.sender, priceWei, title);
    }

    //Buy Art (mints rewards to buyer) 
    function buyArt(uint256 id) external payable {
        require(id > 0 && id <= artCount, "Invalid id");

        Art storage a = arts[id];
        require(!a.sold, "Already sold");
        require(msg.sender != a.seller, "Cannot buy your own art");
        require(msg.value == a.price, "Send exact price");

        a.sold = true;
        a.buyer = msg.sender;

        // pay seller
        a.seller.transfer(msg.value);

    
        if (address(rewardToken) != address(0) && rewardPerEth > 0) {
            uint256 rewardAmount = msg.value * rewardPerEth; 
            rewardToken.mint(msg.sender, rewardAmount);
        }

        emit ArtBought(id, msg.sender, a.seller, a.price);
    }

    //Withdraw listing fees 
    function withdrawFees(address payable to) external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "No fees");
        to.transfer(bal);
        emit FeesWithdrawn(to, bal);
    }

    //Read art data 
    function getArt(uint256 id) external view returns (
        string memory title,
        string memory imageURL,
        uint256 price,
        address seller,
        address buyer,
        bool sold
    ) {
        require(id > 0 && id <= artCount, "Invalid id");
        Art storage a = arts[id];
        return (a.title, a.imageURL, a.price, a.seller, a.buyer, a.sold);
    }
}
