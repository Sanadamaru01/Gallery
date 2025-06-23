
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function initGallery(imageFiles, config, imageBasePath) {
  const { wallWidth: WALL_WIDTH, wallHeight: WALL_HEIGHT, fixedLongSide, backgroundColor } = config;
  const GALLERY_HEIGHT = WALL_HEIGHT / 2;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(backgroundColor);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, GALLERY_HEIGHT, -1);
  camera.lookAt(0, GALLERY_HEIGHT, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = false;
  controls.dampingFactor = 0.1;
  controls.rotateSpeed = 0.1;
  controls.minPolarAngle = Math.PI / 2;
  controls.maxPolarAngle = Math.PI / 2;
  controls.target.set(0, GALLERY_HEIGHT, 0);

  const ivory = new THREE.Color(backgroundColor);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(WALL_WIDTH, WALL_WIDTH),
    new THREE.MeshStandardMaterial({ color: ivory })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const ceiling = floor.clone();
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;
  scene.add(ceiling);

  const wallGeo = new THREE.PlaneGeometry(WALL_WIDTH, WALL_HEIGHT);
  const wallMat = new THREE.MeshStandardMaterial({
    color: ivory,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide
  });

  const backWall = new THREE.Mesh(wallGeo, wallMat);
  backWall.position.set(0, WALL_HEIGHT / 2, -WALL_WIDTH / 2);
  scene.add(backWall);

  const frontWall = new THREE.Mesh(wallGeo, wallMat);
  frontWall.rotation.y = Math.PI;
  frontWall.position.set(0, WALL_HEIGHT / 2, WALL_WIDTH / 2);
  scene.add(frontWall);

  const leftWall = new THREE.Mesh(wallGeo, wallMat);
  leftWall.rotation.y = -Math.PI / 2;
  leftWall.position.set(WALL_WIDTH / 2, WALL_HEIGHT / 2, 0);
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.rotation.y = Math.PI / 2;
  rightWall.position.set(-WALL_WIDTH / 2, WALL_HEIGHT / 2, 0);
  scene.add(rightWall);

  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  const ambientLight = new THREE.AmbientLight(0x888888, 0.5);
  scene.add(light, light.target, ambientLight);

  const loader = new THREE.TextureLoader();
  const wallData = [
    { name: 'front',  z: WALL_WIDTH / 2 - 0.1, rotY: Math.PI,       axis: 'x', origin: -WALL_WIDTH / 2, startIndex: 0 },
    { name: 'right',  x: -WALL_WIDTH / 2 + 0.1, rotY: Math.PI / 2,  axis: 'z', origin: WALL_WIDTH / 2,  startIndex: 2 },
    { name: 'left',   x:  WALL_WIDTH / 2 - 0.1, rotY: -Math.PI / 2, axis: 'z', origin: WALL_WIDTH / 2, startIndex: 4 }
  ];

  wallData.forEach(wall => {
    const count = imageFiles.length >= wall.startIndex + 2 ? 2 : 1;
    const spacing = WALL_WIDTH / (count + 1);

    for (let i = 0; i < count; i++) {
      const imagePath = imageBasePath + imageFiles[wall.startIndex + i];
      const img = new Image();
      img.onload = () => {
        const iw = img.width, ih = img.height, aspect = ih / iw;
        let fw, fh;
        if (iw >= ih) {
          fw = fixedLongSide;
          fh = fixedLongSide * aspect;
        } else {
          fh = fixedLongSide;
          fw = fixedLongSide / aspect;
        }

        const fx = wall.axis === 'x' ? wall.origin + spacing * (i + 1) : wall.x;
        const fz = wall.axis === 'z' ? wall.origin - spacing * (i + 1) : wall.z;
        const fy = GALLERY_HEIGHT;

        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(fw, fh, 0.05),
          new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        frame.position.set(fx || 0, fy, fz || 0);
        frame.rotation.y = wall.rotY;
        scene.add(frame);

        loader.load(imagePath, texture => {
          const panel = new THREE.Mesh(
            new THREE.PlaneGeometry(fw * 0.95, fh * 0.95),
            new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
          );
          panel.position.copy(frame.position);
          panel.rotation.y = wall.rotY;
          const offset = new THREE.Vector3(0, 0, 0.03);
          offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), wall.rotY);
          panel.position.add(offset);
          scene.add(panel);
        });
      };
      img.src = imagePath;
    }
  });

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let moveStart = null, moveFrom = new THREE.Vector3(), moveTo = new THREE.Vector3();
  const moveDuration = 0.6;
  let isClick = false, clickStartTime = 0;

  window.addEventListener('mousedown', () => { isClick = true; clickStartTime = performance.now(); });
  window.addEventListener('mousemove', () => {
    if (performance.now() - clickStartTime > 200) isClick = false;
  });
  window.addEventListener('mouseup', (event) => {
    if (!isClick) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(floor);
    if (intersects.length > 0) {
      const clicked = intersects[0].point;
      if (Math.abs(clicked.x) > WALL_WIDTH / 2 - 1 || Math.abs(clicked.z) > WALL_WIDTH / 2 - 1) return;
      const targetY = controls.target.y;
      const lookAtPos = new THREE.Vector3(clicked.x, targetY, clicked.z);
      controls.target.copy(lookAtPos);
      const dir = new THREE.Vector3().subVectors(lookAtPos, camera.position).normalize();
      const newCamPos = lookAtPos.clone().addScaledVector(dir, -1);
      newCamPos.y = camera.position.y;
      moveStart = performance.now() / 1000;
      moveFrom.copy(camera.position);
      moveTo.copy(newCamPos);
    }
  });

  const lightOffset = new THREE.Vector3(0, 10, 7.5);
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    if (moveStart !== null) {
      const now = performance.now() / 1000;
      const elapsed = now - moveStart;
      const t = Math.min(elapsed / moveDuration, 1);
      camera.position.lerpVectors(moveFrom, moveTo, t);
      camera.lookAt(controls.target);
      if (t >= 1) moveStart = null;
    }
    const lightPos = lightOffset.clone();
    camera.localToWorld(lightPos);
    light.position.copy(lightPos);
    light.target.position.copy(controls.target);
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
