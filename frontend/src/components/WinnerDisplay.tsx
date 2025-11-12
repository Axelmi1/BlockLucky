import React, { useState, useEffect } from "react";
import "./WinnerDisplay.css";

interface WinnerDisplayProps {
  winner: string;
  prize: string;
}

export const WinnerDisplay: React.FC<WinnerDisplayProps> = ({ winner, prize }) => {
  const [countdown, setCountdown] = useState<number | null>(3);
  const [showContent, setShowContent] = useState(false);
  const [revealedAddress, setRevealedAddress] = useState("");
  const [showPrize, setShowPrize] = useState(false);

  const fullAddress = winner || "";
  const formattedAddress = fullAddress ? `${fullAddress.slice(0, 6)}...${fullAddress.slice(-4)}` : "";

  useEffect(() => {
    // Phase 1: Décompte
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 800);
      return () => clearTimeout(timer);
    }

    // Phase 2: Afficher le contenu après le décompte
    if (countdown === 0) {
      const timer = setTimeout(() => {
        setCountdown(null);
        setShowContent(true);
      }, 500);
      return () => clearTimeout(timer);
    }

    // Phase 3: Révéler l'adresse caractère par caractère
    if (showContent && revealedAddress.length < formattedAddress.length) {
      const timer = setTimeout(() => {
        setRevealedAddress(formattedAddress.slice(0, revealedAddress.length + 1));
      }, 100);
      return () => clearTimeout(timer);
    }

    // Phase 4: Afficher le prix après l'adresse complète
    if (showContent && revealedAddress.length === formattedAddress.length && !showPrize) {
      const timer = setTimeout(() => {
        setShowPrize(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [countdown, showContent, revealedAddress, formattedAddress, showPrize]);

  // Reset when winner or prize changes
  useEffect(() => {
    setCountdown(3);
    setShowContent(false);
    setRevealedAddress("");
    setShowPrize(false);
  }, [winner, prize]);

  return (
    <div className="winner-display">
      <div className="winner-card">
        {countdown !== null ? (
          <div className="countdown-container">
            <div className="countdown-number">{countdown}</div>
            <div className="countdown-text">Le gagnant est...</div>
          </div>
        ) : (
          <>
            <div className="winner-icon">🎉</div>
            <h2 className={showContent ? "fade-in" : ""}>Félicitations !</h2>
            <p className={`winner-label ${showContent ? "fade-in" : ""}`}>
              Le gagnant de la loterie est :
            </p>
            <div className={`winner-address ${showContent ? "fade-in" : ""}`}>
              <span className="address-reveal">
                {revealedAddress}
                {revealedAddress.length < formattedAddress.length && (
                  <span className="cursor">|</span>
                )}
              </span>
            </div>
            {showPrize && (
              <div className={`winner-prize fade-in`}>
                <span className="prize-label">Prix gagné :</span>
                <span className="prize-amount">{parseFloat(prize || "0").toFixed(4)} ETH</span>
              </div>
            )}
            <div className="confetti">
              <span>🎊</span>
              <span>🎈</span>
              <span>🎉</span>
              <span>🎊</span>
              <span>🎈</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

