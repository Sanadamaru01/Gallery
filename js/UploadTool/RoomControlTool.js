import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
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

// -----------------------------
// DOM
// -----------------------------
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
  editArea.style.display = "none";
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

    // ★ 正式サムネイルパス（V2/V3 共通）
    const thumbRef = ref(storage, `rooms/${roomId}/thumbnail.webp`);
    console.log("[THUMB CHECK]", thumbRef.fullPath);

    getDownloadURL(thumbRef)
      .then(url => {
        img.src = url;
      })
      .catch(() => {
        img.src = "./noimage.jpg";
      });

    img.onerror = () => {
      img.src = "./noimage.jpg";
    };

    const info = document.createElement("div");
    info.className = "room-info";
    info.innerHTML = `
      <strong>${roomId}</strong><br>
      ${data.roomTitle ?? "(タイトルなし)"}
    `;

    card.appendChild(img);
    card.appendChild(info);

    card.addEventListener("click", () => selectRoom(roomId, card));

    roomList.appendChild(card);
  });
}

// -----------------------------
// ルーム選択
// -----------------------------
async function selectRoom(roomId, cardElement) {
  selectedRoomId = roomId;

  [...roomList.children].forEach(c => c.classList.remove("selected"));
  cardElement.classList.add("selected");

  editArea.style.display = "block";

  const snap = await getDoc(doc(db, "rooms", roomId));
  const data = snap.data();

  titleInput.value = data.roomTitle ?? "";
  startDateInput.value = data.startDate ? toDateInputValue(data.startDate.toDate()) : "";
  openDateInput.value = data.openDate ? toDateInputValue(data.openDate.toDate()) : "";
  endDateInput.value = data.endDate ? toDateInputValue(data.endDate.toDate()) : "";
}

// -----------------------------
// 日付ユーティリティ
// -----------------------------
function toDateInputValue(dateObj) {
  return dateObj.toISOString().split("T")[0];
}

function parseLocalDate(yyyyMMdd) {
  const [y, m, d] = yyyyMMdd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0);
}

// -----------------------------
// 設定保存
// -----------------------------
saveRoomBtn.addEventListener("click", async () => {
  if (!selectedRoomId) return;

  await updateDoc(doc(db, "rooms", selectedRoomId), {
    roomTitle: titleInput.value,
    startDate: startDateInput.value ? parseLocalDate(startDateInput.value) : null,
    openDate: openDateInput.value ? parseLocalDate(openDateInput.value) : null,
    endDate: endDateInput.value ? parseLocalDate(endDateInput.value) : null
  });

  alert("保存しました");
  await loadRoomList();
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
  const imagesSnap = await getDocs(collection(db, `rooms/${roomId}/images`));
  for (const docSnap of imagesSnap.docs) {
    await deleteDoc(doc(db, `rooms/${roomId}/images`, docSnap.id));
  }

  // Storage 画像削除
  const roomStorageDir = ref(storage, `rooms/${roomId}`);
  try {
    const list = await listAll(roomStorageDir);
    for (const fileRef of list.items) {
      await deleteObject(fileRef);
    }
  } catch {}

  // サムネイル削除（同一パス）
  const thumbRef = ref(storage, `rooms/${roomId}/thumbnail.webp`);
  deleteObject(thumbRef).catch(() => {});

  // Firestore 初期化
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
  editArea.style.display = "none";
  await loadRoomList();
});
