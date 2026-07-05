import { auth, db } from "./src/firebase.js";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const userInfo = document.getElementById("user-info");
const signInBtn = document.getElementById("sign-in-btn");
const signOutBtn = document.getElementById("sign-out-btn");
const saveBtn = document.getElementById("save-btn");
const loadBtn = document.getElementById("load-btn");
const scoreInput = document.getElementById("score-input");
const status = document.getElementById("status");

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    userInfo.textContent = `Signed in as ${user.displayName ?? user.uid}`;
    signInBtn.style.display = "none";
    signOutBtn.style.display = "inline-block";
  } else {
    userInfo.textContent = "Not signed in";
    signInBtn.style.display = "inline-block";
    signOutBtn.style.display = "none";
  }
});

signInBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) {
    status.textContent = `Sign-in error: ${err.message}`;
  }
});

signOutBtn.addEventListener("click", () => signOut(auth));

saveBtn.addEventListener("click", async () => {
  if (!currentUser) {
    status.textContent = "Sign in first.";
    return;
  }
  const bestScore = Number(scoreInput.value) || 0;
  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      bestScore,
      lastPlayedAt: serverTimestamp(),
    }, { merge: true });
    status.textContent = `Saved bestScore=${bestScore} to cloud.`;
  } catch (err) {
    status.textContent = `Save error: ${err.message}`;
  }
});

loadBtn.addEventListener("click", async () => {
  if (!currentUser) {
    status.textContent = "Sign in first.";
    return;
  }
  try {
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    status.textContent = snap.exists()
      ? `Loaded from cloud: bestScore=${snap.data().bestScore}`
      : "No saved data yet.";
  } catch (err) {
    status.textContent = `Load error: ${err.message}`;
  }
});
