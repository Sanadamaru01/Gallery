import * as THREE from 'three';
import { buildRoom } from './roomBuilder.js';
import { setupCameraControls } from './cameraControls.js';
import { loadImages } from './imageLoader.js';

export function initGallery(imageFiles, config, imageBasePath) {
  const {
    wallWidth: WALL_WIDTH,
    wallHeight: WALL_HEIGHT,
    fixedLongSide,
    backgroundColor
  } = config;

  // タイトルバーの高さを data 属性から取得（デフォルト 60）
  const titleBar = document.getElementById('titleBar');
  const HEADER_HEIGHT = titleBar ? parseInt(titleBar.dataset.height || '60', 10) : 60;
  const GALLERY_HEIGHT = WALL_HEIGHT / 2;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(backgroundColor);
  scene.userData.wallWidth = WALL_WIDTH;

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
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.body.appendChild(renderer.domElement);

  // 部屋（床・壁）構築
  const floor = buildRoom(scene, config);

  // 照明
  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  const ambientLight = new THREE.AmbientLight(0x888888, 0.5);
  scene.add(light, light.target, ambientLight);
  const lightOffset = new THREE.Vector3(0, 10, 7.5);

  // カメラコントロール
  const { controls, animateCamera } = setupCameraControls(
    camera, renderer, GALLERY_HEIGHT, floor, scene
  );

  // 画像読み込み・配置
  loadImages(scene, imageFiles, WALL_WIDTH, WALL_HEIGHT, fixedLongSide, imageBasePath);

  // ビューポート高さ取得（安定版）
  function getViewportHeight() {
    return document.documentElement.clientHeight;
  }

  function getViewportHeightMinusHeader() {
    return getViewportHeight() - HEADER_HEIGHT;
  }

  // リサイズ対応
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

  // アニメーションループ
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

  animate();
}
