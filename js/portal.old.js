const now = new Date();

async function loadConfigJson() {
  const res = await fetch('./portalConfig.json?t=' + Date.now());
  if (!res.ok) throw new Error('portalConfig.json の読み込みに失敗しました');
  return await res.json();
}

async function loadRoomConfig(roomId) {
  const path = `./rooms/${roomId}/RoomConfig.json`;
  const res = await fetch(`${path}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return await res.json();
}

function isWithinPeriod(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  return now >= start && now <= end;
}

function createRoomCard(roomId, config, isOpen) {
  const container = document.createElement('div');
  container.className = 'room-card';

  const link = document.createElement('a');
  link.href = `./rooms/${roomId}/index.html`;
  if (!isOpen) link.classList.add('closed');

  const thumb = document.createElement('img');
  thumb.src = `./rooms/${roomId}/thumbnail.jpg`;
  thumb.alt = config.roomTitle;
  thumb.onerror = () => { thumb.src = 'noimage.jpg'; };

  const title = document.createElement('h3');
  title.textContent = config.roomTitle;

  const dates = document.createElement('p');
  dates.textContent = `${config.startDate} ～ ${config.endDate}`;

  const status = document.createElement('p');
  status.textContent = isOpen ? '🔓 公開中' : '🔒 非公開';

  link.append(thumb, title, dates, status);
  container.appendChild(link);
  return container;
}

async function renderAllRooms() {
  const container = document.getElementById('roomList');
  container.textContent = '読み込み中...';

  try {
    const config = await loadConfigJson();
    const rooms = config.rooms;

    container.textContent = '';

    for (const roomId of rooms) {
      try {
        const roomConfig = await loadRoomConfig(roomId);
        const isOpen = isWithinPeriod(roomConfig.startDate, roomConfig.endDate);
        const card = createRoomCard(roomId, roomConfig, isOpen);
        container.appendChild(card);
      } catch (e) {
        console.warn(`${roomId} 読み込みエラー:`, e);
      }
    }
  } catch (e) {
    container.textContent = 'ルーム一覧の読み込みに失敗しました。';
    console.error(e);
  }
}

renderAllRooms();
