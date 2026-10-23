// Chrome doesn't let an extension assign its own shortcut — it can only show the
// current binding and send the user to the browser's shortcut page.
chrome.commands.getAll().then(commands => {
  const { shortcut } = commands.find(c => c.name === 'sanitize') || {};
  document.getElementById('current').textContent =
    shortcut ? `現在のショートカット: ${shortcut}` : 'ショートカットは未設定です';
});

document.getElementById('open').addEventListener('click', () => {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});
