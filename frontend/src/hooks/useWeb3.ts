import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

interface Web3State {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export const useWeb3 = (): Web3State => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        // Vérifier le réseau actuel
        let provider = new ethers.BrowserProvider(window.ethereum);
        let network = await provider.getNetwork();
        const hardhatChainId = BigInt(1337);

        // Si on n'est pas sur Hardhat Local, basculer
        if (network.chainId !== hardhatChainId) {
          try {
            // Essayer de basculer vers le réseau Hardhat Local
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0x539" }], // 1337 en hexadécimal
            });
          } catch (switchError: any) {
            // Si le réseau n'existe pas, l'ajouter
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: "0x539",
                    chainName: "Hardhat Local",
                    nativeCurrency: {
                      name: "Ether",
                      symbol: "ETH",
                      decimals: 18,
                    },
                    rpcUrls: ["http://127.0.0.1:8545"],
                  },
                ],
              });
            } else {
              throw switchError;
            }
          }
          
          // Attendre un peu pour que le changement de réseau soit pris en compte
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Recréer le provider après le changement de réseau
          provider = new ethers.BrowserProvider(window.ethereum);
        }

        // Demander l'accès au compte
        await window.ethereum.request({ method: "eth_requestAccounts" });
        
        // Vérifier à nouveau le réseau après la connexion
        network = await provider.getNetwork();
        if (network.chainId !== hardhatChainId) {
          throw new Error("Veuillez basculer vers le réseau Hardhat Local dans MetaMask");
        }
        
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        setProvider(provider);
        setSigner(signer);
        setAccount(address);
        setChainId(Number(network.chainId));
        setIsConnected(true);

        // Forcer MetaMask à rafraîchir la balance et synchroniser l'historique pour cette adresse
        // Cela évite les problèmes de cache avec d'anciens numéros de blocs
        try {
          console.log(`🔄 Synchronisation MetaMask pour l'adresse ${address}...`);
          
          // Forcer la synchronisation en demandant le blockNumber d'abord
          await provider.getBlockNumber();
          
          // Puis demander la balance avec "latest" explicitement
          const balance = await provider.getBalance(address, "latest");
          console.log("Balance synchronisée:", ethers.formatEther(balance), "ETH");
          
          // Forcer MetaMask à rafraîchir en envoyant plusieurs requêtes de synchronisation
          if (window.ethereum) {
            // 1. Demander la balance
            await window.ethereum.request({ 
              method: "eth_getBalance",
              params: [address, "latest"]
            });
            
            // 2. Demander le nombre de transactions pour forcer le rafraîchissement
            try {
              await window.ethereum.request({
                method: "eth_getTransactionCount",
                params: [address, "latest"]
              });
            } catch (e) {
              // Ignorer si cette méthode n'est pas disponible
            }
            
            // 3. Scanner les blocs récents pour trouver et charger toutes les transactions de cette adresse
            try {
              const blockNumber = await window.ethereum.request({ method: "eth_blockNumber" });
              const blockNum = parseInt(blockNumber, 16);
              const transactionsFound: string[] = [];
              
              console.log(`🔍 Scan des ${Math.min(100, blockNum + 1)} derniers blocs pour ${address}...`);
              
              // Scanner les 100 derniers blocs pour trouver toutes les transactions
              for (let i = 0; i < 100 && i <= blockNum; i++) {
                try {
                  const blockNumToCheck = blockNum - i;
                  const blockHex = `0x${blockNumToCheck.toString(16)}`;
                  
                  const block = await window.ethereum.request({
                    method: "eth_getBlockByNumber",
                    params: [blockHex, true] // true = inclure les transactions complètes
                  });
                  
                  if (block && block.transactions) {
                    for (const tx of block.transactions) {
                      // Transactions envoyées
                      if (tx.from && tx.from.toLowerCase() === address.toLowerCase()) {
                        if (!transactionsFound.includes(tx.hash)) {
                          transactionsFound.push(tx.hash);
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
                            // Ignorer
                          }
                        }
                      }
                      
                      // Transactions reçues
                      if (tx.to && tx.to.toLowerCase() === address.toLowerCase() && tx.value && tx.value !== "0x0") {
                        if (!transactionsFound.includes(tx.hash)) {
                          transactionsFound.push(tx.hash);
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
                            // Ignorer
                          }
                        }
                      }
                    }
                  }
                } catch (e) {
                  // Ignorer les erreurs pour les blocs individuels
                }
              }
              
              console.log(`✅ ${transactionsFound.length} transaction(s) trouvée(s) et chargée(s) pour ${address}`);
            } catch (e) {
              console.warn("Erreur lors du scan des blocs:", e);
            }
            
            console.log(`✅ MetaMask synchronisé pour ${address}`);
          }
        } catch (err) {
          console.warn("Erreur lors de la synchronisation de la balance:", err);
        }

        // Écouter les changements de compte
        window.ethereum.on("accountsChanged", async (accounts: string[]) => {
          if (accounts.length === 0) {
            disconnect();
          } else {
            const newAccount = accounts[0];
            setAccount(newAccount);
            
            // Forcer MetaMask à synchroniser pour la nouvelle adresse avec un scan complet
            if (window.ethereum) {
              try {
                console.log(`🔄 Changement d'adresse détecté, synchronisation complète MetaMask pour ${newAccount}...`);
                
                // 1. Forcer MetaMask à rafraîchir en demandant le blockNumber
                await window.ethereum.request({ method: "eth_blockNumber" });
                
                // 2. Demander la balance avec "latest" explicitement
                await window.ethereum.request({
                  method: "eth_getBalance",
                  params: [newAccount, "latest"]
                });
                
                // 3. Demander le nombre de transactions pour forcer le rafraîchissement
                try {
                  await window.ethereum.request({
                    method: "eth_getTransactionCount",
                    params: [newAccount, "latest"]
                  });
                } catch (e) {
                  // Ignorer si cette méthode n'est pas disponible
                }
                
                // 4. Scanner les blocs récents pour trouver et charger toutes les transactions de cette adresse
                try {
                  const blockNumber = await window.ethereum.request({ method: "eth_blockNumber" });
                  const blockNum = parseInt(blockNumber, 16);
                  const transactionsFound: string[] = [];
                  
                  console.log(`🔍 Scan des ${Math.min(100, blockNum + 1)} derniers blocs pour ${newAccount}...`);
                  
                  // Scanner les 100 derniers blocs pour trouver toutes les transactions
                  for (let i = 0; i < 100 && i <= blockNum; i++) {
                    try {
                      const blockNumToCheck = blockNum - i;
                      const blockHex = `0x${blockNumToCheck.toString(16)}`;
                      
                      const block = await window.ethereum.request({
                        method: "eth_getBlockByNumber",
                        params: [blockHex, true] // true = inclure les transactions complètes
                      });
                      
                      if (block && block.transactions) {
                        for (const tx of block.transactions) {
                          // Transactions envoyées
                          if (tx.from && tx.from.toLowerCase() === newAccount.toLowerCase()) {
                            if (!transactionsFound.includes(tx.hash)) {
                              transactionsFound.push(tx.hash);
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
                                // Ignorer
                              }
                            }
                          }
                          
                          // Transactions reçues
                          if (tx.to && tx.to.toLowerCase() === newAccount.toLowerCase() && tx.value && tx.value !== "0x0") {
                            if (!transactionsFound.includes(tx.hash)) {
                              transactionsFound.push(tx.hash);
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
                                // Ignorer
                              }
                            }
                          }
                        }
                      }
                    } catch (e) {
                      // Ignorer les erreurs pour les blocs individuels
                    }
                  }
                  
                  console.log(`✅ ${transactionsFound.length} transaction(s) trouvée(s) et chargée(s) pour ${newAccount}`);
                } catch (scanErr) {
                  console.warn("Erreur lors du scan des blocs:", scanErr);
                }
                
                console.log(`✅ MetaMask synchronisé pour la nouvelle adresse ${newAccount}`);
              } catch (syncErr: any) {
                console.warn("⚠️ Erreur lors de la synchronisation MetaMask pour la nouvelle adresse:", syncErr);
              }
            }
          }
        });

        // Écouter les changements de réseau
        window.ethereum.on("chainChanged", (chainId: string) => {
          // Si on change vers Hardhat Local, mettre à jour le chainId
          const newChainId = parseInt(chainId, 16);
          setChainId(newChainId);
          
          // Si on change vers un autre réseau, recharger la page
          if (newChainId !== 1337) {
            window.location.reload();
          } else if (window.ethereum) {
            // Si on revient sur Hardhat Local, recréer le provider
            const newProvider = new ethers.BrowserProvider(window.ethereum);
            newProvider.getSigner().then(signer => {
              setProvider(newProvider);
              setSigner(signer);
            }).catch(() => {
              // Si pas connecté, juste mettre à jour le provider
              setProvider(newProvider);
            });
          }
        });
      } catch (error) {
        console.error("Erreur lors de la connexion:", error);
        throw error;
      }
    } else {
      throw new Error("MetaMask n'est pas installé");
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      // Révoquer les permissions MetaMask pour forcer la sélection d'adresse à la reconnexion
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          // Révoquer les permissions d'accès aux comptes
          await window.ethereum.request({
            method: "wallet_revokePermissions",
            params: [
              {
                eth_accounts: {}
              }
            ]
          });
          console.log("✅ Permissions MetaMask révoquées - La sélection d'adresse sera demandée à la prochaine connexion");
        } catch (revokeError: any) {
          // Si wallet_revokePermissions n'est pas supporté, essayer une autre méthode
          console.warn("wallet_revokePermissions non supporté, tentative alternative...", revokeError);
          
          // Alternative : essayer de se déconnecter en vidant les comptes
          try {
            // Certaines versions de MetaMask supportent cette méthode
            await window.ethereum.request({
              method: "eth_accounts"
            });
            // Forcer MetaMask à oublier l'autorisation en ne gardant aucune trace
            console.log("⚠️ wallet_revokePermissions non disponible, déconnexion locale uniquement");
          } catch (altError) {
            console.warn("Erreur lors de la déconnexion alternative:", altError);
          }
        }
      }
    } catch (error) {
      console.warn("Erreur lors de la révocation des permissions:", error);
    } finally {
      // Toujours réinitialiser l'état local
      setProvider(null);
      setSigner(null);
      setAccount(null);
      setChainId(null);
      setIsConnected(false);
      console.log("✅ Déconnexion effectuée");
    }
  }, []);

  useEffect(() => {
    // Vérifier si déjà connecté au chargement
    if (typeof window.ethereum !== "undefined" && window.ethereum) {
      const checkConnection = async () => {
        try {
          if (!window.ethereum) return;
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            // Vérifier aussi le réseau
            const provider = new ethers.BrowserProvider(window.ethereum);
            const network = await provider.getNetwork();
            if (network.chainId === BigInt(1337)) {
              await connect();
            }
          }
        } catch (error) {
          console.error("Erreur lors de la vérification de la connexion:", error);
        }
      };
      checkConnection();

      // Écouter les événements MetaMask même si pas encore connecté
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0 && !isConnected) {
          checkConnection();
        } else if (accounts.length === 0 && isConnected) {
          disconnect();
        }
      };

      const handleChainChanged = () => {
        checkConnection();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
          window.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, [isConnected, connect, disconnect]);

  return {
    provider,
    signer,
    account,
    chainId,
    isConnected,
    connect,
    disconnect,
  };
};

// Extension de Window pour TypeScript
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

