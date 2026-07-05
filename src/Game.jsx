import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export default function Game({ lesson, words, onComplete }) {
  const target = words.join(" ");
  const [typed, setTyped] = useState("");
  const startTimeRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typed.length === target.length && typed.length > 0) {
      const elapsedSeconds = Math.max((Date.now() - startTimeRef.current) / 1000, 0.1);
      let correctCount = 0;
      for (let i = 0; i < target.length; i++) {
        if (typed[i] === target[i]) correctCount++;
      }
      const wpm = Math.round((target.length / 5) / (elapsedSeconds / 60));
      const accuracy = Math.round((correctCount / target.length) * 100);
      onComplete({ wpm, accuracy });
    }
  }, [typed, target, onComplete]);

  const handleChange = (e) => {
    if (startTimeRef.current === null && e.target.value.length > 0) {
      startTimeRef.current = Date.now();
    }
    setTyped(e.target.value.slice(0, target.length));
  };

  return (
    <motion.div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%", maxWidth: 700, padding: "0 16px" }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ fontSize: 20, color: "#aaa" }}>{lesson.label}</div>
      <div
        style={{ fontSize: 32, fontFamily: "monospace", lineHeight: 1.5, letterSpacing: 1, textAlign: "center" }}
        onClick={() => inputRef.current?.focus()}
      >
        {target.split("").map((char, i) => {
          let color = "#666";
          let background = "transparent";
          if (i < typed.length) {
            color = typed[i] === char ? "#6f6" : "#f66";
          } else if (i === typed.length) {
            background = "#333";
          }
          return (
            <span key={i} style={{ color, background, borderRadius: 3 }}>
              {char}
            </span>
          );
        })}
      </div>
      <input
        ref={inputRef}
        value={typed}
        onChange={handleChange}
        autoFocus
        style={{ fontSize: 20, padding: 12, width: "100%", borderRadius: 8, border: "2px solid #444", background: "#1a1a1a", color: "white" }}
        placeholder="Start typing here..."
      />
    </motion.div>
  );
}
