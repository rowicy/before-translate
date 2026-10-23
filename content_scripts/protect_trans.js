// Ensure <samp> elements are not translated unless already inside a span[translate="no"]
(function() {
  // Comment spans produced by common highlighters (GitHub, highlight.js, Prism, Rouge)
  const COMMENT_SELECTOR = 'pre .pl-c, pre .hljs-comment, pre .token.comment, pre .comment,'
    + ' .react-code-file-contents .pl-c';

  // GitHub's code viewer and the paths around it: identifiers, not prose
  const PROTECT_SELECTOR = [
    'samp',
    '#read-only-cursor-text-area',         // blob view's invisible text overlay
    '.react-code-file-contents',           // blob view's rendered lines
    '[data-testid="breadcrumbs"]',         // owner / repo / path / file name
    '.PRIVATE_TreeView-item-content-text', // file tree sidebar
    '.react-directory-filename-column',    // directory listing
  ].join(', ');

  // Line comment marker by language, for code blocks a highlighter didn't mark up.
  // The language comes from the class names GitHub/highlight.js/Prism put on the block.
  const MARKERS = [
    [/html|xml|svg|vue|xhtml/, /^\s*<!--\s*/],
    [/sql|lua|haskell|elm|hs\b/, /^\s*--+\s*/],
    [/lisp|clojure|scheme|asm|ini/, /^\s*;+\s*/],
    [/js|ts|java|go|c\+\+|cpp|csharp|cs\b|rust|php|swift|kotlin|scala|dart|proto|less|scss/, /^\s*\/\/+\s*/],
    [/./, /^\s*(#+|\/\/+)\s*/], // shell, python, ruby, yaml, dockerfile … and the fallback
  ];

  const MARKER_ONLY = /^\s*(#+|\/\/+|--+|;+|<!--|\*)\s*$/;

  function protectElement(el) {
    if (!(el instanceof Element)) return;
    // If it's already inside a span[translate="no"], do nothing
    if (el.closest('span[translate="no"]')) return;
    // If the element itself already has translate="no", do nothing
    if (el.getAttribute && el.getAttribute('translate') === 'no') return;
    el.setAttribute('translate', 'no');
  }

  // Protect <li> elements that contain only <a> children (and whitespace)
  function processListItem(li) {
    if (!(li instanceof Element)) return;
    if (li.closest && li.closest('span[translate="no"]')) return;
    if (li.getAttribute && li.getAttribute('translate') === 'no') return;

    let onlyAnchors = true;
    for (const child of li.childNodes) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName.toLowerCase() !== 'a') { onlyAnchors = false; break; }
      } else if (child.nodeType === Node.TEXT_NODE) {
        if ((child.textContent || '').trim() !== '') { onlyAnchors = false; break; }
      } else if (child.nodeType === Node.COMMENT_NODE) {
        // comments don't affect the check
        continue;
      } else {
        onlyAnchors = false; break;
      }
    }

    if (onlyAnchors) {
      li.setAttribute('translate', 'no');
      return;
    }

    // Protect <li> whose entire content is a single word with no child elements
    if (li.children.length === 0) {
      const text = (li.textContent || '').trim();
      if (text !== '' && !/\s/.test(text)) {
        li.setAttribute('translate', 'no');
      }
    }
  }

  // Code stays protected, but the prose inside its comments should be translated.
  function processCodeComment(el) {
    if (!(el instanceof Element)) return;
    if (el.getAttribute('translate') === 'yes') return;
    // Markers (#, //, <!--) and shebangs are punctuation, not prose — leave them protected.
    const txt = el.textContent || '';
    if (MARKER_ONLY.test(txt) || /^\s*#!/.test(txt)) { el.setAttribute('translate', 'no'); return; }
    // Google's legacy "notranslate" class skips the whole subtree, while the standard
    // translate attribute lets a descendant opt back in — swap it on every ancestor.
    for (let a = el.parentElement; a; a = a.parentElement) {
      if (a.classList.contains('notranslate')) {
        a.classList.remove('notranslate');
        a.setAttribute('translate', 'no');
      }
    }
    el.setAttribute('translate', 'yes');
  }

  // Same idea for plain code blocks: find comment lines by the language's marker.
  function markPlainComments(pre) {
    const hint = [pre.className, pre.parentElement && pre.parentElement.className,
                  (pre.querySelector('code') || {}).className].join(' ').toLowerCase();
    const marker = MARKERS.find(([lang]) => lang.test(hint))[1];

    const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
    const texts = [];
    for (let n; (n = walker.nextNode()); ) texts.push(n);

    for (const node of texts) {
      if (!node.parentElement || node.parentElement.closest('[translate="yes"]')) continue;
      const frag = document.createDocumentFragment();
      const spans = [];
      for (const line of node.textContent.split(/(?<=\n)/)) {
        const m = line.match(marker);
        const rest = m ? line.slice(m[0].length) : '';
        // rest[0] === '!' keeps shebangs (#!/bin/sh) out of the translator
        if (!m || !rest.trim() || rest[0] === '!') { frag.append(line); continue; }
        frag.append(m[0]);
        const span = document.createElement('span');
        span.textContent = rest;
        frag.append(span);
        spans.push(span);
      }
      if (spans.length) {
        node.replaceWith(frag);
        spans.forEach(processCodeComment);
      }
    }
  }

  function scanAll() {
    document.querySelectorAll(PROTECT_SELECTOR).forEach(protectElement);
    document.querySelectorAll('li').forEach(processListItem);
    document.querySelectorAll(COMMENT_SELECTOR).forEach(processCodeComment);
    document.querySelectorAll('pre').forEach(markPlainComments);
  }

  // Run once on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanAll);
  } else {
    scanAll();
  }

  // Batch mutations: one idle pass over the document beats a scan per added node.
  // Every pass is idempotent, and only childList is observed, so it settles immediately.
  let scheduled = false;
  // the timeout keeps a busy SPA from starving the pass until after the user hits translate
  const idle = cb => window.requestIdleCallback
    ? window.requestIdleCallback(cb, { timeout: 500 })
    : setTimeout(cb, 200);
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    idle(() => { scheduled = false; scanAll(); });
  });

  // Start observing the document
  try {
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  } catch (e) {
    // If observe fails (very early), try again on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    });
  }

  // Chrome can't bind a shortcut from the extension, so match the recorded combo here.
  // Capture phase at document_start: the page can't swallow it first.
  let shortcut = DEFAULT_SHORTCUT;
  chrome.storage.sync.get({ shortcut }).then(v => { shortcut = v.shortcut; });
  chrome.storage.onChanged.addListener(c => {
    if (c.shortcut) shortcut = c.shortcut.newValue;
  });
  window.addEventListener('keydown', e => {
    if (comboOf(e) !== shortcut) return;
    e.preventDefault();
    chrome.runtime.sendMessage('sanitize');
  }, true);

})();
