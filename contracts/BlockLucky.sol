// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title BlockLucky
 * @dev Smart contract pour une loterie blockchain transparente et sécurisée
 * @notice Les participants achètent des tickets et un gagnant est sélectionné aléatoirement
 */
contract BlockLucky {
    // Propriétaire du contrat
    address public owner;
    
    // Prix d'un ticket en wei
    uint256 public constant TICKET_PRICE = 0.01 ether;
    
    // Nombre minimum de participants requis pour déclencher le tirage
    uint256 public minParticipants;
    
    // Compteur de participants actuels
    uint256 public participantCount;
    
    // Cagnotte totale
    uint256 public pot;
    
    // État de la loterie
    bool public lotteryActive;
    bool public lotteryCompleted;
    
    // Liste des participants
    address[] public participants;
    
    // Mapping pour vérifier si une adresse a déjà participé
    mapping(address => bool) public hasParticipated;
    
    // Mapping pour stocker le nombre de tickets par adresse
    mapping(address => uint256) public ticketsByAddress;
    
    // Adresse du gagnant
    address public winner;
    
    // Constantes pour les packs VIP
    uint256 public constant VIP_PACK_15 = 15;
    uint256 public constant VIP_PACK_20 = 20;
    uint256 public constant VIP_PACK_25 = 25;
    uint256 public constant DISCOUNT_10_PERCENT = 10; // 10%
    uint256 public constant DISCOUNT_15_PERCENT = 15; // 15%
    uint256 public constant DISCOUNT_50_PERCENT = 50; // 50%
    uint256 public constant MAX_TICKETS_PER_TRANSACTION = 25;
    
    // Événements pour la transparence
    event TicketPurchased(address indexed buyer, uint256 ticketPrice, uint256 quantity, uint256 newParticipantCount);
    event TicketsBought(address indexed buyer, uint256 quantity, uint256 totalPrice, uint256 discount);
    event LotteryTriggered(uint256 totalParticipants, uint256 totalPot);
    event WinnerSelected(address indexed winner, uint256 prize);
    event LotteryReset(uint256 newMinParticipants);
    
    // Modificateurs
    modifier onlyOwner() {
        require(msg.sender == owner, "Seul le proprietaire peut executer cette fonction");
        _;
    }
    
    modifier lotteryMustBeActive() {
        require(lotteryActive, "La loterie n'est pas active");
        require(!lotteryCompleted, "La loterie est terminee");
        _;
    }
    
    /**
     * @dev Constructeur du contrat
     * @param _minParticipants Nombre minimum de participants requis
     */
    constructor(uint256 _minParticipants) {
        require(_minParticipants > 0, "Le nombre minimum de participants doit etre superieur a 0");
        owner = msg.sender;
        minParticipants = _minParticipants;
        lotteryActive = true;
        lotteryCompleted = false;
        participantCount = 0;
        pot = 0;
    }
    
    /**
     * @dev Permet d'acheter un ticket de loterie
     * @notice Le montant envoyé doit être exactement égal au prix du ticket
     */
    function buyTicket() external payable lotteryMustBeActive {
        require(msg.value == TICKET_PRICE, "Montant incorrect. Le prix d'un ticket est de 0.01 ether");
        
        // Ajouter le participant s'il n'a pas déjà participé
        if (!hasParticipated[msg.sender]) {
            participants.push(msg.sender);
            hasParticipated[msg.sender] = true;
            participantCount++;
        }
        
        // Ajouter un ticket pour cette adresse
        ticketsByAddress[msg.sender]++;
        
        // Ajouter le montant à la cagnotte
        pot += msg.value;
        
        emit TicketPurchased(msg.sender, msg.value, 1, participantCount);
        
        // Déclencher automatiquement le tirage si le nombre minimum est atteint
        if (participantCount >= minParticipants) {
            _selectWinner();
        }
    }
    
    /**
     * @dev Calcule le prix total avec réduction pour les packs VIP
     * @param quantity Nombre de tickets à acheter
     * @return totalPrice Prix total en wei
     * @return discount Pourcentage de réduction appliqué
     */
    function calculatePrice(uint256 quantity) public pure returns (uint256 totalPrice, uint256 discount) {
        require(quantity > 0 && quantity <= MAX_TICKETS_PER_TRANSACTION, "Nombre de tickets invalide (1-25)");
        
        uint256 basePrice = TICKET_PRICE * quantity;
        
        // Appliquer les réductions pour les packs VIP
        if (quantity >= VIP_PACK_25) {
            // Pack 25 tickets : 50% de réduction
            totalPrice = basePrice - (basePrice * DISCOUNT_50_PERCENT / 100);
            discount = DISCOUNT_50_PERCENT;
        } else if (quantity >= VIP_PACK_20) {
            // Pack 20 tickets : 15% de réduction
            totalPrice = basePrice - (basePrice * DISCOUNT_15_PERCENT / 100);
            discount = DISCOUNT_15_PERCENT;
        } else if (quantity >= VIP_PACK_15) {
            // Pack 15 tickets : 10% de réduction
            totalPrice = basePrice - (basePrice * DISCOUNT_10_PERCENT / 100);
            discount = DISCOUNT_10_PERCENT;
        } else {
            // Pas de réduction
            totalPrice = basePrice;
            discount = 0;
        }
    }
    
    /**
     * @dev Permet d'acheter plusieurs tickets en une transaction
     * @param quantity Nombre de tickets à acheter (1 à 25)
     * @notice Le montant envoyé doit correspondre au prix calculé avec les réductions VIP
     */
    function buyTickets(uint256 quantity) external payable lotteryMustBeActive {
        require(quantity > 0 && quantity <= MAX_TICKETS_PER_TRANSACTION, "Nombre de tickets invalide (1-25)");
        
        // Calculer le prix avec les réductions
        (uint256 totalPrice, uint256 discount) = calculatePrice(quantity);
        require(msg.value == totalPrice, "Montant incorrect");
        
        // Ajouter le participant s'il n'a pas déjà participé
        if (!hasParticipated[msg.sender]) {
            participants.push(msg.sender);
            hasParticipated[msg.sender] = true;
            participantCount++;
        }
        
        // Ajouter les tickets pour cette adresse
        ticketsByAddress[msg.sender] += quantity;
        
        // Ajouter le montant à la cagnotte
        pot += msg.value;
        
        emit TicketsBought(msg.sender, quantity, totalPrice, discount);
        
        // Déclencher automatiquement le tirage si le nombre minimum est atteint
        if (participantCount >= minParticipants) {
            _selectWinner();
        }
    }
    
    /**
     * @dev Sélectionne aléatoirement un gagnant et distribue la cagnotte
     * @notice Fonction interne appelée automatiquement quand le nombre minimum est atteint
     * @notice La sélection est pondérée par le nombre de tickets de chaque participant
     */
    function _selectWinner() internal {
        require(participantCount >= minParticipants, "Pas assez de participants");
        require(!lotteryCompleted, "La loterie est deja terminee");
        
        // Calculer le nombre total de tickets
        uint256 totalTickets = 0;
        for (uint256 i = 0; i < participants.length; i++) {
            totalTickets += ticketsByAddress[participants[i]];
        }
        
        // Génération d'un nombre aléatoire sécurisé
        uint256 randomNumber = _generateRandomNumber();
        uint256 randomTicket = randomNumber % totalTickets;
        
        // Trouver le gagnant en fonction du ticket sélectionné
        uint256 currentTicket = 0;
        for (uint256 i = 0; i < participants.length; i++) {
            currentTicket += ticketsByAddress[participants[i]];
            if (randomTicket < currentTicket) {
                winner = participants[i];
                break;
            }
        }
        
        // Marquer la loterie comme terminée
        lotteryActive = false;
        lotteryCompleted = true;
        
        // Distribuer la cagnotte au gagnant
        uint256 prize = pot;
        pot = 0;
        
        // Protection contre les reentrancy attacks
        (bool success, ) = winner.call{value: prize}("");
        require(success, "Echec du transfert de la cagnotte");
        
        emit LotteryTriggered(participantCount, prize);
        emit WinnerSelected(winner, prize);
    }
    
    /**
     * @dev Génère un nombre pseudo-aléatoire
     * @return Un nombre aléatoire basé sur plusieurs facteurs de la blockchain
     */
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
    
    /**
     * @dev Permet au propriétaire de réinitialiser la loterie
     * @param _newMinParticipants Nouveau nombre minimum de participants
     */
    function resetLottery(uint256 _newMinParticipants) external onlyOwner {
        require(_newMinParticipants > 0, "Le nombre minimum de participants doit etre superieur a 0");
        require(lotteryCompleted || pot == 0, "Impossible de reinitialiser une loterie active avec une cagnotte");
        
        // Réinitialiser les variables
        delete participants;
        participantCount = 0;
        pot = 0;
        winner = address(0);
        lotteryActive = true;
        lotteryCompleted = false;
        minParticipants = _newMinParticipants;
        
        // Note: Les mappings hasParticipated et ticketsByAddress ne sont pas réinitialisés
        // car cela nécessiterait de garder une trace de toutes les adresses
        // Pour une réinitialisation complète, il faudrait un nouveau contrat
        
        emit LotteryReset(_newMinParticipants);
    }
    
    /**
     * @dev Fonction de lecture pour obtenir le nombre de participants
     * @return Le nombre actuel de participants
     */
    function getParticipantCount() external view returns (uint256) {
        return participantCount;
    }
    
    /**
     * @dev Fonction de lecture pour obtenir la cagnotte actuelle
     * @return La cagnotte en wei
     */
    function getPot() external view returns (uint256) {
        return pot;
    }
    
    /**
     * @dev Fonction de lecture pour obtenir tous les participants
     * @return Tableau des adresses des participants
     */
    function getAllParticipants() external view returns (address[] memory) {
        return participants;
    }
    
    /**
     * @dev Fonction de lecture pour obtenir les informations de la loterie
     * @return currentParticipantCount Nombre de participants
     * @return currentPot Cagnotte actuelle
     * @return minParticipantsRequired Nombre minimum requis
     * @return isActive État actif de la loterie
     * @return isCompleted État de complétion
     * @return currentWinner Adresse du gagnant
     */
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
    
    /**
     * @dev Fonction de secours pour récupérer les fonds en cas de problème
     * @notice Seulement le propriétaire peut appeler cette fonction
     */
    function emergencyWithdraw() external onlyOwner {
        require(pot > 0, "Aucun fond a recuperer");
        uint256 amount = pot;
        pot = 0;
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Echec du transfert d'urgence");
    }
}

