import * as THREE from 'three';

export function buildRoom(scene, config) {
  console.log('[roomBuilder] called');
  
  const { wallWidth: WALL_WIDTH, wallHeight: WALL_HEIGHT, backgroundColor } = config;
  const ivory = new THREE.Color(backgroundColor);

  // 床
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(WALL_WIDTH, WALL_WIDTH),
    new THREE.MeshStandardMaterial({ color: ivory })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // 天井
  const ceiling = floor.clone();
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;
  scene.add(ceiling);

  // 壁共通
  const wallGeo = new THREE.PlaneGeometry(WALL_WIDTH, WALL_HEIGHT);
  const wallMat = new THREE.MeshStandardMaterial({
    color: ivory,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide
  });

  // 各壁の追加
  const addWall = (x, y, z, ry) => {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, y, z);
    wall.rotation.y = ry;
    scene.add(wall);
  };

  const h = WALL_HEIGHT / 2, w = WALL_WIDTH / 2;
  addWall(0, h, -w, 0);          // back
  addWall(0, h, w, Math.PI);     // front
  addWall(-w, h, 0, Math.PI / 2); // right
  addWall(w, h, 0, -Math.PI / 2); // left

  return floor;
}
