# 🎰 BlockLucky - Loterie Blockchain

BlockLucky est une application de loterie décentralisée construite sur la blockchain Ethereum. Elle garantit la transparence, la sécurité et l'impartialité grâce à l'utilisation de smart contracts.

## 📋 Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Technologies utilisées](#technologies-utilisées)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Déploiement](#déploiement)
- [Utilisation](#utilisation)
- [Comptes de test](#comptes-de-test)
- [Structure du projet](#structure-du-projet)
- [Tests](#tests)
- [Sécurité](#sécurité)

## ✨ Fonctionnalités

- **Achat de tickets** : Les participants peuvent acheter des tickets avec des ethers fictifs
- **Tirage automatique** : Le tirage au sort se déclenche automatiquement lorsque le nombre minimum de participants est atteint
- **Transparence totale** : Toutes les transactions sont enregistrées sur la blockchain et visibles par tous
- **Interface moderne** : Interface React intuitive et responsive
- **Sécurité** : Protection contre les attaques de reentrancy et validation des montants

## 🛠 Technologies utilisées

### Backend
- **Solidity** ^0.8.24 : Langage de programmation pour les smart contracts
- **Hardhat** : Framework de développement Ethereum
- **TypeScript** : Typage statique pour JavaScript
- **Ethers.js** : Bibliothèque pour interagir avec Ethereum

### Frontend
- **React** : Bibliothèque JavaScript pour l'interface utilisateur
- **TypeScript** : Typage statique
- **Ethers.js** : Intégration Web3

### Tests
- **Chai** : Bibliothèque d'assertions
- **Mocha** : Framework de tests (via Hardhat)

## 📦 Prérequis

- Node.js (version 18 ou supérieure)
- npm ou yarn
- MetaMask (pour l'interaction avec le frontend)
- Git

## ⚠️ IMPORTANT : Redéploiement nécessaire pour les packs VIP

Si vous avez déjà déployé le contrat avant d'ajouter les fonctionnalités de packs VIP, vous devez **redéployer le contrat** pour utiliser :
- L'achat de plusieurs tickets en une transaction (`buyTickets`)
- Les packs VIP avec réductions (15, 20, 25 tickets)
- Le calcul automatique des prix avec réductions

**Pour redéployer :**
```bash
npm run deploy
```

Copiez la nouvelle adresse affichée et mettez-la à jour dans votre frontend.

## 🚀 Installation

1. **Cloner le repository**
   ```bash
   git clone <url-du-repo>
   cd BlockLucky
   ```

2. **Installer les dépendances du projet principal**
   ```bash
   npm install
   ```

3. **Installer les dépendances du frontend**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

## 🏗 Déploiement

### 1. Compiler le smart contract

```bash
npm run compile
```

### 2. Lancer le réseau local Hardhat

Dans un terminal séparé :

```bash
npm run node
```

Cela démarre un nœud Hardhat local sur `http://127.0.0.1:8545` avec 20 comptes de test pré-approvisionnés.

### 3. Déployer le contrat

Dans un nouveau terminal :

```bash
npm run deploy
```

Le script affichera l'adresse du contrat déployé. **Copiez cette adresse**, vous en aurez besoin pour le frontend.

### 4. Configurer MetaMask pour le réseau local

**📖 Guide détaillé disponible dans `METAMASK_SETUP.md`**

Résumé rapide :
1. Ouvrez MetaMask
2. Cliquez sur le réseau actuel (en haut)
3. Sélectionnez "Ajouter un réseau" > "Ajouter un réseau manuellement"
4. Remplissez les informations :
   - **Nom du réseau** : Hardhat Local
   - **URL RPC** : http://127.0.0.1:8545
   - **ID de chaîne** : 1337
   - **Symbole de la devise** : ETH
   - **URL du explorateur de blocs** : (laisser vide)

5. Importer un compte de test :
   - Dans le terminal où `npm run node` est lancé, vous verrez des comptes avec leurs clés privées
   - Dans MetaMask, cliquez sur l'icône de compte > "Importer un compte"
   - Collez une clé privée d'un des comptes affichés

### 5. Financer votre compte MetaMask (optionnel mais recommandé)

Si votre compte MetaMask n'a pas assez de fonds, vous pouvez utiliser le script de financement :

```bash
ACCOUNT_ADDRESS=<ADRESSE_VOTRE_COMPTE> npm run fund
```

Par exemple :
```bash
ACCOUNT_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 npm run fund
```

Cela enverra 10 ETH au compte spécifié depuis le compte déployeur.

**Note :** Normalement, tous les comptes Hardhat ont déjà 10,000 ETH par défaut. Si MetaMask affiche 0 ETH, vérifiez que vous êtes bien sur le réseau "Hardhat Local" (Chain ID: 1337).

### 6. Lancer le frontend

```bash
cd frontend
npm start
```

L'application s'ouvrira dans votre navigateur sur `http://localhost:3000`.

### 7. Configurer l'adresse du contrat dans le frontend

1. Dans l'interface web, entrez l'adresse du contrat que vous avez copiée à l'étape 3
2. Cliquez sur "Utiliser cette adresse"

**Alternative** : Vous pouvez créer un fichier `.env` dans le dossier `frontend` :

```env
REACT_APP_CONTRACT_ADDRESS=0x...votre_adresse_ici
```

## 💻 Utilisation

1. **Connecter votre wallet**
   - Cliquez sur "Connecter Wallet" dans l'en-tête
   - Approuvez la connexion dans MetaMask

2. **Acheter un ticket**
   - Vérifiez les statistiques de la loterie (nombre de participants, cagnotte)
   - Cliquez sur "Acheter un Ticket"
   - Confirmez la transaction dans MetaMask
   - Attendez la confirmation

3. **Suivre le tirage**
   - La barre de progression indique combien de participants sont encore nécessaires
   - Lorsque le nombre minimum est atteint, le tirage se déclenche automatiquement
   - Le gagnant est sélectionné aléatoirement et reçoit la cagnotte

4. **Voir le gagnant**
   - Une fois le tirage terminé, le gagnant est affiché avec une animation
   - La cagnotte gagnée est également affichée

## 👥 Comptes de test

Pour tester avec plusieurs participants, vous pouvez utiliser les comptes de test Hardhat. Voir le fichier **[ACCOUNTS.md](./ACCOUNTS.md)** pour la liste complète des comptes et comment les importer dans MetaMask.

**Comptes rapides pour tester :**
- **Account #0** : `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Account #1** : `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Account #2** : `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`

Tous ces comptes ont 10,000 ETH et leurs clés privées sont affichées dans le terminal où `npm run node` est lancé.

## 📁 Structure du projet

```
BlockLucky/
├── contracts/
│   └── BlockLucky.sol          # Smart contract principal
├── scripts/
│   └── deploy.ts               # Script de déploiement
├── test/
│   └── BlockLucky.test.ts     # Tests du smart contract
├── frontend/
│   ├── src/
│   │   ├── components/        # Composants React
│   │   │   ├── LotteryStats.tsx
│   │   │   ├── BuyTicket.tsx
│   │   │   ├── WinnerDisplay.tsx
│   │   │   └── LotteryInterface.tsx
│   │   ├── hooks/             # Hooks personnalisés
│   │   │   ├── useWeb3.ts
│   │   │   └── useBlockLucky.ts
│   │   ├── utils/             # Utilitaires
│   │   │   └── contract.ts
│   │   ├── App.tsx            # Composant principal
│   │   └── index.tsx
│   └── package.json
├── hardhat.config.ts          # Configuration Hardhat
├── tsconfig.json              # Configuration TypeScript
└── package.json
```

## 🧪 Tests

Exécuter les tests du smart contract :

```bash
npm test
```

Les tests couvrent :
- Déploiement du contrat
- Achat de tickets
- Déclenchement automatique du tirage
- Distribution de la cagnotte
- Gestion des erreurs
- Fonctions de lecture
- Réinitialisation de la loterie

## 🔒 Sécurité

Le smart contract implémente plusieurs mesures de sécurité :

- **Protection contre la reentrancy** : Utilisation de `call` avec vérification du succès
- **Validation des montants** : Vérification que le montant envoyé correspond exactement au prix du ticket
- **Gestion des états** : Vérification que la loterie est active avant d'autoriser les achats
- **Randomness** : Génération pseudo-aléatoire basée sur plusieurs facteurs de la blockchain
- **Modificateurs** : Restriction d'accès aux fonctions sensibles (owner only)

## 📝 Scripts disponibles

- `npm run compile` : Compile les smart contracts
- `npm test` : Lance les tests
- `npm run deploy` : Déploie le contrat sur le réseau local
- `npm run node` : Lance un nœud Hardhat local
- `npm run clean` : Nettoie les fichiers de build

## 🎯 Objectifs du projet

Ce projet a été développé pour :

1. **Comprendre les smart contracts** : Apprendre à développer et déployer des contrats Solidity
2. **Utiliser les outils blockchain** : Maîtriser Hardhat, Ethers.js et les outils de développement
3. **Mettre en pratique les concepts** : Appliquer la théorie blockchain dans un projet concret
4. **Garantir la transparence** : Démontrer comment la blockchain assure la confiance dans un système de loterie

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## ⚠️ Historique MetaMask sur Réseaux Locaux

**Limitation connue :** MetaMask ne suit pas automatiquement toutes les transactions sur les réseaux locaux. C'est une limitation architecturale de MetaMask.

**Solution implémentée :** Un explorateur de blocs local intégré dans l'interface. Il :
- ✅ Lit directement depuis la blockchain Hardhat
- ✅ Fonctionne pour toutes les adresses
- ✅ Se met à jour automatiquement toutes les 5 secondes
- ✅ Affiche toutes les transactions (envoyées et reçues)
- ✅ Affiche les détails complets : gas, statut, contrats créés, etc.
- ✅ Bouton pour copier les hash de transactions

**Où le trouver :** L'historique s'affiche automatiquement en bas de la page quand vous êtes connecté.

**Alternative :** Consultez les logs du terminal où `npm run node` est lancé pour voir toutes les transactions avec leurs détails complets.

Pour plus de détails, consultez :
- [METAMASK_HISTORY_LIMITATION.md](./METAMASK_HISTORY_LIMITATION.md) - Explication de la limitation
- [LOCAL_EXPLORER.md](./LOCAL_EXPLORER.md) - Guide complet de l'explorateur local

## 📄 Licence

Ce projet est sous licence ISC.

## 🙏 Remerciements

Développé pour la ville d'EtherBay dans le cadre d'un projet éducatif sur la blockchain.

---

**Note importante** : Ce projet utilise des ethers fictifs sur un réseau local. Aucun vrai ETH n'est utilisé.
