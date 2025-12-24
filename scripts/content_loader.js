/* global chrome */
(async () => {
  const src = chrome.runtime.getURL('scripts/main.js');
  await import(src);
})();
