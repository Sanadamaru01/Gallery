// utils.js - 分割版独立動作
import pica from "https://cdn.skypack.dev/pica";

// -------------------- ログ出力 --------------------
let globalLogArea = document.getElementById("log");

export function log(msg) {
  const t = new Date().toLocaleString();
  const line = `[${t}] ${msg}\n`;
  if (globalLogArea) globalLogArea.textContent = line + globalLogArea.textContent;
  console.log(msg);
}

// -------------------- HTML エスケープ --------------------
export function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c]));
}

// -------------------- select オプション選択 --------------------
export function selectOptionByValue(selectEl, value, logger = null) {
  if (!selectEl || !value) return;
  const opts = Array.from(selectEl.options);
  const found = opts.find(o => o.value === value);
  if (found) {
    selectEl.value = value;
  } else {
    if (logger) logger(`⚠️ 選択肢に存在しない値が設定されています: ${value}`);
    console.warn(`[selectOptionByValue] not found: ${value}`);
  }
}

// -------------------- 画像リサイズ（pica 使用 WebP 変換） --------------------
export async function resizeImageToWebp(file, maxLongSide = 1600, quality = 0.9) {
  const img = new Image();
  const objectURL = URL.createObjectURL(file);
  img.src = objectURL;
  await img.decode();

  const long = Math.max(img.width, img.height);
  const scale = long > maxLongSide ? (maxLongSide / long) : 1;
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = img.width;
  sourceCanvas.height = img.height;
  sourceCanvas.getContext("2d").drawImage(img, 0, 0);

  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = width;
  targetCanvas.height = height;

  await pica().resize(sourceCanvas, targetCanvas);
  const blob = await new Promise(resolve => targetCanvas.toBlob(resolve, "image/webp", quality));
  URL.revokeObjectURL(objectURL);
  return blob;
}

console.log("utils.js loaded");
