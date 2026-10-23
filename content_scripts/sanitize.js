function sanitizeCodeTags() {
  document.querySelectorAll("p code, li code, td code").forEach(codeEl => {
    if (codeEl.closest("pre")) return;

    // If this code is inside a <td> that contains only <code> children (and optional whitespace),
    // do not replace — leave table-only code cells intact.
    const td = codeEl.closest('td');
    if (td) {
      let onlyCodes = true;
      for (const child of td.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.tagName.toLowerCase() !== 'code') { onlyCodes = false; break; }
        } else if (child.nodeType === Node.TEXT_NODE) {
          if (child.textContent.trim() !== '') { onlyCodes = false; break; }
        } // ignore other node types (comments, etc.)
      }
      if (onlyCodes) return;
    }

    const zwsp = '\u200B';
    const parent = codeEl.parentNode;
    const quotedText = ` ${zwsp}${codeEl.textContent}${zwsp} `;
    const textNode = document.createTextNode(quotedText);

    parent.replaceChild(textNode, codeEl);
  });
}

sanitizeCodeTags();
