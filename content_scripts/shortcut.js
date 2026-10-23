// Shared by the options recorder and the content script so both spell a combo the same way.
// e.code, not e.key: Alt+T yields "†" on macOS and shifted keys change layout to layout.
function comboOf(e) {
  if (/^(Control|Alt|Shift|Meta)/.test(e.code)) return '';
  const key = e.code.replace(/^(Key|Digit|Numpad)/, '');
  return [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Command', key]
    .filter(Boolean).join('+');
}

const DEFAULT_SHORTCUT = 'Alt+T';
