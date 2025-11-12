import { ethers } from "hardhat";

async function main() {
  const accountAddress = process.env.ACCOUNT_ADDRESS || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  
  if (!ethers.isAddress(accountAddress)) {
    console.error("❌ Adresse invalide:", accountAddress);
    process.exit(1);
  }

  console.log("Vérification de la balance du compte:", accountAddress, "\n");

  const balance = await ethers.provider.getBalance(accountAddress);
  const balanceInEth = ethers.formatEther(balance);
  
  console.log("✅ Balance actuelle:", balanceInEth, "ETH");
  console.log("Balance en Wei:", balance.toString());
  
  if (balance === 0n) {
    console.log("\n⚠️  Le compte a 0 ETH. Utilisez le script de financement :");
    console.log(`   ACCOUNT_ADDRESS=${accountAddress} npm run fund`);
  } else {
    console.log("\n✅ Le compte a des fonds !");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

