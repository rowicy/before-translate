const sanitize = tabId => chrome.scripting.executeScript({
  target: { tabId },
  files: ["content_scripts/sanitize.js"],
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "beforeTranslate") sanitize(tab.id);
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "sanitize") sanitize(tab.id);
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "beforeTranslate",
    title: "日本語に翻訳する前に...",
    contexts: ["page"],
  });
});
