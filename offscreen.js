// Offscreen Document：圖片裁切

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'cropImage') {
    cropImage(message.dataUrl, message.rect, message.dpr)
      .then((cropped) => sendResponse({ success: true, dataUrl: cropped }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

function cropImage(dataUrl, rect, dpr) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let cw = rect.w * dpr;
      let ch = rect.h * dpr;
      // 限制最大邊 2560px
      const maxDim = 2560;
      if (cw > maxDim || ch > maxDim) {
        const scale = maxDim / Math.max(cw, ch);
        cw = Math.round(cw * scale);
        ch = Math.round(ch * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        img,
        rect.x * dpr, rect.y * dpr, rect.w * dpr, rect.h * dpr,
        0, 0, cw, ch
      );
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('圖片載入失敗'));
    img.src = dataUrl;
  });
}
