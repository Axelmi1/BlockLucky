import React from "react";
import "./WinnerDisplay.css";

interface WinnerDisplayProps {
  winner: string;
  prize: string;
}

export const WinnerDisplay: React.FC<WinnerDisplayProps> = ({ winner, prize }) => {
  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="winner-display">
      <div className="winner-card">
        <div className="winner-icon">🎉</div>
        <h2>Félicitations !</h2>
        <p className="winner-label">Le gagnant de la loterie est :</p>
        <div className="winner-address">{formatAddress(winner)}</div>
        <div className="winner-prize">
          <span className="prize-label">Prix gagné :</span>
          <span className="prize-amount">{parseFloat(prize).toFixed(4)} ETH</span>
        </div>
        <div className="confetti">
          <span>🎊</span>
          <span>🎈</span>
          <span>🎉</span>
          <span>🎊</span>
          <span>🎈</span>
        </div>
      </div>
    </div>
  );
};

