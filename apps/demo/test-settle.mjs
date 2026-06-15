import { ethers } from "ethers";

const RPC = "https://atlantic.dplabs-internal.com";
const PRIVATE_KEY = "0x4828d32e619b7b2c7e55baccddf8a60c3192e8488a1e4377a4307f2e5101b371";
const CONTRACT = "0xc35C5df1F1cf18AeF636aB48bA8e6Dd00A795c1e";
const AGENT = "0xEc1C198468cA52bF17E7b148fDbE66c581015d74";
const PUBLISHER = "0xEc1C198468cA52bF17E7b148fDbE66c581015d74";
const CHAIN_ID = 688689;
const URL = "https://medium.com/p/e212c166e5e9";

const ABI = [
  "function settle(address agent, address publisher, bytes32 urlHash, uint256 amount, bytes32 nonce, uint256 timestamp, bytes calldata signature) external",
  "function getReputation(address)(uint256,uint256,uint256,uint256)"
];

const provider = new ethers.JsonRpcProvider(RPC, {
  chainId: CHAIN_ID,
  name: "pharos-atlantic"
}, { staticNetwork: true });

const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT, ABI, wallet);

const nonce = ethers.hexlify(ethers.randomBytes(32));
const timestamp = Math.floor(Date.now() / 1000);
const amount = 100n;
const urlHash = ethers.keccak256(ethers.toUtf8Bytes(URL + "\n" + timestamp));

console.log("nonce:", nonce);
console.log("urlHash:", urlHash);
console.log("timestamp:", timestamp);

// Sign
const settlementHash = ethers.solidityPackedKeccak256(
  ["address", "address", "bytes32", "uint256", "bytes32", "uint256", "uint256"],
  [AGENT, PUBLISHER, urlHash, amount, nonce, timestamp, CHAIN_ID]
);
console.log("settlementHash:", settlementHash);

const sig = await wallet.signMessage(ethers.getBytes(settlementHash));
console.log("signature:", sig);

// Call contract
console.log("calling settle...");
const tx = await contract.settle(AGENT, PUBLISHER, urlHash, amount, nonce, timestamp, sig);
console.log("tx hash:", tx.hash);
const receipt = await tx.wait();
console.log("confirmed in block:", receipt.blockNumber);

// Check reputation
const rep = await contract.getReputation(AGENT);
console.log("reputation:", rep);
