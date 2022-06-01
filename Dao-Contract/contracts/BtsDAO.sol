// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";


interface IFakeNftMarketplace {
    function purchase(uint256 _tokenId) external payable;


    function getPrice() external view returns (uint256);

    function available(uint256 _tokenId) external view returns (bool);
}

// interface for BtsNft containing only two functions that we are interested in

interface IBtsNft {
    function balanceOf(address owner) external view returns (uint256);

    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
}


contract BtsDAO is Ownable {
    // interface for the FakeNftMarketPlace
    
// struct to hold all the relevant information
    struct Proposal {
        // tokenId of the NFT to purchase from the marketplace if the proposal passes
        uint256 nftTokenId;
        // deadline - the UNIX timestamp until which this proposal is active. Proposal can be executed after the deadline has been exceeded.)
        uint256 deadline;
        // yayvotes for the proposal
        uint256 yayVotes;
        // nayvotes for the proposal
        uint256 nayVotes;
        // executed - whether or not this proposal has been executed yet. Cannot be executed before the deadline has been exceeded.
        bool executed;
        // voters - a mapping of BtsNft tokenIDs to booleans indicating whether that NFT has already been used to cast a vote or not
        mapping(uint256 => bool) voters;
        

    }
    // Create a mapping of ID to Proposal to hold all the proposals
    mapping(uint256 => Proposal) public proposals;
    // number of proposals that have been created
    uint256 public numProposals;

    IFakeNftMarketplace nftMarketplace;
    IBtsNft btsNft;

    // create instances for FakeNftMarketplace and BtsNft
    constructor(address _nftMarketplace, address _btsNft) payable {
        nftMarketplace = IFakeNftMarketplace(_nftMarketplace);
        btsNft = IBtsNft(_btsNft);
    }
    // Create a modifier which only allows a function to be called by someone who owns at least 1 BtsNft
    modifier nftHolderOnly() {
        require(btsNft.balanceOf(msg.sender) > 0, "NOT A DAO MEMBER!");
        _;
    }

    ///  createProposal allows a CryptoDevsNFT holder to create a new proposal in the DAO
    ///  _nftTokenId - the tokenID of the NFT to be purchased from FakeNFTMarketplace if this proposal passes
    ///  Returns the proposal index for the newly created proposal
    function createProposal(uint256 _nftTokenId) external nftHolderOnly returns(uint256){

        require(nftMarketplace.available(_nftTokenId), "NFT NOT FOR SALE");
        Proposal storage proposal = proposals[numProposals];
        proposal.deadline = block.timestamp + 5 minutes;
        numProposals++;
        return numProposals - 1;

    }
    // modifier to check if a given proposal has been exceeded or not
    modifier activeProposalOnly(uint256 proposalIndex) {
        require(proposals[proposalIndex].deadline > block.timestamp, "DEADLINE_EXCEEDED");
        _;
    }

    // Create an enum named Vote containing possible options for a vote
    enum Vote {
        YAY, 
        NAY
    }

    // function to vote on the proposal
    function voteOnProposal(uint256 proposalIndex, Vote vote) external nftHolderOnly activeProposalOnly(proposalIndex) {
        Proposal storage proposal = proposals[proposalIndex];

        uint256 voterNFTBalance = btsNft.balanceOf(msg.sender);
        uint256 numVotes = 0;

        // Calculate how many NFTs are owned by the voter
        // that haven't already been used for voting on this proposal
        for (uint256 i = 0; i < voterNFTBalance; i++) {
            uint256 tokenId  = btsNft.tokenOfOwnerByIndex(msg.sender, i);
            if (proposal.voters[tokenId] == false ) {
                numVotes++;
                proposal.voters[tokenId] == true;
            }
        }
        require(numVotes > 0, "ALREADY_VOTED");

        if (vote == Vote.YAY) {
            proposal.yayVotes += numVotes;
        }   else {
            proposal.nayVotes += numVotes;
        }
    }


    // modifier for inactove proposals
    modifier inactiveProposalOnly(uint256 proposalIndex) {
        require(proposals[proposalIndex].deadline <= block.timestamp, "DEADLINE_NOT_EXCEEDED");
        require(proposals[proposalIndex].executed == false, "PROPOSAL_ALREADY_EXECUTED");
        _;
    }

    //function to execute proposal after its deadline has exceeded
    function executeProposal(uint256 proposalIndex)
        external
        nftHolderOnly
        inactiveProposalOnly(proposalIndex)
    {
        Proposal storage proposal = proposals[proposalIndex];

        // If the proposal has more YAY votes than NAY votes
        // purchase the NFT from the FakeNFTMarketplace
        if (proposal.yayVotes > proposal.nayVotes) {
            uint256 nftPrice = nftMarketplace.getPrice();
            require(address(this).balance >= nftPrice, "NOT_ENOUGH_FUNDS");
            nftMarketplace.purchase{value: nftPrice}(proposal.nftTokenId);
        }
        proposal.executed = true;
    }

    ///withdrawEther allows the contract owner (deployer) to withdraw the ETH from the contract
    function withdrawEther() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    // Normally, contract addresses cannot accept ETH sent to them,
    // unless it was through a payable function.
    // The following two functions allow the contract to accept ETH deposits
    // directly from a wallet without calling a function  
    receive() external payable {}

    fallback() external payable {}


}