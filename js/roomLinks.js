// =====================================
// roomLinks.js（Firestore版・firebaseInit.js 統一版 / room.html対応）
// =====================================

import { db } from './firebaseInit.js';  // 初期化済み Firestore
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// -------------------------------------
// 現在の roomId を URL クエリから取得
// -------------------------------------
function getCurrentRoomId() {
  const params = new URLSearchParams(location.search);
  return params.get('roomId');
}

// -------------------------------------
// 前後リンクを設定（サーキュラーリンク）
// -------------------------------------
export async function setupRoomLinks() {
  //console.log("[roomLinks] setupRoomLinks 開始");

  const currentRoomId = getCurrentRoomId();
  if (!currentRoomId) {
    console.warn("[roomLinks] ❌ URL から roomId を取得できません");
    return;
  }
  //console.log("[roomLinks] 現在の roomId:", currentRoomId);

  const prevLink = document.getElementById("prevRoom");
  const nextLink = document.getElementById("nextRoom");
  if (!prevLink || !nextLink) {
    console.warn("[roomLinks] ❌ prevRoom / nextRoom が HTML に存在しません");
    return;
  }

  try {
    //console.log("[roomLinks] Firestore から rooms コレクションを取得中...");
    const snapshot = await getDocs(collection(db, "rooms"));
    const roomIds = snapshot.docs.map(doc => doc.id);
    //console.log("[roomLinks] 取得した roomIds:", roomIds);

    // room1, room2,... を数値で正しくソート
    roomIds.sort((a, b) => parseInt(a.replace("room","")) - parseInt(b.replace("room","")));
    //console.log("[roomLinks] ソート後 roomIds:", roomIds);

    const currentIndex = roomIds.indexOf(currentRoomId);
    if (currentIndex === -1) {
      console.warn("[roomLinks] ❌ Firestore 内に現在の roomId が存在しません:", currentRoomId);
      return;
    }

    // サーキュラーリンク
    const prevId = roomIds[(currentIndex - 1 + roomIds.length) % roomIds.length];
    const nextId = roomIds[(currentIndex + 1) % roomIds.length];

    // room.html 用リンクに設定
    prevLink.href = `room.html?roomId=${prevId}`;
    nextLink.href = `room.html?roomId=${nextId}`;

    prevLink.style.opacity = "1";
    prevLink.style.pointerEvents = "auto";
    nextLink.style.opacity = "1";
    nextLink.style.pointerEvents = "auto";

    //console.log("[roomLinks] ✅ 前後リンクを更新しました（サーキュラー）", {
    //  current: currentRoomId,
    //  prev: prevId,
    //  next: nextId
    //});

  } catch (err) {
    console.error("[roomLinks] ❌ Firestore ルーム取得エラー:", err);
  }
}

// ⚠️ 注意：setupRoomLinks() の自動実行は行わず、main.js から呼び出す
