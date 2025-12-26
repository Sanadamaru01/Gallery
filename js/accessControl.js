export function checkAccessAndShowMessage(startDate, endDate) {
  const now = new Date();
  //console.log("[DEBUG] checkAccess inputs:", { startDate, endDate, now });

  function toValidDate(value) {
    if (!value) return null;

    // Firestore Timestamp
    if (value.toDate instanceof Function) {
      const d = value.toDate();
      return isNaN(d) ? null : d;
    }

    // 既に Date の場合
    if (value instanceof Date) {
      return isNaN(value) ? null : value;
    }

    // string など
    const d = new Date(value);
    return isNaN(d) ? null : d;
  }

  const start = toValidDate(startDate);
  const end   = toValidDate(endDate);

  //console.log("[DEBUG] normalized start/end:", {
  //  start, end,
  //  startValid: !!start,
  //  endValid: !!end
  //});

  // 両方 null → 非公開
  if (!start && !end) {
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = 'このギャラリーは現在非公開です。（公開設定がされていません）';
    document.body.appendChild(msg);
    console.log("[DEBUG] result = false (both null)");
    return false;
  }

  const inPeriod =
    (!start || now >= start) &&
    (!end || now <= end);

  if (inPeriod) {
    //console.log("[DEBUG] result = true (in period)");
    return true;
  }

  const msg = document.createElement('div');
  msg.className = 'message';

  if (start && now < start) {
    msg.textContent = 'このギャラリーはまだ公開されていません。';
  } else if (end && now > end) {
    msg.textContent = 'このギャラリーの展示期間は終了しました。';
  } else {
    msg.textContent = '現在このギャラリーは非公開です。';
  }

  document.body.appendChild(msg);
  //console.log("[DEBUG] result = false (out of period)");
  return false;
}
