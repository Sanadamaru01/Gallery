import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
  let moveStart = null;
  let moveFrom = new THREE.Vector3();
  let moveTo = new THREE.Vector3();
  const moveDuration = 0.6;
  let isClick = false;
  let clickStartTime = 0;

  let lastPanel = null;
  let lastCameraPos = new THREE.Vector3();
  let lastCameraTarget = new THREE.Vector3();
  let currentLookAt = new THREE.Vector3();
  let pendingTarget = null;

  function moveCameraTo(lookAtPos, offsetDirection = null, distance = 0.5, isReturn = false) {
    const direction = offsetDirection
      ? offsetDirection.clone().normalize()
      : new THREE.Vector3().subVectors(camera.position, lookAtPos).normalize();

    const newCamPos = lookAtPos.clone().addScaledVector(direction, distance);
    newCamPos.y = camera.position.y;

    if (isReturn) {
      currentLookAt.copy(controls.target);
      pendingTarget = lookAtPos.clone();
    } else {
      controls.target.copy(lookAtPos);
      currentLookAt.copy(lookAtPos);
      pendingTarget = null;
    }

    moveStart = performance.now() / 1000;
    moveFrom.copy(camera.position);
    moveTo.copy(newCamPos);
  }

  window.addEventListener('mousedown', () => {
    isClick = true;
    clickStartTime = performance.now();
  });

  window.addEventListener('mousemove', () => {
    if (performance.now() - clickStartTime > 200) isClick = false;
  });

  window.addEventListener('mouseup', (event) => {
    if (!isClick) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const panels = scene.userData.clickablePanels || [];
    const hits = raycaster.intersectObjects(panels);

    if (hits.length > 0) {
      const panel = hits[0].object;

      if (lastPanel === panel) {
        // 同じパネル再クリック → 後退
        moveCameraTo(lastCameraTarget, null, 0, true);
        moveTo.copy(lastCameraPos);
        lastPanel = null;
        return;
      }

      // 新しいパネルクリック → 前進
      lastPanel = panel;
