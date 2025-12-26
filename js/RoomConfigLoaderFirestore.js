// RoomConfigLoaderFirestore.js
import {
  doc,
  collection,
  getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Firestore から部屋データ（設定 + 画像）を取得
 */
export async function loadRoomDataFromFirestore(roomId, db) {
  //console.log("[DEBUG] loadRoomDataFromFirestore start:", roomId);

  // rooms/{roomId} ドキュメント取得
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) {
    throw new Error(`Room not found: ${roomId}`);
  }

  const roomData = roomSnap.data();
  //console.log("[DEBUG] room document:", roomData);

  // Firestore Timestamp → JS Date に変換
  const startDate = roomData.startDate ? roomData.startDate.toDate() : null;
  const endDate = roomData.endDate ? roomData.endDate.toDate() : null;

  // Config オブジェクト（ギャラリー描画に必要な値）
  const config = {
    wallWidth: roomData.wallWidth,
    wallHeight: roomData.wallHeight,
    fixedLongSide: roomData.fixedLongSide,
    backgroundColor: roomData.backgroundColor,
    roomTitle: roomData.roomTitle,
    texturePaths: roomData.texturePaths,

    // ★ 公開期間を追加
    startDate,
    endDate
  };

  //console.log("[DEBUG] config object:", config);

  // 画像サブコレクション取得
  const imagesRef = collection(db, "rooms", roomId, "images");
  const imagesSnap = await getDocs(imagesRef);

  const images = imagesSnap.docs.map(docSnap => {
    const d = docSnap.data();
    return {
      file: d.file,
      title: d.title,
      caption: d.caption,
      author: d.author,
      order: d.order ?? Number.MAX_SAFE_INTEGER,
    };
  });

  //console.log("[DEBUG] loaded images:", images.length);

  return { config, images, raw: roomData };
}
