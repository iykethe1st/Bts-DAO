// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract FakeNftMarketplace {
    // maintain mapping of tokenId to owners address
    mapping(uint256 => address) public tokens;

    // set the price for each NFT
    uint256 nftPrice = 0.01 ether;


    // accepts ETH and marks the owner of the tokenId as the caller address
    function purchase(uint256 _tokenId) external payable {
        require(msg.value == nftPrice, "This NFT costs 0.01 ETH");
        tokens[_tokenId] = msg.sender;
    }

    // get the proce of one NFT
    function getPrice() external view returns (uint256) {
        return nftPrice;
    }

    // check whether the given tokenId has been sold or not
    function available(uint256 _tokenId) external view returns (bool) {
        if (tokens[_tokenId] == address(0)) {
            return true;
        }
        return false;
    }
}