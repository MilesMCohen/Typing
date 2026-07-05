import { motion } from "framer-motion";
import SnowLeopard from "./SnowLeopard.jsx";

const buttonStyle = {
  fontSize: 18,
  padding: "10px 24px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};

const DIRECTION_MESSAGES = {
  start: "Let's get started!",
  advance: "🎉 Great job — leveling up next time!",
  hold: "💪 Keep practicing these letters",
  regress: "🐢 Let's slow down and review",
  mastered: "🏆 You've mastered the full keyboard!",
};

function letterBreakdown(letterStats) {
  return Object.entries(letterStats ?? {})
    .map(([letter, { attempts, correct }]) => ({
      letter,
      attempts,
      accuracy: Math.round((correct / attempts) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

export default function Results({ lesson, stats, onPlayAgain, onBackToMenu }) {
  const letters = letterBreakdown(stats.letterStats);

  return (
    <motion.div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, type: "spring" }}
    >
      <div style={{ fontSize: 28, fontWeight: "bold" }}>Nice work! 🎉</div>
      <SnowLeopard progress={1} />
      <div style={{ color: "#aaa" }}>{lesson.label}</div>
      <motion.div
        style={{ fontSize: 56, fontWeight: "bold", color: "#6f6" }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
      >
        {stats.wpm} wpm
      </motion.div>
      <div style={{ fontSize: 20 }}>{stats.accuracy}% accuracy</div>

      <div style={{ fontSize: 16, color: "#ccc" }}>{DIRECTION_MESSAGES[stats.direction]}</div>
      {stats.weakLetters?.length > 0 && (
        <div style={{ fontSize: 14, color: "#f96" }}>Extra practice: {stats.weakLetters.join(", ")}</div>
      )}

      {letters.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", maxWidth: 400 }}>
          {letters.map(({ letter, accuracy, attempts }) => (
            <div
              key={letter}
              title={`${attempts} typed`}
              style={{
                fontFamily: "monospace",
                fontSize: 13,
                padding: "4px 8px",
                borderRadius: 6,
                background: accuracy >= 90 ? "#1a3" : accuracy >= 70 ? "#a71" : "#a22",
                color: "white",
              }}
            >
              {letter} {accuracy}%
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button style={{ ...buttonStyle, background: "cyan", color: "black" }} onClick={onPlayAgain}>
          Next Lesson
        </button>
        <button style={{ ...buttonStyle, background: "#eee" }} onClick={onBackToMenu}>
          Back to Menu
        </button>
      </div>
    </motion.div>
  );
}
