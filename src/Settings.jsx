import { motion } from "framer-motion";
import { GRADE_WPM_TARGETS } from "./progression.js";

const buttonStyle = {
  fontSize: 16,
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};

export default function Settings({ wpmTarget, onSetWpmTarget, onBack }) {
  return (
    <motion.div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 420, padding: "0 16px" }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ fontSize: 28, fontWeight: "bold" }}>Settings</div>
      <div style={{ color: "#aaa", textAlign: "center" }}>
        Speed (wpm) matters more than accuracy here — new letters only unlock once you're actually
        fast at the ones you already know. Pick a target to aim for, from early school benchmarks up
        to adult typing speeds.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
        {GRADE_WPM_TARGETS.map((grade) => (
          <motion.button
            key={grade.id}
            style={{
              ...buttonStyle,
              background: grade.wpm === wpmTarget ? "cyan" : "#eee",
              color: "black",
              display: "flex",
              justifyContent: "space-between",
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSetWpmTarget(grade.wpm)}
          >
            <span style={{ fontWeight: "bold" }}>{grade.label}</span>
            <span>{grade.wpm} wpm</span>
          </motion.button>
        ))}
      </div>
      <button style={{ ...buttonStyle, background: "#333", color: "white", marginTop: 8 }} onClick={onBack}>
        Back to Menu
      </button>
    </motion.div>
  );
}
