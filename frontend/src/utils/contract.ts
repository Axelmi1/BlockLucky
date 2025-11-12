import { ethers } from "ethers";

// ABI du contrat BlockLucky (à mettre à jour après compilation)
export const BLOCKLUCKY_ABI = [
  "function owner() view returns (address)",
  "function TICKET_PRICE() view returns (uint256)",
  "function minParticipants() view returns (uint256)",
  "function participantCount() view returns (uint256)",
  "function pot() view returns (uint256)",
  "function lotteryActive() view returns (bool)",
  "function lotteryCompleted() view returns (bool)",
  "function winner() view returns (address)",
  "function hasParticipated(address) view returns (bool)",
  "function ticketsByAddress(address) view returns (uint256)",
  "function buyTicket() payable",
  "function buyTickets(uint256) payable",
  "function calculatePrice(uint256) view returns (uint256, uint256)",
  "function getLotteryInfo() view returns (uint256, uint256, uint256, bool, bool, address)",
  "function getAllParticipants() view returns (address[])",
  "event TicketPurchased(address indexed buyer, uint256 ticketPrice, uint256 quantity, uint256 newParticipantCount)",
  "event TicketsBought(address indexed buyer, uint256 quantity, uint256 totalPrice, uint256 discount)",
  "event LotteryTriggered(uint256 totalParticipants, uint256 totalPot)",
  "event WinnerSelected(address indexed winner, uint256 prize)",
];

// Adresse du contrat (sera mise à jour après déploiement)
// Pour le développement local, cette adresse sera remplacée dynamiquement
export const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "";

export const getContract = (
  provider: ethers.Provider | ethers.Signer,
  contractAddress: string
): ethers.Contract => {
  return new ethers.Contract(contractAddress, BLOCKLUCKY_ABI, provider);
};

