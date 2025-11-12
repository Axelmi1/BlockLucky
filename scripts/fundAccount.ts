import { ethers } from "hardhat";

async function main() {
  // Récupérer l'adresse du compte à financer depuis les arguments
  // Hardhat passe les arguments après --, donc on cherche dans process.argv
  let accountAddress = "";
  
  // Chercher l'adresse dans les arguments (après --)
  const args = process.argv.slice(2);
  const addressIndex = args.findIndex(arg => arg.startsWith("0x") && arg.length === 42);
  
  if (addressIndex !== -1) {
    accountAddress = args[addressIndex];
  } else if (process.env.ACCOUNT_ADDRESS) {
    accountAddress = process.env.ACCOUNT_ADDRESS;
  } else {
    console.error("❌ Adresse de compte manquante !");
    console.error("\nUsage:");
    console.error("  ACCOUNT_ADDRESS=0x... npm run fund");
    console.error("\nExemple:");
    console.error("  ACCOUNT_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 npm run fund");
    process.exit(1);
  }

  if (!ethers.isAddress(accountAddress)) {
    console.error("❌ Adresse invalide:", accountAddress);
    process.exit(1);
  }

  console.log("Envoi de fonds au compte:", accountAddress, "\n");

  // Récupérer le premier compte (qui a 10000 ETH par défaut dans Hardhat)
  const [deployer] = await ethers.getSigners();
  console.log("Compte déployeur:", deployer.address);
  console.log("Balance déployeur:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Vérifier la balance actuelle du compte cible
  const balanceBefore = await ethers.provider.getBalance(accountAddress);
  console.log("Balance actuelle du compte cible:", ethers.formatEther(balanceBefore), "ETH");

  // Envoyer 10 ETH au compte
  const amount = ethers.parseEther("10");
  console.log("\nEnvoi de", ethers.formatEther(amount), "ETH...");

  const tx = await deployer.sendTransaction({
    to: accountAddress,
    value: amount,
  });

  console.log("Transaction envoyée:", tx.hash);
  await tx.wait();

  const balanceAfter = await ethers.provider.getBalance(accountAddress);
  console.log("\n✅ Balance après envoi:", ethers.formatEther(balanceAfter), "ETH");
  console.log("✅ Fonds envoyés avec succès !");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

