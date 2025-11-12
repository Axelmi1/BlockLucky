import React from "react";
import "./LotteryStats.css";

interface LotteryStatsProps {
  participantCount: number;
  minParticipants: number;
  currentPot: string;
  isActive: boolean;
  isCompleted: boolean;
}

export const LotteryStats: React.FC<LotteryStatsProps> = ({
  participantCount,
  minParticipants,
  currentPot,
  isActive,
  isCompleted,
}) => {
  const progress = (participantCount / minParticipants) * 100;
  const remaining = Math.max(0, minParticipants - participantCount);

  return (
    <div className="lottery-stats">
      <h2>Statistiques de la Loterie</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Participants</div>
          <div className="stat-value">
            {participantCount} / {minParticipants}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Cagnotte</div>
          <div className="stat-value">{parseFloat(currentPot).toFixed(4)} ETH</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">État</div>
          <div className={`stat-value status ${isCompleted ? "completed" : isActive ? "active" : "inactive"}`}>
            {isCompleted ? "Terminée" : isActive ? "Active" : "Inactive"}
          </div>
        </div>
      </div>

      {isActive && !isCompleted && (
        <div className="progress-section">
          <div className="progress-label">
            {remaining > 0 ? (
              <span>{remaining} participant{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""} pour déclencher le tirage</span>
            ) : (
              <span>Le tirage va être déclenché !</span>
            )}
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

