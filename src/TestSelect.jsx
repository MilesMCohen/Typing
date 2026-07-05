import { motion } from "framer-motion";
import { TEST_LEVELS, stageKeysHint } from "./progression.js";

const buttonStyle = {
  fontSize: 16,
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};

export default function TestSelect({ onSelectLevel, onCancel }) {
  return (
    <motion.div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 420, padding: "0 16px" }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ fontSize: 28, fontWeight: "bold" }}>Placement Test</div>
      <div style={{ color: "#aaa", textAlign: "center" }}>
        Pick a level to test. We'll check your speed and accuracy and tell you if it's a good fit.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
        {TEST_LEVELS.map((level) => (
          <motion.button
            key={level.id}
            style={{ ...buttonStyle, background: "#eee", display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectLevel(level)}
          >
            <span style={{ fontWeight: "bold" }}>{level.label}</span>
            <span style={{ fontSize: 12, color: "#555" }}>keys: {stageKeysHint(level.stageIndex)}</span>
          </motion.button>
        ))}
      </div>
      <button style={{ ...buttonStyle, background: "#333", color: "white", marginTop: 8 }} onClick={onCancel}>
        Back to Menu
      </button>
    </motion.div>
  );
}
