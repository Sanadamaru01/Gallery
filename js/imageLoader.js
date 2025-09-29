import * as THREE from 'three';

// メイン関数：画像読み込みと計画適用
export async function loadImages(scene, imageFiles, wallWidth, wallHeight, fixedLongSide = 3, imageBasePath) {
  const MIN_MARGIN = 1.0;
  const MIN_SPACING = 0.5;
  const loader = new THREE.TextureLoader();

  // 画像情報のプリロード（サイズ取得＋テクスチャ化を並列処理）
  const imageMetaList = await Promise.all(imageFiles.map(src => {
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

        // Textureも並列ロード
        loader.load(imageBasePath + src, (texture) => {
          // r175用色空間・フィルター設定
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          resolve({ fw, fh, texture, src });
        });
      };
      img.src = imageBasePath + src;
    });
  }));

  const imageSizes = imageMetaList.map(item => ({ fw: item.fw, fh: item.fh }));
  const layoutPlan = planWallLayouts(imageSizes, wallWidth, MIN_MARGIN, MIN_SPACING);
  applyWallLayouts(scene, layoutPlan, imageMetaList, wallWidth, wallHeight);
}

// Three.js上に画像を貼る
export function applyWallLayouts(scene, layoutPlan, imageMetaList, wallWidth, wallHeight) {
  const GALLERY_HEIGHT = wallHeight / 2;

  // 既存クリック対象を維持
  scene.userData.clickablePanels = scene.userData.clickablePanels || [];

  const wallData = {
    front: { axis: 'x', origin: -wallWidth / 2, z: wallWidth / 2 - 0.1, rotY: Math.PI },
    right: { axis: 'z', origin: wallWidth / 2, x: -wallWidth / 2 + 0.1, rotY: Math.PI / 2 },
    left:  { axis: 'z', origin: wallWidth / 2, x:  wallWidth / 2 - 0.1, rotY: -Math.PI / 2 }
  };

  layoutPlan.forEach(plan => {
    const wall = wallData[plan.wall];
    plan.images.forEach(img => {
      const meta = imageMetaList[img.index];
      const texture = meta.texture;

      const fx = wall.axis === 'x' ? wall.origin + img.offset : wall.x;
      const fz = wall.axis === 'z' ? wall.origin - img.offset : wall.z;
      const fy = GALLERY_HEIGHT;

      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(img.fw, img.fh, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
      );
      frame.position.set(fx || 0, fy, fz || 0);
      frame.rotation.y = wall.rotY;
      scene.add(frame);

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

      // クリック時に距離計算に使うサイズ情報を userData に追加
      panel.userData.size = { width: img.fw, height: img.fh };

      // クリック対象に追加
      scene.userData.clickablePanels.push(panel);
    });
  });
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

    const totalSpacing = minSpacing * (count - 1);
    const totalWidth = totalImageWidth;
    const extraSpace = availableWidth - totalWidth;
    let offset = minMargin + extraSpace / 2;

    const wallPlan = {
      wall: wallName,
      images: []
    };

    for (let i = 0; i < count; i++) {
      const idx = imageIndex + (wallName === 'front' ? count - 1 - i : i);
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
