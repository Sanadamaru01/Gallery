// imageRowManager.js
import { getStorage, ref, getDownloadURL, uploadBytesResumable, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getFirestore, collection, doc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app } from '../firebaseInit.js';
import { log, resizeImageToWebp } from './utils.js';

const storage = getStorage(app);
const db = getFirestore(app);

// -------------------- 画像一覧読み込み --------------------
export async function loadRoomImages(roomId, previewArea, logArea) {
  if (!roomId || !previewArea) return;
  previewArea.innerHTML = "";

  // コントロールバー（順序保存ボタン）
  let controlBar = document.getElementById("imageOrderControlBar");
  if (!controlBar) {
    controlBar = document.createElement("div");
    controlBar.id = "imageOrderControlBar";
    controlBar.style.margin = "8px 0";
    controlBar.style.display = "flex";
    controlBar.style.gap = "8px";

    const saveOrderBtn = document.createElement("button");
    saveOrderBtn.textContent = "順序保存";
    saveOrderBtn.addEventListener("click", async () => {
      await saveCurrentOrderToFirestore(previewArea, logArea);
    });
    controlBar.appendChild(saveOrderBtn);
    previewArea.parentElement.insertBefore(controlBar, previewArea);
  }

  try {
    const imagesSnap = await getDocs(collection(db, `rooms/${roomId}/images`));
    log(`✅ ${imagesSnap.size} 件の画像を読み込みました`, logArea);

    const docs = imagesSnap.docs.map(d => ({ id: d.id, data: d.data() }));

    // order 昇順（fallback createdAt）
    docs.sort((a, b) => {
      const ao = a.data.order ?? null;
      const bo = b.data.order ?? null;
      if (ao !== null && bo !== null) return ao - bo;
      if (ao !== null) return -1;
      if (bo !== null) return 1;
      const at = a.data.createdAt?.toMillis?.() ?? 0;
      const bt = b.data.createdAt?.toMillis?.() ?? 0;
      return at - bt;
    });

    // order 初期化
    const needOrderAssign = docs.some(d => d.data.order === undefined || d.data.order === null);
    if (needOrderAssign) {
      const updates = [];
      for (let i = 0; i < docs.length; i++) {
        const d = docs[i];
        if (d.data.order === undefined || d.data.order === null) {
          updates.push(updateDoc(doc(db, `rooms/${roomId}/images/${d.id}`), {
            order: i,
            updatedAt: serverTimestamp()
          }).catch(e => log(`❌ order 初期値保存失敗: ${d.id} - ${e.message}`, logArea)));
          d.data.order = i;
        }
      }
      if (updates.length > 0) await Promise.all(updates);
    }

    // 行作成 or 更新
    for (const d of docs) {
      const data = d.data;
      if (data.file === "thumbnail.webp") continue;

      let downloadURL = data.downloadURL || "";
      if (!downloadURL && data.file) {
        try {
          const storagePath = data.file.includes('/') ? data.file : `rooms/${roomId}/${data.file}`;
          const storageRefObj = ref(storage, storagePath);
          downloadURL = await getDownloadURL(storageRefObj);
        } catch (e) {
          log(`❌ 画像 URL 取得失敗: ${data.file} - ${e.message}`, logArea);
        }
      }

      const existingRow = previewArea.querySelector(`.file-row[data-doc-id="${d.id}"]`);
      if (existingRow) {
        existingRow.querySelector(".titleInput").value = data.title || "";
        existingRow.querySelector(".captionInput").value = data.caption || "";
        existingRow.querySelector(".authorInput").value = data.author || "";
      } else {
        createImageRow(previewArea, d.id, { ...data, downloadURL }, true, logArea);
      }
    }
  } catch (e) {
    log(`❌ 画像読み込みエラー: ${e.message}`, logArea);
  }
}

// -------------------- サムネイルアップロード --------------------
export async function handleThumbnailSelect(file, roomId, logArea) {
  if (!file) return;
  const renamedFile = new File([file], "thumbnail.webp", { type: file.type });
  log(`🖼️ サムネイルアップロード開始: thumbnail.webp`, logArea);

  const blob = await resizeImageToWebp(renamedFile, 1600);
  const storagePath = `rooms/${roomId}/thumbnail.webp`;
  const storageRefObj = ref(storage, storagePath);

  try {
    await deleteObject(storageRefObj).catch(()=>{});
    await uploadBytesResumable(storageRefObj, blob);
    const downloadURL = await getDownloadURL(storageRefObj);

    const imagesSnap = await getDocs(collection(db, `rooms/${roomId}/images`));
    let docId = null;
    imagesSnap.forEach(d => { if(d.data().file === "thumbnail.webp") docId = d.id; });

    if(docId){
      await updateDoc(doc(db, `rooms/${roomId}/images/${docId}`), { downloadURL, updatedAt: serverTimestamp() });
    } else {
      await addDoc(collection(db, `rooms/${roomId}/images`), {
        file: "thumbnail.webp",
        downloadURL,
        title: "サムネイル",
        caption: "",
        author: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    log("✅ サムネイルアップロード完了", logArea);
    document.getElementById("thumbnailImg").src = downloadURL;
  } catch(e){
    log(`❌ サムネイルアップロード失敗: ${e.message}`, logArea);
  }
}

// -------------------- 通常ファイル選択 --------------------
export function handleFileSelect(fileInput, previewArea, logArea) {
  if (!fileInput || !previewArea) return;
  fileInput.addEventListener("change", () => {
    const files = Array.from(fileInput.files || []);
    for (const file of files) {
      const previewURL = URL.createObjectURL(file);
      const tempId = crypto.randomUUID();
      createImageRow(previewArea, tempId, {
        title: file.name,
        caption: "",
        author: "",
        downloadURL: previewURL,
        _fileObject: file
      }, false, logArea);
    }
    log(`${files.length} 件の画像を選択しました`, logArea);
  });
}

// -------------------- 通常アップロード --------------------
export async function uploadFiles(previewArea, logArea) {
  if (!previewArea) return;

  const roomSelect = document.getElementById("roomSelect");
  const roomId = roomSelect?.value;
  if (!roomId) return log("❌ ルームを選択してください", logArea);

  const rows = Array.from(previewArea.querySelectorAll(".file-row"));
  const uploadRows = rows.filter(r => r._fileObject);
  if (uploadRows.length === 0) return log("アップロードする新規ファイルがありません", logArea);

  let currentMaxOrder = -1;
  try {
    const imagesSnap = await getDocs(collection(db, `rooms/${roomId}/images`));
    imagesSnap.forEach(d => { const od = d.data().order; if(typeof od === "number" && od > currentMaxOrder) currentMaxOrder = od; });
  } catch (e) {
    log(`❌ 現行画像の order 取得失敗: ${e.message}`, logArea);
  }

  let nextOrder = currentMaxOrder + 1;
  const allRows = Array.from(previewArea.querySelectorAll(".file-row"));

  for (const row of allRows) {
    if (!row._fileObject) continue;
    const meta = row.querySelector(".file-meta");
    const title = meta.querySelector(".titleInput").value.trim();
    const caption = meta.querySelector(".captionInput").value.trim();
    const author = meta.querySelector(".authorInput").value.trim();
    const fileObj = row._fileObject;

    try {
      const blob = await resizeImageToWebp(fileObj, 1600);
      const fileName = crypto.randomUUID() + ".webp";
      const storagePath = `rooms/${roomId}/${fileName}`;
      const storageRefObj = ref(storage, storagePath);

      await uploadBytesResumable(storageRefObj, blob);
      const downloadURL = await getDownloadURL(storageRefObj);

      await addDoc(collection(db, `rooms/${roomId}/images`), {
        file: fileName,
        downloadURL,
        title, caption, author,
        order: nextOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      log(`✅ アップロード完了: ${fileName} (order=${nextOrder})`, logArea);
      nextOrder++;
    } catch (e) {
      log(`❌ アップロード失敗: ${fileObj.name} - ${e.message}`, logArea);
    }
  }

  await loadRoomImages(roomId, previewArea, logArea);
}

// -------------------- 順序保存 --------------------
async function saveCurrentOrderToFirestore(previewArea, logArea) {
  if (!previewArea) return;

  const roomSelect = document.getElementById("roomSelect");
  const roomId = roomSelect?.value;
  if (!roomId) return log("❌ ルームが選択されていません", logArea);

  const rows = Array.from(previewArea.querySelectorAll(".file-row"));
  const updates = [];
  rows.forEach((r, idx) => {
    const docId = r.dataset.docId;
    if (!docId) return;
    r.dataset.order = idx;
    updates.push({ docId, order: idx });
  });
  if (updates.length === 0) return log("保存する画像がありません。", logArea);

  try {
    const promises = updates.map(item =>
      updateDoc(doc(db, `rooms/${roomId}/images/${item.docId}`), {
        order: item.order,
        updatedAt: serverTimestamp()
      }).catch(e => log(`❌ order 更新失敗: ${item.docId} - ${e.message}`, logArea))
    );
    await Promise.all(promises);
    log("✅ 並び順を保存しました", logArea);
    await loadRoomImages(roomId, previewArea, logArea);
  } catch (e) {
    log(`❌ 並び順保存エラー: ${e.message}`, logArea);
  }
}

// -------------------- 画像行作成 --------------------
function createImageRow(previewArea, docId, data, isExisting = false, logArea) {
  const row = document.createElement("div");
  row.className = "file-row";
  row.style.display = "flex";
  row.style.gap = "12px";
  row.style.alignItems = "flex-start";
  row.style.marginBottom = "8px";

  if (docId) row.dataset.docId = docId;
  if (typeof data.order === "number") row.dataset.order = data.order;

  const img = document.createElement("img");
  img.src = data.downloadURL || "";
  img.alt = data.title || "(no title)";
  img.style.width = "120px";
  img.style.height = "120px";
  img.style.objectFit = "cover";
  img.style.background = "#f0f0f0";

  // --- order control ---
  const orderCtrl = document.createElement("div");
  orderCtrl.style.display = "flex";
  orderCtrl.style.flexDirection = "column";
  orderCtrl.style.gap = "4px";
  orderCtrl.style.marginRight = "6px";

  const upBtn = document.createElement("button");
  upBtn.textContent = "↑";
  upBtn.title = "上へ移動";
  const downBtn = document.createElement("button");
  downBtn.textContent = "↓";
  downBtn.title = "下へ移動";

  orderCtrl.appendChild(upBtn);
  orderCtrl.appendChild(downBtn);

  const meta = document.createElement("div");
  meta.className = "file-meta";

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.className = "titleInput";
  titleInput.placeholder = "タイトル";
  titleInput.value = data.title || "";

  const captionInput = document.createElement("input");
  captionInput.type = "text";
  captionInput.className = "captionInput";
  captionInput.placeholder = "キャプション";
  captionInput.value = data.caption || "";

  const authorInput = document.createElement("input");
  authorInput.type = "text";
  authorInput.className = "authorInput";
  authorInput.placeholder = "作者";
  authorInput.value = data.author || "";

  const btnWrap = document.createElement("div");
  btnWrap.style.display = "flex";
  btnWrap.style.gap = "6px";
  btnWrap.style.alignItems = "center";

  const updateBtn = document.createElement("button");
  updateBtn.textContent = isExisting ? "更新" : "（プレビュー）";
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "削除";

  const statusText = document.createElement("div");
  statusText.className = "statusText small";

  btnWrap.appendChild(updateBtn);
  btnWrap.appendChild(deleteBtn);
  btnWrap.appendChild(statusText);

  meta.appendChild(titleInput);
  meta.appendChild(captionInput);
  meta.appendChild(authorInput);
  meta.appendChild(btnWrap);

  if (!isExisting && data._fileObject) row._fileObject = data._fileObject;

  // --- up / down ---
  upBtn.addEventListener("click", () => {
    const prev = row.previousElementSibling;
    if (!prev) return;
    row.parentElement.insertBefore(row, prev);
    renumberPreviewRows(previewArea);
  });
  downBtn.addEventListener("click", () => {
    const next = row.nextElementSibling;
    if (!next) return;
    row.parentElement.insertBefore(next, row);
    renumberPreviewRows(previewArea);
  });

  // 更新
  updateBtn.addEventListener("click", async ()=> {
    if(!isExisting){ statusText.textContent="(未アップロード)"; return; }

    const roomSelect = document.getElementById("roomSelect");
    const roomId = roomSelect?.value;
    if (!roomId) { statusText.textContent="更新失敗"; return log("❌ ルームが選択されていません", logArea); }

    try{
      await updateDoc(doc(db, `rooms/${roomId}/images/${docId}`), {
        title:titleInput.value.trim(),
        caption:captionInput.value.trim(),
        author:authorInput.value.trim(),
        updatedAt: serverTimestamp()
      });
      statusText.textContent = "更新済み";
      log(`📝 ${titleInput.value || docId} 更新`, logArea);
    }catch(e){ statusText.textContent="更新失敗"; log(`❌ 更新失敗: ${e.message}`, logArea); }
  });

  // 削除
  deleteBtn.addEventListener("click", async ()=> {
    if(!confirm("本当に削除しますか？")) return;

    const roomSelect = document.getElementById("roomSelect");
    const roomId = roomSelect?.value;
    if (!roomId) return log("❌ ルームが選択されていません", logArea);

    try{
      if(isExisting){
        await deleteDoc(doc(db, `rooms/${roomId}/images/${docId}`));
        if(data.file){
          const storagePath = data.file.includes('/')?data.file:`rooms/${roomId}/${data.file}`;
          await deleteObject(ref(storage, storagePath)).catch(()=>{});
          log(`🗑️ ${storagePath} 削除`, logArea);
        }
      }
      row.remove();
      log(`❌ ${data.title || docId} 削除`, logArea);
    }catch(e){ log(`❌ 削除失敗: ${e.message}`, logArea); }
  });

  row.appendChild(orderCtrl);
  row.appendChild(img);
  row.appendChild(meta);
  previewArea.appendChild(row);
}

// -------------------- 再番号付与 --------------------
function renumberPreviewRows(previewArea) {
  const rows = Array.from(previewArea.querySelectorAll(".file-row"));
  rows.forEach((r, idx) => r.dataset.order = idx);
}
