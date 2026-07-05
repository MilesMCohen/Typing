import { motion } from "framer-motion";
import SnowLeopard from "./SnowLeopard.jsx";

const buttonStyle = {
  fontSize: 18,
  padding: "10px 24px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};

export default function Menu({ user, bestScore, status, plan, onSignIn, onSignOut, onStart, onOpenTest }) {
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
      {!user && (
        <div style={{ color: "#888", fontSize: 13, maxWidth: 260, textAlign: "center" }}>
          Sign in to save your progress between visits.
        </div>
      )}

      <motion.button
        style={{ ...buttonStyle, background: "cyan", color: "black", display: "flex", flexDirection: "column", gap: 4, minWidth: 200, marginTop: 8 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
      >
        <span style={{ fontWeight: "bold" }}>Start {plan.label}</span>
        <span style={{ fontSize: 13, color: "#333" }}>keys: {plan.keysHint}</span>
      </motion.button>

      <button style={{ ...buttonStyle, background: "transparent", color: "#aaa", border: "1px solid #444", fontSize: 14 }} onClick={onOpenTest}>
        Take a Placement Test
      </button>
    </motion.div>
  );
}
