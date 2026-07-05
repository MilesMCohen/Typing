import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCQOAj-UJJZPlVNsXUXw0Pfpwt5R_ppzQk",
  authDomain: "milesmcohen-typing.firebaseapp.com",
  projectId: "milesmcohen-typing",
  storageBucket: "milesmcohen-typing.firebasestorage.app",
  messagingSenderId: "754350752074",
  appId: "1:754350752074:web:575778c50fe7a9bf67c1b3",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
