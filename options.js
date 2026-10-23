// Chrome won't let an extension assign a chrome.commands shortcut, so the combo is
// recorded here and matched by the content script instead.
const record = document.getElementById('record');
const hint = document.getElementById('hint');
let current = DEFAULT_SHORTCUT;

const render = combo => {
  record.classList.remove('recording');
  hint.textContent = 'クリックして新しいキーを押す';
  record.replaceChildren(...combo.split('+').map(key => {
    const kbd = document.createElement('kbd');
    kbd.textContent = key;
    return kbd;
  }));
};

chrome.storage.sync.get({ shortcut: current }).then(({ shortcut }) => render(current = shortcut));

record.addEventListener('click', () => {
  record.classList.add('recording');
  record.textContent = 'キーを入力…';
  hint.textContent = 'Ctrl / Alt / ⌘ と組み合わせてください';
});

record.addEventListener('blur', () => render(current));

record.addEventListener('keydown', e => {
  if (!record.classList.contains('recording')) return;
  e.preventDefault();
  if (e.code === 'Escape') { render(current); return; }
  const combo = comboOf(e);
  // a bare letter would fire while typing on any page — demand a real modifier
  if (!combo || !/^(Ctrl|Alt|Command)/.test(combo)) return;
  chrome.storage.sync.set({ shortcut: current = combo });
  render(combo);
  hint.textContent = '保存しました';
});
