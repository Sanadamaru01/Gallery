import * as THREE from 'three';
import { createCaptionPanel } from './captionHelper.js'; // キャプション生成関数

// メイン関数：画像読み込みと壁への配置
export async function loadImages(scene, imageFiles, wallWidth, wallHeight, fixedLongSide = 3, imageBasePath) {
  const MIN_MARGIN = 1.0;
  const MIN_SPACING = 0.5;
  const loader = new THREE.TextureLoader();

  // 画像情報のプリロード（サイズ取得＋テクスチャ化を並列処理）
  const imageMetaList = await Promise.all(imageFiles.map(srcObj => {
    const src = typeof srcObj === 'string' ? srcObj : srcObj.file;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const iw = img.width;
        const ih = img.height;
        let fw, fh;

        if (iw >= ih) {
          fw = fixedLongSide;
          fh = fixedLongSide * (ih / iw);
        } else {
          fh = fixedLongSide;
          fw = fixedLongSide * (iw / ih);
        }

        loader.load(imageBasePath + src, (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          resolve({ fw, fh, texture, src, title: srcObj.title, caption: srcObj.caption });
        });
      };
      img.src = imageBasePath + src;
    });
  }));

  const imageSizes = imageMetaList.map(item => ({ fw: item.fw, fh: item.fh }));
  const layoutPlan = planWallLayouts(imageSizes, wallWidth, MIN_MARGIN, MIN_SPACING);
  return applyWallLayouts(scene, layoutPlan, imageMetaList, wallWidth, wallHeight); // メッシュ配列を返す
}

// Three.js上に画像とキャプションを貼る
export function applyWallLayouts(scene, layoutPlan, imageMetaList, wallWidth, wallHeight) {
  const GALLERY_HEIGHT = wallHeight / 2;
  scene.userData.clickablePanels = scene.userData.clickablePanels || [];

  const wallData = {
    front: { axis: 'x', origin: -wallWidth / 2, z: wallWidth / 2 - 0.1, rotY: Math.PI },
    right: { axis: 'z', origin: wallWidth / 2, x: -wallWidth / 2 + 0.1, rotY: Math.PI / 2 },
    left:  { axis: 'z', origin: wallWidth / 2, x:  wallWidth / 2 - 0.1, rotY: -Math.PI / 2 }
  };

  const meshes = [];

  layoutPlan.forEach(plan => {
    const wall = wallData[plan.wall];
    plan.images.forEach(img => {
      const meta = imageMetaList[img.index];
      const texture = meta.texture;

      // 壁の座標に応じた位置
      const fx = wall.axis === 'x' ? wall.origin + img.offset : wall.x;
      const fz = wall.axis === 'z' ? wall.origin - img.offset : wall.z;
      const fy = GALLERY_HEIGHT;

      // フレーム作成
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(img.fw, img.fh, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
      );
      frame.position.set(fx || 0, fy, fz || 0);
      frame.rotation.y = wall.rotY;
      scene.add(frame);

      // 画像パネル
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(img.fw * 0.95, img.fh * 0.95),
        new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
      );
      panel.position.copy(frame.position);
      panel.rotation.y = wall.rotY;

      const offsetVec = new THREE.Vector3(0, 0, 0.03);
      offsetVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), wall.rotY);
      panel.position.add(offsetVec);
      scene.add(panel);

      // クリック対象登録
      panel.userData.size = { width: img.fw, height: img.fh };
      scene.userData.clickablePanels.push(panel);

      // キャプション生成（画像と同じループ内で作る）
      if (meta.title && meta.caption) {
        const aspect = img.fw / img.fh;
        const captionPanel = createCaptionPanel(panel, meta.title, meta.caption, aspect);
        panel.userData.captionPanel = captionPanel;
      }

      meshes.push(panel);
    });
  });

  return meshes;
}

// 壁幅・画像サイズから貼り付けプランを作成
export function planWallLayouts(imageSizes, wallWidth, minMargin, minSpacing) {
  const wallNames = ['front', 'right', 'left'];
  const plans = [];
  let imageIndex = 0;

  for (const wallName of wallNames) {
    const availableWidth = wallWidth - 2 * minMargin;
    let count = 0;
    let totalImageWidth = 0;

    while (imageIndex + count < imageSizes.length) {
      const w = imageSizes[imageIndex + count].fw;
      const spacing = count > 0 ? minSpacing : 0;
      if (totalImageWidth + spacing + w > availableWidth) break;
      totalImageWidth += spacing + w;
      count++;
    }

    if (count === 0) continue;

    const totalWidth = totalImageWidth;
    const extraSpace = availableWidth - totalWidth;
    let offset = minMargin + extraSpace / 2;

    const wallPlan = { wall: wallName, images: [] };

    for (let i = 0; i < count; i++) {
      // 正面と左面は左から右、右面は左から右でそのまま
      let idx;
      if (wallName === 'front' || wallName === 'left') {
        idx = imageIndex + (count - 1 - i); // 左右逆順で左から並ぶよう調整
      } else {
        idx = imageIndex + i;
      }

      const { fw, fh } = imageSizes[idx];
      wallPlan.images.push({
        index: idx,
        fw,
        fh,
        offset: offset + fw / 2
      });

      offset += fw + minSpacing;
    }

    plans.push(wallPlan);
    imageIndex += count;
  }

  return plans;
}
