// 背景服務 - 處理快捷鍵、截圖、裁切、翻譯

// 共用：帶 429 自動重試的 fetch
async function fetchWithRetry(url, options, maxRetries = 2, delayMs = 3000) {
  let res = await fetch(url, options);
  if (res.status === 429) {
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(r => setTimeout(r, delayMs));
      res = await fetch(url, options);
      if (res.status !== 429) break;
    }
  }
  return res;
}

// 共用：人話化錯誤訊息
function humanizeError(status, rawErr, serviceName) {
  if (status === 401) return `${serviceName} API Key 無效或已過期，請檢查設定`;
  if (status === 403) return `${serviceName} API 權限不足，可能需要啟用 API 或確認 Key 權限`;
  if (status === 404) return `${serviceName} 模型名稱錯誤或不存在，請檢查設定中的模型名稱`;
  if (status === 429) return `${serviceName} 請求過於頻繁（已重試仍失敗），請稍後再試或更換 API Key`;
  if (status === 500 || status === 502 || status === 503) return `${serviceName} 伺服器暫時異常，請稍後再試`;
  if (rawErr && rawErr.includes('Failed to fetch')) return `無法連線到 ${serviceName}，請檢查網路或 URL 是否正確`;
  return `${serviceName} 錯誤 (${status})：${rawErr.slice(0, 150)}`;
}

// 快捷鍵觸發框選模式
chrome.commands.onCommand.addListener((command) => {
  if (command === 'start-selection') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'startSelection' });
      }
    });
  }
});

// 確保 offscreen document 存在（用於圖片裁切）
async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });
  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_PARSER'],
      justification: '圖片裁切',
    });
  }
}

// 接收來自 content script 的請求
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'processSelection') {
    handleProcessSelection(message.rect, message.dpr, message.domCapture)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'startSelectionFromPopup') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'startSelection' });
      }
    });
  }
});

// 完整處理流程：截圖 → 裁切 → 翻譯
async function handleProcessSelection(rect, dpr, domCapture) {
  let croppedDataUrl;

  try {
    const dataUrl = await new Promise((resolve, reject) => {
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (url) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(url);
        }
      });
    });

    await ensureOffscreen();
    const cropResult = await chrome.runtime.sendMessage({
      action: 'cropImage',
      dataUrl,
      rect,
      dpr,
    });
    if (!cropResult || !cropResult.success) throw new Error(cropResult?.error || '圖片裁切失敗');
    croppedDataUrl = cropResult.dataUrl;
  } catch (captureErr) {
    if (domCapture) {
      console.log('[韓漫翻譯] captureVisibleTab 失敗，使用 DOM 擷取 fallback');
      croppedDataUrl = domCapture;
    } else {
      throw new Error('截圖失敗（手機瀏覽器可能不支援此功能），且頁面中找不到可擷取的圖片');
    }
  }

  const settings = await chrome.storage.local.get([
    'translationService', 'sourceLang', 'textDirection',
    'geminiApiKey', 'geminiModel',
    'claudeProxyUrl', 'claudeModel',
    'openaiBaseUrl', 'openaiApiKey', 'openaiModel',
    'groqVisionApiKey', 'groqVisionModel',
    'groqTranslateBackend', 'groqTranslateBaseUrl', 'groqTranslateApiKey', 'groqTranslateModel',
    'groqTranslateGeminiApiKey', 'groqTranslateGeminiModel',
    'geminiApiKey',
    'ocrOnlyEngine', 'ocrOnlyGeminiApiKey', 'ocrOnlyGeminiModel', 'ocrOnlyGroqApiKey', 'ocrOnlyCloudvisionApiKey', 'ocrOnlyOcrspaceApiKey',
    'ocrSpaceApiKey', 'ocrTranslateBackend', 'ocrTranslateBaseUrl', 'ocrTranslateApiKey', 'ocrTranslateModel',
    'ocrTranslateGeminiApiKey', 'ocrTranslateGeminiModel',
    'cvllmApiKey', 'cvllmTranslateBackend', 'cvllmGeminiApiKey', 'cvllmGeminiModel',
    'cvllmBaseUrl', 'cvllmLlmApiKey', 'cvllmLlmModel',
  ]);

  const service = settings.translationService || 'gemini';

  if (service === 'gemini') {
    if (!settings.geminiApiKey) throw new Error('請先在擴充套件設定中填入 Gemini API Key');
    return await translateImageWithGemini(
      croppedDataUrl, settings.geminiApiKey, settings.geminiModel,
      settings.sourceLang || 'ko', settings.textDirection || 'auto'
    );
  } else if (service === 'claude') {
    if (!settings.claudeProxyUrl) throw new Error('請先在設定中填入 Local Proxy URL');
    return await translateImageWithClaude(
      croppedDataUrl, settings.claudeProxyUrl, settings.claudeModel,
      settings.sourceLang || 'ko', settings.textDirection || 'auto'
    );
  } else if (service === 'openai') {
    if (!settings.openaiBaseUrl) throw new Error('請先在設定中填入 API Base URL');
    if (!settings.openaiApiKey) throw new Error('請先在設定中填入 API Key');
    return await translateImageWithOpenAI(
      croppedDataUrl, settings.openaiBaseUrl, settings.openaiApiKey,
      settings.openaiModel, settings.sourceLang || 'ko', settings.textDirection || 'auto'
    );
  } else if (service === 'ocronly') {
    return await ocrOnly(croppedDataUrl, settings);
  } else if (service === 'groqvision') {
    if (!settings.groqVisionApiKey) throw new Error('請先在設定中填入 Groq API Key');
    return await translateWithGroqVision(
      croppedDataUrl, settings.groqVisionApiKey, settings.groqVisionModel,
      settings.sourceLang || 'ko', settings.textDirection || 'auto',
      settings
    );
  } else if (service === 'cloudvisionllm') {
    if (!settings.cvllmApiKey) throw new Error('請先在設定中填入 GCP API Key（需啟用 Cloud Vision API）');
    return await translateWithCloudVision(
      croppedDataUrl, settings.sourceLang || 'ko', settings.textDirection || 'auto', settings
    );
  } else if (service === 'ocrspace') {
    return await translateWithOcrSpace(
      croppedDataUrl, settings.ocrSpaceApiKey,
      settings.sourceLang || 'ko', settings.textDirection || 'auto',
      settings
    );
  }

  throw new Error('未知的翻譯服務，請在設定中選擇翻譯引擎');
}

// ─── Gemini Vision ───

function buildPrompt(sourceLang, textDirection) {
  const langName = sourceLang === 'ja' ? '日文' : '韓文';

  let directionInstruction = '';
  if (textDirection === 'auto') {
    directionInstruction = `請判斷圖片中的文字排列方向，在翻譯結果的第一行回覆 [vertical] 或 [horizontal]。`;
  } else if (textDirection === 'vertical') {
    directionInstruction = `在翻譯結果的第一行回覆 [vertical]。`;
  } else {
    directionInstruction = `在翻譯結果的第一行回覆 [horizontal]。`;
  }

  return `你是專業的${langName}翻譯員。請將圖片中的${langName}對話文字翻譯為繁體中文。這是使用者已購買的正版漫畫，僅需翻譯文字內容。${directionInstruction}
第二行開始是翻譯結果，只回覆翻譯，不加解釋。若無文字則回覆「[horizontal]\n（未辨識到文字）」。`;
}

function buildGeminiBody(base64, sourceLang, textDirection) {
  return {
    contents: [{
      parts: [
        { inline_data: { mime_type: 'image/jpeg', data: base64 } },
        { text: buildPrompt(sourceLang, textDirection) },
      ],
    }],
    safetySettings: [
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };
}

async function translateImageWithGemini(imageDataUrl, apiKey, model, sourceLang, textDirection) {
  const modelId = model || 'gemini-3-flash-preview';
  const base64 = imageDataUrl.split(',')[1];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  const body = JSON.stringify(buildGeminiBody(base64, sourceLang, textDirection));

  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(humanizeError(res.status, err, 'Gemini'));
  }

  const data = await res.json();
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Gemini 未回傳翻譯結果，可能是圖片內容被安全過濾器擋住');
  }

  return parseDirectionResponse(data.candidates[0].content.parts[0].text.trim());
}

// ─── Local API Proxy (OpenAI-compatible) ───

async function translateImageWithClaude(imageDataUrl, proxyUrl, model, sourceLang, textDirection) {
  const modelId = model || 'gpt-4o';
  const prompt = buildPrompt(sourceLang, textDirection);
  const baseUrl = proxyUrl.replace(/\/+$/, '').replace(/\/v1$/, '');

  let res;
  try {
    res = await fetchWithRetry(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageDataUrl } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });
  } catch (e) {
    throw new Error(`無法連線到 Local Proxy (${baseUrl})，請確認 proxy 是否正在運行`);
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(humanizeError(res.status, err, 'Local Proxy'));
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Local Proxy 未回傳翻譯結果');

  return parseDirectionResponse(text.trim());
}

// ─── OpenAI 相容 API ───

async function translateImageWithOpenAI(imageDataUrl, baseUrl, apiKey, model, sourceLang, textDirection) {
  const prompt = buildPrompt(sourceLang, textDirection);
  const url = baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '') + '/v1/chat/completions';

  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageDataUrl } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(humanizeError(res.status, err, 'OpenAI 相容 API'));
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('API 未回傳翻譯結果');

  return parseDirectionResponse(text.trim());
}

// ─── 純 OCR ───

async function ocrOnly(imageDataUrl, settings) {
  const engine = settings.ocrOnlyEngine || 'gemini';
  const sourceLang = settings.sourceLang || 'ko';
  const langName = sourceLang === 'ja' ? '日文' : '韓文';
  const base64 = imageDataUrl.split(',')[1];
  const ocrPrompt = `請辨識圖片中的所有${langName}文字，按照閱讀順序輸出。只輸出原文文字，不要翻譯、不要解釋。若無文字則回覆「（無文字）」。`;

  let ocrText;

  if (engine === 'groq') {
    const groqKey = settings.ocrOnlyGroqApiKey || settings.groqVisionApiKey;
    if (!groqKey) throw new Error('請填入 Groq API Key（純 OCR 設定或 Groq Vision 設定）');

    const res = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
            { type: 'text', text: ocrPrompt },
          ],
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(humanizeError(res.status, err, 'Groq Vision OCR'));
    }
    const data = await res.json();
    ocrText = data.choices?.[0]?.message?.content?.trim();
  } else if (engine === 'cloudvision') {
    // Google Cloud Vision API
    const cvApiKey = settings.ocrOnlyCloudvisionApiKey;
    if (!cvApiKey) throw new Error('請填入 GCP API Key（需在 GCP Console 啟用 Cloud Vision API）');

    const res = await fetchWithRetry(`https://vision.googleapis.com/v1/images:annotate?key=${cvApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [{ type: 'TEXT_DETECTION' }],
          imageContext: {
            languageHints: [sourceLang === 'ja' ? 'ja' : 'ko'],
          },
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(humanizeError(res.status, err, 'Cloud Vision API'));
    }
    const data = await res.json();
    ocrText = data.responses?.[0]?.fullTextAnnotation?.text?.trim();
  } else if (engine === 'ocrspace') {
    // OCR Space
    const ocrApiKey = settings.ocrOnlyOcrspaceApiKey || settings.ocrSpaceApiKey || 'helloworld';
    const ocrLang = sourceLang === 'ja' ? 'jpn' : sourceLang === 'ko' ? 'kor' : 'eng';

    const formData = new FormData();
    formData.append('base64Image', imageDataUrl);
    formData.append('apikey', ocrApiKey);
    formData.append('language', ocrLang);
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');
    formData.append('isOverlayRequired', 'true');

    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();

    if (data.IsErroredOnProcessing) {
      throw new Error('OCR Space 辨識失敗：' + (data.ErrorMessage?.[0] || '未知錯誤'));
    }
    ocrText = data.ParsedResults?.map(r => r.ParsedText).join('\n').trim();
  } else {
    // Gemini Vision（預設）
    const geminiKey = settings.ocrOnlyGeminiApiKey || settings.geminiApiKey;
    if (!geminiKey) throw new Error('請填入 Gemini API Key（純 OCR 設定或全域 Gemini 設定）');
    const model = settings.ocrOnlyGeminiModel || 'gemini-3-flash-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: 'image/png', data: base64 } },
            { text: ocrPrompt },
          ],
        }],
        safetySettings: [
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(humanizeError(res.status, err, 'Gemini Vision OCR'));
    }
    const data = await res.json();
    ocrText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  }

  if (!ocrText || ocrText.includes('（無文字）')) {
    return { success: true, translated: '（未辨識到文字）', direction: 'horizontal' };
  }

  return { success: true, translated: ocrText, direction: 'horizontal' };
}

// ─── Groq Vision OCR + LLM 翻譯 ───

async function translateWithGroqVision(imageDataUrl, groqApiKey, visionModel, sourceLang, textDirection, settings) {
  const langName = sourceLang === 'ja' ? '日文' : '韓文';
  const modelId = visionModel || 'meta-llama/llama-4-scout-17b-16e-instruct';
  const base64 = imageDataUrl.split(',')[1];

  // 1. Groq Vision OCR
  const ocrRes = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
          { type: 'text', text: `請辨識圖片中的所有${langName}文字，按照閱讀順序輸出。只輸出原文文字，不要翻譯、不要解釋。若無文字則回覆「（無文字）」。` },
        ],
      }],
    }),
  });

  if (!ocrRes.ok) {
    const err = await ocrRes.text();
    throw new Error(humanizeError(ocrRes.status, err, 'Groq Vision OCR'));
  }

  const ocrData = await ocrRes.json();
  const ocrText = ocrData.choices?.[0]?.message?.content?.trim();
  if (!ocrText || ocrText.includes('（無文字）')) {
    return { success: true, translated: '（未辨識到文字）', direction: 'horizontal' };
  }

  // 2. 翻譯
  let directionInstruction = '';
  if (textDirection === 'auto') {
    directionInstruction = '請判斷原文的排列方向，在翻譯結果的第一行回覆 [vertical] 或 [horizontal]。';
  } else if (textDirection === 'vertical') {
    directionInstruction = '在翻譯結果的第一行回覆 [vertical]。';
  } else {
    directionInstruction = '在翻譯結果的第一行回覆 [horizontal]。';
  }

  const translatePrompt = `將以下${langName}漫畫對話翻譯為繁體中文。${directionInstruction}\n第二行開始是翻譯結果，只回覆翻譯，不加解釋。\n\n${ocrText}`;

  const backend = settings.groqTranslateBackend || 'openai';
  let translated;

  if (backend === 'gemini') {
    const geminiKey = settings.groqTranslateGeminiApiKey || settings.geminiApiKey;
    if (!geminiKey) throw new Error('請填入 Gemini API Key（Groq Vision 翻譯後端或全域 Gemini 設定）');
    const geminiModel = settings.groqTranslateGeminiModel || 'gemini-3-flash-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;

    const geminiRes = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: translatePrompt }] }],
        safetySettings: [
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      throw new Error(humanizeError(geminiRes.status, err, 'Gemini 翻譯'));
    }

    const geminiData = await geminiRes.json();
    translated = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!translated) throw new Error('Gemini 翻譯未回傳結果');
  } else {
    const effectiveBaseUrl = settings.groqTranslateBaseUrl || 'https://api.groq.com/openai';
    const effectiveApiKey = settings.groqTranslateApiKey || groqApiKey;
    const effectiveModel = settings.groqTranslateModel || 'qwen/qwen3-32b';

    const url = effectiveBaseUrl.replace(/\/+$/, '').replace(/\/v1$/, '') + '/v1/chat/completions';
    const translateRes = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${effectiveApiKey}`,
      },
      body: JSON.stringify({
        model: effectiveModel,
        messages: [{ role: 'user', content: translatePrompt }],
      }),
    });

    if (!translateRes.ok) {
      const err = await translateRes.text();
      throw new Error(humanizeError(translateRes.status, err, '翻譯 LLM'));
    }

    const translateData = await translateRes.json();
    translated = translateData.choices?.[0]?.message?.content?.trim();
    if (!translated) throw new Error('翻譯 LLM 未回傳結果');
  }

  // 過濾 thinking 標籤
  translated = translated.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  return parseDirectionResponse(translated);
}

// ─── OCR Space + Google Translate ───

async function translateWithOcrSpace(imageDataUrl, apiKey, sourceLang, textDirection, settings) {
  const ocrApiKey = apiKey || 'helloworld';
  const ocrLang = sourceLang === 'ja' ? 'jpn' : sourceLang === 'ko' ? 'kor' : 'eng';

  const formData = new FormData();
  formData.append('base64Image', imageDataUrl);
  formData.append('apikey', ocrApiKey);
  formData.append('language', ocrLang);
  formData.append('scale', 'true');
  formData.append('OCREngine', '2');
  formData.append('isOverlayRequired', 'true');

  const ocrRes = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  });
  const ocrData = await ocrRes.json();

  if (ocrData.IsErroredOnProcessing) {
    throw new Error('OCR 辨識失敗：' + (ocrData.ErrorMessage?.[0] || '未知錯誤'));
  }
  if (!ocrData.ParsedResults || ocrData.ParsedResults.length === 0) {
    return { success: true, translated: '（未辨識到文字）', direction: 'horizontal' };
  }

  const ocrText = ocrData.ParsedResults.map(r => r.ParsedText).join('\n').trim();
  if (!ocrText) {
    return { success: true, translated: '（未辨識到文字）', direction: 'horizontal' };
  }

  const langName = sourceLang === 'ja' ? '日文' : '韓文';
  const ocrBackend = settings.ocrTranslateBackend || 'google';
  let translated = '';

  if (ocrBackend === 'gemini') {
    // Gemini 翻譯
    const geminiKey = settings.ocrTranslateGeminiApiKey || settings.geminiApiKey;
    if (!geminiKey) throw new Error('請填入 Gemini API Key（OCR Space 翻譯後端或全域 Gemini 設定）');
    const geminiModel = settings.ocrTranslateGeminiModel || 'gemini-3-flash-preview';
    const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;

    const geminiRes = await fetchWithRetry(gUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `將以下${langName}翻譯為繁體中文，只回覆翻譯結果，不加解釋：\n\n${ocrText}` }] }],
        safetySettings: [
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      throw new Error(humanizeError(geminiRes.status, err, 'Gemini 翻譯'));
    }
    const geminiData = await geminiRes.json();
    translated = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '（翻譯失敗）';
  } else if (ocrBackend === 'openai') {
    // OpenAI 相容翻譯
    if (!settings.ocrTranslateBaseUrl || !settings.ocrTranslateApiKey) {
      throw new Error('請填入 OCR Space 翻譯後端的 Base URL 和 API Key，或改用 Google 翻譯 / Gemini');
    }
    const url = settings.ocrTranslateBaseUrl.replace(/\/+$/, '').replace(/\/v1$/, '') + '/v1/chat/completions';
    const llmRes = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.ocrTranslateApiKey}`,
      },
      body: JSON.stringify({
        model: settings.ocrTranslateModel || 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{
          role: 'user',
          content: `將以下${langName}翻譯為繁體中文，只回覆翻譯結果，不加解釋：\n\n${ocrText}`,
        }],
      }),
    });
    if (!llmRes.ok) {
      const err = await llmRes.text();
      throw new Error(humanizeError(llmRes.status, err, '翻譯 LLM'));
    }
    const llmData = await llmRes.json();
    translated = llmData.choices?.[0]?.message?.content?.trim() || '（翻譯失敗）';
  } else if (ocrBackend === 'google') {
    // Google 翻譯（預設）
    const sl = sourceLang === 'ja' ? 'ja' : sourceLang === 'ko' ? 'ko' : 'auto';
    const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=zh-TW&dt=t&q=${encodeURIComponent(ocrText)}`;
    const transRes = await fetch(translateUrl);
    const transData = await transRes.json();
    if (transData && transData[0]) {
      for (let i = 0; i < transData[0].length; i++) {
        translated += transData[0][i][0];
      }
    }
    if (!translated) translated = '（翻譯失敗）';
  } else {
    throw new Error(`未知的 OCR Space 翻譯後端：${ocrBackend}`);
  }

  // 過濾 thinking 標籤
  translated = translated.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  let direction = 'horizontal';
  if (textDirection === 'vertical') direction = 'vertical';
  else if (textDirection === 'auto' && sourceLang === 'ja') direction = 'vertical';

  return { success: true, translated, direction };
}

// ─── Cloud Vision OCR + LLM 翻譯 ───

async function translateWithCloudVision(imageDataUrl, sourceLang, textDirection, settings) {
  const base64 = imageDataUrl.split(',')[1];
  const langHint = sourceLang === 'ja' ? 'ja' : 'ko';
  const langName = sourceLang === 'ja' ? '日文' : '韓文';

  // 1. Cloud Vision OCR
  const ocrRes = await fetchWithRetry(`https://vision.googleapis.com/v1/images:annotate?key=${settings.cvllmApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: base64 },
        features: [{ type: 'TEXT_DETECTION' }],
        imageContext: { languageHints: [langHint] },
      }],
    }),
  });

  if (!ocrRes.ok) {
    const err = await ocrRes.text();
    throw new Error(humanizeError(ocrRes.status, err, 'Cloud Vision OCR'));
  }

  const ocrData = await ocrRes.json();
  const ocrText = ocrData.responses?.[0]?.fullTextAnnotation?.text?.trim();
  if (!ocrText) {
    return { success: true, translated: '（未辨識到文字）', direction: 'horizontal' };
  }

  // 2. LLM 翻譯
  let directionInstruction = '';
  if (textDirection === 'auto') {
    directionInstruction = '請判斷原文的排列方向，在翻譯結果的第一行回覆 [vertical] 或 [horizontal]。';
  } else if (textDirection === 'vertical') {
    directionInstruction = '在翻譯結果的第一行回覆 [vertical]。';
  } else {
    directionInstruction = '在翻譯結果的第一行回覆 [horizontal]。';
  }

  const translatePrompt = `將以下${langName}漫畫對話翻譯為繁體中文。${directionInstruction}\n第二行開始是翻譯結果，只回覆翻譯，不加解釋。\n\n${ocrText}`;

  const backend = settings.cvllmTranslateBackend || 'gemini';
  let translated;

  if (backend === 'gemini') {
    const geminiKey = settings.cvllmGeminiApiKey || settings.geminiApiKey;
    if (!geminiKey) throw new Error('請填入 Gemini API Key（Cloud Vision 翻譯後端或全域 Gemini 設定）');
    const geminiModel = settings.cvllmGeminiModel || 'gemini-3-flash-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;

    const geminiRes = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: translatePrompt }] }],
        safetySettings: [
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      throw new Error(humanizeError(geminiRes.status, err, 'Gemini 翻譯'));
    }

    const geminiData = await geminiRes.json();
    translated = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!translated) throw new Error('Gemini 翻譯未回傳結果');
  } else {
    // OpenAI 相容
    if (!settings.cvllmBaseUrl || !settings.cvllmLlmApiKey) throw new Error('請填入翻譯 LLM 的 Base URL 和 API Key');
    const url = settings.cvllmBaseUrl.replace(/\/+$/, '').replace(/\/v1$/, '') + '/v1/chat/completions';
    const model = settings.cvllmLlmModel || 'qwen/qwen3-32b';

    const llmRes = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.cvllmLlmApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: translatePrompt }],
      }),
    });

    if (!llmRes.ok) {
      const err = await llmRes.text();
      throw new Error(humanizeError(llmRes.status, err, '翻譯 LLM'));
    }

    const llmData = await llmRes.json();
    translated = llmData.choices?.[0]?.message?.content?.trim();
    if (!translated) throw new Error('翻譯 LLM 未回傳結果');
  }

  // 過濾 thinking 標籤
  translated = translated.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  return parseDirectionResponse(translated);
}

// ─── 共用：解析 [vertical]/[horizontal] 前綴 ───

function parseDirectionResponse(rawText) {
  let direction = 'horizontal';
  let translated = rawText;

  if (rawText.startsWith('[vertical]')) {
    direction = 'vertical';
    translated = rawText.replace(/^\[vertical\]\s*/, '');
  } else if (rawText.startsWith('[horizontal]')) {
    direction = 'horizontal';
    translated = rawText.replace(/^\[horizontal\]\s*/, '');
  }

  return { success: true, translated, direction };
}
