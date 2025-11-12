import { ethers } from "hardhat";

async function main() {
  console.log("Deploiement du contrat BlockLucky...\n");

  // Nombre minimum de participants requis (peut être modifié)
  const MIN_PARTICIPANTS = 3;

  // Récupérer le compte déployeur
  const [deployer] = await ethers.getSigners();
  console.log("Deploiement avec le compte:", deployer.address);
  console.log("Balance du compte:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Déployer le contrat
  const BlockLucky = await ethers.getContractFactory("BlockLucky");
  const blockLucky = await BlockLucky.deploy(MIN_PARTICIPANTS);

  await blockLucky.waitForDeployment();

  const contractAddress = await blockLucky.getAddress();
  console.log("Contrat BlockLucky deploye a l'adresse:", contractAddress);
  console.log("Nombre minimum de participants:", MIN_PARTICIPANTS);
  console.log("Prix d'un ticket: 0.01 ETH\n");

  // Afficher les informations du contrat
  console.log("Informations du contrat:");
  console.log("- Proprietaire:", await blockLucky.owner());
  console.log("- Loterie active:", await blockLucky.lotteryActive());
  console.log("- Participants actuels:", await blockLucky.participantCount());
  console.log("- Cagnotte actuelle:", ethers.formatEther(await blockLucky.pot()), "ETH\n");

  console.log("Pour interagir avec le contrat, utilisez l'adresse suivante dans votre frontend:");
  console.log(contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

