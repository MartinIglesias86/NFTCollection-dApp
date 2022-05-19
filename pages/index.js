import { Contract, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import { abi, NFT_CONTRACT_ADDRESS } from "../constants";
import styles from "../styles/Home.module.css";

export default function Home() {
  //walletConnected keep track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);
  //presaleStarted keeps track of whether the presale has started or not
  const [presaleStarted, setPresaleStarted] = useState(false);
  //presaleEnded keeps track of whether the presale ended or not
  const [presaleEnded, setPresaleEnded] = useState(false);
  //loading is set to true when we are waiting for a transaction to get mined
  const [loading, setLoading] = useState(false);
  //isOwner check if the currently connected MetaMask wallet is the owner of the contract
  const [isOwner, setIsOwner] = useState(false);
  //tokenIdsMinted keeps track of the number of tokenIds that have been minted
  const [tokenIdsMinted, setTokenIdsMinted] = useState("0");
  //create a reference to the Web3 Modal (used for connecting Metamask) which persists as long as the page is open
  const web3ModalRef = useRef();
  
  //presaleMint mint an NFT during the presale
  const presaleMint = async () => {
    try {
      //we need a signer here since this is a 'write' transaction
      const signer = await getProviderOrSigner(true);
      //create a new instance of the contract with a signer, which allows update methods
      const whitelistContract =  new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      //call the presaleMint from the contract, only whitelisted addresses would be able to mint
      const tx = await whitelistContract.presaleMint({
        //value signifies the cost of one crypto dev which is "0.01" eth, we are parsing '0.01' string to ether using the utils library from ethers.js
        value: utils.parseEther("0.01"),
      });
      setLoading(true);
      //wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("Tu Crypto Dev se minteo correctamente!");
    } catch (err) {
      console.error(err);
    }
  };

  //publicMint mint an NFT after the presale
  const publicMint = async () => {
    try {
      //we need a signer here since this is a 'write' transaction
      const signer = await getProviderOrSigner(true);
      //create a new instance of the contract with a signer, which allows update methods
      const whitelistContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      //call the mint from the contract to mint the Crypto Dev
      const tx = await whitelistContract.mint({
        //value signifies the cost of one crypto dev which is "0.01" eth, we are parsing "0.01" string to ether using
        //the utils library from ether.js
        value: utils.parseEther("0.01"),
      });
      setLoading(true);
      //wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("Tu Crypto Dev se minteo correctamente!");
    } catch (err) {
      console.error(err);
    }
  };

  //connectWallet connects the MetaMask wallet
  const connectWallet = async () => {
    try {
      //get the provider from web3Modal, which in our case is MetaMask.
      //when used for the first time, it prompts the user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  //startPresale starts the presale for the NFT Collection
  const startPresale = async () => {
    try{
      //we need a signer here since this is a 'write' transaction
      const signer = await getProviderOrSigner(true);
      //create a new instance of the contract with a signer, which allows update methods
      const whitelistContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      //call the startPresale from the contract
      const tx = await whitelistContract.startPresale();
      setLoading(true);
      //wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      //set the presale started to true
      await checkIfPresaleStarted();
    } catch (err) {
      console.error(err);
    }
  };
  
  //checkIfPresaleStarted checks if the presale has started 
  //by quering the 'presaleStarted' variable in the contract
  const checkIfPresaleStarted = async () => {
    try {
      //get the provider from web3Modal, which in our case is MetaMask
      //no need for the Signer here, as we are only reading state from the blockchain
      const provider = await getProviderOrSigner();
      //er connect to the Contract using a Provider, so we will only
      //have read-only access to the Contract
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      //call the presaleStarted from the contract
      const _presaleStarted =  await nftContract.presaleStarted();
      if (!_presaleStarted) {
        await getOwner();
      }
      setPresaleStarted(_presaleStarted);
      return _presaleStarted;
    }catch (err) {
      console.error(err);
      return false;
    }
  };

  //checkIfPresaleEnded checks if the presale has ended by quering the 'presaleEnded'
  //variable in the contract
  const checkIfPresaleEnded = async () => {
    try {
      //get the provider from web3Modal, which in our case us MetaMask
      //no need for the Signer here, as we are only reading state from the blockchain
      const provider = await getProviderOrSigner();
      //we connect to the Contract using a Provider, so we will only
      //have read-only access to the contract
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      //call the presaleEnded from the contract
      const _presaleEnded = await nftContract.presaleEnded();
      //_presaleEnded is a Big Number, so we are using the lt(less than function) instead of `<`
      //Date.now()/1000 returns the current time in seconds
      //we compare if the _presaleEnded timestamp is less tha the current time,
      //which means presale has ended.
      const hasEnded = _presaleEnded.lt(Math.floor(Date.now() / 1000));
      if (hasEnded) {
        setPresaleEnded(true);
      }else {
        setPresaleEnded(false);
      }
      return hasEnded;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  //getOwner calls the contract to retrieve the owner
  const getOwner = async () => {
    try {
      //get the provider from web3Modal, which in our case is MetaMask
      //no need for the Signer here, as we are only reading state from the blockchain
      const provider = await getProviderOrSigner();
      //we connect to the Contract using a Provider, so we will only
      //have read-only access to the contract
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      //call the owner function from the contract
      const _owner = await nftContract.owner();
      //we will get the signer now to extract the address of the currently connected MetaMask account
      const signer = await getProviderOrSigner(true);
      //get the address associated to the signer which is connected to  MetaMask
      const address = await signer.getAddress();
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  //getTokenIdsMinted gets the number of tokenIds that have been minted
  const getTokenIdsMinted = async () => {
    try {
      //get the provider from the web3Modal, which in our case is MetaMask
      //no need for the Signer here, as we are only reading state from the blockchain
      const provider = await getProviderOrSigner();
      //we connect to the Contract using a Provider, so we will only
      //have read-only access to the Contract
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      //call the tokenIds from the contract
      const _tokenIds = await nftContract.tokenIds();
      //_tokenIds is a 'Big number'. We need to convert the Big Number to a string
      setTokenIdsMinted(_tokenIds.toString());
    } catch (err) {
      console.error(err);
    }
  };

  /*
  Returns a Provider or Signer object representing the Ethereum RPC with or without
  signing capabilities of metamask attached.
  A 'Provider' is needed to interact with the blockchain - reading transactions, reading balances, reading states, etc.
  A `Signer` is a special type of Provider used in case a `write` transaction needs to be made to the blockchain, which involves the connected account
  needing to make a digital signature to authorize the transaction being sent. Metamask exposes a Signer API to allow your website to
  request signatures from the user using Signer functions.
  @param {*} needSigner - True if you need the signer, default false otherwise
  */
  const getProviderOrSigner = async (needSigner = false) => {
    //connect to MetaMask
    //since we store 'web3Modal' as a reference, we need to access the 'current' value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);
    //if user is not connected to the Rinkeby network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Cambia la red de tu billetera a Rinkeby");
      throw new Error("Cambia la red de tu billetera a Rinkeby");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };
  /*
  useEffects are used to react to changes in the state of the website
  The array at the end of function call represents what state changes will trigger this effect.
  In this case, whenever the value of 'walletConnected' changes - this effect will be called.
  */
  useEffect(() => {
    //if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      //assign the Web3Modal class to the reference object by setting it's 'current' value.
      //the 'current'  value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();

      //check if presale has started and ended
      const _presaleStarted = checkIfPresaleStarted();
      if (_presaleStarted) {
        checkIfPresaleEnded();
      }
      getTokenIdsMinted();

      //set an interval which gets called every 5 seconds to check presale has ended 
      const presaleEndedInterval = setInterval(async function () {
        const _presaleStarted = await checkIfPresaleStarted();
        if (_presaleStarted) {
          const _presaleEnded = await checkIfPresaleEnded();
          if (_presaleEnded) {
            clearInterval(presaleEndedInterval);
          }
        }
      }, 5 * 1000);
      //set an interval to get the number of token Ids minted every 5 seconds
      setInterval(async function () {
        await getTokenIdsMinted();
      }, 5 * 1000);
    }
  }, [walletConnected]);
  
  //renderButton returns a button based on the state of the dApp
  const renderButton = () => {
    //if wallet is not connected, return a button which allows them to connect their wallet
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Conecta tu billetera
        </button>
      );
    }
    //if we are currently waiting for something, return a loading button
    if (loading) {
      return <button className={styles.button}>Cargando...</button>
    }
    //if connected user is the owner, and presale hasn't started yet, allow them to start the presale
    if (isOwner && !presaleStarted) {
      return (
        <button className={styles.button} onClick={startPresale}>
          Empieza la pre-venta!!!
        </button>
      );
    }
    //if connected user is not the owner but presale hasn't started yet, tell them that
    if (!presaleStarted) {
      return (
        <div>
          <div className={styles.description}>La pre-venta no a comenzado</div>
        </div>
      );
    }
    //if presale starter, but hasn't ended yet, allow for minting during the presale period
    if (presaleStarted && !presaleEnded) {
      return (
        <div>
          <div className={styles.description}>
            La pre-venta a comenzado!!! Si tu dirección esta en la whitelist, Mintea un Crypto Dev 🥳 
          </div>
          <button className={styles.button} onClick={presaleMint}>
            Minteo de Pre-venta 🚀
          </button>
        </div>
      );
    }
    //if presale started and has ended, its time for public minting
    if (presaleStarted && presaleEnded) {
      return (
        <button className={styles.button} onClick={publicMint}>
          Minteo público 🚀
        </button>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="Whitelist-dApp" />
        <link rel="icon" href="/favicon.ico"/>
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Bienvenido a Crypto Devs!</h1>
          <div className={styles.description}>
            Es una colección de NFTs para desarrolladores en Crypto
          </div>
          <div className={styles.description}>
            {tokenIdsMinted}/20 ya fueron minteados!
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="/cryptodevs/0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
      Made with &#10084; by Martin Iglesias
      </footer>
    </div>
  );
}