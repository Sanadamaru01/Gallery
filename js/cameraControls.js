// 必要な import を追記
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCameraMover } from './cameraMover.js';

// --- 以下、cameraControls.js ---
export function setupCameraControls(camera, renderer, controlsTargetY, floor, scene) {
  console.log('[cameraControls] called');

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.mouseButtons.RIGHT = null;
  controls.dampingFactor = 0.1;
  controls.rotateSpeed = -0.1;
  controls.minPolarAngle = Math.PI / 2;
  controls.maxPolarAngle = Math.PI / 2;
  controls.target.set(0, controlsTargetY, 0);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const startPos = new THREE.Vector2();

  let lastPanel = null;
  let lastCameraPos = new THREE.Vector3();
  let lastCameraTarget = new THREE.Vector3();

  const cameraMover = createCameraMover(camera, controls);

  // --- ポインターイベント ---
  renderer.domElement.addEventListener('pointerdown', (event) => {
    startPos.set(event.clientX, event.clientY);
  });

  renderer.domElement.addEventListener('pointerup', (event) => {
    // クリック判定：移動距離が10px以内ならクリックとみなす（指の微細な動きを許容）
    const moveDistance = Math.hypot(event.clientX - startPos.x, event.clientY - startPos.y);
    if (moveDistance > 10) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // --- パネルクリック処理 ---
    const panels = scene.userData.clickablePanels || [];
    const hits = raycaster.intersectObjects(panels, true); // 子要素も含めて判定

    if (hits.length > 0) {
      const clickedObj = hits[0].object;

      // onClick が設定されている場合は実行 (ドアなど)
      if (clickedObj.userData?.onClick) {
        clickedObj.userData.onClick();
        return;
      }
      // 親要素に onClick がある場合（ドアの子要素など）を考慮
      if (clickedObj.parent?.userData?.onClick) {
        clickedObj.parent.userData.onClick();
        return;
      }

      const panel = clickedObj;

      if (lastPanel === panel) {
        // 同じパネル再クリック → 後退
        cameraMover.moveCameraTo(lastCameraTarget, lastCameraPos, true);
        lastPanel = null;
        return;
      }

      // 新しいパネルクリック → 前進
      lastPanel = panel;
      lastCameraPos.copy(camera.position);
      lastCameraTarget.copy(controls.target);

      // --- パネルクリック時の距離計算 ---
      const panelCenter = new THREE.Vector3();
      panel.getWorldPosition(panelCenter);

      const panelNormal = new THREE.Vector3(0, 0, -1)
        .applyQuaternion(panel.quaternion)
        .normalize();

      const panelWidth = panel.userData.size?.width || 1;
      const panelHeight = panel.userData.size?.height || 1;
      const fov = THREE.MathUtils.degToRad(camera.fov);

      // ▼▼ ここから追加修正 ▼▼
      function getEffectiveAspect() {
        const header = document.getElementById('titleBar');
        const headerHeight = header ? header.offsetHeight || 0 : 0;
        const effectiveHeight = Math.max(window.innerHeight - headerHeight, 1);
        return window.innerWidth / effectiveHeight;
      }
      const aspect = getEffectiveAspect();
      // ▲▲ ここまで修正（元の "window.innerWidth / window.innerHeight" を置換）▲▲

      const distH = (panelHeight / 2) / Math.tan(fov / 2);
      const distW = (panelWidth / 2) / (Math.tan(fov / 2) * aspect);

      let distance = Math.max(distH, distW) * 1.1; // ← const → let に変更

      const isPortraitScreen = window.innerHeight > window.innerWidth;
      const isPortraitImage = panelHeight > panelWidth;

      if (isPortraitScreen && isPortraitImage) {
        // 縦画面 × 縦写真 → 少し離す
        distance *= 1.15;
      } else if (isPortraitScreen && !isPortraitImage) {
        // 縦画面 × 横写真 → 少し寄る
        distance *= 0.85;
      } else if (!isPortraitScreen && !isPortraitImage) {
        // 横画面 × 横写真 → 少し離す
        distance *= 1.1;
      }

      // カメラ位置を算出
      const camPos = panelCenter.clone().addScaledVector(panelNormal, -distance);
      camPos.y = camera.position.y;

      const lookAt = panelCenter.clone();
      cameraMover.moveCameraTo(lookAt, camPos);
      return;
    }

    // --- 床クリック処理（修正版：向き維持） ---
    const floorHits = raycaster.intersectObject(floor);
    if (floorHits.length > 0) {
      const clicked = floorHits[0].point;

      const wallLimit = scene.userData.wallWidth / 2 - 0.5;
      if (Math.abs(clicked.x) > wallLimit || Math.abs(clicked.z) > wallLimit) return;

      // 移動前のカメラ向きベクトルを取得
      const dir = camera.getWorldDirection(new THREE.Vector3()).normalize();

      // 新しいカメラ位置
      const camPos = new THREE.Vector3(clicked.x, camera.position.y, clicked.z);

      // 向きを維持したlookAtを算出（カメラ移動後でも同じ方向を向く）
      const lookAt = camPos.clone().add(dir.clone().multiplyScalar(0.1));

      cameraMover.moveCameraTo(lookAt, camPos);

      lastPanel = null;
    }
  });

  window.addEventListener('resize', () => {
    const titleBar = document.getElementById('titleBar');
    const headerHeight = titleBar ? titleBar.offsetHeight || 60 : 60;
    camera.aspect = window.innerWidth / (window.innerHeight - headerHeight);
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight - headerHeight);
  });

  return {
    controls,
    animateCamera: cameraMover.animateCamera
  };
}
