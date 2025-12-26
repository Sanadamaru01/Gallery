import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const auth = getAuth();
const db = getFirestore();

let currentUser = null;
let userRole = null;
let userRooms = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  currentUser = user;
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    userRole = data.role;
    userRooms = data.rooms || [];
    console.log(`ログイン中の役割: ${userRole}, 管理ルーム: ${userRooms.join(", ")}`);
  } else {
    console.warn("ユーザーがFirestoreに登録されていません。");
  }
});
