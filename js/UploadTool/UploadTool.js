// UploadTool.js
import { log } from './utils.js';
import { loadRoomImages, handleFileSelect, uploadFiles, handleThumbnailSelect } from './imageRowManager.js';
import { loadAllTextures } from './textureManager.js';
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref as storageRef, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { app } from '../firebaseInit.js';

const db = getFirestore(app);

// --- DOM ---
const roomSelect = document.getElementById("roomSelect");
const roomTitleInput = document.getElementById("roomTitleInput");
const updateRoomBtn = document.getElementById("updateRoomBtn");
const roomAnnouncementInput = document.getElementById("roomAnnouncementInput");
const fileInput = document.getElementById("fileInput");
const previewArea = document.getElementById("previewArea");
const uploadBtn = document.getElementById("uploadBtn");
const uploadThumbnailBtn = document.getElementById("uploadThumbnailBtn");
const thumbnailFileInput = document.getElementById("thumbnailFileInput");
const logArea = document.getElementById("log");
const wallSelect = document.getElementById("wallTexture");
const floorSelect = document.getElementById("floorTexture");
const ceilingSelect = document.getElementById("ceilingTexture");
const doorSelect = document.getElementById("doorTexture");

// -------------------------------
// 初期ロード
// -------------------------------
window.addEventListener("DOMContentLoaded", async () => {
  await loadRooms();
  handleFileSelect(fileInput, previewArea, logArea);
});

// -------------------------------
// rooms 読み込み
// -------------------------------
async function loadRooms() {
  const snap = await getDocs(collection(db, "rooms"));
  roomSelect.innerHTML = "";
  snap.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.id + " : " + (d.data().roomTitle ?? "(no title)");
    roomSelect.appendChild(opt);
  });
  if (roomSelect.options.length > 0) {
    roomSelect.selectedIndex = 0;
    await onRoomChange();
  }
}

roomSelect.addEventListener("change", onRoomChange);

// -------------------------------
// room 切替 / UI初期化
// -------------------------------
async function onRoomChange() {
  const roomId = roomSelect.value;
  if (!roomId) return;

  if(!previewArea) return;

  const snap = await getDoc(doc(db, "rooms", roomId));
  if (!snap.exists()) return;
  const data = snap.data();

  // タイトル反映
  roomTitleInput.value = data.roomTitle ?? "";
  roomAnnouncementInput.value = data.announcement ?? "";

  // 画像ロード
  await loadRoomImages(roomId, previewArea, logArea);

  // テクスチャ反映
  const tex = data.texturePaths ?? {};
  const currentValues = { wall: tex.wall ?? "", floor: tex.floor ?? "", ceiling: tex.ceiling ?? "", door: tex.door ?? "" };
  await loadAllTextures({ wallTexture: wallSelect, floorTexture: floorSelect, ceilingTexture: ceilingSelect, doorTexture: doorSelect }, logArea, currentValues);

  // サムネイル
  const storage = getStorage(app);
  const thumbRef = storageRef(storage, `rooms/${roomId}/thumbnail.webp`);
  try { document.getElementById("thumbnailImg").src = await getDownloadURL(thumbRef); }
  catch(e){ document.getElementById("thumbnailImg").src = "./noimage.jpg"; }
}

// -------------------------------
// ルーム情報更新
// -------------------------------
updateRoomBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) return;
  await updateDoc(doc(db, "rooms", roomId), {
    roomTitle: roomTitleInput.value,
    announcement: roomAnnouncementInput.value,  // ★追加
    updatedAt: serverTimestamp()
  });
  log(`[INFO] ルーム情報更新: ${roomTitleInput.value} / ${roomAnnouncementInput.value}`, logArea);
  await onRoomChange();
});

// -------------------------------
// テクスチャ保存
// -------------------------------
async function saveTexture(type, value) {
  const roomId = roomSelect.value;
  if (!roomId) return;
  await updateDoc(doc(db, "rooms", roomId), { [`texturePaths.${type}`]: value, updatedAt: serverTimestamp() });
  log(`[INFO] ${type} テクスチャ更新: ${value}`, logArea);
  await onRoomChange();
}

wallSelect.addEventListener("change", () => saveTexture("wall", wallSelect.value));
floorSelect.addEventListener("change", () => saveTexture("floor", floorSelect.value));
ceilingSelect.addEventListener("change", () => saveTexture("ceiling", ceilingSelect.value));
doorSelect.addEventListener("change", () => saveTexture("door", doorSelect.value));

// -------------------------------
// 通常アップロード
// -------------------------------
uploadBtn.addEventListener("click", async () => {
  const roomId = roomSelect.value;
  if (!roomId) return log("[WARN] ルームを選択してください", logArea);
  await uploadFiles(previewArea, roomId, logArea);
});

// -------------------------------
// サムネイルアップロード
// -------------------------------
uploadThumbnailBtn.addEventListener("click", () => thumbnailFileInput.click());
thumbnailFileInput.addEventListener("change", async () => {
  const file = thumbnailFileInput.files[0];
  if (file) await handleThumbnailSelect(file, roomSelect.value, logArea);
});
