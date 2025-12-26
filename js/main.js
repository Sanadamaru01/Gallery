// main.js（Firestore対応版・firebaseInit.js統一・ログ追加版）

// --------------------
// ログ出力
// --------------------
//console.log("[DEBUG] main.js load start");

// ---------------------------------------------------------
// ① firebaseInit.js を最初に読み込む（UploadTool と同じ方式）
// ---------------------------------------------------------
import { db } from './firebaseInit.js'; // storage は main.js では不要
//console.log("[DEBUG] firebaseInit imported, db ready");

// ---------------------------------------------------------
// ② Firestore 使用モジュールを後から読み込む
// ---------------------------------------------------------
import * as roomLoader from './RoomConfigLoaderFirestore.js';
//console.log("[DEBUG] RoomConfigLoaderFirestore imported");

import * as accessControl from './accessControl.js';
//console.log("[DEBUG] accessControl imported");

import * as galleryModule from './gallery.js';
import { setOnFirstRender } from './gallery.js'; // ★追加
//console.log("[DEBUG] gallery imported");

import * as roomLinksModule from './roomLinks.js';
//console.log("[DEBUG] roomLinks imported");

// ---------------------------------------------------------
// ギャラリー初期化メイン処理
// ---------------------------------------------------------
/**
 * 指定した roomId でギャラリーを初期化
 */
export async function initGalleryFromRoomId(roomId) {
  //console.log("[DEBUG] initGalleryFromRoomId called with roomId:", roomId);

  if (!roomId) {
    console.warn("[WARN] roomId が未指定です");
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = '❌ roomId が指定されていません。URL に ?roomId=XXX を付加してください。';
    document.body.appendChild(msg);
    return;
  }

  try {
    //console.log("[DEBUG] loading room data from Firestore...");
    const { config, images, raw } = await roomLoader.loadRoomDataFromFirestore(roomId, db);
    //console.log("[DEBUG] room data loaded:", { config, images, raw });

    const allowed = accessControl.checkAccessAndShowMessage(raw.startDate, raw.endDate);
    //console.log("[DEBUG] access check result:", allowed);
    if (!allowed) return;

    const title = raw.roomTitle || 'Untitled Room';
    document.title = title;
    //console.log("[DEBUG] room title set:", title);
    
    // 🔹 読み込み中 表示（ここが最速）
    const messageEl = document.getElementById('message');
    if (messageEl) {
      messageEl.style.display = 'block';
      messageEl.textContent = '読み取り中…';
    }

    // 🔹 初回描画完了フック登録（★ここ）
    setOnFirstRender(() => {
      // 部屋が表示された瞬間に実行される
      if (messageEl) messageEl.style.display = 'none';
      document.getElementById('titleText').textContent = title;
      document.title = title;
    });
    
    //console.log("[DEBUG] initializing gallery...");
    // 改修：roomId と images のみ渡す
    galleryModule.initGallery(roomId, images, config);

    //console.log("[DEBUG] setting up room links...");
    await roomLinksModule.setupRoomLinks();
    //console.log("[DEBUG] setupRoomLinks finished");

  } catch (err) {
    console.error("[ERROR] 部屋情報の取得に失敗:", err);
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = 'ギャラリー情報の読み込みに失敗しました。';
    document.body.appendChild(msg);
  }
}

// ========================================================
// URL パラメータから roomId を取得して init を実行
// ========================================================
console.log("[DEBUG] main.js param check start");

const params = new URLSearchParams(window.location.search);
const roomId = params.get('roomId');

const messageEl = document.getElementById('message');

if (!roomId) {
  console.warn("[WARN] roomId が指定されていません");
  if (messageEl) {
    messageEl.style.display = 'block';
    messageEl.textContent = '❌ roomId が指定されていません。URL に ?roomId=XXX を付加してください。';
  }
} else {
  //console.log("[DEBUG] initGalleryFromRoomId will be executed with:", roomId);
  initGalleryFromRoomId(roomId);
}
