import { loadRoomConfig } from './RoomConfigLoader.js';
import { checkAccessAndShowMessage } from './accessControl.js';
import { initGallery } from './gallery.js';

const roomPath = './';

loadRoomConfig(`${roomPath}RoomConfig.json`)
  .then(({ config, images, raw }) => {
    const allowed = checkAccessAndShowMessage(raw.startDate, raw.endDate);
    if (!allowed) return;

    const title = raw.roomTitle || 'Untitled Room';
    document.getElementById('titleText').textContent = title;
    document.title = title;

    initGallery(images, config, `${roomPath}images/`);
  })
  .catch(err => {
    console.error('設定ファイルの読み込みに失敗:', err);
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = 'ギャラリー情報の読み込みに失敗しました。';
    document.body.appendChild(msg);
  });
