import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { auth, db } from "./firebase.js";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { WORDS_PER_ROUND, randomWords } from "./lessons.js";
import Menu from "./Menu.jsx";
import Game from "./Game.jsx";
import Results from "./Results.jsx";

const containerStyle = {
  fontFamily: "sans-serif",
  background: "#111",
  color: "white",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  gap: 16,
  margin: 0,
  overflow: "hidden",
};

export default function App() {
  const [user, setUser] = useState(null);
  const [bestScore, setBestScore] = useState(null);
  const [status, setStatus] = useState("");
  const [screen, setScreen] = useState("menu");
  const [lesson, setLesson] = useState(null);
  const [roundWords, setRoundWords] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) {
      setBestScore(null);
      return;
    }
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      setBestScore(snap.exists() ? snap.data().bestScore ?? null : null);
    });
  }, [user]);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      setStatus(`Sign-in error: ${err.message}`);
    }
  };

  const recordScore = useCallback(
    async (wpm) => {
      if (!user || (bestScore != null && wpm <= bestScore)) return;
      setBestScore(wpm);
      await setDoc(
        doc(db, "users", user.uid),
        { bestScore: wpm, lastPlayedAt: serverTimestamp() },
        { merge: true }
      );
    },
    [user, bestScore]
  );

  const startLesson = (selectedLesson) => {
    setLesson(selectedLesson);
    setRoundWords(randomWords(selectedLesson.words, WORDS_PER_ROUND));
    setScreen("game");
  };

  const handleComplete = useCallback(
    (roundStats) => {
      setStats(roundStats);
      recordScore(roundStats.wpm);
      setScreen("results");
    },
    [recordScore]
  );

  return (
    <div style={containerStyle}>
      <AnimatePresence mode="wait">
        {screen === "menu" && (
          <Menu
            key="menu"
            user={user}
            bestScore={bestScore}
            status={status}
            onSignIn={handleSignIn}
            onSignOut={() => signOut(auth)}
            onSelectLesson={startLesson}
          />
        )}
        {screen === "game" && (
          <Game key="game" lesson={lesson} words={roundWords} onComplete={handleComplete} />
        )}
        {screen === "results" && (
          <Results
            key="results"
            lesson={lesson}
            stats={stats}
            onPlayAgain={() => startLesson(lesson)}
            onBackToMenu={() => setScreen("menu")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
