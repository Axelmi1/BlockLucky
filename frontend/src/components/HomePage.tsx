import React, { useState, useEffect } from "react";
import { NetworkGraph } from "./NetworkGraph";
import "./HomePage.css";

interface HomePageProps {
  onParticipate: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onParticipate }) => {
  const [countdown, setCountdown] = useState({
    days: 3,
    hours: 8,
    minutes: 52,
    seconds: 49,
  });

  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        let { days, hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else if (days > 0) {
          days--;
          hours = 23;
          minutes = 59;
          seconds = 59;
        }
        
        return { days, hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleFAQ = (index: number) => {
    setActiveSection(activeSection === `faq-${index}` ? null : `faq-${index}`);
  };

  return (
    <div className="homepage">
      {/* Header */}
      <header className="homepage-header">
        <div className="header-logo">
          <div className="logo-icon">💎</div>
          <span className="logo-text">Tombola ETH</span>
        </div>
        <nav className="header-nav">
          <button onClick={() => document.getElementById("rules")?.scrollIntoView({ behavior: "smooth" })}>
            Règles
          </button>
          <button onClick={() => document.getElementById("winners")?.scrollIntoView({ behavior: "smooth" })}>
            Vainqueurs
          </button>
          <button onClick={() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" })}>
            FAQ
          </button>
          <button className="nav-participate" onClick={onParticipate}>
            Participer
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-tags">
            <span className="tag">TRANSPARENCE</span>
            <span className="tag">CRYPTO</span>
            <span className="tag">DIVERTISSEMENT</span>
          </div>
          
          <h1 className="hero-title">
            Une tombola <span className="highlight">premium</span> pour tenter de gagner de l'Ethereum
          </h1>
          
          <p className="hero-description">
            Site vitrine – présentation, règles, témoignages et derniers gagnants (anonymes). 
            Aucune collecte de fonds sur ce site de démonstration.
          </p>
          
          <div className="hero-badges">
            <span className="badge">Billets limités par édition</span>
            <span className="badge">Tirage auditable (hash bloc)</span>
            <span className="badge">Preuve de paiement on-chain</span>
          </div>
          
          <div className="hero-buttons">
            <button className="btn-primary" onClick={onParticipate}>
              Je participe
            </button>
            <button className="btn-secondary" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
              Comment ça marche
            </button>
          </div>
          
          <div className="countdown">
            <div className="countdown-item">
              <div className="countdown-number">{String(countdown.days).padStart(2, "0")}</div>
              <div className="countdown-label">JOURS</div>
            </div>
            <div className="countdown-item">
              <div className="countdown-number">{String(countdown.hours).padStart(2, "0")}</div>
              <div className="countdown-label">HEURES</div>
            </div>
            <div className="countdown-item">
              <div className="countdown-number">{String(countdown.minutes).padStart(2, "0")}</div>
              <div className="countdown-label">MIN</div>
            </div>
            <div className="countdown-item">
              <div className="countdown-number">{String(countdown.seconds).padStart(2, "0")}</div>
              <div className="countdown-label">SEC</div>
            </div>
          </div>
        </div>
        
        <div className="hero-visual">
          <NetworkGraph />
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="process-section">
        <div className="process-steps">
          <div className="step">
            <div className="step-icon">🏆</div>
            <h3 className="step-title">CHOISIR</h3>
            <p className="step-description">
              Choisissez le nombre de billets (jusqu'à la limite par joueur) et préparez-vous à tenter de gagner de l'ETH.
            </p>
          </div>
          
          <div className="step-connector"></div>
          
          <div className="step">
            <div className="step-icon">▶</div>
            <h3 className="step-title">JOUER</h3>
            <p className="step-description">
              Test simple anti-bot / preuve d'intérêt, puis validation de votre participation à l'édition en cours.
            </p>
          </div>
          
          <div className="step-connector"></div>
          
          <div className="step">
            <div className="step-icon">🔒</div>
            <h3 className="step-title">ACHETER</h3>
            <p className="step-description">
              Payez en toute sécurité. Le tirage utilise une graine publique et un RNG auditable pour une sélection impartiale.
            </p>
          </div>
          
          <div className="step-connector"></div>
          
          <div className="step step-active">
            <div className="step-icon">⭐</div>
            <h3 className="step-title">GAGNER</h3>
            <p className="step-description">
              Et voilà ! Si vous êtes tiré au sort, vous recevez le gain en ETH. Les transactions sont vérifiables on-chain.
            </p>
          </div>
        </div>

        <div className="stats-section">
          <div className="stat-item">
            <div className="stat-number">1.2k+</div>
            <div className="stat-label">Participants</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">12</div>
            <div className="stat-label">Éditions</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">3.2 ETH</div>
            <div className="stat-label">Déjà versés</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">100%</div>
            <div className="stat-label">Tirages tenus</div>
          </div>
        </div>
      </section>

      {/* Rules Section */}
      <section id="rules" className="rules-section">
        <h2 className="section-title">Règles & fonctionnement</h2>
        <p className="section-subtitle">
          Règles simples de la tombola. Adaptez ce texte selon vos contraintes légales locales.
        </p>
        
        <div className="rules-grid">
          <div className="rule-card">
            <h3 className="rule-title">1. Billets</h3>
            <p className="rule-text">
              Chaque billet porte un identifiant unique. Vente limitée à n billets par édition.
            </p>
          </div>
          
          <div className="rule-card">
            <h3 className="rule-title">2. Tirage</h3>
            <p className="rule-text">
              Tirage à une date annoncée. Graine publique (hash d'un bloc ETH) + script documenté.
            </p>
          </div>
          
          <div className="rule-card">
            <h3 className="rule-title">3. Gains</h3>
            <p className="rule-text">
              1er prix en ETH, autres lots éventuels. Gagnants anonymes (initiales + partie d'adresse).
            </p>
          </div>
        </div>
      </section>

      {/* Winners Section */}
      <section id="winners" className="winners-section">
        <h2 className="section-title">Derniers vainqueurs (anonymes)</h2>
        
        <div className="winners-list">
          <div className="winner-card">
            <div className="winner-edition">Édition #12 - 1er prix</div>
            <div className="winner-info">
              <span className="winner-initials">R.N.</span>
              <span className="winner-separator">•</span>
              <span className="winner-address">0x43f...9bA</span>
              <span className="winner-separator">•</span>
              <span className="winner-amount">0.5 ETH</span>
            </div>
            <button className="winner-status paid">Payé</button>
          </div>
          
          <div className="winner-card">
            <div className="winner-edition">Édition #11 - 1er prix</div>
            <div className="winner-info">
              <span className="winner-initials">L.P.</span>
              <span className="winner-separator">•</span>
              <span className="winner-address">0x1c9...A21</span>
              <span className="winner-separator">•</span>
              <span className="winner-amount">0.4 ETH</span>
            </div>
            <button className="winner-status paid">Payé</button>
          </div>
          
          <div className="winner-card">
            <div className="winner-edition">Édition #10 - 1er prix</div>
            <div className="winner-info">
              <span className="winner-initials">C.S.</span>
              <span className="winner-separator">•</span>
              <span className="winner-address">0xb7e...f02</span>
              <span className="winner-separator">•</span>
              <span className="winner-amount">0.6 ETH</span>
            </div>
            <button className="winner-status paid">Payé</button>
          </div>
          
          <div className="winner-card">
            <div className="winner-edition">Édition #9 - 1er prix</div>
            <div className="winner-info">
              <span className="winner-initials">A.K.</span>
              <span className="winner-separator">•</span>
              <span className="winner-address">0xd3a...91c</span>
              <span className="winner-separator">•</span>
              <span className="winner-amount">0.3 ETH</span>
            </div>
            <button className="winner-status paid">Payé</button>
          </div>
        </div>
        
        <p className="winners-note">
          Les identités complètes ne sont jamais publiées. Seuls des éléments non-identifiants apparaissent.
        </p>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <h2 className="section-title">Retours clients</h2>
        
        <div className="testimonials-list">
          <div className="testimonial-card">
            <div className="testimonial-stars">★★★★★</div>
            <p className="testimonial-text">
              "Process super clair et résultats publiés avec la preuve du tirage."
            </p>
            <div className="testimonial-author">— A. K., Paris</div>
          </div>
          
          <div className="testimonial-card">
            <div className="testimonial-stars">★★★★☆</div>
            <p className="testimonial-text">
              "Paiement en ETH rapide et traçable sur la blockchain."
            </p>
            <div className="testimonial-author">— M. D., Lyon</div>
          </div>
          
          <div className="testimonial-card">
            <div className="testimonial-stars">★★★★☆</div>
            <p className="testimonial-text">
              "Sympa et transparent. J'attends la prochaine édition !"
            </p>
            <div className="testimonial-author">— J. T., Marseille</div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <h2 className="section-title">FAQ</h2>
        
        <div className="faq-list">
          <div 
            className={`faq-item ${activeSection === "faq-0" ? "active" : ""}`}
            onClick={() => toggleFAQ(0)}
          >
            <div className="faq-question">
              <span className="faq-icon">▶</span>
              Comment les gagnants sont-ils tirés au sort?
            </div>
            {activeSection === "faq-0" && (
              <div className="faq-answer">
                Le tirage utilise une graine publique basée sur le hash d'un bloc Ethereum, 
                garantissant la transparence et l'impartialité du processus.
              </div>
            )}
          </div>
          
          <div 
            className={`faq-item ${activeSection === "faq-1" ? "active" : ""}`}
            onClick={() => toggleFAQ(1)}
          >
            <div className="faq-question">
              <span className="faq-icon">▶</span>
              Comment vérifier un paiement?
            </div>
            {activeSection === "faq-1" && (
              <div className="faq-answer">
                Tous les paiements sont effectués on-chain et sont vérifiables sur la blockchain Ethereum. 
                Vous pouvez consulter l'historique des transactions dans notre explorateur intégré.
              </div>
            )}
          </div>
          
          <div 
            className={`faq-item ${activeSection === "faq-2" ? "active" : ""}`}
            onClick={() => toggleFAQ(2)}
          >
            <div className="faq-question">
              <span className="faq-icon">▶</span>
              Y a-t-il des restrictions légales?
            </div>
            {activeSection === "faq-2" && (
              <div className="faq-answer">
                Ce site est une démonstration. Veuillez vous renseigner sur les réglementations locales 
                concernant les loteries et les cryptomonnaies dans votre juridiction.
              </div>
            )}
          </div>
          
          <div 
            className={`faq-item ${activeSection === "faq-3" ? "active" : ""}`}
            onClick={() => toggleFAQ(3)}
          >
            <div className="faq-question">
              <span className="faq-icon">▶</span>
              Ce site collecte-t-il des fonds?
            </div>
            {activeSection === "faq-3" && (
              <div className="faq-answer">
                Non, ce site est une démonstration. Aucune collecte de fonds réelle n'est effectuée. 
                Il s'agit d'un site vitrine pour présenter le concept.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section">
        <h2 className="section-title">Contact</h2>
        
        <div className="contact-content">
          <div className="contact-form">
            <label htmlFor="email">Votre email</label>
            <input 
              type="email" 
              id="email" 
              placeholder="vous@exemple.com" 
              className="contact-input"
            />
            
            <label htmlFor="message">Votre message</label>
            <textarea 
              id="message" 
              placeholder="Écrivez votre question..." 
              className="contact-textarea"
              rows={5}
            />
            
            <button className="contact-submit">Envoyer</button>
            
            <p className="contact-privacy">
              En cliquant sur « Envoyer », vous acceptez notre{" "}
              <a href="#" className="privacy-link">Politique de confidentialité</a>.
            </p>
          </div>
          
          <div className="contact-info">
            <h3 className="info-title">Infos</h3>
            <div className="info-item">Email: contact@tombola-eth.demo</div>
            <div className="info-item">Twitter/X: @tombola_eth</div>
            <div className="info-item">Heures: Lun-Ven, 10h-18h (CET)</div>
            
            <div className="info-address">
              <div className="info-subtitle">Adresse officielle (démo)</div>
              <div className="address-box">0xABCDEF...123456</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

