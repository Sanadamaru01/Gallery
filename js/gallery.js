import * as THREE from 'three';
import { buildRoom } from './roomBuilder.js';
import { setupCameraControls } from './cameraControls.js';
import { loadImages } from './imageLoader.js';
import { createCaptionPanel } from './captionHelper.js'; // 旧版キャプション用

export async function initGallery(imageFiles, config, imageBasePath) {
  const {
    wallWidth: WALL_WIDTH,
    wallHeight: WALL_HEIGHT,
    fixedLongSide,
    backgroundColor
  } = config;

  const titleBar = document.getElementById('titleBar');
  const HEADER_HEIGHT = titleBar ? parseInt(titleBar.dataset.height || '60', 10) : 60;
  const GALLERY_HEIGHT = WALL_HEIGHT / 2;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(backgroundColor);
  scene.userData.wallWidth = WALL_WIDTH;
  scene.userData.clickablePanels = [];

  // カメラ設定
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / getViewportHeightMinusHeader(),
    0.1,
    1000
  );
  camera.position.set(0, GALLERY_HEIGHT, -0.5);
  camera.lookAt(0, GALLERY_HEIGHT, 0);

  // レンダラー設定（最新版の詳細）
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, getViewportHeightMinusHeader());
  renderer.colorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;
  console.log('✅ Renderer colorSpace:', renderer.colorSpace);
  console.log('✅ ToneMapping:', renderer.toneMapping);
  console.log('✅ ToneMappingExposure:', renderer.toneMappingExposure);

  document.body.appendChild(renderer.domElement);

  // 部屋とドア生成
  const { floor, door } = await buildRoom(scene, config);

  // ドアクリック処理
  door.userData.onClick = () => {
    console.log('✅ ドアがクリックされました');
    window.location.href = '../../index.html';
  };
  door.traverse((child) => {
    if (child !== door) child.userData.onClick = door.userData.onClick;
  });

  // 照明
  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  const ambientLight = new THREE.AmbientLight(0x888888, 0.5);
  scene.add(light, light.target, ambientLight);
  const lightOffset = new THREE.Vector3(0, 10, 7.5);

  // カメラコントロール
  const { controls, animateCamera } = setupCameraControls(
    camera, renderer, GALLERY_HEIGHT, floor, scene
  );

  // 画像読み込み・配置（旧版キャプション対応）
  const loadedMeshes = await loadImages(scene, imageFiles, WALL_WIDTH, WALL_HEIGHT, fixedLongSide, imageBasePath);

  // キャプション生成（旧版）
  loadedMeshes.forEach((mesh, idx) => {
    const imgData = imageFiles[idx];
    if (imgData.title && imgData.caption) {
      const aspect = mesh.geometry.parameters.width / mesh.geometry.parameters.height;
      const captionPanel = createCaptionPanel(mesh, imgData.title, imgData.caption, aspect);
      mesh.userData.captionPanel = captionPanel;
    }
  });

  // ビューポート
  function getViewportHeight() { return document.documentElement.clientHeight; }
  function getViewportHeightMinusHeader() { return getViewportHeight() - HEADER_HEIGHT; }

  // リサイズ対応
  function onWindowResize() {
    const width = window.innerWidth;
    const height = getViewportHeightMinusHeader();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
  }
  window.addEventListener('resize', () => setTimeout(onWindowResize, 100));
  onWindowResize();

  // 描画ループ
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    animateCamera();

    // キャプション距離制御（旧版）
    loadedMeshes.forEach(mesh => {
      if (mesh.userData.captionPanel) {
        const distance = camera.position.distanceTo(mesh.position);
        mesh.userData.captionPanel.visible = distance < 3;
      }
    });

    // 照明追従
    const lightPos = lightOffset.clone();
    camera.localToWorld(lightPos);
    light.position.copy(lightPos);
    light.target.position.copy(controls.target);

    renderer.render(scene, camera);
  }

  // クリック処理
  window.addEventListener('click', (event) => {
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / getViewportHeightMinusHeader()) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.userData.clickablePanels || [], true);
    if (intersects.length > 0) {
      const clicked = intersects[0].object;
      if (clicked.userData && typeof clicked.userData.onClick === 'function') clicked.userData.onClick();
    }
  });

  animate();
}
