import React, { useState } from "react";
import { useBlockLucky } from "../hooks/useBlockLucky";
import { LotteryStats } from "./LotteryStats";
import { BuyTicket } from "./BuyTicket";
import { WinnerDisplay } from "./WinnerDisplay";
import { TransactionHistory } from "./TransactionHistory";
import "./LotteryInterface.css";

interface LotteryInterfaceProps {
  contractAddress: string;
  isConnected: boolean;
}

export const LotteryInterface: React.FC<LotteryInterfaceProps> = ({
  contractAddress,
  isConnected,
}) => {
  const {
    lotteryInfo,
    ticketPrice,
    loading,
    error,
    buyTicket,
    buyTickets,
    calculatePrice,
    refreshInfo,
  } = useBlockLucky(contractAddress);

  const [showError, setShowError] = useState(true);

  if (!lotteryInfo && !error) {
    return (
      <div className="lottery-interface loading">
        <div className="spinner-large"></div>
        <p>Chargement des informations de la loterie...</p>
        {!isConnected && (
          <p style={{ marginTop: "1rem", color: "#666", fontSize: "0.9rem" }}>
            💡 Connectez votre wallet pour interagir avec le contrat
          </p>
        )}
      </div>
    );
  }

  if (error && !lotteryInfo) {
    return (
      <div className="lottery-interface">
        <div className="error-message" style={{ marginBottom: "1rem" }}>
          <span>
            <strong>Erreur :</strong> {error}
          </span>
        </div>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p><strong>Vérifiez que :</strong></p>
          <ul style={{ textAlign: "left", display: "inline-block", marginTop: "1rem", marginBottom: "1rem" }}>
            <li>Le nœud Hardhat est lancé : <code>npm run node</code></li>
            <li>Le contrat est déployé : <code>npm run deploy</code></li>
            <li>L'adresse du contrat est correcte (copiez celle affichée après le déploiement)</li>
            <li>Vous êtes connecté au bon réseau (Hardhat Local - Chain ID: 1337)</li>
            <li>Vous utilisez la même adresse que celle du déploiement</li>
          </ul>
          <div style={{ marginTop: "1rem", padding: "1rem", background: "#f5f5f5", borderRadius: "8px" }}>
            <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>📝 Étapes à suivre :</p>
            <ol style={{ textAlign: "left", display: "inline-block", margin: "0", paddingLeft: "1.5rem" }}>
              <li>Ouvrez un terminal et lancez : <code>npm run node</code></li>
              <li>Dans un autre terminal, lancez : <code>npm run deploy</code></li>
              <li>Copiez l'adresse affichée (ex: 0x5FbDB2315678afecb367f032d93F642f64180aa3)</li>
              <li>Collez cette adresse dans le champ ci-dessus</li>
            </ol>
          </div>
          <button 
            className="refresh-button" 
            onClick={refreshInfo} 
            style={{ marginTop: "1rem" }}
          >
            🔄 Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!lotteryInfo) {
    return null; // Ne devrait pas arriver ici grâce aux vérifications précédentes
  }

  return (
    <div className="lottery-interface">
      {error && showError && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setShowError(false)}>×</button>
        </div>
      )}

      <LotteryStats
        participantCount={lotteryInfo.participantCount}
        minParticipants={lotteryInfo.minParticipantsRequired}
        currentPot={lotteryInfo.currentPot}
        isActive={lotteryInfo.isActive}
        isCompleted={lotteryInfo.isCompleted}
      />

      {lotteryInfo.isCompleted && lotteryInfo.currentWinner && (
        <WinnerDisplay
          winner={lotteryInfo.currentWinner}
          prize={lotteryInfo.prizeAmount || lotteryInfo.currentPot}
        />
      )}

      <BuyTicket
        ticketPrice={ticketPrice}
        onBuyTicket={buyTicket}
        onBuyTickets={buyTickets}
        calculatePrice={calculatePrice}
        loading={loading}
        isConnected={isConnected}
        isActive={lotteryInfo.isActive}
        isCompleted={lotteryInfo.isCompleted}
      />

      <div className="refresh-section">
        <button className="refresh-button" onClick={refreshInfo} disabled={loading}>
          🔄 Actualiser
        </button>
      </div>

      {isConnected && (
        <TransactionHistory contractAddress={contractAddress} />
      )}
    </div>
  );
};

