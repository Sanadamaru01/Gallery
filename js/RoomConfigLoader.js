export async function loadRoomConfig(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error('RoomConfig.json fetch failed');
  const json = await res.json();

  const config = {
    wallWidth: json.wallWidth,
    wallHeight: json.wallHeight,
    fixedLongSide: json.fixedLongSide,
    backgroundColor: json.backgroundColor,
    texturePaths: json.texturePaths,
    roomTitle: json.roomTitle
  };

  const images = json.images;
  return { config, images, raw: json };
}
