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
  controls.rotateSpeed = 0.1;
  controls.minPolarAngle = Math.PI / 2;
  controls.maxPolarAngle = Math.PI / 2;
  controls.target.set(0, controlsTargetY, 0);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let moveStart = null, moveFrom = new THREE.Vector3(), moveTo = new THREE.Vector3();
  const moveDuration = 0.6;
  let isClick = false, clickStartTime = 0;

  function moveCameraTo(lookAtPos, offsetDirection = null, distance = 0.5) {
    const direction = offsetDirection
      ? offsetDirection.clone().normalize()
      : new THREE.Vector3().subVectors(camera.position, lookAtPos).normalize();
    
    const newCamPos = lookAtPos.clone().addScaledVector(direction, distance);
    newCamPos.y = camera.position.y;

    controls.target.copy(lookAtPos);
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

    // 🖼 パネルクリック時
    const panels = scene.userData.clickablePanels || [];
    const hits = raycaster.intersectObjects(panels);
    if (hits.length > 0) {
      const panel = hits[0].object;
      const panelCenter = new THREE.Vector3();
      panel.getWorldPosition(panelCenter);
    
      const panelNormal = new THREE.Vector3(0, 0, -1)
        .applyQuaternion(panel.quaternion)
        .normalize();
    
      const lookAtPos = panelCenter.clone().addScaledVector(panelNormal, -1); // ✅ LookAt位置を1m外に
      moveCameraTo(lookAtPos, panelNormal, -0.5); // ✅ そこからさらに1m離れて注視
      return;
    }

    // 🟦 床クリック時
    const floorHits = raycaster.intersectObject(floor);
    if (floorHits.length > 0) {
      const clicked = floorHits[0].point;
      const wallLimit = scene.userData.wallWidth / 2 - 0.5;
      if (Math.abs(clicked.x) > wallLimit || Math.abs(clicked.z) > wallLimit) return;
    
      const lookAtPos = new THREE.Vector3(clicked.x, controls.target.y, clicked.z);
      const offsetDir = new THREE.Vector3().subVectors(lookAtPos, camera.position).normalize();
      moveCameraTo(lookAtPos, offsetDir, -0.5); // 向きに合わせて1m後方
    }

  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return {
    controls,
    animateCamera: () => {
      if (moveStart !== null) {
        const now = performance.now() / 1000;
        const elapsed = now - moveStart;
        const t = Math.min(elapsed / moveDuration, 1);
        camera.position.lerpVectors(moveFrom, moveTo, t);
        camera.lookAt(controls.target);
        if (t >= 1) moveStart = null;
      }
    },
  };
}
