/* global chrome */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open_options_page") {
    chrome.tabs.create({
      url: "settings_files/options.html"
    });
  }
});