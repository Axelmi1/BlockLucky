import React, { useState } from "react";
import { useWeb3 } from "./hooks/useWeb3";
import { LotteryInterface } from "./components/LotteryInterface";
import { HomePage } from "./components/HomePage";
import "./App.css";

// Adresse du contrat déployé (à mettre à jour après déploiement)
// Pour le développement, vous pouvez utiliser l'adresse du contrat déployé localement
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "";

function App() {
  const { account, isConnected, connect, disconnect } = useWeb3();
  const [contractAddress, setContractAddress] = useState<string>(CONTRACT_ADDRESS);
  const [inputAddress, setInputAddress] = useState<string>(CONTRACT_ADDRESS);
  const [showHomePage, setShowHomePage] = useState<boolean>(true);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error: any) {
      alert(error.message || "Erreur lors de la connexion");
    }
  };

  const handleSetContractAddress = () => {
    if (inputAddress && inputAddress.startsWith("0x") && inputAddress.length === 42) {
      setContractAddress(inputAddress);
    } else {
      alert("Adresse de contrat invalide");
    }
  };

  const handleParticipate = () => {
    // Si pas d'adresse de contrat, demander à l'utilisateur de la configurer
    if (!contractAddress) {
      setShowHomePage(false);
      // Si pas d'adresse dans l'input, utiliser l'adresse par défaut
      if (!inputAddress) {
        setInputAddress("0x5fbdb2315678afecb367f032d93f642f64180aa3");
      }
    } else {
      setShowHomePage(false);
    }
  };

  // Si on affiche la page d'accueil
  if (showHomePage) {
    return <HomePage onParticipate={handleParticipate} />;
  }

  // Sinon, afficher l'interface de loterie
  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h1>🎰 BlockLucky</h1>
          <p className="subtitle">Loterie Blockchain Transparente</p>
        </div>

        <div className="wallet-section">
          {isConnected ? (
            <div className="wallet-info">
              <span className="wallet-address">
                {account?.slice(0, 6)}...{account?.slice(-4)}
              </span>
              <button 
                className="disconnect-button" 
                onClick={async () => {
                  try {
                    await disconnect();
                  } catch (error: any) {
                    console.error("Erreur lors de la déconnexion:", error);
                    // La fonction disconnect() réinitialise toujours l'état local même en cas d'erreur
                  }
                }}
                title="Déconnexion (révoque les permissions MetaMask pour forcer la sélection d'adresse)"
              >
                Déconnexion
              </button>
              <button 
                className="refresh-button" 
                onClick={async () => {
                  try {
                    if (window.ethereum && account) {
                      console.log("🔄 Rafraîchissement de la balance...");
                      
                      // Méthode 1: Forcer MetaMask à rafraîchir en demandant le blockNumber
                      await window.ethereum.request({
                        method: "eth_blockNumber"
                      });
                      
                      // Méthode 2: Demander la balance avec "latest" explicitement
                      const balance = await window.ethereum.request({
                        method: "eth_getBalance",
                        params: [account, "latest"]
                      });
                      
                      console.log("Balance (hex):", balance);
                      console.log("Balance (ETH):", parseInt(balance, 16) / 1e18, "ETH");
                      
                      // Méthode 3: Forcer une requête de synchronisation
                      await window.ethereum.request({
                        method: "eth_requestAccounts"
                      });
                      
                      // Recharger la page pour forcer MetaMask à se resynchroniser
                      alert(`Balance rafraîchie ! La page va se recharger.\nBalance: ${(parseInt(balance, 16) / 1e18).toFixed(4)} ETH`);
                      window.location.reload();
                    }
                  } catch (err: any) {
                    console.error("Erreur lors du rafraîchissement:", err);
                    alert(`Erreur: ${err.message || "Impossible de rafraîchir"}\n\nEssayez de fermer et rouvrir MetaMask.`);
                  }
                }}
                title="Rafraîchir la balance MetaMask"
                style={{ 
                  marginLeft: "0.5rem", 
                  padding: "0.5rem 1rem",
                  fontSize: "0.9rem",
                  background: "#4caf50",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer"
                }}
              >
                🔄 Rafraîchir
              </button>
            </div>
          ) : (
            <button className="connect-button" onClick={handleConnect}>
              Connecter Wallet
            </button>
          )}
        </div>
      </header>

      <main className="App-main">
        {!contractAddress ? (
          <div className="contract-setup">
            <h2>Configuration du Contrat</h2>
            <p>Veuillez entrer l'adresse du contrat BlockLucky déployé :</p>
            <div className="address-input-group">
              <input
                type="text"
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
                placeholder="0x..."
                className="address-input"
              />
              <button onClick={handleSetContractAddress} className="set-button">
                Utiliser cette adresse
              </button>
            </div>
            <p className="hint">
              💡 Pour obtenir l'adresse, déployez le contrat avec{" "}
              <code>npm run deploy</code> dans le dossier racine
            </p>
            <p className="hint" style={{ marginTop: "1rem", color: "#666", fontSize: "0.9rem" }}>
              📝 Dernière adresse déployée (si disponible) : <code style={{ background: "#f0f0f0", padding: "2px 6px", borderRadius: "4px" }}>0x5fbdb2315678afecb367f032d93f642f64180aa3</code>
            </p>
            <button 
              onClick={() => setShowHomePage(true)} 
              style={{ 
                marginTop: "1rem", 
                padding: "0.75rem 1.5rem",
                background: "#667eea",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "1rem"
              }}
            >
              ← Retour à l'accueil
            </button>
          </div>
        ) : (
          <>
            <button 
              onClick={() => setShowHomePage(true)} 
              style={{ 
                marginBottom: "1rem", 
                padding: "0.75rem 1.5rem",
                background: "#667eea",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "1rem"
              }}
            >
              ← Retour à l'accueil
            </button>
            <LotteryInterface contractAddress={contractAddress} isConnected={isConnected} />
          </>
        )}
      </main>

      <footer className="App-footer">
        <p>
          Développé pour la ville d'EtherBay | Blockchain & Transparence
        </p>
      </footer>
    </div>
  );
}

export default App;
