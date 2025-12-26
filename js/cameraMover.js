import * as THREE from 'three';

/**
 * カメラ移動用モジュール
 * 呼び出し側でカメラ位置と注視点を計算して渡す
 */
export function createCameraMover(camera, controls) {
  let moveStart = null;
  let moveFrom = new THREE.Vector3();
  let moveTo = new THREE.Vector3();
  const moveDuration = 0.6;

  let currentLookAt = new THREE.Vector3();
  let pendingTarget = null;

  /**
   * カメラ移動開始
   * @param {THREE.Vector3} lookAtPos - 移動先での注視点（例: パネル中心）
   * @param {THREE.Vector3} camPos - 移動先のカメラ位置
   * @param {boolean} isReturn - 後退フラグ
   */
  function moveCameraTo(lookAtPos, camPos, isReturn = false) {
    moveFrom.copy(camera.position);
    moveTo.copy(camPos);

    if (isReturn) {
      // 後退時: 現在の注視点を保持し、到着後に変更
      currentLookAt.copy(controls.target);
      pendingTarget = lookAtPos.clone();
    } else {
      // 前進時: 注視点を更新しておく（方向情報として保持）
      currentLookAt.copy(lookAtPos);
      pendingTarget = lookAtPos.clone();
    }

    moveStart = performance.now() / 1000;
  }

  /**
   * アニメーション処理（毎フレーム呼び出す）
   */
  function animateCamera() {
    if (moveStart !== null) {
      const now = performance.now() / 1000;
      const elapsed = now - moveStart;
      const t = Math.min(elapsed / moveDuration, 1);

      // --- カメラ位置を補間 ---
      camera.position.lerpVectors(moveFrom, moveTo, t);
      camera.lookAt(currentLookAt);

      // --- 終了処理 ---
      if (t >= 1) {
        moveStart = null;

        if (pendingTarget) {
          // 注視点方向を正規化し、カメラ前方0.1mにtargetを設定
          const dir = new THREE.Vector3().subVectors(pendingTarget, camera.position).normalize();
          const safeTarget = camera.position.clone().addScaledVector(dir, 0.1);

          controls.target.copy(safeTarget);
          camera.lookAt(safeTarget);

          pendingTarget = null;
        } else {
          camera.lookAt(controls.target);
        }
      }
    }
  }

  return { moveCameraTo, animateCamera };
}
