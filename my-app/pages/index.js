import {Contract, providers} from "ethers";
import {formatEther} from "ethers/lib/utils";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import {
  BTS_DAO_ABI,
  BTS_DAO_CONTRACT_ADDRESS,
  BTS_NFT_ABI,
  BTS_NFT_CONTRACT_ADDRESS
} from "../constants";
import styles from "../styles/Home.module.css";




export default function Home() {
  // ETH Balance of the contract
  const [treasuryBalance, setTreasuryBalance] = useState("0");
  // number of proposals created in the DAO
  const [numProposals, setNumProposals] = useState("0");
  // array of all proposals created in the DAO
  const [proposals, setProposals] = useState([]);
  // User's balance of btsNfts
  const [nftBalance, setNftBalance] = useState(0);
  // fake nft token Id to purchase. used when creating a proposal
  const [fakeNftTokeId, setFakeNftTokenId] = useState("");
  // one of "creare proposal" or "view proposal"
  const [selectedTab, setSelectedTab] = useState("");
  // true if waiting for a transaction to be mined, false if otherwise
  const [loading, setLoading] = useState(false);
  // true if user has connected their wallet, false if otherwise
  const [walletConnected, setWalletConnected] = useState(false);
  const web3ModalRef = useRef();

  // helper function to connect Wallet

  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch(err) {
      console.error(err);
    }
  };

  // reads the ETH balance of the DAO contract and sets the "treasuryBalance" state variable
  const getDAOTreasuryBalance = async() => {
    try {
      const provider = await getProviderOrSigner();
      const balance = await provider.getBalance(BTS_DAO_CONTRACT_ADDRESS);
      setTreasuryBalance(balance.toString());
    } catch (err) {
      console.error(err);
    }
  };



  // gets the number opf proposal in the DAO contract ans sets the "numProposals" state variable
  const getNumProposalsInDaAO = async () => {
    try {
      const provider = await getProviderOrSigner();
      const contract = getDaoContractInstance(provider);
      const daoNumProposals = await contract.numProposals();
      setNumProposals(daoNumProposals.toString());
    } catch (err) {
      console.error(err);
    }
  };


  // reads the user btsNft balance and sets the "nftBalance" state variable
  const getUserNFTBalance = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = getBtsNftContractInstance(signer);
      const balance = await nftContract.balanceOf(signer.getAddress());
      setNftBalance(parseInt(balance.toString()));
    } catch (err) {
      console.error(err);
    }
  };

  // calls the "createProposal" function using the tokenId from "fakeNftTokenId"
  const createProposal = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      const txn = await daoContract.createProposal(fakeNftTokeId);
      setLoading(true);
      await txn.wait();
      await getNumProposalsInDaAO();
      setLoading(false);
    } catch (error) {
      console.error(error);
      window.alert(error.data.message);
    }
  }


  // Helper function to fetch and parse one proposal from the DAO contract
  // Given the Proposal ID
  // and converts the returned data into a Javascript object with values we can use
  const fetchProposalById = async (id) => {
    try {
      const provider = await getProviderOrSigner();
      const daoContract = getDaoContractInstance(provider);
      const proposal = await daoContract.proposals(id);
      const parsedProposal = {
        proposalId: id,
        nftTokenId: proposal.nftTokenId.toString(),
        deadline: new Date(parseInt(proposal.deadline.toString()) * 1000),
        yayVotes: proposal.yayVotes.toString(),
        nayVotes: proposal.nayVotes.toString(),
        executed: proposal.executed,
      };
      return parsedProposal;
    } catch (error) {
      console.error(error);
    }
  };


  // Runs a loop `numProposals` times to fetch all proposals in the DAO
  // and sets the `proposals` state variable
  const fetchAllProposals = async () => {
    try {
      const proposals = [];
      for (let i = 0; i < numProposals; i++) {
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      }
      setProposals(proposals);
      return proposals;
    } catch (error) {
      console.error(error);
    }
  };


  //  function to vote, using the passed proposal ID and vote
  const voteOnProposal = async (proposalId, _vote) => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      let vote = _vote === "YAY" ? 0 : 1;
      const txn = await daoContract.voteOnProposal(proposalId, vote);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
    } catch (error) {
      console.error(error);
      window.alert(error.data.message);
    }
  };

  // execute the proposal
  const executeProposal = async (proposalId) => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      const txn = await daoContract.executeProposal(proposalId);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
    } catch(error) {
      console.error(error);
    }
  };


  // get provider or signer
  const getProviderOrSigner = async(needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);
    const {chainId} = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Please switch to the Rinkeby network");
      throw new Error("Switch to the Rinkeby network");
    }
    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  // initiate a DAO Contract instance
  const getDaoContractInstance = (providerOrSigner) => {
    return new Contract(BTS_DAO_CONTRACT_ADDRESS, BTS_DAO_ABI, providerOrSigner);
  };

  // initiate a BtsNFT Contract instance
  const getBtsNftContractInstance = (providerOrSigner) => {
    return new Contract(BTS_NFT_CONTRACT_ADDRESS, BTS_NFT_ABI, providerOrSigner);
  }

  // useEffect to prompt user to collect wallet, and calls functions to fetch 
  // DAO Treasury balance, userNft balance, and number of proposals in the DAO contract
  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false
      });
      connectWallet().then(() => {
        getDAOTreasuryBalance();
        getUserNFTBalance();
        getNumProposalsInDaAO();
      });
    }
  }, [walletConnected]);


  // use to re-fetch all proposals whenever user switches tab
  useEffect(() => {
    if (selectedTab === "View Proposals") {
      fetchAllProposals();
    }
  }, [selectedTab]);





  // render Create Proposal tab
  function renderCreatProposalTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading...
        </div>        
      );
    } else if (nftBalance === 0) {
      return (
        <div className={styles.description}>
        You do not own any CryptoDevs NFTs. <br />
        <b>You cannot create or vote on proposals</b>
        </div>
      );
    } else {
      return (
        <div className={styles.container}>
        <label>Fake NFT Token ID to Purchase: </label>
        <input
          placeholder="0"
          type="number"
          onChange={(e) => setFakeNftTokenId(e.target.value)}
        />
        <button className={styles.button2} onClick={createProposal}>
          Create
        </button>
        </div>
      );
    }
  }

  // render View Proposal Tab
  function renderViewProposalsTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Checking for proposals...
        </div>
      );
    } else if (proposals.length === 0) {
      return (
        <div className={styles.description}>
          No proposals have been created
        </div>
      );
    } else {
      return (
        <div>
        {proposals.map((p, index) => (
          <div key={index} className={styles.proposalCard}>
            <p>Proposal ID: {p.proposalId}</p>
            <p>Fake NFT to Purchase: {p.nftTokenId}</p>
            <p>Deadline: {p.deadline.toLocaleString()}</p>
            <p>Yay Votes: {p.yayVotes}</p>
            <p>Nay Votes: {p.nayVotes}</p>
            <p>Executed?: {p.executed.toString()}</p>
            {p.deadline.getTime() > Date.now() && !p.executed ? (
              <div className={styles.flex}>
                <button
                  className={styles.button2}
                  onClick={() => voteOnProposal(p.proposalId, "YAY")}
                >
                  Vote YAY
                </button>
                <button
                  className={styles.button2}
                  onClick={() => voteOnProposal(p.proposalId, "NAY")}
                >
                  Vote NAY
                </button>
              </div>
            ) : p.deadline.getTime() < Date.now() && !p.executed ? (
              <div className={styles.flex}>
                <button
                  className={styles.button2}
                  onClick={() => executeProposal(p.proposalId)}
                >
                  Execute Proposal{" "}
                  {p.yayVotes > p.nayVotes ? "(YAY)" : "(NAY)"}
                </button>
              </div>
            ) : (
              <div className={styles.description}>Proposal Executed</div>
            )}
          </div>
        ))}
        </div>
      );
    }
  }





  // render tabs
  function renderTabs() {
    if (selectedTab === "Create Proposal") {
      return renderCreatProposalTab();
    } else if (selectedTab === "View Proposals") {
      return renderViewProposalsTab();
    }
    return null;
  }

  // -----------

  return (
    <div>
      <Head>
        <title>Bts DAO</title>
        <meta name="description" content="CryptoDevs DAO" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Bts DAO</h1>
          <div className={styles.description}>
            Your Bts NFT Balance: {nftBalance}
            <br />
            Treasury Balance: {formatEther(treasuryBalance)} ETH
            <br />
            Total Number of Proposals: {numProposals}
          </div>
          <div className={styles.flex}>
            <button
              className={styles.button}
              onClick={() => setSelectedTab("Create Proposal")}
            >
              Create Proposal
            </button>
            <br /><br />
            <button
              className={styles.button}
              onClick={() => setSelectedTab("View Proposals")}
            >
              View Proposals
            </button>
          </div>
          {renderTabs()}
        </div>
        <div>
          <img className={styles.image} src="/cryptodevs/0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
      <img alt="Twitter Logo" className={styles.twitter} src="/cryptodevs/twitter-logo.svg" />
        <a href="https://twitter.com/iykethe1st" target="_blank">Made with &#10084; by  @iykethe1st</a>
      </footer>
    </div>
  );  



















}