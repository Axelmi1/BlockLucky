import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../hooks/useWeb3";
import { getContract } from "../utils/contract";
import "./TransactionHistory.css";

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  blockNumber: number;
  type: "sent" | "received";
  gasUsed?: string;
  gasPrice?: string;
  status?: "success" | "failed";
  contractAddress?: string;
}

interface TransactionHistoryProps {
  contractAddress: string;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  contractAddress,
}) => {
  const { account, provider } = useWeb3();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    if (!account || !provider) {
      setTransactions([]);
      return;
    }

    if (typeof window === "undefined" || !window.ethereum) {
      setError("MetaMask n'est pas disponible");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Utiliser window.ethereum.request directement comme dans useBlockLucky
      const blockNumber = await window.ethereum.request({ method: "eth_blockNumber" });
      const blockNum = parseInt(blockNumber, 16);
      
      const foundTransactions: Transaction[] = [];
      const maxBlocksToScan = 200; // Scanner les 200 derniers blocs (augmenté pour capturer plus de transactions)
      const seenHashes = new Set<string>(); // Pour éviter les doublons
      
      console.log(`🔍 Scan des ${Math.min(maxBlocksToScan, blockNum + 1)} derniers blocs pour ${account}...`);

      // ÉTAPE 1: Scanner les événements WinnerSelected pour trouver les transferts de prix
      try {
        console.log("🔍 Scan des événements WinnerSelected pour les transferts de prix...");
        
        // Signature de l'événement WinnerSelected(address indexed winner, uint256 prize)
        // Keccak256("WinnerSelected(address,uint256)") = 0x...
        const winnerSelectedTopic = ethers.id("WinnerSelected(address,uint256)");
        
        const logs = await window.ethereum.request({
          method: "eth_getLogs",
          params: [{
            fromBlock: `0x${Math.max(0, blockNum - maxBlocksToScan).toString(16)}`,
            toBlock: "latest",
            address: contractAddress, // Filtrer par adresse du contrat
            topics: [winnerSelectedTopic] // Filtrer par événement WinnerSelected
          }]
        });
        
        console.log(`📋 ${logs?.length || 0} événement(s) WinnerSelected trouvé(s)`);
        
        // Pour chaque événement WinnerSelected, vérifier si notre compte est le gagnant
        for (const log of logs || []) {
          try {
            // topic[1] contient le winner (indexed address, 32 bytes avec padding)
            // data contient le prize (uint256, encodé en ABI)
            const winnerAddress = "0x" + (log.topics[1] || "").slice(-40); // Prendre les 40 derniers caractères (20 bytes = address)
            
            // Vérifier si notre compte est le gagnant
            if (winnerAddress.toLowerCase() === account.toLowerCase()) {
              // Décoder le prize depuis les data (ABI-encoded uint256)
              let prize = "0";
              try {
                // Utiliser l'interface ethers pour décoder correctement
                if (provider) {
                  const contract = getContract(provider, contractAddress);
                  const iface = contract.interface;
                  // decodeEventLog décode les topics et data selon la signature de l'événement
                  const decoded = iface.decodeEventLog("WinnerSelected", log.data, log.topics);
                  // decoded[0] = winner (address), decoded[1] = prize (uint256)
                  prize = ethers.formatEther(decoded[1]);
                } else {
                  // Fallback: décoder manuellement si pas de provider
                  if (log.data && log.data !== "0x" && log.data.length >= 66) {
                    // Le data contient le prize encodé en ABI (32 bytes pour uint256)
                    const prizeHex = "0x" + log.data.slice(2, 66); // Prendre les 32 premiers bytes
                    prize = ethers.formatEther(BigInt(prizeHex));
                  }
                }
              } catch (e) {
                console.warn("Erreur lors du décodage du prize:", e);
                // Dernier recours: essayer de décoder manuellement
                if (log.data && log.data !== "0x" && log.data.length >= 66) {
                  try {
                    const prizeHex = "0x" + log.data.slice(2, 66);
                    prize = ethers.formatEther(BigInt(prizeHex));
                  } catch (manualErr) {
                    console.warn("Erreur lors du décodage manuel:", manualErr);
                  }
                }
              }
              
              if (prize !== "0") {
                // Récupérer les détails de la transaction
                const tx = await window.ethereum.request({
                  method: "eth_getTransactionByHash",
                  params: [log.transactionHash]
                });
                
                const receipt = await window.ethereum.request({
                  method: "eth_getTransactionReceipt",
                  params: [log.transactionHash]
                });
                
                const blockNumFromTx = receipt?.blockNumber ? parseInt(receipt.blockNumber, 16) : 0;
                const blockInfo = receipt?.blockNumber ? await window.ethereum.request({
                  method: "eth_getBlockByNumber",
                  params: [receipt.blockNumber, false]
                }) : null;
                const timestamp = blockInfo?.timestamp ? parseInt(blockInfo.timestamp, 16) : 0;
                
                // Créer une transaction "received" pour le prix
                const prizeTxHash = log.transactionHash + "-prize"; // Hash unique pour éviter les doublons
                if (!seenHashes.has(prizeTxHash)) {
                  foundTransactions.push({
                    hash: log.transactionHash, // Utiliser le hash de la transaction qui a déclenché le transfert
                    from: contractAddress, // Le contrat est l'expéditeur
                    to: account,
                    value: prize,
                    timestamp: timestamp,
                    blockNumber: blockNumFromTx,
                    type: "received",
                    gasUsed: receipt?.gasUsed ? receipt.gasUsed : undefined,
                    gasPrice: tx?.gasPrice ? tx.gasPrice : undefined,
                    status: receipt?.status === "0x1" ? "success" : receipt?.status === "0x0" ? "failed" : undefined,
                    contractAddress: contractAddress,
                  });
                  seenHashes.add(prizeTxHash);
                  console.log(`💰 Prix détecté: ${prize} ETH reçu par ${account} dans le bloc ${blockNumFromTx}`);
                }
              }
            }
          } catch (logErr) {
            console.warn("Erreur lors du traitement d'un événement WinnerSelected:", logErr);
          }
        }
      } catch (logsErr) {
        console.warn("Erreur lors du scan des événements WinnerSelected:", logsErr);
      }

      // ÉTAPE 2: Scanner les blocs récents pour les transactions normales
      for (let i = 0; i < maxBlocksToScan && i <= blockNum; i++) {
        try {
          const blockNumToCheck = blockNum - i;
          const blockHex = `0x${blockNumToCheck.toString(16)}`;
          
          // Récupérer le bloc avec les transactions complètes via window.ethereum
          const block = await window.ethereum.request({
            method: "eth_getBlockByNumber",
            params: [blockHex, true] // true = inclure les transactions complètes
          });

          if (block && block.transactions) {
            for (const tx of block.transactions) {
              // Vérifier que c'est un objet avec les propriétés nécessaires
              if (tx && typeof tx === "object" && "hash" in tx) {
                // Récupérer le receipt pour plus de détails
                let receipt = null;
                try {
                  receipt = await window.ethereum.request({
                    method: "eth_getTransactionReceipt",
                    params: [tx.hash]
                  });
                } catch (e) {
                  // Ignorer si le receipt n'est pas disponible
                }
                
                // Éviter les doublons
                if (seenHashes.has(tx.hash)) {
                  continue;
                }
                
                // Transaction envoyée
                if (tx.from && tx.from.toLowerCase() === account.toLowerCase()) {
                  const value = tx.value ? ethers.formatEther(BigInt(tx.value)) : "0";
                  foundTransactions.push({
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to || "",
                    value: value,
                    timestamp: block.timestamp ? parseInt(block.timestamp, 16) : 0,
                    blockNumber: blockNumToCheck,
                    type: "sent",
                    gasUsed: receipt?.gasUsed ? receipt.gasUsed : undefined,
                    gasPrice: tx.gasPrice ? tx.gasPrice : undefined,
                    status: receipt?.status === "0x1" ? "success" : receipt?.status === "0x0" ? "failed" : undefined,
                    contractAddress: receipt?.contractAddress || undefined,
                  });
                  seenHashes.add(tx.hash);
                }
                
                // Transaction reçue (y compris les transferts du contrat)
                // IMPORTANT: Les transferts internes du contrat (via call{value: X}) apparaissent comme des transactions
                // où le contrat est le "from" et le gagnant est le "to"
                if (tx.to && tx.to.toLowerCase() === account.toLowerCase() && tx.value && tx.value !== "0x0" && tx.value !== "0x") {
                  const value = ethers.formatEther(BigInt(tx.value));
                  foundTransactions.push({
                    hash: tx.hash,
                    from: tx.from || "",
                    to: tx.to,
                    value: value,
                    timestamp: block.timestamp ? parseInt(block.timestamp, 16) : 0,
                    blockNumber: blockNumToCheck,
                    type: "received",
                    gasUsed: receipt?.gasUsed ? receipt.gasUsed : undefined,
                    gasPrice: tx.gasPrice ? tx.gasPrice : undefined,
                    status: receipt?.status === "0x1" ? "success" : receipt?.status === "0x0" ? "failed" : undefined,
                    contractAddress: receipt?.contractAddress || undefined,
                  });
                  seenHashes.add(tx.hash);
                }
                
                // Vérifier aussi les transactions où le contrat est l'expéditeur (transferts internes)
                // Dans Hardhat, les transferts internes via call{value: X} peuvent apparaître comme des transactions
                // où from est l'adresse du contrat et to est le destinataire
                if (tx.from && tx.from.toLowerCase() === contractAddress.toLowerCase() && 
                    tx.to && tx.to.toLowerCase() === account.toLowerCase() && 
                    tx.value && tx.value !== "0x0" && tx.value !== "0x") {
                  // C'est un transfert du contrat vers notre compte (probablement le prix)
                  const value = ethers.formatEther(BigInt(tx.value));
                  if (!seenHashes.has(tx.hash)) {
                    foundTransactions.push({
                      hash: tx.hash,
                      from: tx.from || contractAddress,
                      to: tx.to,
                      value: value,
                      timestamp: block.timestamp ? parseInt(block.timestamp, 16) : 0,
                      blockNumber: blockNumToCheck,
                      type: "received",
                      gasUsed: receipt?.gasUsed ? receipt.gasUsed : undefined,
                      gasPrice: tx.gasPrice ? tx.gasPrice : undefined,
                      status: receipt?.status === "0x1" ? "success" : receipt?.status === "0x0" ? "failed" : undefined,
                      contractAddress: receipt?.contractAddress || contractAddress,
                    });
                    seenHashes.add(tx.hash);
                  }
                }
              }
            }
          }
        } catch (blockErr) {
          // Ignorer les erreurs pour les blocs individuels
          console.warn(`Erreur lors du scan du bloc ${blockNum - i}:`, blockErr);
        }
      }

      // Trier par bloc (plus récent en premier), puis par timestamp si même bloc
      foundTransactions.sort((a, b) => {
        if (b.blockNumber !== a.blockNumber) {
          return b.blockNumber - a.blockNumber;
        }
        return b.timestamp - a.timestamp;
      });

      console.log(`✅ ${foundTransactions.length} transaction(s) trouvée(s) pour ${account}`);
      console.log(`📊 Détails: ${foundTransactions.filter(t => t.type === "sent").length} envoyée(s), ${foundTransactions.filter(t => t.type === "received").length} reçue(s)`);
      setTransactions(foundTransactions);
    } catch (err: any) {
      console.error("Erreur lors de la récupération des transactions:", err);
      setError(err.message || "Erreur lors de la récupération des transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    
    // Rafraîchir toutes les 5 secondes
    const interval = setInterval(fetchTransactions, 5000);
    
    return () => clearInterval(interval);
  }, [account, provider, contractAddress]);
  
  // Forcer un rafraîchissement quand l'adresse change
  useEffect(() => {
    if (account) {
      console.log(`🔄 Adresse changée, rafraîchissement de l'historique pour ${account}...`);
      fetchTransactions();
    }
  }, [account]);

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp * 1000).toLocaleString("fr-FR");
  };

  const getTransactionTypeLabel = (type: "sent" | "received") => {
    return type === "sent" ? "Envoyé" : "Reçu";
  };

  const getTransactionTypeClass = (type: "sent" | "received") => {
    return type === "sent" ? "tx-sent" : "tx-received";
  };

  if (!account) {
    return (
      <div className="transaction-history">
        <h3>📜 Historique des Transactions</h3>
        <p className="no-account">Connectez votre wallet pour voir l'historique</p>
      </div>
    );
  }

  return (
    <div className="transaction-history">
      <div className="transaction-history-header">
        <h3>📜 Historique des Transactions</h3>
        <button 
          className="refresh-button-small" 
          onClick={fetchTransactions}
          disabled={loading}
        >
          {loading ? "🔄" : "🔄"} {loading ? "Chargement..." : "Actualiser"}
        </button>
      </div>

      {error && (
        <div className="error-message-small">
          {error}
        </div>
      )}

      {loading && transactions.length === 0 ? (
        <div className="loading-transactions">
          <div className="spinner-small"></div>
          <p>Chargement des transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="no-transactions">
          <p>📭 Aucune transaction trouvée</p>
          <p className="hint">Les transactions apparaîtront ici après vos achats de tickets</p>
        </div>
      ) : (
        <div className="transactions-list">
          {transactions.map((tx) => (
            <div key={tx.hash} className={`transaction-item ${getTransactionTypeClass(tx.type)}`}>
              <div className="transaction-header">
                <span className={`transaction-type-badge ${getTransactionTypeClass(tx.type)}`}>
                  {getTransactionTypeLabel(tx.type)}
                </span>
                <span className="transaction-value">
                  {tx.type === "sent" ? "-" : "+"} {parseFloat(tx.value).toFixed(4)} ETH
                </span>
              </div>
              <div className="transaction-details">
                <div className="transaction-detail">
                  <span className="detail-label">Hash:</span>
                  <span className="detail-value hash">{formatAddress(tx.hash)}</span>
                </div>
                {tx.type === "sent" && tx.to && (
                  <div className="transaction-detail">
                    <span className="detail-label">Vers:</span>
                    <span className="detail-value">{formatAddress(tx.to)}</span>
                  </div>
                )}
                {tx.type === "received" && tx.from && (
                  <div className="transaction-detail">
                    <span className="detail-label">De:</span>
                    <span className="detail-value">{formatAddress(tx.from)}</span>
                  </div>
                )}
                <div className="transaction-detail">
                  <span className="detail-label">Bloc:</span>
                  <span className="detail-value">{tx.blockNumber}</span>
                </div>
                <div className="transaction-detail">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">{formatDate(tx.timestamp)}</span>
                </div>
                {tx.gasUsed && (
                  <div className="transaction-detail">
                    <span className="detail-label">Gas utilisé:</span>
                    <span className="detail-value">{parseInt(tx.gasUsed, 16).toLocaleString()}</span>
                  </div>
                )}
                {tx.status && (
                  <div className="transaction-detail">
                    <span className="detail-label">Statut:</span>
                    <span className={`detail-value status ${tx.status}`}>
                      {tx.status === "success" ? "✅ Succès" : "❌ Échec"}
                    </span>
                  </div>
                )}
                {tx.contractAddress && (
                  <div className="transaction-detail">
                    <span className="detail-label">Contrat créé:</span>
                    <span className="detail-value">{formatAddress(tx.contractAddress)}</span>
                  </div>
                )}
              </div>
              <div className="transaction-hash-full">
                <code>{tx.hash}</code>
                <button
                  className="copy-hash-button"
                  onClick={() => {
                    navigator.clipboard.writeText(tx.hash);
                    alert("Hash copié dans le presse-papiers !");
                  }}
                  title="Copier le hash"
                >
                  📋 Copier
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="transaction-history-footer">
        <div className="explorer-info">
          <h4>🔍 Explorateur de Blocs Local</h4>
          <p className="hint">
            💡 Cet historique est lu directement depuis la blockchain Hardhat. 
            Pour voir tous les détails, consultez les logs du terminal où <code>npm run node</code> est lancé.
          </p>
          <p className="hint" style={{ marginTop: "0.5rem" }}>
            📊 <strong>Astuce :</strong> Les logs Hardhat affichent toutes les transactions avec leurs détails complets (gas, events, etc.)
          </p>
        </div>
      </div>
    </div>
  );
};

