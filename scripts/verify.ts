import { ethers } from "hardhat";

async function main() {
  const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  console.log("Verification du contrat à l'adresse:", CONTRACT_ADDRESS, "\n");
  
  // Vérifier le code du contrat
  const code = await ethers.provider.getCode(CONTRACT_ADDRESS);
  console.log("Code du contrat:", code === "0x" ? "AUCUN (contrat n'existe pas)" : "PRESENT");
  
  if (code === "0x") {
    console.log("\n❌ Le contrat n'existe pas à cette adresse.");
    console.log("💡 Redéployez le contrat avec: npm run deploy");
    return;
  }
  
  // Essayer d'appeler une méthode du contrat
  try {
    const BlockLucky = await ethers.getContractFactory("BlockLucky");
    const contract = BlockLucky.attach(CONTRACT_ADDRESS);
    
    const owner = await contract.owner();
    const minParticipants = await contract.minParticipants();
    const participantCount = await contract.participantCount();
    
    console.log("\n✅ Contrat trouvé et fonctionnel !");
    console.log("- Proprietaire:", owner);
    console.log("- Participants minimum:", minParticipants.toString());
    console.log("- Participants actuels:", participantCount.toString());
  } catch (error: any) {
    console.log("\n❌ Erreur lors de l'appel du contrat:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

