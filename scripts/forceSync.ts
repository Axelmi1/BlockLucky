import { ethers } from "hardhat";

/**
 * Script pour forcer MetaMask à se synchroniser en envoyant une transaction
 * Cela crée un nouveau bloc et force MetaMask à se mettre à jour
 */
async function main() {
  const accountAddress = process.env.ACCOUNT_ADDRESS || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  
  if (!ethers.isAddress(accountAddress)) {
    console.error("❌ Adresse invalide:", accountAddress);
    process.exit(1);
  }

  console.log("🔄 Forçage de la synchronisation pour:", accountAddress, "\n");

  const [deployer] = await ethers.getSigners();
  
  // Vérifier la balance actuelle
  const balanceBefore = await ethers.provider.getBalance(accountAddress);
  console.log("Balance actuelle:", ethers.formatEther(balanceBefore), "ETH");

  // Envoyer une très petite transaction (0.0001 ETH) pour créer un nouveau bloc
  // Cela force MetaMask à se synchroniser avec le nouveau bloc
  const amount = ethers.parseEther("0.0001");
  console.log("\nEnvoi d'une micro-transaction pour forcer la synchronisation...");
  
  const tx = await deployer.sendTransaction({
    to: accountAddress,
    value: amount,
  });

  console.log("Transaction:", tx.hash);
  await tx.wait();
  
  const balanceAfter = await ethers.provider.getBalance(accountAddress);
  console.log("\n✅ Nouvelle balance:", ethers.formatEther(balanceAfter), "ETH");
  console.log("✅ Un nouveau bloc a été créé, MetaMask devrait maintenant se synchroniser !");
  console.log("\n💡 Dans MetaMask, attendez quelques secondes ou rafraîchissez la page.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

