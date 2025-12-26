import * as THREE from 'three';

// テキストを描画した CanvasTexture を返す
function createCaptionTexture(title,author,caption) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let currentY = 28;
  
  // タイトル（少し大きめ）
  ctx.fillStyle = 'white';
  ctx.font = '20px sans-serif';
  if (title) {
    ctx.fillText(title, 10, currentY);
  }
  
  // 作者名（普通）
  ctx.fillStyle = 'white';
  ctx.font = '14px sans-serif';
  if (author) {
    currentY += 24; // タイトルの下に余白
    ctx.fillText(author, 10, currentY);
  }

  // 解説（改行対応、普通）
  ctx.font = '14px sans-serif';
  if (caption) {
    currentY += 24; // 作者の下に余白
    wrapText(ctx, caption, 10, currentY, canvas.width - 20, 22);
  }

  return new THREE.CanvasTexture(canvas);
}

// 長文対応の改行処理
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  if (typeof text !== 'string') text = String(text || '');
  const words = text.split('');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

// キャプションパネルを生成して返す
export function createCaptionPanel(imageMesh, title, author, caption, aspect) {
  const texture = createCaptionTexture(title, author, caption);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });

  // パネルサイズ固定
  const PANEL_WIDTH = 0.8;
  const PANEL_HEIGHT = 0.4;
  const geometry = new THREE.PlaneGeometry(PANEL_WIDTH, PANEL_HEIGHT);
  const panel = new THREE.Mesh(geometry, material);

  // 余白調整用マージン
  const margin = 0.05;

  // 画像サイズを取得
  const imgWidth = imageMesh.geometry.parameters.width;
  const imgHeight = imageMesh.geometry.parameters.height;

  if (aspect > 1) {
    // 横長作品 → 下に配置、右端揃え
    const offsetX = imgWidth / 2 - PANEL_WIDTH / 2;
    const offsetY = -imgHeight / 2 - PANEL_HEIGHT / 2 - margin;
    panel.position.set(offsetX, offsetY, 0.01);
  } else {
    // 縦長作品 → 右に配置、下端揃え
    const offsetX = imgWidth / 2 + PANEL_WIDTH / 2 + margin;
    const offsetY = -imgHeight / 2 + PANEL_HEIGHT / 2;
    panel.position.set(offsetX, offsetY, 0.01);
  }

  // 画像のローカル座標に追加
  imageMesh.add(panel);
  panel.visible = false; // 初期は非表示

  return panel;
}
