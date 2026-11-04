/**
 * ダイアログを開いたときに入力欄へ自動でフォーカスしてよいか。
 * タッチ操作の端末ではキーボードが勝手に出て画面が隠れるので、マウス操作の端末だけにする。
 */
export const canAutoFocus: boolean = (() => {
  try { return window.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch { return false; }
})();
