// textureManager.js
import { getStorage, ref, listAll } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { app } from '../firebaseInit.js';
import { log } from './utils.js';

// Firebase Storage インスタンス
const storage = getStorage(app);

/**
 * Storage パスの候補を順に試す（大文字小文字耐性あり）
 */
export async function tryListAllWithFallbacks(storagePath) {
  const tried = [];
  const parts = storagePath.split('/');
  const prefixes = [parts[0], parts[0].toLowerCase(), parts[0].toUpperCase()];

  for (const pre of prefixes) {
    const pathCandidate = [pre, ...parts.slice(1)].join('/');
    tried.push(pathCandidate);
    try {
      const listRef = ref(storage, pathCandidate);
      const res = await listAll(listRef);
      if (res.items && res.items.length > 0) {
        return { path: pathCandidate, res };
      }
    } catch (e) {
      // 無視して次
    }
  }

  // 最後にオリジナルを試す
  try {
    const listRef = ref(storage, storagePath);
    const res = await listAll(listRef);
    return { path: storagePath, res };
  } catch (e) {
    throw new Error(`listAll failed for candidates: ${tried.join(', ')} - ${e.message}`);
  }
}

/**
 * 指定パスの Storage ファイルを select 要素に反映
 */
async function populateTextureSelect(storagePath, selectEl, logArea, currentValue = "") {
  if (!selectEl) return;
  selectEl.innerHTML = "";

  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "(設定なし)";
  selectEl.appendChild(emptyOpt);

  log(`[TRACE] populateTextureSelect start: ${storagePath}`, logArea);

  try {
    const { path: usedPath, res } = await tryListAllWithFallbacks(storagePath);
    log(`[TRACE] Using path: ${usedPath}, items=${res.items.length}`, logArea);

    if (!res.items || res.items.length === 0) {
      const note = document.createElement("option");
      note.value = "";
      note.textContent = "(Share にファイルがありません)";
      selectEl.appendChild(note);
      log(`⚠️ ${storagePath} にファイルが見つかりませんでした（候補: ${usedPath}）`, logArea);
    } else {
      for (const itemRef of res.items) {
        const relativePath = `${usedPath}/${itemRef.name}`;
        const opt = document.createElement("option");
        opt.value = relativePath;
        opt.textContent = itemRef.name;
        if (relativePath === currentValue) opt.selected = true; // 現在値を選択
        selectEl.appendChild(opt);
        log(`[TRACE] item added: ${relativePath}`, logArea);
      }
    }

    log(`✅ ${usedPath} から ${res.items.length} 件のテクスチャを取得しました`, logArea);

  } catch (err) {
    log(`❌ ${storagePath} の一覧取得エラー: ${err.message}`, logArea);
    const errOpt = document.createElement("option");
    errOpt.value = "";
    errOpt.textContent = "(取得エラー)";
    selectEl.appendChild(errOpt);
  }

  log(`[TRACE] populateTextureSelect end: ${storagePath}`, logArea);
}

/**
 * 各テクスチャ select をロード（現在値も反映可能）
 */
export async function loadAllTextures(selectors, logArea, currentValues = {}) {
  log("[TRACE] loadAllTextures start", logArea);
  log("🖼️ テクスチャ一覧を Storage (Share) から取得しています...", logArea);

  await populateTextureSelect("share/Wall", selectors.wallTexture, logArea, currentValues.wall ?? "");
  await populateTextureSelect("share/Floor", selectors.floorTexture, logArea, currentValues.floor ?? "");
  await populateTextureSelect("share/Ceiling", selectors.ceilingTexture, logArea, currentValues.ceiling ?? "");
  await populateTextureSelect("share/Door", selectors.doorTexture, logArea, currentValues.door ?? "");

  log("✅ テクスチャ一覧取得完了", logArea);
  log("[TRACE] loadAllTextures end", logArea);
}
