import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getStorage,
  ref,
  getDownloadURL,
  deleteObject,
  listAll
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import { app } from "../firebaseInit.js";

const db = getFirestore(app);
const storage = getStorage(app);

// DOM
const roomList = document.getElementById("roomList");
const editArea = document.getElementById("editArea");

const titleInput = document.getElementById("roomTitleInput");
const startDateInput = document.getElementById("startDateInput");
const openDateInput = document.getElementById("openDateInput");
const endDateInput = document.getElementById("endDateInput");

const saveRoomBtn = document.getElementById("saveRoomBtn");
const resetRoomBtn = document.getElementById("resetRoomBtn");

let selectedRoomId = null;

// -----------------------------
// 初期ロード
// -----------------------------
window.addEventListener("DOMContentLoaded", async () => {
  await loadRoomList();
});

// -----------------------------
// ルーム一覧の読み込み
// -----------------------------
async function loadRoomList() {
  roomList.innerHTML = "";

  const snap = await getDocs(collection(db, "rooms"));
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const roomId = docSnap.id;

    const card = document.createElement("div");
    card.className = "room-card";
    card.dataset.roomId = roomId;

    const img = document.createElement("img");
    img.className = "thumb";

    // サムネイル読み込み
    const thumbRef = ref(storage, `roomThumbnails/${roomId}.webp`);
    getDownloadURL(thumbRef)
      .then(url => img.src = url)
      .catch(() => img.src = "./noimage.jpg");

    const info = document.createElement("div");
    info.className = "room-info";
    info.innerHTML = `
      <strong>${roomId}</strong><br>
      ${data.roomTitle ?? "(タイトルなし)"}
    `;

    card.appendChild(img);
    card.appendChild(info);

    // クリックで選択
    card.addEventListener("click", () => selectRoom(roomId, card));

    roomList.appendChild(card);
  });
}

// -----------------------------
// ルーム選択
// -----------------------------
async function selectRoom(roomId, cardElement) {
  selectedRoomId = roomId;

  // UI の選択ハイライト
  [...roomList.children].forEach(c => c.classList.remove("selected"));
  cardElement.classList.add("selected");

  // 設定UIを表示
  editArea.style.display = "block";

  // Firestore から読み込み
  const snap = await getDoc(doc(db, "rooms", roomId));
  const data = snap.data();

  titleInput.value = data.roomTitle ?? "";

  // 日付反映（timestamp → YYYY-MM-DD）
  startDateInput.value = data.startDate ? toDateInputValue(data.startDate.toDate()) : "";
  openDateInput.value = data.openDate ? toDateInputValue(data.openDate.toDate()) : "";
  endDateInput.value = data.endDate ? toDateInputValue(data.endDate.toDate()) : "";
}

// timestamp → YYYY-MM-DD
function toDateInputValue(dateObj) {
  return dateObj.toISOString().split("T")[0];
}

function parseLocalDate(yyyyMMdd) {
  const [y, m, d] = yyyyMMdd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0);  // ← これならローカルの00:00
}

// -----------------------------
// 設定保存
// -----------------------------
saveRoomBtn.addEventListener("click", async () => {
  if (!selectedRoomId) return;

  const refRoom = doc(db, "rooms", selectedRoomId);

  await updateDoc(refRoom, {
    roomTitle: titleInput.value,
    startDate: startDateInput.value ? parseLocalDate(startDateInput.value) : null,
    endDate: endDateInput.value ? parseLocalDate(endDateInput.value) : null,
    openDate: openDateInput.value ? parseLocalDate(openDateInput.value) : null,
    //startDate: startDateInput.value ? new Date(startDateInput.value) : null,
    //openDate: openDateInput.value ? new Date(openDateInput.value) : null,
    //endDate: endDateInput.value ? new Date(endDateInput.value) : null
  });

  alert("保存しました");
  await loadRoomList(); // タイトル変更の反映
});

// -----------------------------
// ルーム初期化
// -----------------------------
resetRoomBtn.addEventListener("click", async () => {
  if (!selectedRoomId) return;

  const ok = confirm("本当にこのルームを初期化しますか？\n画像データは全削除されます。");
  if (!ok) return;

  const roomId = selectedRoomId;

  // images サブコレクション削除
  const imagesPath = collection(db, `rooms/${roomId}/images`);
  const snap = await getDocs(imagesPath);

  for (const docSnap of snap.docs) {
    await deleteDoc(doc(db, `rooms/${roomId}/images`, docSnap.id));
  }

  // Storage の画像削除
  const roomStorageDir = ref(storage, `rooms/${roomId}`);
  try {
    const list = await listAll(roomStorageDir);
    for (const fileRef of list.items) {
      await deleteObject(fileRef);
    }
  } catch (e) {
    console.warn("Storage 画像なし");
  }

  // サムネイル削除
  const thumbRef = ref(storage, `roomThumbnails/${roomId}.webp`);
  deleteObject(thumbRef).catch(() => {});

  // Firestore の部屋設定を初期値へ
  await updateDoc(doc(db, "rooms", roomId), {
    wallWidth: 10,
    wallHeight: 5,
    fixedLongSide: 3,
    backgroundColor: "#fdf6e3",
    roomTitle: "",
    startDate: null,
    openDate: null,
    endDate: null
  });

  alert("初期化が完了しました");
  await loadRoomList();
});
