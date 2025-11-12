import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { getContract } from "../utils/contract";
import { useWeb3 } from "./useWeb3";

// Fonction utilitaire pour synchroniser MetaMask pour une adresse donnée
const syncMetaMaskForAddress = async (address: string, label: string = "adresse", txHash?: string) => {
  if (typeof window === "undefined" || !window.ethereum) return;
  
  try {
    console.log(`🔄 Synchronisation MetaMask pour ${label} (${address})...`);
    
    // Attendre un peu pour que la transaction soit bien confirmée
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Méthode 1: Si on a le hash de la transaction, forcer MetaMask à la charger
    if (txHash) {
      try {
        console.log(`📋 Chargement de la transaction ${txHash} dans MetaMask...`);
        // Demander la transaction par son hash pour forcer MetaMask à la charger
        await window.ethereum.request({
          method: "eth_getTransactionByHash",
          params: [txHash]
        });
        
        // Demander aussi le receipt pour forcer le chargement complet
        await window.ethereum.request({
          method: "eth_getTransactionReceipt",
          params: [txHash]
        });
        console.log(`✅ Transaction ${txHash} chargée dans MetaMask`);
      } catch (e) {
        console.warn("Erreur lors du chargement de la transaction:", e);
      }
    }
    
    // Méthode 2: Forcer MetaMask à rafraîchir en demandant le blockNumber
    await window.ethereum.request({
      method: "eth_blockNumber"
    });
    
    // Méthode 3: Demander la balance avec "latest" explicitement
    await window.ethereum.request({
      method: "eth_getBalance",
      params: [address, "latest"]
    });
    
    // Méthode 4: Demander le nombre de transactions pour forcer le rafraîchissement
    try {
      await window.ethereum.request({
        method: "eth_getTransactionCount",
        params: [address, "latest"]
      });
    } catch (e) {
      // Ignorer si cette méthode n'est pas disponible
    }
    
    // Méthode 5: Scanner les blocs récents pour trouver et charger les transactions de cette adresse
    try {
      const blockNumber = await window.ethereum.request({ method: "eth_blockNumber" });
      const blockNum = parseInt(blockNumber, 16);
      
      console.log(`🔍 Scanner les ${Math.min(50, blockNum + 1)} derniers blocs pour trouver les transactions de ${address}...`);
      
      // Scanner les 50 derniers blocs pour forcer MetaMask à détecter les transactions
      // On utilise true pour obtenir les transactions complètes avec 'from'
      const transactionsFound: string[] = [];
      
      for (let i = 0; i < 50 && i <= blockNum; i++) {
        try {
          const blockNumToCheck = blockNum - i;
          const blockHex = `0x${blockNumToCheck.toString(16)}`;
          
          // Récupérer le bloc avec les transactions complètes
          const block = await window.ethereum.request({
            method: "eth_getBlockByNumber",
            params: [blockHex, true] // true = inclure les transactions complètes
          });
          
          // Si le bloc contient des transactions, vérifier si elles viennent de notre adresse
          if (block && block.transactions) {
            for (const tx of block.transactions) {
              // Vérifier si la transaction vient de notre adresse (en minuscules pour comparaison)
              if (tx.from && tx.from.toLowerCase() === address.toLowerCase()) {
                transactionsFound.push(tx.hash);
                console.log(`📋 Transaction trouvée: ${tx.hash} dans le bloc ${blockNumToCheck}`);
                
                // Forcer MetaMask à charger cette transaction dans son historique
                try {
                  await window.ethereum.request({
                    method: "eth_getTransactionByHash",
                    params: [tx.hash]
                  });
                  await window.ethereum.request({
                    method: "eth_getTransactionReceipt",
                    params: [tx.hash]
                  });
                } catch (e) {
                  // Ignorer les erreurs individuelles
                }
              }
              
              // Vérifier aussi si la transaction va vers notre adresse (pour les réceptions)
              if (tx.to && tx.to.toLowerCase() === address.toLowerCase() && tx.value && tx.value !== "0x0") {
                transactionsFound.push(tx.hash);
                console.log(`💰 Transaction de réception trouvée: ${tx.hash} dans le bloc ${blockNumToCheck}`);
                
                // Forcer MetaMask à charger cette transaction
                try {
                  await window.ethereum.request({
                    method: "eth_getTransactionByHash",
                    params: [tx.hash]
                  });
                  await window.ethereum.request({
                    method: "eth_getTransactionReceipt",
                    params: [tx.hash]
                  });
                } catch (e) {
                  // Ignorer les erreurs individuelles
                }
              }
            }
          }
        } catch (e) {
          // Ignorer les erreurs pour les blocs individuels
        }
      }
      
      console.log(`✅ ${transactionsFound.length} transaction(s) trouvée(s) et chargée(s) dans MetaMask pour ${address}`);
      
      // Demander aussi les logs pour les événements du contrat
      try {
        await window.ethereum.request({
          method: "eth_getLogs",
          params: [{
            fromBlock: `0x${Math.max(0, blockNum - 50).toString(16)}`, // 50 blocs en arrière
            toBlock: "latest"
          }]
        });
      } catch (e) {
        // Ignorer si cette méthode échoue
      }
    } catch (e) {
      console.warn("Erreur lors du scan des blocs:", e);
    }
    
    // Méthode 6: Vérifier si c'est le compte actuel et forcer une synchronisation
    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0 && accounts[0].toLowerCase() === address.toLowerCase()) {
        // Si c'est le compte actuel, forcer une requête de synchronisation
        await window.ethereum.request({
          method: "eth_requestAccounts"
        });
        
        // Essayer de forcer MetaMask à rafraîchir en demandant plusieurs fois la balance
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          await window.ethereum.request({
            method: "eth_getBalance",
            params: [address, "latest"]
          });
        }
      }
    } catch (e) {
      // Ignorer si cette méthode échoue
    }
    
    console.log(`✅ MetaMask synchronisé pour ${label} - L'historique devrait se mettre à jour dans quelques secondes`);
  } catch (syncErr: any) {
    console.warn(`⚠️ Erreur lors de la synchronisation MetaMask pour ${label}:`, syncErr);
  }
};

interface LotteryInfo {
  participantCount: number;
  currentPot: string;
  prizeAmount: string; // Montant du prix gagné (récupéré depuis l'événement)
  minParticipantsRequired: number;
  isActive: boolean;
  isCompleted: boolean;
  currentWinner: string;
}

interface UseBlockLuckyReturn {
  contract: ethers.Contract | null;
  lotteryInfo: LotteryInfo | null;
  ticketPrice: string;
  loading: boolean;
  error: string | null;
  buyTicket: () => Promise<void>;
  buyTickets: (quantity: number) => Promise<void>;
  calculatePrice: (quantity: number) => Promise<{ totalPrice: string; discount: number; totalPriceWei: bigint }>;
  refreshInfo: () => Promise<void>;
}

export const useBlockLucky = (contractAddress: string): UseBlockLuckyReturn => {
  const { signer, provider, isConnected, account } = useWeb3();
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [lotteryInfo, setLotteryInfo] = useState<LotteryInfo | null>(null);
  const [ticketPrice, setTicketPrice] = useState<string>("0");
  const [ticketPriceWei, setTicketPriceWei] = useState<string>("0");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [prizeAmount, setPrizeAmount] = useState<string>("0"); // Stocker le montant du prix gagné
  const [hasCalculatePrice, setHasCalculatePrice] = useState<boolean | null>(null); // Cache pour vérifier si calculatePrice existe
  const [lastSyncedAccount, setLastSyncedAccount] = useState<string | null>(null); // Pour suivre la dernière adresse synchronisée

  // Initialiser le contrat
  // Pour la lecture, on utilise toujours le provider local Hardhat
  // Pour les transactions, on utilise le signer de MetaMask
  useEffect(() => {
    if (contractAddress) {
      try {
        // Vérifier que l'adresse est valide
        if (!ethers.isAddress(contractAddress)) {
          setError("Adresse de contrat invalide");
          return;
        }
        
        // Toujours utiliser le provider local Hardhat pour la lecture
        // Cela garantit qu'on lit depuis le bon réseau
        const localProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        
        // Pour les transactions, on utilisera le signer si disponible
        // Mais pour la lecture, on utilise le provider local
        const contractInstance = getContract(localProvider, contractAddress);
        
        // Vérifier que le contrat existe en essayant d'appeler une fonction simple
        contractInstance.owner.staticCall().then(() => {
          setContract(contractInstance);
          setError(null);
          // Réinitialiser le cache de hasCalculatePrice quand le contrat change
          setHasCalculatePrice(null);
        }).catch((err: any) => {
          console.error("Le contrat n'existe pas à cette adresse ou n'est pas accessible:", err);
          setError(`Le contrat n'existe pas à l'adresse ${contractAddress}. Vérifiez que le contrat est bien déployé et que l'adresse est correcte.`);
        });
      } catch (err) {
        console.error("Impossible de se connecter au réseau local Hardhat:", err);
        setError("Impossible de se connecter au réseau. Assurez-vous que Hardhat node est lancé (npm run node)");
      }
    }
  }, [contractAddress]);

  // Charger les informations de la loterie
  const refreshInfo = useCallback(async () => {
    if (!contract) return;

    try {
      setLoading(true);
      setError(null);

      // Vérifier que le contrat existe à l'adresse donnée en essayant d'appeler owner()
      try {
        await contract.owner.staticCall();
      } catch (err: any) {
        // Si owner() échoue, le contrat n'existe probablement pas
        if (err.code === "BAD_DATA" || err.message?.includes("could not decode")) {
          setError("Aucun contrat trouvé à cette adresse. Vérifiez que le contrat est bien déployé avec 'npm run deploy' et que vous utilisez la bonne adresse.");
          setLoading(false);
          return;
        }
        // Sinon, on continue - peut-être juste une erreur temporaire
      }

      const [info, price] = await Promise.all([
        contract.getLotteryInfo(),
        contract.TICKET_PRICE(),
      ]);

      // Si la loterie est terminée et qu'on n'a pas encore le montant du prix,
      // essayer de le récupérer depuis les événements passés
      let finalPrizeAmount = prizeAmount;
      if (info[4] && info[5] !== ethers.ZeroAddress && prizeAmount === "0") {
        try {
          // Récupérer l'événement WinnerSelected le plus récent
          const filter = contract.filters.WinnerSelected();
          const events = await contract.queryFilter(filter);
          if (events.length > 0) {
            const lastEvent = events[events.length - 1];
            // Vérifier que c'est un EventLog avec args
            if (lastEvent && 'args' in lastEvent && lastEvent.args && Array.isArray(lastEvent.args) && lastEvent.args.length >= 2) {
              finalPrizeAmount = ethers.formatEther(lastEvent.args[1] as bigint);
              setPrizeAmount(finalPrizeAmount);
            }
          }
        } catch (err) {
          console.warn("Impossible de récupérer le montant du prix depuis les événements:", err);
          // Calculer le montant du prix basé sur le nombre de participants
          const calculatedPrize = BigInt(info[0]) * price;
          finalPrizeAmount = ethers.formatEther(calculatedPrize);
          setPrizeAmount(finalPrizeAmount);
        }
      }

      setLotteryInfo({
        participantCount: Number(info[0]),
        currentPot: ethers.formatEther(info[1]),
        prizeAmount: finalPrizeAmount,
        minParticipantsRequired: Number(info[2]),
        isActive: info[3],
        isCompleted: info[4],
        currentWinner: info[5],
      });

      setTicketPrice(ethers.formatEther(price));
      setTicketPriceWei(price.toString());
    } catch (err: any) {
      console.error("Erreur lors du chargement des informations:", err);
      
      // Messages d'erreur plus explicites
      if (err.code === "BAD_DATA" || err.message?.includes("could not decode")) {
        setError("Le contrat n'existe pas à cette adresse. Vérifiez que vous avez bien déployé le contrat avec 'npm run deploy' et que vous utilisez la bonne adresse.");
      } else if (err.code === "NETWORK_ERROR" || err.message?.includes("network")) {
        setError("Erreur de réseau. Vérifiez que Hardhat node est lancé (npm run node) et que vous êtes connecté au bon réseau (Hardhat Local - Chain ID: 1337).");
      } else {
        setError(err.message || "Erreur lors du chargement des informations");
      }
    } finally {
      setLoading(false);
    }
  }, [contract]);

  // Fonction pour calculer le prix côté client (fallback)
  const calculatePriceClient = useCallback((quantity: number): { totalPrice: string; discount: number; totalPriceWei: bigint } => {
    const basePrice = parseFloat(ticketPrice) * quantity;
    let discount = 0;
    if (quantity >= 25) discount = 50;
    else if (quantity >= 20) discount = 15;
    else if (quantity >= 15) discount = 10;
    const totalPrice = basePrice - (basePrice * discount / 100);
    const totalPriceWei = ethers.parseEther(totalPrice.toFixed(18));
    return { totalPrice: totalPrice.toFixed(4), discount, totalPriceWei };
  }, [ticketPrice]);

  // Vérifier si calculatePrice existe dans le contrat (une seule fois)
  useEffect(() => {
    if (!contract || hasCalculatePrice !== null) return;

    const checkCalculatePrice = async () => {
      try {
        // Essayer d'appeler calculatePrice avec une valeur de test
        // Utiliser staticCall pour éviter les erreurs dans les logs si ça échoue
        const result = await contract.calculatePrice.staticCall(1);
        // Si on arrive ici, la fonction existe
        setHasCalculatePrice(true);
        console.log("✅ calculatePrice disponible dans le contrat");
      } catch (err: any) {
        // Si l'erreur indique que la fonction n'existe pas
        if (err.message?.includes("unrecognized-selector") || 
            err.message?.includes("could not decode") ||
            err.code === "BAD_DATA") {
          setHasCalculatePrice(false);
          console.log("ℹ️ calculatePrice non disponible, utilisation du calcul côté client");
        } else {
          // Autre erreur, on assume que la fonction existe
          setHasCalculatePrice(true);
        }
      }
    };

    // Vérifier après un court délai pour laisser le contrat se charger
    const timeout = setTimeout(() => {
      checkCalculatePrice();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [contract, hasCalculatePrice]);

  // Calculer le prix pour un nombre de tickets
  const calculatePrice = useCallback(async (quantity: number): Promise<{ totalPrice: string; discount: number; totalPriceWei: bigint }> => {
    if (quantity < 1 || quantity > 25) {
      return { totalPrice: "0", discount: 0, totalPriceWei: BigInt(0) };
    }

    // Si on sait déjà que calculatePrice n'existe pas, utiliser directement le calcul côté client
    if (hasCalculatePrice === false) {
      return calculatePriceClient(quantity);
    }

    // Si on n'a pas encore vérifié, utiliser le calcul côté client pour éviter les erreurs
    if (hasCalculatePrice === null) {
      return calculatePriceClient(quantity);
    }

    // Si on sait que calculatePrice existe, l'utiliser avec staticCall pour éviter les erreurs dans les logs
    if (contract && hasCalculatePrice === true) {
      try {
        // Utiliser staticCall pour éviter les erreurs dans les logs Hardhat
        const [totalPriceWei, discountPercent] = await contract.calculatePrice.staticCall(quantity);
        return {
          totalPrice: ethers.formatEther(totalPriceWei),
          discount: Number(discountPercent),
          totalPriceWei: totalPriceWei,
        };
      } catch (err: any) {
        // Si l'erreur indique que la fonction n'existe pas, mettre à jour le cache et utiliser le calcul côté client
        if (err.message?.includes("unrecognized-selector") || 
            err.message?.includes("could not decode") ||
            err.code === "BAD_DATA") {
          setHasCalculatePrice(false);
          return calculatePriceClient(quantity);
        } else {
          // Autre erreur, utiliser le calcul côté client comme fallback
          console.warn("Erreur lors de l'appel de calculatePrice:", err.message);
          return calculatePriceClient(quantity);
        }
      }
    }

    // Si pas de contrat, utiliser le calcul côté client
    return calculatePriceClient(quantity);
  }, [contract, hasCalculatePrice, calculatePriceClient]);

  // Acheter un ticket
  const buyTicket = useCallback(async () => {
    if (!contract || !isConnected || !signer) {
      setError("Veuillez vous connecter à votre wallet");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Pour les transactions, créer un nouveau contrat avec le signer
      const contractWithSigner = getContract(signer, contract.target as string);
      
      // Forcer MetaMask à se synchroniser AVANT la transaction pour éviter les erreurs de bloc invalide
      // C'est CRITIQUE : MetaMask peut avoir un cache d'un ancien numéro de bloc
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          console.log("🔄 Synchronisation MetaMask avant transaction...");
          
          // 1. Forcer MetaMask à obtenir le vrai blockNumber actuel (plusieurs fois pour nettoyer le cache)
          for (let i = 0; i < 3; i++) {
            const blockNumber = await window.ethereum.request({ method: "eth_blockNumber" });
            const blockNum = parseInt(blockNumber, 16);
            console.log(`📦 BlockNumber actuel (tentative ${i + 1}/3): ${blockNum}`);
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // 2. Demander la balance avec "latest" pour forcer la synchronisation
          const address = await signer.getAddress();
          await window.ethereum.request({ 
            method: "eth_getBalance", 
            params: [address, "latest"] 
          });
          
          // 3. Demander le transactionCount pour forcer le rafraîchissement
          await window.ethereum.request({
            method: "eth_getTransactionCount",
            params: [address, "latest"]
          });
          
          // 4. Forcer MetaMask à reconnaître le compte actif
          await window.ethereum.request({ method: "eth_requestAccounts" });
          
          console.log("✅ MetaMask synchronisé avant transaction");
        } catch (e) {
          console.warn("⚠️ Erreur lors de la synchronisation avant transaction:", e);
          // Continuer quand même, mais on va gérer l'erreur si elle se produit
        }
      }
      
      const tx = await contractWithSigner.buyTicket({ value: ticketPriceWei });
      const transactionHash = tx.hash;
      console.log("✅ Transaction envoyée (buyTicket):", transactionHash);
      await tx.wait();
      console.log("✅ Transaction confirmée !");

      // Rafraîchir les informations après l'achat
      await refreshInfo();

      // Forcer MetaMask à synchroniser l'historique des transactions IMMÉDIATEMENT après confirmation
      // C'est crucial : MetaMask ne met à jour l'historique que si on le fait pendant que le compte est actif
      if (typeof window !== "undefined" && window.ethereum && signer && transactionHash) {
        try {
          const address = await signer.getAddress();
          console.log(`🔄 Synchronisation IMMÉDIATE MetaMask avec la transaction ${transactionHash}...`);
          
          // CRITIQUE : Forcer MetaMask à reconnaître que c'est le compte actif qui a fait la transaction
          try {
            // 1. S'assurer que le compte est bien actif
            const accounts = await window.ethereum.request({ method: "eth_accounts" });
            if (accounts.length > 0 && accounts[0].toLowerCase() === address.toLowerCase()) {
              // 2. Forcer MetaMask à rafraîchir en demandant les comptes
              await window.ethereum.request({ method: "eth_requestAccounts" });
              
              // 3. Charger la transaction IMMÉDIATEMENT (sans délai) pour que MetaMask l'enregistre
              await window.ethereum.request({
                method: "eth_getTransactionByHash",
                params: [transactionHash]
              });
              
              // 4. Charger le receipt IMMÉDIATEMENT
              await window.ethereum.request({
                method: "eth_getTransactionReceipt",
                params: [transactionHash]
              });
              
              console.log(`✅ Transaction ${transactionHash} chargée IMMÉDIATEMENT dans MetaMask pour le compte actif`);
            }
          } catch (immediateErr: any) {
            console.warn("Erreur lors du chargement immédiat:", immediateErr);
          }
          
          // Attendre un peu pour que MetaMask traite
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Synchronisation complète avec scan des blocs
          await syncMetaMaskForAddress(address, "compte actuel", transactionHash);
          
          // Attendre un peu et forcer à nouveau le rafraîchissement
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Forcer MetaMask à rafraîchir l'historique en demandant plusieurs fois la balance et la transaction
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 300));
            try {
              // Recharger la transaction à chaque fois pour forcer MetaMask à l'enregistrer
              await window.ethereum.request({
                method: "eth_getTransactionByHash",
                params: [transactionHash]
              });
              
              const balance = await window.ethereum.request({
                method: "eth_getBalance",
                params: [address, "latest"]
              });
              console.log(`💰 Balance vérifiée (tentative ${i + 1}/5): ${ethers.formatEther(balance)} ETH`);
            } catch (e) {
              // Ignorer les erreurs
            }
          }
          
          console.log("✅ Synchronisation complète terminée - La transaction devrait apparaître dans l'historique MetaMask");
        } catch (syncErr: any) {
          console.warn("⚠️ Erreur lors de la synchronisation MetaMask:", syncErr);
        }
      } else if (typeof window !== "undefined" && window.ethereum && signer) {
        // Fallback si on n'a pas le hash de la transaction
        try {
          const address = await signer.getAddress();
          await syncMetaMaskForAddress(address, "compte actuel");
        } catch (syncErr: any) {
          console.warn("⚠️ Erreur lors de la synchronisation MetaMask:", syncErr);
        }
      }
    } catch (err: any) {
      console.error("Erreur lors de l'achat du ticket:", err);
      console.error("Détails de l'erreur:", {
        message: err.message,
        reason: err.reason,
        code: err.code,
        data: err.data,
        error: err.error
      });
      
      // Gérer les différents types d'erreurs
      let errorMessage = "Erreur lors de l'achat du ticket";
      
      if (err.reason) {
        // Erreur du contrat (revert reason)
        errorMessage = err.reason;
      } else if (err.message) {
        // Analyser le message d'erreur pour donner des informations plus claires
        if (err.message.includes("Montant incorrect")) {
          errorMessage = "Montant incorrect. Le prix d'un ticket est de 0.01 ETH.";
        } else if (err.message.includes("La loterie n'est pas active") || err.message.includes("La loterie est terminee")) {
          errorMessage = "La loterie n'est pas active ou est terminée.";
        } else if (err.message.includes("insufficient funds") || err.message.includes("Insufficient funds")) {
          errorMessage = "Fonds insuffisants. Vérifiez votre balance dans MetaMask.";
        } else if (err.message.includes("user rejected") || err.message.includes("User rejected")) {
          errorMessage = "Transaction annulée par l'utilisateur.";
        } else if (err.message.includes("Internal JSON-RPC error") || err.code === "UNKNOWN_ERROR" || err.error?.code === -32603) {
          // Erreur RPC interne - souvent causée par un cache de bloc obsolète dans MetaMask
          console.error("❌ Erreur RPC interne détectée. Probablement un problème de synchronisation MetaMask.");
          errorMessage = "Erreur de synchronisation avec MetaMask. Veuillez rafraîchir la page et réessayer.";
          
          // Essayer de forcer une resynchronisation complète
          if (typeof window !== "undefined" && window.ethereum && signer) {
            try {
              const address = await signer.getAddress();
              console.log("🔄 Tentative de resynchronisation complète MetaMask...");
              
              // Forcer MetaMask à obtenir le vrai blockNumber (plusieurs fois)
              for (let i = 0; i < 5; i++) {
                await window.ethereum.request({ method: "eth_blockNumber" });
                await new Promise(resolve => setTimeout(resolve, 200));
              }
              
              // Demander la balance avec "latest"
              await window.ethereum.request({ 
                method: "eth_getBalance", 
                params: [address, "latest"] 
              });
              
              // Forcer la reconnaissance du compte
              await window.ethereum.request({ method: "eth_requestAccounts" });
              
              console.log("✅ Resynchronisation MetaMask terminée");
            } catch (syncErr: any) {
              console.warn("⚠️ Erreur lors de la resynchronisation:", syncErr);
            }
          }
        } else if (err.message.includes("invalid block tag") || err.message?.includes("block number")) {
          // Gérer l'erreur de bloc invalide
          console.error("❌ Erreur de bloc invalide détectée. Resynchronisation MetaMask...");
          
          if (typeof window !== "undefined" && window.ethereum && signer) {
            try {
              const address = await signer.getAddress();
              // Forcer une resynchronisation complète
              await window.ethereum.request({ method: "eth_blockNumber" });
              await window.ethereum.request({ 
                method: "eth_getBalance", 
                params: [address, "latest"] 
              });
              await window.ethereum.request({ method: "eth_requestAccounts" });
              
              // Attendre un peu avant de réessayer
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              console.log("🔄 Nouvelle tentative après resynchronisation...");
              const contractWithSigner = getContract(signer, contract.target as string);
              const tx = await contractWithSigner.buyTicket({ value: ticketPriceWei });
              await tx.wait();
              await refreshInfo();
              
              // Synchroniser MetaMask après le succès
              if (typeof window !== "undefined" && window.ethereum && signer) {
                try {
                  const address = await signer.getAddress();
                  await syncMetaMaskForAddress(address, "compte actuel");
                } catch (syncErr: any) {
                  console.warn("⚠️ Erreur lors de la synchronisation MetaMask:", syncErr);
                }
              }
              return; // Succès, sortir de la fonction
            } catch (retryErr: any) {
              errorMessage = `Erreur de synchronisation avec le réseau. Veuillez:\n1. Vérifier que Hardhat node est lancé (npm run node)\n2. Rafraîchir la page\n3. Réessayer l'achat\n\nErreur: ${retryErr.message || retryErr.reason || "Erreur inconnue"}`;
            }
          } else {
            errorMessage = "Erreur de synchronisation avec le réseau. Veuillez rafraîchir la page et réessayer.";
          }
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contract, isConnected, signer, ticketPriceWei, refreshInfo]);

  // Acheter plusieurs tickets
  const buyTickets = useCallback(async (quantity: number) => {
    if (!contract || !isConnected || !signer) {
      setError("Veuillez vous connecter à votre wallet");
      return;
    }

    if (quantity < 1 || quantity > 25) {
      setError("Le nombre de tickets doit être entre 1 et 25");
      return;
    }

    // Stocker totalPriceWei pour l'utiliser dans le catch si nécessaire
    let storedTotalPriceWei: bigint | undefined;

    try {
      setLoading(true);
      setError(null);

      // Pour les transactions, créer un nouveau contrat avec le signer
      const contractWithSigner = getContract(signer, contract.target as string);
      
      // Calculer le prix avec les réductions
      // Utiliser la fonction calculatePrice qui gère déjà les fallbacks
      const priceInfo = await calculatePrice(quantity);
      const totalPriceWei = priceInfo.totalPriceWei;
      
      // Stocker pour utilisation dans le catch
      storedTotalPriceWei = totalPriceWei;
      
      if (hasCalculatePrice === true) {
        console.log(`💰 Prix calculé par le contrat: ${ethers.formatEther(totalPriceWei)} ETH - Réduction: ${priceInfo.discount}%`);
      } else {
        console.log(`💰 Prix calculé côté client: ${ethers.formatEther(totalPriceWei)} ETH - Réduction: ${priceInfo.discount}%`);
      }

      console.log(`🛒 Achat de ${quantity} tickets pour ${ethers.formatEther(totalPriceWei)} ETH`);

      // Essayer d'utiliser buyTickets
      let transactionHash: string | undefined;
      try {
        // Forcer MetaMask à se synchroniser AVANT la transaction pour éviter les erreurs de bloc invalide
        // C'est CRITIQUE : MetaMask peut avoir un cache d'un ancien numéro de bloc
        if (typeof window !== "undefined" && window.ethereum) {
          try {
            console.log("🔄 Synchronisation MetaMask avant transaction...");
            
            // 1. Forcer MetaMask à obtenir le vrai blockNumber actuel (plusieurs fois pour nettoyer le cache)
            for (let i = 0; i < 3; i++) {
              const blockNumber = await window.ethereum.request({ method: "eth_blockNumber" });
              const blockNum = parseInt(blockNumber, 16);
              console.log(`📦 BlockNumber actuel (tentative ${i + 1}/3): ${blockNum}`);
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // 2. Demander la balance avec "latest" pour forcer la synchronisation
            const address = await signer.getAddress();
            await window.ethereum.request({ 
              method: "eth_getBalance", 
              params: [address, "latest"] 
            });
            
            // 3. Demander le transactionCount pour forcer le rafraîchissement
            await window.ethereum.request({
              method: "eth_getTransactionCount",
              params: [address, "latest"]
            });
            
            // 4. Forcer MetaMask à reconnaître le compte actif
            await window.ethereum.request({ method: "eth_requestAccounts" });
            
            console.log("✅ MetaMask synchronisé avant transaction");
          } catch (e) {
            console.warn("⚠️ Erreur lors de la synchronisation avant transaction:", e);
            // Continuer quand même, mais on va gérer l'erreur si elle se produit
          }
        }
        
        const tx = await contractWithSigner.buyTickets(quantity, { value: totalPriceWei });
        transactionHash = tx.hash;
        console.log("✅ Transaction envoyée (buyTickets):", transactionHash);
        await tx.wait();
        console.log("✅ Transaction confirmée !");
      } catch (err: any) {
        console.error("Erreur lors de l'appel de buyTickets:", err);
        
        // Vérifier si l'erreur indique que la fonction n'existe pas
        const isFunctionNotFound = 
          err.message?.includes("unrecognized-selector") || 
          err.message?.includes("could not decode") ||
          err.code === "BAD_DATA";
        
        // Vérifier si c'est une erreur de montant incorrect
        const isAmountIncorrect = 
          err.message?.includes("Montant incorrect") || 
          err.reason?.includes("Montant incorrect") ||
          err.data?.includes("Montant incorrect");
        
        if (isFunctionNotFound) {
          // buyTickets n'existe pas dans le contrat déployé
          console.warn("⚠️ buyTickets non disponible dans le contrat déployé. Utilisation de buyTicket en boucle...");
          
          // Afficher un message d'alerte à l'utilisateur
          if (quantity > 1) {
            alert(`⚠️ Le contrat déployé n'a pas la fonction buyTickets.\n\nLes ${quantity} tickets seront achetés un par un (${quantity} transactions).\n\n💡 Pour acheter en une seule transaction et utiliser les packs VIP, redéployez le contrat avec:\n\nnpm run deploy\n\nPuis mettez à jour l'adresse du contrat dans l'interface.`);
          }
          
          // Utiliser buyTicket en boucle (sans limite)
          const ticketPriceWei = ethers.parseEther(ticketPrice);
          console.log(`Achat de ${quantity} tickets un par un...`);
          
          for (let i = 0; i < quantity; i++) {
            const tx = await contractWithSigner.buyTicket({ value: ticketPriceWei });
            await tx.wait();
            console.log(`✅ Ticket ${i + 1}/${quantity} acheté`);
          }
          console.log(`✅ Tous les ${quantity} tickets ont été achetés !`);
        } else if (isAmountIncorrect) {
          // Le montant ne correspond pas - réessayer avec le calcul du contrat
          console.error("❌ Montant incorrect ! Le calcul côté client ne correspond pas au contrat.");
          console.error("Tentative de recalcul avec le contrat...");
          
          try {
            // Recalculer avec la fonction calculatePrice qui gère les fallbacks
            const correctPriceInfo = await calculatePrice(quantity);
            const correctPriceWei = correctPriceInfo.totalPriceWei;
            
            console.log(`💰 Prix correct: ${ethers.formatEther(correctPriceWei)} ETH`);
            console.log(`💰 Prix envoyé: ${ethers.formatEther(totalPriceWei)} ETH`);
            
            // Forcer MetaMask à se synchroniser avant la nouvelle tentative
            if (typeof window !== "undefined" && window.ethereum) {
              try {
                await window.ethereum.request({ method: "eth_blockNumber" });
              } catch (e) {
                console.warn("Erreur lors de la synchronisation avant retry:", e);
              }
            }
            
            // Réessayer avec le bon montant
            const tx = await contractWithSigner.buyTickets(quantity, { value: correctPriceWei });
            console.log("✅ Transaction envoyée (buyTickets) avec le montant corrigé:", tx.hash);
            await tx.wait();
            console.log("✅ Transaction confirmée !");
          } catch (retryErr: any) {
            const errorMsg = `Erreur: Montant incorrect. Le contrat attend un montant différent de celui envoyé (${ethers.formatEther(totalPriceWei)} ETH).\n\nVérifiez que le contrat est bien déployé avec les nouvelles fonctionnalités.`;
            setError(errorMsg);
            throw new Error(errorMsg);
          }
        } else if (err.message?.includes("invalid block tag") || err.message?.includes("block number")) {
          // Erreur de bloc invalide - forcer MetaMask à se resynchroniser et réessayer
          console.error("❌ Erreur de bloc invalide détectée. Resynchronisation MetaMask...");
          
          if (typeof window !== "undefined" && window.ethereum && signer) {
            try {
              const address = await signer.getAddress();
              // Forcer une resynchronisation complète
              await window.ethereum.request({ method: "eth_blockNumber" });
              await window.ethereum.request({ 
                method: "eth_getBalance", 
                params: [address, "latest"] 
              });
              await window.ethereum.request({ method: "eth_requestAccounts" });
              
              // Attendre un peu avant de réessayer
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              console.log("🔄 Nouvelle tentative après resynchronisation...");
              const tx = await contractWithSigner.buyTickets(quantity, { value: totalPriceWei });
              console.log("✅ Transaction envoyée (buyTickets) après resynchronisation:", tx.hash);
              await tx.wait();
              console.log("✅ Transaction confirmée !");
            } catch (retryErr: any) {
              const errorMsg = `Erreur de synchronisation avec le réseau. Veuillez:\n1. Vérifier que Hardhat node est lancé (npm run node)\n2. Rafraîchir la page\n3. Réessayer l'achat\n\nErreur: ${retryErr.message || retryErr.reason || "Erreur inconnue"}`;
              setError(errorMsg);
              throw new Error(errorMsg);
            }
          } else {
            throw err;
          }
        } else {
          // Autre erreur, la propager
          throw err;
        }
      }

      // Rafraîchir les informations après l'achat
      await refreshInfo();

      // Forcer MetaMask à synchroniser l'historique des transactions IMMÉDIATEMENT après confirmation
      // C'est crucial : MetaMask ne met à jour l'historique que si on le fait pendant que le compte est actif
      if (typeof window !== "undefined" && window.ethereum && signer && transactionHash) {
        try {
          const address = await signer.getAddress();
          console.log(`🔄 Synchronisation IMMÉDIATE MetaMask avec la transaction ${transactionHash}...`);
          
          // CRITIQUE : Forcer MetaMask à reconnaître que c'est le compte actif qui a fait la transaction
          try {
            // 1. S'assurer que le compte est bien actif
            const accounts = await window.ethereum.request({ method: "eth_accounts" });
            if (accounts.length > 0 && accounts[0].toLowerCase() === address.toLowerCase()) {
              // 2. Forcer MetaMask à rafraîchir en demandant les comptes
              await window.ethereum.request({ method: "eth_requestAccounts" });
              
              // 3. Charger la transaction IMMÉDIATEMENT (sans délai) pour que MetaMask l'enregistre
              await window.ethereum.request({
                method: "eth_getTransactionByHash",
                params: [transactionHash]
              });
              
              // 4. Charger le receipt IMMÉDIATEMENT
              await window.ethereum.request({
                method: "eth_getTransactionReceipt",
                params: [transactionHash]
              });
              
              console.log(`✅ Transaction ${transactionHash} chargée IMMÉDIATEMENT dans MetaMask pour le compte actif`);
            }
          } catch (immediateErr: any) {
            console.warn("Erreur lors du chargement immédiat:", immediateErr);
          }
          
          // Attendre un peu pour que MetaMask traite
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Vérifier que la transaction existe bien dans le réseau
          try {
            const tx = await window.ethereum.request({
              method: "eth_getTransactionByHash",
              params: [transactionHash]
            });
            console.log("✅ Transaction trouvée dans le réseau:", tx);
            
            // Obtenir le bloc de la transaction
            if (tx && tx.blockNumber) {
              const blockNum = parseInt(tx.blockNumber, 16);
              console.log(`📦 Transaction dans le bloc ${blockNum}`);
              
              // Forcer MetaMask à scanner ce bloc spécifique
              await window.ethereum.request({
                method: "eth_getBlockByNumber",
                params: [tx.blockNumber, true] // true = avec les transactions complètes
              });
            }
          } catch (txErr: any) {
            console.warn("Erreur lors de la vérification de la transaction:", txErr);
          }
          
          // Synchronisation complète avec scan des blocs
          await syncMetaMaskForAddress(address, "compte actuel", transactionHash);
          
          // Attendre un peu et forcer à nouveau le rafraîchissement
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Forcer MetaMask à rafraîchir l'historique en demandant plusieurs fois la balance et la transaction
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 300));
            try {
              // Recharger la transaction à chaque fois pour forcer MetaMask à l'enregistrer
              await window.ethereum.request({
                method: "eth_getTransactionByHash",
                params: [transactionHash]
              });
              
              const balance = await window.ethereum.request({
                method: "eth_getBalance",
                params: [address, "latest"]
              });
              console.log(`💰 Balance vérifiée (tentative ${i + 1}/5): ${ethers.formatEther(balance)} ETH`);
            } catch (e) {
              // Ignorer les erreurs
            }
          }
          
          console.log("✅ Synchronisation complète terminée - La transaction devrait apparaître dans l'historique MetaMask");
        } catch (syncErr: any) {
          console.warn("⚠️ Erreur lors de la synchronisation MetaMask:", syncErr);
        }
      } else if (typeof window !== "undefined" && window.ethereum && signer) {
        // Fallback si on n'a pas le hash de la transaction
        try {
          const address = await signer.getAddress();
          await syncMetaMaskForAddress(address, "compte actuel");
        } catch (syncErr: any) {
          console.warn("⚠️ Erreur lors de la synchronisation MetaMask:", syncErr);
        }
      }
    } catch (err: any) {
      console.error("Erreur lors de l'achat des tickets:", err);
      console.error("Détails de l'erreur:", {
        message: err.message,
        reason: err.reason,
        code: err.code,
        data: err.data,
        error: err.error
      });
      
      // Gérer les différents types d'erreurs
      let errorMessage = "Erreur lors de l'achat des tickets";
      
      if (err.reason) {
        // Erreur du contrat (revert reason)
        errorMessage = err.reason;
      } else if (err.message) {
        // Analyser le message d'erreur pour donner des informations plus claires
        if (err.message.includes("Montant incorrect")) {
          errorMessage = `Montant incorrect. Vérifiez le prix calculé (${storedTotalPriceWei ? ethers.formatEther(storedTotalPriceWei) : "N/A"} ETH pour ${quantity} tickets).`;
        } else if (err.message.includes("La loterie n'est pas active") || err.message.includes("La loterie est terminee")) {
          errorMessage = "La loterie n'est pas active ou est terminée.";
        } else if (err.message.includes("insufficient funds") || err.message.includes("Insufficient funds")) {
          errorMessage = "Fonds insuffisants. Vérifiez votre balance dans MetaMask.";
        } else if (err.message.includes("user rejected") || err.message.includes("User rejected")) {
          errorMessage = "Transaction annulée par l'utilisateur.";
        } else if (err.message.includes("Internal JSON-RPC error") || err.code === "UNKNOWN_ERROR" || err.error?.code === -32603) {
          // Erreur RPC interne - souvent causée par un cache de bloc obsolète dans MetaMask
          console.error("❌ Erreur RPC interne détectée. Probablement un problème de synchronisation MetaMask.");
          errorMessage = "Erreur de synchronisation avec MetaMask. Veuillez rafraîchir la page et réessayer.";
          
          // Essayer de forcer une resynchronisation complète
          if (typeof window !== "undefined" && window.ethereum && signer) {
            try {
              const address = await signer.getAddress();
              console.log("🔄 Tentative de resynchronisation complète MetaMask...");
              
              // Forcer MetaMask à obtenir le vrai blockNumber (plusieurs fois)
              for (let i = 0; i < 5; i++) {
                await window.ethereum.request({ method: "eth_blockNumber" });
                await new Promise(resolve => setTimeout(resolve, 200));
              }
              
              // Demander la balance avec "latest"
              await window.ethereum.request({ 
                method: "eth_getBalance", 
                params: [address, "latest"] 
              });
              
              // Forcer la reconnaissance du compte
              await window.ethereum.request({ method: "eth_requestAccounts" });
              
              console.log("✅ Resynchronisation MetaMask terminée");
            } catch (syncErr: any) {
              console.warn("⚠️ Erreur lors de la resynchronisation:", syncErr);
            }
          }
        } else if (err.message.includes("Nombre de tickets invalide")) {
          errorMessage = "Le nombre de tickets doit être entre 1 et 25.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contract, isConnected, signer, calculatePrice, refreshInfo]);

  // Synchroniser MetaMask quand l'adresse change
  useEffect(() => {
    if (isConnected && account && account !== lastSyncedAccount && typeof window !== "undefined" && window.ethereum) {
      console.log(`🔄 Nouvelle adresse détectée: ${account}, synchronisation MetaMask...`);
      syncMetaMaskForAddress(account, "nouvelle adresse").then(() => {
        setLastSyncedAccount(account);
        console.log(`✅ Synchronisation terminée pour ${account}`);
      }).catch((err) => {
        console.warn("Erreur lors de la synchronisation pour la nouvelle adresse:", err);
      });
    }
  }, [account, isConnected, lastSyncedAccount]);

  // Charger les informations au montage et écouter les événements
  useEffect(() => {
    if (!contract) return;

    // Charger les informations initiales
    refreshInfo();

    // Écouter les événements
      const onTicketPurchased = () => {
        refreshInfo();
      };

      const onTicketsBought = () => {
        refreshInfo();
      };

      const onWinnerSelected = async (winner: string, prize: bigint) => {
        // Stocker le montant du prix dès qu'il est sélectionné
        const prizeAmountStr = ethers.formatEther(prize);
        setPrizeAmount(prizeAmountStr);
        refreshInfo();
        
        console.log(`🎉 Gagnant sélectionné: ${winner} - Prix: ${prizeAmountStr} ETH`);
        
        // Attendre que la transaction interne soit confirmée (le transfert se fait dans le même bloc)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Vérifier si le compte actuel est le gagnant
        if (typeof window !== "undefined" && window.ethereum) {
          try {
            const accounts = await window.ethereum.request({ method: "eth_accounts" });
            if (accounts.length > 0) {
              const currentAccount = accounts[0].toLowerCase();
              const isCurrentUserWinner = winner.toLowerCase() === currentAccount;
              
              if (isCurrentUserWinner) {
                console.log("🎊 Vous êtes le gagnant ! Synchronisation MetaMask...");
                
                // Forcer MetaMask à vérifier les transactions récentes
                // Les transferts internes ne sont pas toujours détectés automatiquement
                try {
                  // 1. Obtenir le numéro de bloc actuel
                  const blockNumber = await window.ethereum.request({ method: "eth_blockNumber" });
                  const blockNum = parseInt(blockNumber, 16);
                  
                  // 2. Demander les logs d'événements pour forcer MetaMask à scanner
                  await window.ethereum.request({
                    method: "eth_getLogs",
                    params: [{
                      fromBlock: `0x${(blockNum - 5).toString(16)}`, // 5 blocs en arrière
                      toBlock: "latest",
                      address: contract.target, // Adresse du contrat
                      topics: [] // Tous les événements
                    }]
                  });
                  
                  // 3. Forcer la synchronisation complète
                  await syncMetaMaskForAddress(winner, "votre compte (gagnant)");
                  
                  // 4. Attendre un peu et vérifier la balance
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  const balance = await window.ethereum.request({
                    method: "eth_getBalance",
                    params: [winner, "latest"]
                  });
                  
                  console.log(`✅ Balance du gagnant: ${ethers.formatEther(BigInt(balance))} ETH`);
                  
                  // 5. Afficher une notification à l'utilisateur
                  alert(`🎉 Félicitations ! Vous avez gagné ${prizeAmountStr} ETH !\n\nLe transfert a été effectué. Vérifiez votre balance dans MetaMask.\n\nSi la transaction n'apparaît pas dans l'historique, essayez de rafraîchir MetaMask ou de fermer/rouvrir l'extension.`);
                } catch (syncErr: any) {
                  console.warn("Erreur lors de la synchronisation pour le gagnant:", syncErr);
                  alert(`🎉 Félicitations ! Vous avez gagné ${prizeAmountStr} ETH !\n\nLe transfert a été effectué. Vérifiez votre balance dans MetaMask.`);
                }
              } else {
                // Synchroniser quand même pour l'adresse du gagnant (au cas où)
                await syncMetaMaskForAddress(winner, "gagnant");
              }
            }
          } catch (e) {
            console.warn("Erreur lors de la vérification du compte gagnant:", e);
            // Synchroniser quand même
            await syncMetaMaskForAddress(winner, "gagnant");
          }
        }
      };

      contract.on("TicketPurchased", onTicketPurchased);
      contract.on("TicketsBought", onTicketsBought);
      contract.on("WinnerSelected", onWinnerSelected);

    // Polling automatique toutes les 5 secondes pour maintenir la synchronisation
    const pollingInterval = setInterval(() => {
      if (contract) {
        refreshInfo().catch(err => console.warn("Erreur lors du polling:", err));
      }
    }, 5000);

    return () => {
      contract.off("TicketPurchased", onTicketPurchased);
      contract.off("TicketsBought", onTicketsBought);
      contract.off("WinnerSelected", onWinnerSelected);
      clearInterval(pollingInterval);
    };
  }, [contract, refreshInfo]);

  return {
    contract,
    lotteryInfo,
    ticketPrice,
    loading,
    error,
    buyTicket,
    buyTickets,
    calculatePrice,
    refreshInfo,
  };
};

