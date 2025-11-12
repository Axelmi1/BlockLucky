// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BlockLucky {
    address public owner;
    uint256 public constant TICKET_PRICE = 0.01 ether;
    uint256 public minParticipants;
    uint256 public participantCount;
    uint256 public pot;
    bool public lotteryActive;
    bool public lotteryCompleted;
    address[] public participants;
    mapping(address => bool) public hasParticipated;
    mapping(address => uint256) public ticketsByAddress;
    address public winner;
    
    uint256 public constant VIP_PACK_15 = 15;
    uint256 public constant VIP_PACK_20 = 20;
    uint256 public constant VIP_PACK_25 = 25;
    uint256 public constant DISCOUNT_10_PERCENT = 10;
    uint256 public constant DISCOUNT_15_PERCENT = 15;
    uint256 public constant DISCOUNT_50_PERCENT = 50;
    uint256 public constant MAX_TICKETS_PER_TRANSACTION = 25;
    
    // 5. TRANSPARENCE : Tous les événements sont publics et vérifiables sur la blockchain
    event TicketPurchased(address indexed buyer, uint256 ticketPrice, uint256 quantity, uint256 newParticipantCount);
    event TicketsBought(address indexed buyer, uint256 quantity, uint256 totalPrice, uint256 discount);
    event LotteryTriggered(uint256 totalParticipants, uint256 totalPot);
    event WinnerSelected(address indexed winner, uint256 prize);
    event LotteryReset(uint256 newMinParticipants);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Seul le proprietaire peut executer cette fonction");
        _;
    }
    
    modifier lotteryMustBeActive() {
        require(lotteryActive, "La loterie n'est pas active");
        require(!lotteryCompleted, "La loterie est terminee");
        _;
    }
    
    constructor(uint256 _minParticipants) {
        require(_minParticipants > 0, "Le nombre minimum de participants doit etre superieur a 0");
        owner = msg.sender;
        minParticipants = _minParticipants;
        lotteryActive = true;
        lotteryCompleted = false;
        participantCount = 0;
        pot = 0;
    }
    
    function buyTicket() external payable lotteryMustBeActive {
        require(msg.value == TICKET_PRICE, "Montant incorrect. Le prix d'un ticket est de 0.01 ether");
        
        if (!hasParticipated[msg.sender]) {
            participants.push(msg.sender);
            hasParticipated[msg.sender] = true;
            participantCount++;
        }
        
        ticketsByAddress[msg.sender]++;
        pot += msg.value;
        emit TicketPurchased(msg.sender, msg.value, 1, participantCount);
        
        // 1. DECLENCHEMENT AUTOMATIQUE : Le tirage se fait tout seul quand le nombre minimum est atteint
        if (participantCount >= minParticipants) {
            _selectWinner();
        }
    }
    
    function calculatePrice(uint256 quantity) public pure returns (uint256 totalPrice, uint256 discount) {
        require(quantity > 0 && quantity <= MAX_TICKETS_PER_TRANSACTION, "Nombre de tickets invalide (1-25)");
        
        uint256 basePrice = TICKET_PRICE * quantity;
        
        if (quantity >= VIP_PACK_25) {
            totalPrice = basePrice - (basePrice * DISCOUNT_50_PERCENT / 100);
            discount = DISCOUNT_50_PERCENT;
        } else if (quantity >= VIP_PACK_20) {
            totalPrice = basePrice - (basePrice * DISCOUNT_15_PERCENT / 100);
            discount = DISCOUNT_15_PERCENT;
        } else if (quantity >= VIP_PACK_15) {
            totalPrice = basePrice - (basePrice * DISCOUNT_10_PERCENT / 100);
            discount = DISCOUNT_10_PERCENT;
        } else {
            totalPrice = basePrice;
            discount = 0;
        }
    }
    
    function buyTickets(uint256 quantity) external payable lotteryMustBeActive {
        require(quantity > 0 && quantity <= MAX_TICKETS_PER_TRANSACTION, "Nombre de tickets invalide (1-25)");
        
        (uint256 totalPrice, uint256 discount) = calculatePrice(quantity);
        require(msg.value == totalPrice, "Montant incorrect");
        
        if (!hasParticipated[msg.sender]) {
            participants.push(msg.sender);
            hasParticipated[msg.sender] = true;
            participantCount++;
        }
        
        ticketsByAddress[msg.sender] += quantity;
        pot += msg.value;
        emit TicketsBought(msg.sender, quantity, totalPrice, discount);
        
        // 1. DECLENCHEMENT AUTOMATIQUE : Le tirage se fait tout seul quand le nombre minimum est atteint
        if (participantCount >= minParticipants) {
            _selectWinner();
        }
    }
    
    function _selectWinner() internal {
        require(participantCount >= minParticipants, "Pas assez de participants");
        require(!lotteryCompleted, "La loterie est deja terminee");
        
        uint256 totalTickets = 0;
        for (uint256 i = 0; i < participants.length; i++) {
            totalTickets += ticketsByAddress[participants[i]];
        }
        
        // 2. GENERATION ALEATOIRE : Le contrat génère un nombre aléatoire basé sur la blockchain
        uint256 randomNumber = _generateRandomNumber();
        uint256 randomTicket = randomNumber % totalTickets;
        
        // 3. SELECTION PONDEREE : Plus tu as de tickets, plus tu as de chances de gagner
        uint256 currentTicket = 0;
        for (uint256 i = 0; i < participants.length; i++) {
            currentTicket += ticketsByAddress[participants[i]];
            if (randomTicket < currentTicket) {
                winner = participants[i];
                break;
            }
        }
        
        lotteryActive = false;
        lotteryCompleted = true;
        
        // 4. DISTRIBUTION AUTOMATIQUE : Le prix est envoyé directement au gagnant par le contrat
        uint256 prize = pot;
        pot = 0;
        (bool success, ) = winner.call{value: prize}("");
        require(success, "Echec du transfert de la cagnotte");
        
        // 5. TRANSPARENCE : Les événements permettent de vérifier qui a gagné et combien
        emit LotteryTriggered(participantCount, prize);
        emit WinnerSelected(winner, prize);
    }
    
    function _generateRandomNumber() internal view returns (uint256) {
        return uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    block.number,
                    msg.sender,
                    participants.length,
                    pot
                )
            )
        );
    }
    
    function resetLottery(uint256 _newMinParticipants) external onlyOwner {
        require(_newMinParticipants > 0, "Le nombre minimum de participants doit etre superieur a 0");
        require(lotteryCompleted || pot == 0, "Impossible de reinitialiser une loterie active avec une cagnotte");
        
        delete participants;
        participantCount = 0;
        pot = 0;
        winner = address(0);
        lotteryActive = true;
        lotteryCompleted = false;
        minParticipants = _newMinParticipants;
        
        emit LotteryReset(_newMinParticipants);
    }
    
    function getParticipantCount() external view returns (uint256) {
        return participantCount;
    }
    
    function getPot() external view returns (uint256) {
        return pot;
    }
    
    function getAllParticipants() external view returns (address[] memory) {
        return participants;
    }
    
    function getLotteryInfo() external view returns (
        uint256 currentParticipantCount,
        uint256 currentPot,
        uint256 minParticipantsRequired,
        bool isActive,
        bool isCompleted,
        address currentWinner
    ) {
        return (
            participantCount,
            pot,
            minParticipants,
            lotteryActive,
            lotteryCompleted,
            winner
        );
    }
    
    function emergencyWithdraw() external onlyOwner {
        require(pot > 0, "Aucun fond a recuperer");
        uint256 amount = pot;
        pot = 0;
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Echec du transfert d'urgence");
    }
}

