// Content Script：框選 UI + 顯示翻譯結果
// 所有截圖、OCR、翻譯邏輯都在 background 處理

(function () {
  'use strict';

  let isSelecting = false;
  let startX, startY;
  let overlay, selectionBox;
  let toolbar;
  let continuousMode = false;
  let selectBtn;

  // 快捷鍵快取（避免每次 keydown 讀 storage）
  let cachedShortcut = 'Alt+S';
  chrome.storage.local.get(['customShortcut'], (data) => {
    if (data.customShortcut) cachedShortcut = data.customShortcut;
  });
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.customShortcut) cachedShortcut = changes.customShortcut.newValue || 'Alt+S';
    if (changes.continuousMode) continuousMode = changes.continuousMode.newValue || false;
  });

  // 更新框選按鈕狀態
  function updateSelectBtnState() {
    if (!selectBtn) return;
    if (isSelecting) {
      selectBtn.textContent = '⏹ 停止框選';
      selectBtn.classList.add('active');
    } else {
      selectBtn.textContent = '📷 框選翻譯';
      selectBtn.classList.remove('active');
    }
  }

  // 初始化浮動工具列
  function initToolbar() {
    chrome.storage.local.get(['showToolbar', 'continuousMode'], (data) => {
      if (data.showToolbar === false) return;
      continuousMode = data.continuousMode || false;
      createToolbar();
    });
  }

  function createToolbar() {
    if (toolbar) return;
    toolbar = document.createElement('div');
    toolbar.className = 'ktl-toolbar';

    selectBtn = document.createElement('button');
    selectBtn.textContent = '📷 框選翻譯';
    selectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isSelecting) {
        cleanup();
      } else {
        startSelection();
      }
    });

    const divider1 = document.createElement('div');
    divider1.className = 'ktl-divider';

    const continuousBtn = document.createElement('button');
    continuousBtn.textContent = '🔄 連續';
    continuousBtn.title = '連續框選模式：框選完可捲動頁面，再點一下繼續框選';
    if (continuousMode) continuousBtn.classList.add('active');
    continuousBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      continuousMode = !continuousMode;
      continuousBtn.classList.toggle('active', continuousMode);
      chrome.storage.local.set({ continuousMode });
    });

    const divider2 = document.createElement('div');
    divider2.className = 'ktl-divider';

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '🗑 清除';
    clearBtn.addEventListener('click', (e) => { e.stopPropagation(); clearResults(); });

    toolbar.appendChild(selectBtn);
    toolbar.appendChild(divider1);
    toolbar.appendChild(continuousBtn);
    toolbar.appendChild(divider2);
    toolbar.appendChild(clearBtn);
    document.body.appendChild(toolbar);

    makeDraggableFixed(toolbar);
  }

  // 讓 fixed 定位元素可拖曳（工具列用）
  function makeDraggableFixed(el) {
    let isDragging = false;
    let dragStartX, dragStartY, elStartRight, elStartBottom;
    let moved = false;

    function onStart(clientX, clientY) {
      isDragging = true;
      moved = false;
      el.classList.add('ktl-dragging');
      const rect = el.getBoundingClientRect();
      dragStartX = clientX;
      dragStartY = clientY;
      elStartRight = window.innerWidth - rect.right;
      elStartBottom = window.innerHeight - rect.bottom;
    }

    function onMove(clientX, clientY) {
      if (!isDragging) return;
      const dx = clientX - dragStartX;
      const dy = clientY - dragStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      if (!moved) return;
      el.style.right = Math.max(0, elStartRight - dx) + 'px';
      el.style.bottom = Math.max(0, elStartBottom - dy) + 'px';
    }

    function onEnd() {
      isDragging = false;
      el.classList.remove('ktl-dragging');
    }

    el.addEventListener('mousedown', (e) => { onStart(e.clientX, e.clientY); });
    document.addEventListener('mousemove', (e) => { if (isDragging) { e.preventDefault(); onMove(e.clientX, e.clientY); } });
    document.addEventListener('mouseup', onEnd);

    el.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      onStart(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('touchend', onEnd);
  }

  // 快捷鍵監聽（使用快取，不再每次讀 storage）
  document.addEventListener('keydown', (e) => {
    if (matchShortcut(e, cachedShortcut)) {
      e.preventDefault();
      if (isSelecting) {
        cleanup();
      } else {
        startSelection();
      }
    }
  });

  function matchShortcut(e, shortcut) {
    const parts = shortcut.split('+').map((p) => p.trim().toLowerCase());
    const key = parts[parts.length - 1];
    const needCtrl = parts.includes('ctrl');
    const needAlt = parts.includes('alt');
    const needShift = parts.includes('shift');
    const needMeta = parts.includes('meta') || parts.includes('cmd');

    return (
      e.key.toLowerCase() === key &&
      e.ctrlKey === needCtrl &&
      e.altKey === needAlt &&
      e.shiftKey === needShift &&
      e.metaKey === needMeta
    );
  }

  // 框選用 AbortController，cleanup 時一次移除所有 document-level listener
  let selectionAC = null;
  let isDragging = false;

  // 啟動框選模式
  function startSelection() {
    if (isSelecting) return;
    isSelecting = true;
    isDragging = false;
    updateSelectBtnState();

    overlay = document.createElement('div');
    overlay.className = 'ktl-overlay';
    document.body.appendChild(overlay);

    selectionAC = new AbortController();
    const sig = selectionAC.signal;

    // document capture phase 確保最優先攔截
    document.addEventListener('mousedown', onMouseDown, { capture: true, signal: sig });
    document.addEventListener('mousemove', onMouseMove, { capture: true, signal: sig });
    document.addEventListener('mouseup', onMouseUp, { capture: true, signal: sig });
    document.addEventListener('touchstart', onTouchStart, { passive: false, capture: true, signal: sig });
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true, signal: sig });
    document.addEventListener('touchend', onTouchEnd, { passive: false, capture: true, signal: sig });
    document.addEventListener('keydown', onEsc, { signal: sig });
  }

  function onEsc(e) {
    if (e.key === 'Escape') cleanup();
  }

  function onTouchStart(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    const touch = e.touches[0];
    beginDrag(touch.clientX, touch.clientY);
  }

  function onTouchMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const touch = e.touches[0];
    updateDrag(touch.clientX, touch.clientY);
  }

  function onTouchEnd(e) {
    if (!isDragging) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const touch = e.changedTouches[0];
    endDrag(touch.clientX, touch.clientY);
  }

  function cleanup() {
    isSelecting = false;
    isDragging = false;
    updateSelectBtnState();
    if (selectionAC) { selectionAC.abort(); selectionAC = null; }
    if (overlay) { overlay.remove(); overlay = null; }
    if (selectionBox) { selectionBox.remove(); selectionBox = null; }
  }

  function onMouseDown(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    beginDrag(e.clientX, e.clientY);
  }

  function beginDrag(cx, cy) {
    isDragging = true;
    startX = cx;
    startY = cy;
    selectionBox = document.createElement('div');
    selectionBox.className = 'ktl-selection-box';
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    document.body.appendChild(selectionBox);
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    updateDrag(e.clientX, e.clientY);
  }

  function updateDrag(cx, cy) {
    if (!selectionBox) return;
    const x = Math.min(cx, startX);
    const y = Math.min(cy, startY);
    const w = Math.abs(cx - startX);
    const h = Math.abs(cy - startY);
    selectionBox.style.left = x + 'px';
    selectionBox.style.top = y + 'px';
    selectionBox.style.width = w + 'px';
    selectionBox.style.height = h + 'px';
  }

  function onMouseUp(e) {
    if (!isDragging) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    endDrag(e.clientX, e.clientY);
  }

  function endDrag(cx, cy) {
    const rect = {
      x: Math.min(cx, startX),
      y: Math.min(cy, startY),
      w: Math.abs(cx - startX),
      h: Math.abs(cy - startY),
    };

    cleanup();
    if (rect.w < 10 || rect.h < 10) return;

    processSelection(rect);

    if (continuousMode) {
      if (selectBtn) {
        selectBtn.textContent = '▶ 繼續框選';
        selectBtn.classList.add('active');
      }
    }
  }

  // 手機端 DOM 擷取 fallback
  function captureFromDOM(rect) {
    const elements = document.elementsFromPoint(rect.x + rect.w / 2, rect.y + rect.h / 2);
    let sourceEl = null;
    for (const el of elements) {
      if (el.tagName === 'CANVAS' || el.tagName === 'IMG') {
        sourceEl = el;
        break;
      }
    }
    if (!sourceEl) {
      const points = [
        [rect.x + 5, rect.y + 5],
        [rect.x + rect.w - 5, rect.y + 5],
        [rect.x + 5, rect.y + rect.h - 5],
        [rect.x + rect.w - 5, rect.y + rect.h - 5],
      ];
      for (const [px, py] of points) {
        const els = document.elementsFromPoint(px, py);
        for (const el of els) {
          if (el.tagName === 'CANVAS' || el.tagName === 'IMG') {
            sourceEl = el;
            break;
          }
        }
        if (sourceEl) break;
      }
    }
    if (!sourceEl) return null;

    const elRect = sourceEl.getBoundingClientRect();
    if (!elRect.width || !elRect.height) return null;

    // 用原始圖片像素計算裁切區域（保留最高解析度）
    const naturalW = sourceEl.tagName === 'IMG' ? sourceEl.naturalWidth : sourceEl.width;
    const naturalH = sourceEl.tagName === 'IMG' ? sourceEl.naturalHeight : sourceEl.height;
    if (!naturalW || !naturalH) return null;

    const scaleX = naturalW / elRect.width;
    const scaleY = naturalH / elRect.height;
    const sx = (rect.x - elRect.left) * scaleX;
    const sy = (rect.y - elRect.top) * scaleY;
    const sw = rect.w * scaleX;
    const sh = rect.h * scaleY;

    // 直接使用原始解析度，不縮小（OCR 需要高解析度）
    // 最大限制提高到 2560px，確保文字清晰
    const maxDim = 2560;
    let outW = Math.round(sw);
    let outH = Math.round(sh);
    if (!outW || !outH || !isFinite(outW) || !isFinite(outH)) return null;

    if (outW > maxDim || outH > maxDim) {
      const scale = maxDim / Math.max(outW, outH);
      outW = Math.round(outW * scale);
      outH = Math.round(outH * scale);
    }
    // 如果裁切出來太小，放大到至少 800px（確保 OCR 可辨識）
    const minDim = 800;
    if (outW < minDim && outH < minDim) {
      const scale = minDim / Math.max(outW, outH);
      outW = Math.round(outW * scale);
      outH = Math.round(outH * scale);
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(sourceEl, sx, sy, sw, sh, 0, 0, outW, outH);
      return canvas.toDataURL('image/png');
    } catch (e) {
      return null;
    }
  }

  // 送到 background 處理
  async function processSelection(rect) {
    const loading = document.createElement('div');
    loading.className = 'ktl-loading';
    loading.textContent = '辨識翻譯中…';
    loading.style.left = rect.x + 'px';
    loading.style.top = rect.y + 'px';
    document.body.appendChild(loading);

    try {
      const domCapture = captureFromDOM(rect);

      const result = await new Promise((resolve, reject) => {
        const msg = { action: 'processSelection', rect, dpr: window.devicePixelRatio || 1 };
        if (domCapture) msg.domCapture = domCapture;
        chrome.runtime.sendMessage(msg, (res) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (res && res.success) {
            resolve(res);
          } else {
            reject(new Error(res?.error || '處理失敗'));
          }
        });
      });

      loading.remove();
      showResult(rect, result.translated, result.direction, false);
    } catch (err) {
      loading.remove();
      showResult(rect, `${err.message}`, 'horizontal', true);
    }
  }

  // 顯示翻譯結果
  function showResult(rect, translated, direction, isError) {
    // 用 AbortController 管理此結果框的所有 document-level listener
    const ac = new AbortController();
    const signal = ac.signal;

    const div = document.createElement('div');
    div.className = 'ktl-result';
    if (direction === 'vertical') div.classList.add('ktl-vertical');
    if (isError) div.classList.add('ktl-error');

    // 找 scrollable 容器
    const target = document.elementFromPoint(rect.x + rect.w / 2, rect.y + rect.h / 2);
    let container = null;
    if (target) {
      let el = target;
      while (el && el !== document.documentElement) {
        const style = getComputedStyle(el);
        const overflow = style.overflow + style.overflowY;
        if (/auto|scroll/.test(overflow) && el.scrollHeight > el.clientHeight) {
          container = el;
          break;
        }
        el = el.parentElement;
      }
    }

    if (container) {
      const cRect = container.getBoundingClientRect();
      div.style.position = 'absolute';
      div.style.left = (rect.x - cRect.left + container.scrollLeft) + 'px';
      div.style.top = (rect.y - cRect.top + container.scrollTop) + 'px';
      div.style.width = rect.w + 'px';
      div.style.height = rect.h + 'px';
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }
      container.appendChild(div);
    } else {
      div.style.position = 'absolute';
      div.style.left = (rect.x + window.scrollX) + 'px';
      div.style.top = (rect.y + window.scrollY) + 'px';
      div.style.width = rect.w + 'px';
      div.style.height = rect.h + 'px';
      document.documentElement.appendChild(div);
    }

    // 移除結果框時清理所有 listener
    function removeResult() {
      if (!ac.signal.aborted) ac.abort();
      div.remove();
    }
    div.__ktlCleanup = removeResult;

    // 動作按鈕列（所有按鈕合併在同一列）
    const actions = document.createElement('div');
    actions.className = 'ktl-result-actions';

    // 關閉按鈕
    const closeBtn = document.createElement('button');
    closeBtn.className = 'ktl-close-btn';
    closeBtn.textContent = '✕ 關閉';
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); removeResult(); });
    actions.appendChild(closeBtn);

    // 重翻按鈕
    const retryBtn = document.createElement('button');
    retryBtn.textContent = '🔄 重翻';
    retryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeResult();
      processSelection(rect);
    });
    actions.appendChild(retryBtn);

    // 複製翻譯按鈕
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '📋 複製';
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(translated).then(() => {
        copyBtn.textContent = '✅ 已複製';
        setTimeout(() => { copyBtn.textContent = '📋 複製'; }, 1500);
      });
    });
    actions.appendChild(copyBtn);

    div.appendChild(actions);

    // 翻譯文字
    const transDiv = document.createElement('div');
    transDiv.className = 'ktl-translated';
    transDiv.textContent = translated;
    div.appendChild(transDiv);

    // 自動縮小字體
    let fontSize = 18;
    while (fontSize > 8) {
      transDiv.style.fontSize = fontSize + 'px';
      if (transDiv.scrollWidth <= div.clientWidth && transDiv.scrollHeight <= div.clientHeight) break;
      fontSize--;
    }

    // 結果框拖曳（使用 signal 管理 listener 生命週期）
    {
      let isDragging = false;
      let dragStartX, dragStartY, elStartLeft, elStartTop;
      let moved = false;

      div.addEventListener('mousedown', (e) => {
        if (e.target.closest('.ktl-close, .ktl-result-actions')) return;
        isDragging = true;
        moved = false;
        div.classList.add('ktl-dragging');
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        elStartLeft = parseInt(div.style.left) || 0;
        elStartTop = parseInt(div.style.top) || 0;
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
        if (!moved) return;
        div.style.left = (elStartLeft + dx) + 'px';
        div.style.top = (elStartTop + dy) + 'px';
      }, { signal });

      document.addEventListener('mouseup', () => {
        isDragging = false;
        div.classList.remove('ktl-dragging');
      }, { signal });

      div.addEventListener('touchstart', (e) => {
        if (e.target.closest('.ktl-close, .ktl-result-actions')) return;
        const t = e.touches[0];
        isDragging = true;
        moved = false;
        div.classList.add('ktl-dragging');
        dragStartX = t.clientX;
        dragStartY = t.clientY;
        elStartLeft = parseInt(div.style.left) || 0;
        elStartTop = parseInt(div.style.top) || 0;
      }, { passive: true });

      document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const t = e.touches[0];
        const dx = t.clientX - dragStartX;
        const dy = t.clientY - dragStartY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
        if (!moved) return;
        div.style.left = (elStartLeft + dx) + 'px';
        div.style.top = (elStartTop + dy) + 'px';
      }, { passive: true, signal });

      document.addEventListener('touchend', () => {
        isDragging = false;
        div.classList.remove('ktl-dragging');
      }, { signal });
    }

    // 長按暫時透明（對照原文）
    {
      let pressTimer = null;
      div.addEventListener('mousedown', (e) => {
        if (e.target.closest('.ktl-close, .ktl-result-actions')) return;
        pressTimer = setTimeout(() => { div.style.opacity = '0.1'; }, 400);
      });
      document.addEventListener('mouseup', () => {
        clearTimeout(pressTimer);
        div.style.opacity = '';
      }, { signal });

      div.addEventListener('touchstart', (e) => {
        if (e.target.closest('.ktl-close, .ktl-result-actions')) return;
        pressTimer = setTimeout(() => { div.style.opacity = '0.1'; }, 400);
      }, { passive: true });
      document.addEventListener('touchend', () => {
        clearTimeout(pressTimer);
        div.style.opacity = '';
      }, { signal });
    }

    // 手機端：點一下顯示按鈕列
    div.addEventListener('touchstart', () => {
      div.classList.add('ktl-touch-active');
    }, { passive: true });
    document.addEventListener('touchstart', (e) => {
      if (!div.contains(e.target)) {
        div.classList.remove('ktl-touch-active');
      }
    }, { passive: true, signal });
  }

  function clearResults() {
    document.querySelectorAll('.ktl-result').forEach((el) => {
      if (typeof el.__ktlCleanup === 'function') {
        el.__ktlCleanup();
      } else {
        el.remove();
      }
    });
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'startSelection') {
      startSelection();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initToolbar);
  } else {
    initToolbar();
  }
})();
