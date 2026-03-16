/* global chrome */

/**
 * Generate a unique installation key
 * Used to identify this specific extension installation
 */
function generateInstallationKey() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `install_${timestamp}_${randomPart}`;
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // Generate and store unique installation key
    const installationKey = generateInstallationKey();
    chrome.storage.local.set({ installationKey: installationKey }, () => {
      console.log('Installation key generated:', installationKey);
    });
    
    chrome.tabs.create({
      url: "setup_files/welcome.html"
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open_options_page") {
    chrome.tabs.create({
      url: "settings_files/options.html"
    });
  }
});