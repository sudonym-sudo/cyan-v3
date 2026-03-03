import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, memoryLocalCache, setLogLevel } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAoGrWdWu__JHiTz5t9Udo0UkEy0DLBVVs",
  authDomain: "cyan-ide-cyan.firebaseapp.com",
  projectId: "cyan-ide-cyan",
  storageBucket: "cyan-ide-cyan.appspot.com",
  messagingSenderId: "760729383045",
  appId: "1:760729383045:web:fdd87bce328a49ab3639ec",
  measurementId: "G-6M37H8YPFR"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Set debug logging for easier troubleshooting
setLogLevel("debug");

// In restricted environments (about:blank, null origin), force Firestore to
// use long-polling HTTP instead of WebSocket/WebChannel. The global Epoxy
// proxy patches fetch but not WebSocket, so this is required for chat to work.
const isRestricted =
  typeof window !== "undefined" &&
  (window.location.protocol === "about:" ||
    window.location.protocol === "file:" ||
    window.location.origin === "null" ||
    window.location.origin === null ||
    window.location.href === "about:blank" ||
    window.location.hostname.includes("googleusercontent.com") ||
    !window.location.host);

function getDb() {
  if (isRestricted) {
    try {
      return initializeFirestore(app, {
        experimentalForceLongPolling: true,
        localCache: memoryLocalCache(),
      });
    } catch (e) {
      console.error("[firebase] failed to initialize restricted firestore:", e);
      return getFirestore(app);
    }
  }
  return getFirestore(app);
}

export const db = getDb();
