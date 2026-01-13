/* global chrome */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
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