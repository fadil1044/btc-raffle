// ABI for the BTC Raffle smart contract
// Contract methods and their selectors

export const RAFFLE_ABI = {
  // Read methods
  getRaffleInfo: {
    selector: 0x1a2b3c4d, // bytes4(keccak256("getRaffleInfo()"))
    outputs: ['uint256', 'uint256', 'uint256', 'uint256', 'address', 'bool'],
    // returns: [ticketPrice, totalTickets, maxTickets, endBlock, winner, isActive]
  },
  getMyTickets: {
    selector: 0x2b3c4d5e,
    inputs: ['address'],
    outputs: ['uint256[]'],
  },
  getParticipants: {
    selector: 0x3c4d5e6f,
    outputs: ['address[]', 'uint256[]'],
    // returns: [addresses[], ticketCounts[]]
  },
  getTotalPot: {
    selector: 0x4d5e6f7a,
    outputs: ['uint256'],
  },

  // Write methods
  buyTickets: {
    selector: 0x5e6f7a8b,
    inputs: ['uint256'], // number of tickets
  },
  drawWinner: {
    selector: 0x6f7a8b9c,
    inputs: [],
  },
  claimPrize: {
    selector: 0x7a8b9c0d,
    inputs: [],
  },
} as const;

// Known deployed contract addresses on OP_NET
// Replace with your deployed contract address after deployment
export const RAFFLE_CONTRACT_ADDRESS = import.meta.env.VITE_RAFFLE_CONTRACT_ADDRESS || '';

// OP_NET RPC endpoint
export const OPNET_RPC_URL = 'https://api.opnet.org';
export const OPNET_TESTNET_RPC_URL = 'https://testnet.opnet.org';
