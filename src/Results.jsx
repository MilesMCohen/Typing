import { motion } from "framer-motion";
import SnowLeopard from "./SnowLeopard.jsx";

const buttonStyle = {
  fontSize: 18,
  padding: "10px 24px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};

export default function Results({ lesson, stats, onPlayAgain, onBackToMenu }) {
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
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button style={{ ...buttonStyle, background: "cyan", color: "black" }} onClick={onPlayAgain}>
          Play Again
        </button>
        <button style={{ ...buttonStyle, background: "#eee" }} onClick={onBackToMenu}>
          Back to Menu
        </button>
      </div>
    </motion.div>
  );
}
