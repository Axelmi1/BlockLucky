import React, { useState, useEffect } from "react";
import "./BuyTicket.css";

interface BuyTicketProps {
  ticketPrice: string;
  onBuyTicket: () => Promise<void>;
  onBuyTickets: (quantity: number) => Promise<void>;
  calculatePrice: (quantity: number) => Promise<{ totalPrice: string; discount: number; totalPriceWei: bigint }>;
  loading: boolean;
  isConnected: boolean;
  isActive: boolean;
  isCompleted: boolean;
}

export const BuyTicket: React.FC<BuyTicketProps> = ({
  ticketPrice,
  onBuyTicket,
  onBuyTickets,
  calculatePrice,
  loading,
  isConnected,
  isActive,
  isCompleted,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [priceInfo, setPriceInfo] = useState<{ totalPrice: string; discount: number; totalPriceWei: bigint }>({
    totalPrice: ticketPrice,
    discount: 0,
    totalPriceWei: BigInt(0),
  });
  const [selectedPack, setSelectedPack] = useState<number | null>(null);

  // Calculer le prix quand la quantité change
  useEffect(() => {
    const updatePrice = async () => {
      if (quantity >= 1 && quantity <= 25) {
        try {
          const info = await calculatePrice(quantity);
          setPriceInfo(info);
        } catch (error: any) {
          // En cas d'erreur, utiliser un calcul basique côté client
          // Cela évite les erreurs si calculatePrice n'existe pas dans le contrat
          const basePrice = parseFloat(ticketPrice) * quantity;
          let discount = 0;
          if (quantity >= 25) discount = 20;
          else if (quantity >= 20) discount = 15;
          else if (quantity >= 15) discount = 10;
          const totalPrice = basePrice - (basePrice * discount / 100);
          setPriceInfo({
            totalPrice: totalPrice.toFixed(4),
            discount,
            totalPriceWei: BigInt(0), // Sera calculé lors de l'achat
          });
        }
      }
    };
    updatePrice();
  }, [quantity, calculatePrice, ticketPrice]);

  const handleBuy = async () => {
    if (!isConnected) {
      alert("Veuillez d'abord vous connecter à votre wallet");
      return;
    }
    
    try {
      if (quantity === 1) {
        await onBuyTicket();
      } else {
        // Acheter plusieurs tickets en une seule transaction
        console.log(`Achat de ${quantity} tickets en une seule transaction...`);
        await onBuyTickets(quantity);
      }
    } catch (error: any) {
      console.error("Erreur lors de l'achat:", error);
      // Les erreurs sont déjà gérées dans useBlockLucky et affichées via le prop error
      // Ici on peut juste logger pour le débogage
      if (error.message?.includes("redéployer")) {
        alert(`⚠️ ${error.message}\n\nPour utiliser l'achat de plusieurs tickets, vous devez redéployer le contrat avec les nouvelles fonctionnalités.`);
      } else if (error.message || error.reason) {
        // L'erreur sera affichée dans LotteryInterface via le prop error
        console.error("Détails de l'erreur:", {
          message: error.message,
          reason: error.reason,
          code: error.code
        });
      }
    }
  };

  const handlePackSelect = (packQuantity: number) => {
    setSelectedPack(packQuantity);
    setQuantity(packQuantity);
  };

  if (isCompleted) {
    return (
      <div className="buy-ticket completed">
        <p>La loterie est terminée. Un gagnant a été sélectionné !</p>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="buy-ticket inactive">
        <p>La loterie n'est pas active pour le moment.</p>
      </div>
    );
  }

  const vipPacks = [
    { quantity: 15, discount: 10, label: "Pack VIP 15" },
    { quantity: 20, discount: 15, label: "Pack VIP 20" },
    { quantity: 25, discount: 20, label: "Pack VIP 25" },
  ];

  return (
    <div className="buy-ticket">
      <div className="ticket-card">
        <div className="ticket-header">
          <h3>Acheter des Tickets</h3>
          <div className="ticket-price">
            {priceInfo.totalPrice} ETH
            {priceInfo.discount > 0 && (
              <span className="discount-badge">-{priceInfo.discount}%</span>
            )}
          </div>
        </div>

        {/* Sélecteur de quantité (1-25) */}
        <div className="quantity-selector">
          <label>Nombre de tickets (1-25) :</label>
          <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.5rem", marginBottom: "1rem" }}>
            💡 Sélectionnez plusieurs tickets pour les acheter en <strong>une seule transaction</strong> et économiser sur les frais de gas !
          </p>
          <div className="quantity-controls">
            <button
              className="quantity-btn"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              -
            </button>
            <input
              type="number"
              min="1"
              max="25"
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setQuantity(Math.min(25, Math.max(1, val)));
                setSelectedPack(null);
              }}
              className="quantity-input"
            />
            <button
              className="quantity-btn"
              onClick={() => setQuantity(Math.min(25, quantity + 1))}
              disabled={quantity >= 25}
            >
              +
            </button>
          </div>
        </div>

        {/* Packs VIP */}
        <div className="vip-packs">
          <h4>Packs VIP avec réduction :</h4>
          <div className="packs-grid">
            {vipPacks.map((pack) => {
              const isSelected = selectedPack === pack.quantity;
              return (
                <button
                  key={pack.quantity}
                  className={`pack-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handlePackSelect(pack.quantity)}
                >
                  <div className="pack-label">{pack.label}</div>
                  <div className="pack-discount">-{pack.discount}%</div>
                  <div className="pack-quantity">{pack.quantity} tickets</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Détails du prix */}
        <div className="price-details">
          <div className="price-row">
            <span>Prix unitaire :</span>
            <span>{parseFloat(ticketPrice).toFixed(4)} ETH</span>
          </div>
          <div className="price-row">
            <span>Quantité :</span>
            <span>{quantity} ticket{quantity > 1 ? "s" : ""}</span>
          </div>
          {priceInfo.discount > 0 && (
            <>
              <div className="price-row original">
                <span>Prix total (sans réduction) :</span>
                <span>{(parseFloat(ticketPrice) * quantity).toFixed(4)} ETH</span>
              </div>
              <div className="price-row discount">
                <span>Réduction ({priceInfo.discount}%) :</span>
                <span>
                  -{(parseFloat(ticketPrice) * quantity * (priceInfo.discount / 100)).toFixed(4)} ETH
                </span>
              </div>
            </>
          )}
          <div className="price-row total">
            <span>Total à payer :</span>
            <span className="total-price">{priceInfo.totalPrice} ETH</span>
          </div>
        </div>

        <button
          className="buy-button"
          onClick={handleBuy}
          disabled={loading || !isConnected}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Traitement en cours...
            </>
          ) : !isConnected ? (
            "Connectez votre wallet"
          ) : (
            `Acheter ${quantity} ticket${quantity > 1 ? "s" : ""}`
          )}
        </button>

        {!isConnected && (
          <p className="connect-hint">
            Connectez votre wallet MetaMask pour participer
          </p>
        )}
      </div>
    </div>
  );
};
