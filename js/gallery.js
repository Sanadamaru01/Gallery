import * as THREE from 'three';
import { buildRoom } from './roomBuilder.js';
import { setupCameraControls } from './cameraControls.js';
import { loadImages } from './imageLoader.js';

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

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / getViewportHeightMinusHeader(),
    0.1,
    1000
  );
  camera.position.set(0, GALLERY_HEIGHT, -0.5);
  camera.lookAt(0, GALLERY_HEIGHT, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, getViewportHeightMinusHeader());
  renderer.colorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;
  console.log('✅ Renderer colorSpace:', renderer.colorSpace);
  console.log('✅ ToneMapping:', renderer.toneMapping);
  console.log('✅ ToneMappingExposure:', renderer.toneMappingExposure);


  document.body.appendChild(renderer.domElement);

  // ✅ ドアが正しく生成された後で取得
  const { floor, door } = await buildRoom(scene, config);

  // 🔗 ドアにクリック処理を登録
  door.userData.onClick = () => {
    console.log('✅ ドアがクリックされました');
    window.location.href = '../../index.html';
  };
  
  // 🔁 子要素にもクリック処理を委譲
  door.traverse((child) => {
    if (child !== door) {
      child.userData.onClick = door.userData.onClick;
    }
  });


  // 💡 照明
  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  const ambientLight = new THREE.AmbientLight(0x888888, 0.5);
  scene.add(light, light.target, ambientLight);
  const lightOffset = new THREE.Vector3(0, 10, 7.5);

  // 🎥 カメラコントロール
  const { controls, animateCamera } = setupCameraControls(
    camera, renderer, GALLERY_HEIGHT, floor, scene
  );

  // 🖼️ 画像読み込み・配置
  await loadImages(scene, imageFiles, WALL_WIDTH, WALL_HEIGHT, fixedLongSide, imageBasePath);

  // 📏 ビューポート
  function getViewportHeight() {
    return document.documentElement.clientHeight;
  }
  function getViewportHeightMinusHeader() {
    return getViewportHeight() - HEADER_HEIGHT;
  }

  // 📐 リサイズ対応
  function onWindowResize() {
    const width = window.innerWidth;
    const height = getViewportHeightMinusHeader();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
  }
  window.addEventListener('resize', () => {
    setTimeout(onWindowResize, 100);
  });
  onWindowResize();

  // 🌀 描画ループ
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    animateCamera();

    const lightPos = lightOffset.clone();
    camera.localToWorld(lightPos);
    light.position.copy(lightPos);
    light.target.position.copy(controls.target);

    renderer.render(scene, camera);
  }

  // 🖱️ クリック処理
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
      if (clicked.userData && typeof clicked.userData.onClick === 'function') {
        clicked.userData.onClick();
      }
    }
  });

  animate();
}
