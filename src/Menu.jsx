import { motion } from "framer-motion";
import { LESSONS } from "./lessons.js";
import SnowLeopard from "./SnowLeopard.jsx";

const buttonStyle = {
  fontSize: 18,
  padding: "10px 24px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};

export default function Menu({ user, bestScore, status, onSignIn, onSignOut, onSelectLesson }) {
  return (
    <motion.div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ fontSize: 32, fontWeight: "bold" }}>Typing Adventure</div>
      <SnowLeopard progress={0} />

      <div style={{ color: "#aaa" }}>
        {user ? `Signed in as ${user.displayName ?? user.uid}` : "Not signed in"}
        {user && bestScore != null ? ` · Best: ${bestScore} wpm` : ""}
      </div>
      {user ? (
        <button style={buttonStyle} onClick={onSignOut}>
          Sign out
        </button>
      ) : (
        <button style={{ ...buttonStyle, background: "cyan", color: "black" }} onClick={onSignIn}>
          Sign in with Google
        </button>
      )}
      {status && <div style={{ color: "#6f6", minHeight: 24 }}>{status}</div>}

      <div style={{ fontSize: 20, marginTop: 16 }}>Choose a lesson:</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        {LESSONS.map((lesson) => (
          <motion.button
            key={lesson.id}
            style={{ ...buttonStyle, background: "#eee", display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectLesson(lesson)}
          >
            <span style={{ fontWeight: "bold" }}>{lesson.label}</span>
            <span style={{ fontSize: 13, color: "#555" }}>{lesson.keysHint}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
