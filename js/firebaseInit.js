// firebaseInit.js - 分割版独立動作
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// 元コードと同じ設定値
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",              // ← 元コードのまま
  authDomain: "gallery-us-ebe6e.firebaseapp.com",
  projectId: "gallery-us-ebe6e",
  storageBucket: "gallery-us-ebe6e.firebasestorage.app",
};

// ログ出力で確認
//console.log("[DEBUG] firebaseInit loaded, config:", firebaseConfig);

// Firebase 初期化
export const app = initializeApp(firebaseConfig);
//console.log("[DEBUG] Firebase app initialized:", app);

// Firestore / Storage も同時にエクスポート
export const db = getFirestore(app);
export const storage = getStorage(app);
//console.log("[DEBUG] Firestore & Storage initialized");
