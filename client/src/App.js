import './App.css';
import {useState,useEffect} from "react";
import Web3 from 'web3';
import LendingSystem from './contracts/SimpleLendingContract.json'

function App() {
  const[state,setState]=useState({
    web3:null,
    contract:null,
    accounts:[],
    lenderAddress:null,
    borrowerAddress:null,
    isConnected: false,
    networkId: null,
    chainId: null
  });

  const [message, setMessage] = useState(""); // New state variable for messages
  const [error, setError] = useState(""); // New state variable for errors

  // Function to check if MetaMask is installed
  const checkMetaMask = () => {
    if (typeof window.ethereum !== 'undefined') {
      return true;
    }
    return false;
  };

  // Function to connect to MetaMask
  const connectWallet = async () => {
    try {
      if (!checkMetaMask()) {
        setError("Please install MetaMask to use this DApp");
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const web3 = new Web3(window.ethereum);
      
      // Get network ID
      const networkId = await web3.eth.net.getId();
      const chainId = await web3.eth.getChainId();
      
      // Get contract instance
      const deployedNetwork = LendingSystem.networks[networkId];
      if (!deployedNetwork) {
        setError("Contract not deployed to this network");
        return;
      }
      
      const contract = new web3.eth.Contract(LendingSystem.abi, deployedNetwork.address);
      
      // Set state
      setState({
        web3: web3,
        contract: contract,
        accounts: accounts,
        lenderAddress: accounts[0],
        borrowerAddress: accounts[1],
        isConnected: true,
        networkId: networkId,
        chainId: chainId
      });
      
      setMessage("Wallet connected successfully!");
    } catch (error) {
      setError("Failed to connect wallet: " + error.message);
    }
  };

  // Function to handle network changes
  const handleNetworkChange = async () => {
    try {
      const web3 = new Web3(window.ethereum);
      const networkId = await web3.eth.net.getId();
      const chainId = await web3.eth.getChainId();
      
      if (networkId !== state.networkId || chainId !== state.chainId) {
        setState(prevState => ({
          ...prevState,
          networkId: networkId,
          chainId: chainId
        }));
        setMessage("Network changed. Please reconnect your wallet.");
        setState(prevState => ({
          ...prevState,
          isConnected: false
        }));
      }
    } catch (error) {
      setError("Error handling network change: " + error.message);
    }
  };

  // Function to handle account changes
  const handleAccountsChange = async (accounts) => {
    try {
      const web3 = new Web3(window.ethereum);
      setState(prevState => ({
        ...prevState,
        accounts: accounts,
        lenderAddress: accounts[0],
        borrowerAddress: accounts[1]
      }));
      setMessage("Account changed");
    } catch (error) {
      setError("Error handling account change: " + error.message);
    }
  };

  useEffect(() => {
    // Add event listeners for MetaMask
    if (window.ethereum) {
      window.ethereum.on('chainChanged', handleNetworkChange);
      window.ethereum.on('accountsChanged', handleAccountsChange);
    }

    return () => {
      // Remove event listeners
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', handleNetworkChange);
        window.ethereum.removeListener('accountsChanged', handleAccountsChange);
      }
    };
  }, []);

  const handleFormSubmit = async ({ msgValue, selectedOption, accIndex }) => {
    if (!state.isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      const web3 = state.web3;
      const contract = state.contract;
      const lender = state.lenderAddress;
      const accounts = state.accounts;
      let borrower = accounts[accIndex];
      
      switch (selectedOption) {
        case 'lenderOption1':
          await contract.methods.addFunds().send({ from: lender, value: web3.utils.toWei(msgValue, 'ether') });
          setMessage('Funds added to the contract');
          break;

        case 'lenderOption2':
          await contract.methods.fundLoan(borrower).send({ from: lender });
          setMessage('Loan funded');
          break;

        case 'borrowerOption1':
          const gasEstimate = await contract.methods.requestLoan(
            web3.utils.toWei(msgValue, 'ether')
          ).estimateGas({ from: borrower });
          
          await contract.methods.requestLoan(
            web3.utils.toWei(msgValue, 'ether')
          ).send({
            from: borrower,
            gas: gasEstimate,
          });
          setMessage('Loan requested');
          break;

        case 'borrowerOption2':
          await contract.methods.repayLoan().send({ from: borrower, value: web3.utils.toWei(msgValue, 'ether') });
          setMessage('Loan repaid');
          break;

        case 'borrowerOption3':
          const loanStatus = await contract.methods.getLoanDetails(borrower).call();
          console.log('Loan Status:', loanStatus);
          setMessage('Viewed Loan on Console');
          break;

        default:
          setError('Invalid option selected.');
      }
    } catch (error) {
      setError('Error: ' + error.message);
    }
  };

  return (
    <div className="App">
      <h1>Lending System</h1>

      {!state.isConnected ? (
        <button onClick={connectWallet} className="connect-button">
          Connect MetaMask
        </button>
      ) : (
        <div>
          <p>Connected Account: {state.lenderAddress}</p>
          <p>Network ID: {state.networkId}</p>
        </div>
      )}

      <h2>Instructions:</h2>
      <p>- Fixed 2 ethers interest has to be paid on each loan</p>
      <p>- Select correct borrower account</p>

      {state.isConnected && (
        <form onSubmit={(e) => {
          e.preventDefault();
          handleFormSubmit({
            msgValue: e.target.elements.msgValue.value,
            selectedOption: e.target.elements.selectedOption.value,
            accIndex: e.target.elements.index.value,
          });
        }}>
          <label>
            Select Borrower:
            <select name="index">
              {state.accounts.slice(1).map((account, index) => (
                <option key={index} value={index + 1}>{account}</option>
              ))}
            </select>
            <br />
            Select an option:
            <select name="selectedOption">
              <option value="lenderOption1">Lender: Add Balance to Contract</option>
              <option value="lenderOption2">Lender: Approve Loan</option>
              <option value="borrowerOption1">Borrower: Request Loan</option>
              <option value="borrowerOption2">Borrower: Repay Loan</option>
              <option value="borrowerOption3">Borrower: View Loan Status</option>
            </select>
          </label>
          <br />
          <label>
            Enter MsgValue:
            <input type="number" name="msgValue" />
          </label>
          <br />
          <button type="submit">Submit</button>
        </form>
      )}

      {message && <div style={{ color: 'green', marginTop: '10px' }}>{message}</div>}
      {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
    </div>
  );
}

export default App;
