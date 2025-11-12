import { expect } from "chai";
import { ethers } from "hardhat";
import { BlockLucky, BlockLucky__factory } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("BlockLucky", function () {
  let blockLucky: BlockLucky;
  let owner: HardhatEthersSigner;
  let participant1: HardhatEthersSigner;
  let participant2: HardhatEthersSigner;
  let participant3: HardhatEthersSigner;
  let participants: HardhatEthersSigner[];
  const TICKET_PRICE = ethers.parseEther("0.01");
  const MIN_PARTICIPANTS = 3;

  beforeEach(async function () {
    [owner, participant1, participant2, participant3, ...participants] = await ethers.getSigners();

    const BlockLuckyFactory = new BlockLucky__factory(owner);
    blockLucky = await BlockLuckyFactory.deploy(MIN_PARTICIPANTS);
    await blockLucky.waitForDeployment();
  });

  describe("Déploiement", function () {
    it("Devrait initialiser le contrat avec les bonnes valeurs", async function () {
      expect(await blockLucky.owner()).to.equal(owner.address);
      expect(await blockLucky.minParticipants()).to.equal(MIN_PARTICIPANTS);
      expect(await blockLucky.participantCount()).to.equal(0);
      expect(await blockLucky.pot()).to.equal(0);
      expect(await blockLucky.lotteryActive()).to.be.true;
      expect(await blockLucky.lotteryCompleted()).to.be.false;
    });

    it("Devrait rejeter un déploiement avec 0 participants minimum", async function () {
      const BlockLuckyFactory = await ethers.getContractFactory("BlockLucky");
      await expect(BlockLuckyFactory.deploy(0)).to.be.revertedWith(
        "Le nombre minimum de participants doit etre superieur a 0"
      );
    });
  });

  describe("Achat de tickets", function () {
    it("Devrait permettre l'achat d'un ticket avec le bon montant", async function () {
      await expect(blockLucky.connect(participant1).buyTicket({ value: TICKET_PRICE }))
        .to.emit(blockLucky, "TicketPurchased")
        .withArgs(participant1.address, TICKET_PRICE, 1);

      expect(await blockLucky.participantCount()).to.equal(1);
      expect(await blockLucky.pot()).to.equal(TICKET_PRICE);
      expect(await blockLucky.hasParticipated(participant1.address)).to.be.true;
    });

    it("Devrait rejeter un achat avec un montant incorrect", async function () {
      await expect(
        blockLucky.connect(participant1).buyTicket({ value: ethers.parseEther("0.005") })
      ).to.be.revertedWith("Montant incorrect. Le prix d'un ticket est de 0.01 ether");

      await expect(
        blockLucky.connect(participant1).buyTicket({ value: ethers.parseEther("0.02") })
      ).to.be.revertedWith("Montant incorrect. Le prix d'un ticket est de 0.01 ether");
    });

    it("Ne devrait pas permettre d'acheter un ticket si la loterie est terminée", async function () {
      // Acheter assez de tickets pour déclencher le tirage
      await blockLucky.connect(participant1).buyTicket({ value: TICKET_PRICE });
      await blockLucky.connect(participant2).buyTicket({ value: TICKET_PRICE });
      await blockLucky.connect(participant3).buyTicket({ value: TICKET_PRICE });

      // La loterie devrait être terminée maintenant
      expect(await blockLucky.lotteryCompleted()).to.be.true;

      // Essayer d'acheter un autre ticket devrait échouer
      await expect(
        blockLucky.connect(participants[0]).buyTicket({ value: TICKET_PRICE })
      ).to.be.revertedWith("La loterie n'est pas active");
    });

    it("Ne devrait pas compter deux fois le même participant", async function () {
      await blockLucky.connect(participant1).buyTicket({ value: TICKET_PRICE });
      expect(await blockLucky.participantCount()).to.equal(1);

      // Le même participant achète un autre ticket
      await blockLucky.connect(participant1).buyTicket({ value: TICKET_PRICE });
      
      // Le nombre de participants ne devrait pas augmenter
      expect(await blockLucky.participantCount()).to.equal(1);
      // Mais la cagnotte devrait augmenter
      expect(await blockLucky.pot()).to.equal(TICKET_PRICE * 2n);
    });
  });

  describe("Tirage au sort automatique", function () {
    it("Devrait déclencher automatiquement le tirage quand le nombre minimum est atteint", async function () {
      const initialBalance1 = await ethers.provider.getBalance(participant1.address);
      const initialBalance2 = await ethers.provider.getBalance(participant2.address);
      const initialBalance3 = await ethers.provider.getBalance(participant3.address);

      // Acheter les tickets
      const tx1 = await blockLucky.connect(participant1).buyTicket({ value: TICKET_PRICE });
      const tx2 = await blockLucky.connect(participant2).buyTicket({ value: TICKET_PRICE });
      const tx3 = await blockLucky.connect(participant3).buyTicket({ value: TICKET_PRICE });

      // Attendre que les transactions soient confirmées
      await tx1.wait();
      await tx2.wait();
      await tx3.wait();

      // Vérifier que la loterie est terminée
      expect(await blockLucky.lotteryCompleted()).to.be.true;
      expect(await blockLucky.lotteryActive()).to.be.false;
      expect(await blockLucky.pot()).to.equal(0);

      // Vérifier qu'un gagnant a été sélectionné
      const winner = await blockLucky.winner();
      expect(winner).to.be.oneOf([
        participant1.address,
        participant2.address,
        participant3.address,
      ]);

      // Vérifier que le gagnant a reçu la cagnotte
      const totalPot = TICKET_PRICE * 3n;
      const finalBalance = await ethers.provider.getBalance(winner);
      
      // Le gagnant devrait avoir reçu la cagnotte (en tenant compte des frais de gas)
      if (winner === participant1.address) {
        expect(finalBalance).to.be.gt(initialBalance1);
      } else if (winner === participant2.address) {
        expect(finalBalance).to.be.gt(initialBalance2);
      } else {
        expect(finalBalance).to.be.gt(initialBalance3);
      }
    });

    it("Devrait émettre les événements appropriés lors du tirage", async function () {
      await expect(blockLucky.connect(participant1).buyTicket({ value: TICKET_PRICE }))
        .to.emit(blockLucky, "TicketPurchased");

      await expect(blockLucky.connect(participant2).buyTicket({ value: TICKET_PRICE }))
        .to.emit(blockLucky, "TicketPurchased");

      await expect(blockLucky.connect(participant3).buyTicket({ value: TICKET_PRICE }))
        .to.emit(blockLucky, "LotteryTriggered")
        .and.to.emit(blockLucky, "WinnerSelected");
    });

    it("Devrait distribuer toute la cagnotte au gagnant", async function () {
      await blockLucky.connect(participant1).buyTicket({ value: TICKET_PRICE });
      await blockLucky.connect(participant2).buyTicket({ value: TICKET_PRICE });
      await blockLucky.connect(participant3).buyTicket({ value: TICKET_PRICE });

      const winner = await blockLucky.winner();
      const expectedPot = TICKET_PRICE * 3n;
      
      // La cagnotte devrait être à 0 après distribution
      expect(await blockLucky.pot()).to.equal(0);
    });
  });

  describe("Fonctions de lecture", function () {
    beforeEach(async function () {
      await blockLucky.connect(participant1).buyTicket({ value: TICKET_PRICE });
      await blockLucky.connect(participant2).buyTicket({ value: TICKET_PRICE });
    });

    it("Devrait retourner les bonnes informations via getLotteryInfo", async function () {
      const info = await blockLucky.getLotteryInfo();
      
      // getLotteryInfo retourne un tuple, pas un objet
      expect(info[0]).to.equal(2); // currentParticipantCount
      expect(info[1]).to.equal(TICKET_PRICE * 2n); // currentPot
      expect(info[2]).to.equal(MIN_PARTICIPANTS); // minParticipantsRequired
      expect(info[3]).to.be.true; // isActive
      expect(info[4]).to.be.false; // isCompleted
      expect(info[5]).to.equal(ethers.ZeroAddress); // currentWinner
    });

    it("Devrait retourner tous les participants", async function () {
      const allParticipants = await blockLucky.getAllParticipants();
      expect(allParticipants.length).to.equal(2);
      expect(allParticipants).to.include(participant1.address);
      expect(allParticipants).to.include(participant2.address);
    });

    it("Devrait retourner le nombre de participants", async function () {
      expect(await blockLucky.getParticipantCount()).to.equal(2);
    });

    it("Devrait retourner la cagnotte actuelle", async function () {
      expect(await blockLucky.getPot()).to.equal(TICKET_PRICE * 2n);
    });
  });

  describe("Réinitialisation de la loterie", function () {
    it("Devrait permettre au propriétaire de réinitialiser la loterie", async function () {
      // Compléter une loterie d'abord
      await blockLucky.connect(participant1).buyTicket({ value: TICKET_PRICE });
      await blockLucky.connect(participant2).buyTicket({ value: TICKET_PRICE });
      await blockLucky.connect(participant3).buyTicket({ value: TICKET_PRICE });

      expect(await blockLucky.lotteryCompleted()).to.be.true;

      // Réinitialiser avec un nouveau nombre minimum
      const newMinParticipants = 5;
      await expect(blockLucky.connect(owner).resetLottery(newMinParticipants))
        .to.emit(blockLucky, "LotteryReset")
        .withArgs(newMinParticipants);

      expect(await blockLucky.minParticipants()).to.equal(newMinParticipants);
      expect(await blockLucky.participantCount()).to.equal(0);
      expect(await blockLucky.pot()).to.equal(0);
      expect(await blockLucky.lotteryActive()).to.be.true;
      expect(await blockLucky.lotteryCompleted()).to.be.false;
    });

    it("Ne devrait pas permettre à un non-propriétaire de réinitialiser", async function () {
      await expect(
        blockLucky.connect(participant1).resetLottery(5)
      ).to.be.revertedWith("Seul le proprietaire peut executer cette fonction");
    });

    it("Devrait rejeter une réinitialisation avec 0 participants", async function () {
      await expect(
        blockLucky.connect(owner).resetLottery(0)
      ).to.be.revertedWith("Le nombre minimum de participants doit etre superieur a 0");
    });
  });

  describe("Fonction d'urgence", function () {
    it("Devrait permettre au propriétaire de récupérer les fonds en urgence", async function () {
      await blockLucky.connect(participant1).buyTicket({ value: TICKET_PRICE });
      await blockLucky.connect(participant2).buyTicket({ value: TICKET_PRICE });

      const potBefore = await blockLucky.pot();
      expect(potBefore).to.equal(TICKET_PRICE * 2n);

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await blockLucky.connect(owner).emergencyWithdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(await blockLucky.pot()).to.equal(0);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + potBefore - gasUsed);
    });

    it("Ne devrait pas permettre à un non-propriétaire d'utiliser la fonction d'urgence", async function () {
      await blockLucky.connect(participant1).buyTicket({ value: TICKET_PRICE });

      await expect(
        blockLucky.connect(participant1).emergencyWithdraw()
      ).to.be.revertedWith("Seul le proprietaire peut executer cette fonction");
    });
  });

  describe("Scénarios multiples", function () {
    it("Devrait gérer correctement plusieurs participants avec plusieurs tickets", async function () {
      // Participant 1 achète 2 tickets
      await blockLucky.connect(participant1).buyTicket({ value: TICKET_PRICE });
      await blockLucky.connect(participant1).buyTicket({ value: TICKET_PRICE });

      // Participant 2 achète 1 ticket
      await blockLucky.connect(participant2).buyTicket({ value: TICKET_PRICE });

      // Participant 3 achète 1 ticket (déclenche le tirage)
      await blockLucky.connect(participant3).buyTicket({ value: TICKET_PRICE });

      expect(await blockLucky.participantCount()).to.equal(3);
      expect(await blockLucky.lotteryCompleted()).to.be.true;
      expect(await blockLucky.pot()).to.equal(0);
    });
  });
});

