// Popup 控制邏輯

document.addEventListener('DOMContentLoaded', () => {
  const sourceLangSelect = document.getElementById('sourceLang');
  const textDirectionSelect = document.getElementById('textDirection');
  const translationServiceSelect = document.getElementById('translationService');
  const geminiApiKeyInput = document.getElementById('geminiApiKey');
  const geminiModelSelect = document.getElementById('geminiModel');
  const claudeProxyUrlInput = document.getElementById('claudeProxyUrl');
  const claudeModelInput = document.getElementById('claudeModel');
  const ocrSpaceApiKeyInput = document.getElementById('ocrSpaceApiKey');
  const ocrTranslateBaseUrlInput = document.getElementById('ocrTranslateBaseUrl');
  const ocrTranslateApiKeyInput = document.getElementById('ocrTranslateApiKey');
  const ocrTranslateModelInput = document.getElementById('ocrTranslateModel');
  const openaiBaseUrlInput = document.getElementById('openaiBaseUrl');
  const openaiApiKeyInput = document.getElementById('openaiApiKey');
  const openaiModelInput = document.getElementById('openaiModel');
  const ocrOnlyEngineSelect = document.getElementById('ocrOnlyEngine');
  const ocrOnlyGeminiFields = document.getElementById('ocrOnlyGeminiFields');
  const ocrOnlyGroqFields = document.getElementById('ocrOnlyGroqFields');
  const ocrOnlyGeminiApiKeyInput = document.getElementById('ocrOnlyGeminiApiKey');
  const ocrOnlyGeminiModelSelect = document.getElementById('ocrOnlyGeminiModel');
  const ocrOnlyGroqApiKeyInput = document.getElementById('ocrOnlyGroqApiKey');
  const ocrOnlyCloudvisionFields = document.getElementById('ocrOnlyCloudvisionFields');
  const ocrOnlyCloudvisionApiKeyInput = document.getElementById('ocrOnlyCloudvisionApiKey');
  const ocrOnlyOcrspaceFields = document.getElementById('ocrOnlyOcrspaceFields');
  const ocrOnlyOcrspaceApiKeyInput = document.getElementById('ocrOnlyOcrspaceApiKey');
  const groqVisionApiKeyInput = document.getElementById('groqVisionApiKey');
  const groqVisionModelSelect = document.getElementById('groqVisionModel');
  const groqTranslateBackendSelect = document.getElementById('groqTranslateBackend');
  const groqTranslateBaseUrlInput = document.getElementById('groqTranslateBaseUrl');
  const groqTranslateApiKeyInput = document.getElementById('groqTranslateApiKey');
  const groqTranslateModelInput = document.getElementById('groqTranslateModel');
  const groqTranslateGeminiApiKeyInput = document.getElementById('groqTranslateGeminiApiKey');
  const groqTranslateGeminiModelSelect = document.getElementById('groqTranslateGeminiModel');
  const groqTranslateOpenaiFields = document.getElementById('groqTranslateOpenaiFields');
  const groqTranslateGeminiFields = document.getElementById('groqTranslateGeminiFields');
  const ocrTranslateBackendSelect = document.getElementById('ocrTranslateBackend');
  const ocrTranslateOpenaiFields = document.getElementById('ocrTranslateOpenaiFields');
  const ocrTranslateGeminiFields = document.getElementById('ocrTranslateGeminiFields');
  const ocrTranslateGeminiApiKeyInput = document.getElementById('ocrTranslateGeminiApiKey');
  const ocrTranslateGeminiModelSelect = document.getElementById('ocrTranslateGeminiModel');
  const cvllmApiKeyInput = document.getElementById('cvllmApiKey');
  const cvllmTranslateBackendSelect = document.getElementById('cvllmTranslateBackend');
  const cvllmGeminiFields = document.getElementById('cvllmGeminiFields');
  const cvllmOpenaiFields = document.getElementById('cvllmOpenaiFields');
  const cvllmGeminiApiKeyInput = document.getElementById('cvllmGeminiApiKey');
  const cvllmGeminiModelSelect = document.getElementById('cvllmGeminiModel');
  const cvllmBaseUrlInput = document.getElementById('cvllmBaseUrl');
  const cvllmLlmApiKeyInput = document.getElementById('cvllmLlmApiKey');
  const cvllmLlmModelInput = document.getElementById('cvllmLlmModel');
  const showToolbarCheckbox = document.getElementById('showToolbar');
  const continuousModeCheckbox = document.getElementById('continuousModeCheckbox');
  const shortcutInput = document.getElementById('customShortcut');
  const startBtn = document.getElementById('startBtn');
  const statusMsg = document.getElementById('statusMsg');
  const settingsSummary = document.getElementById('settingsSummary');

  // 服務設定面板切換
  const settingsPanels = {
    gemini: document.getElementById('geminiSettings'),
    claude: document.getElementById('claudeSettings'),
    openai: document.getElementById('openaiSettings'),
    ocronly: document.getElementById('ocronlySettings'),
    groqvision: document.getElementById('groqvisionSettings'),
    cloudvisionllm: document.getElementById('cloudvisionllmSettings'),
    ocrspace: document.getElementById('ocrspaceSettings'),
  };

  function showServiceSettings(service) {
    Object.values(settingsPanels).forEach(p => p.classList.remove('active'));
    if (settingsPanels[service]) settingsPanels[service].classList.add('active');
  }

  // Groq Vision 翻譯後端切換
  function showGroqTranslateBackend(backend) {
    if (backend === 'gemini') {
      groqTranslateOpenaiFields.style.display = 'none';
      groqTranslateGeminiFields.style.display = 'block';
    } else {
      groqTranslateOpenaiFields.style.display = 'block';
      groqTranslateGeminiFields.style.display = 'none';
    }
  }

  // 純 OCR 引擎切換
  function showOcrOnlyEngine(engine) {
    ocrOnlyGeminiFields.style.display = engine === 'gemini' ? 'block' : 'none';
    ocrOnlyGroqFields.style.display = engine === 'groq' ? 'block' : 'none';
    ocrOnlyCloudvisionFields.style.display = engine === 'cloudvision' ? 'block' : 'none';
    ocrOnlyOcrspaceFields.style.display = engine === 'ocrspace' ? 'block' : 'none';
  }

  // Cloud Vision + LLM 翻譯後端切換
  function showCvllmTranslateBackend(backend) {
    if (backend === 'gemini') {
      cvllmGeminiFields.style.display = 'block';
      cvllmOpenaiFields.style.display = 'none';
    } else {
      cvllmGeminiFields.style.display = 'none';
      cvllmOpenaiFields.style.display = 'block';
    }
  }

  // OCR Space 翻譯後端切換
  function showOcrTranslateBackend(backend) {
    ocrTranslateOpenaiFields.style.display = backend === 'openai' ? 'block' : 'none';
    ocrTranslateGeminiFields.style.display = backend === 'gemini' ? 'block' : 'none';
  }

  // 載入設定
  chrome.storage.local.get(
    ['sourceLang', 'textDirection', 'translationService',
     'geminiApiKey', 'geminiModel',
     'claudeProxyUrl', 'claudeModel',
     'openaiBaseUrl', 'openaiApiKey', 'openaiModel',
     'ocrOnlyEngine', 'ocrOnlyGeminiApiKey', 'ocrOnlyGeminiModel', 'ocrOnlyGroqApiKey', 'ocrOnlyCloudvisionApiKey', 'ocrOnlyOcrspaceApiKey',
     'groqVisionApiKey', 'groqVisionModel',
     'groqTranslateBackend', 'groqTranslateBaseUrl', 'groqTranslateApiKey', 'groqTranslateModel',
     'groqTranslateGeminiApiKey', 'groqTranslateGeminiModel',
     'ocrSpaceApiKey', 'ocrTranslateBackend', 'ocrTranslateBaseUrl', 'ocrTranslateApiKey', 'ocrTranslateModel',
     'ocrTranslateGeminiApiKey', 'ocrTranslateGeminiModel',
     'cvllmApiKey', 'cvllmTranslateBackend', 'cvllmGeminiApiKey', 'cvllmGeminiModel',
     'cvllmBaseUrl', 'cvllmLlmApiKey', 'cvllmLlmModel',
     'customShortcut', 'showToolbar', 'continuousMode'],
    (data) => {
      if (data.sourceLang) sourceLangSelect.value = data.sourceLang;
      if (data.textDirection) textDirectionSelect.value = data.textDirection;
      if (data.translationService) translationServiceSelect.value = data.translationService;
      if (data.geminiApiKey) geminiApiKeyInput.value = data.geminiApiKey;
      if (data.geminiModel) geminiModelSelect.value = data.geminiModel;
      if (data.claudeProxyUrl) claudeProxyUrlInput.value = data.claudeProxyUrl;
      if (data.claudeModel) claudeModelInput.value = data.claudeModel;
      if (data.openaiBaseUrl) openaiBaseUrlInput.value = data.openaiBaseUrl;
      if (data.openaiApiKey) openaiApiKeyInput.value = data.openaiApiKey;
      if (data.openaiModel) openaiModelInput.value = data.openaiModel;
      if (data.ocrOnlyEngine) ocrOnlyEngineSelect.value = data.ocrOnlyEngine;
      if (data.ocrOnlyGeminiApiKey) ocrOnlyGeminiApiKeyInput.value = data.ocrOnlyGeminiApiKey;
      if (data.ocrOnlyGeminiModel) ocrOnlyGeminiModelSelect.value = data.ocrOnlyGeminiModel;
      if (data.ocrOnlyGroqApiKey) ocrOnlyGroqApiKeyInput.value = data.ocrOnlyGroqApiKey;
      if (data.ocrOnlyCloudvisionApiKey) ocrOnlyCloudvisionApiKeyInput.value = data.ocrOnlyCloudvisionApiKey;
      if (data.ocrOnlyOcrspaceApiKey) ocrOnlyOcrspaceApiKeyInput.value = data.ocrOnlyOcrspaceApiKey;
      if (data.groqVisionApiKey) groqVisionApiKeyInput.value = data.groqVisionApiKey;
      if (data.groqVisionModel) groqVisionModelSelect.value = data.groqVisionModel;
      if (data.groqTranslateBackend) groqTranslateBackendSelect.value = data.groqTranslateBackend;
      if (data.groqTranslateBaseUrl) groqTranslateBaseUrlInput.value = data.groqTranslateBaseUrl;
      if (data.groqTranslateApiKey) groqTranslateApiKeyInput.value = data.groqTranslateApiKey;
      if (data.groqTranslateModel) groqTranslateModelInput.value = data.groqTranslateModel;
      if (data.groqTranslateGeminiApiKey) groqTranslateGeminiApiKeyInput.value = data.groqTranslateGeminiApiKey;
      if (data.groqTranslateGeminiModel) groqTranslateGeminiModelSelect.value = data.groqTranslateGeminiModel;
      if (data.ocrSpaceApiKey) ocrSpaceApiKeyInput.value = data.ocrSpaceApiKey;
      if (data.ocrTranslateBackend) ocrTranslateBackendSelect.value = data.ocrTranslateBackend;
      if (data.ocrTranslateGeminiApiKey) ocrTranslateGeminiApiKeyInput.value = data.ocrTranslateGeminiApiKey;
      if (data.ocrTranslateGeminiModel) ocrTranslateGeminiModelSelect.value = data.ocrTranslateGeminiModel;
      if (data.ocrTranslateBaseUrl) ocrTranslateBaseUrlInput.value = data.ocrTranslateBaseUrl;
      if (data.ocrTranslateApiKey) ocrTranslateApiKeyInput.value = data.ocrTranslateApiKey;
      if (data.ocrTranslateModel) ocrTranslateModelInput.value = data.ocrTranslateModel;
      if (data.cvllmApiKey) cvllmApiKeyInput.value = data.cvllmApiKey;
      if (data.cvllmTranslateBackend) cvllmTranslateBackendSelect.value = data.cvllmTranslateBackend;
      if (data.cvllmGeminiApiKey) cvllmGeminiApiKeyInput.value = data.cvllmGeminiApiKey;
      if (data.cvllmGeminiModel) cvllmGeminiModelSelect.value = data.cvllmGeminiModel;
      if (data.cvllmBaseUrl) cvllmBaseUrlInput.value = data.cvllmBaseUrl;
      if (data.cvllmLlmApiKey) cvllmLlmApiKeyInput.value = data.cvllmLlmApiKey;
      if (data.cvllmLlmModel) cvllmLlmModelInput.value = data.cvllmLlmModel;
      if (data.customShortcut) shortcutInput.value = data.customShortcut;
      showToolbarCheckbox.checked = data.showToolbar !== false;
      continuousModeCheckbox.checked = data.continuousMode || false;
      showServiceSettings(data.translationService || 'gemini');
      showGroqTranslateBackend(data.groqTranslateBackend || 'openai');
      showCvllmTranslateBackend(data.cvllmTranslateBackend || 'gemini');
      showOcrTranslateBackend(data.ocrTranslateBackend || 'google');
      showOcrOnlyEngine(data.ocrOnlyEngine || 'gemini');
      updateSummary();
    }
  );

  // 儲存設定並顯示提示
  function saveSettings() {
    chrome.storage.local.set({
      sourceLang: sourceLangSelect.value,
      textDirection: textDirectionSelect.value,
      translationService: translationServiceSelect.value,
      geminiApiKey: geminiApiKeyInput.value,
      geminiModel: geminiModelSelect.value,
      claudeProxyUrl: claudeProxyUrlInput.value,
      claudeModel: claudeModelInput.value,
      openaiBaseUrl: openaiBaseUrlInput.value,
      openaiApiKey: openaiApiKeyInput.value,
      openaiModel: openaiModelInput.value,
      ocrOnlyEngine: ocrOnlyEngineSelect.value,
      ocrOnlyGeminiApiKey: ocrOnlyGeminiApiKeyInput.value,
      ocrOnlyGeminiModel: ocrOnlyGeminiModelSelect.value,
      ocrOnlyGroqApiKey: ocrOnlyGroqApiKeyInput.value,
      ocrOnlyCloudvisionApiKey: ocrOnlyCloudvisionApiKeyInput.value,
      ocrOnlyOcrspaceApiKey: ocrOnlyOcrspaceApiKeyInput.value,
      groqVisionApiKey: groqVisionApiKeyInput.value,
      groqVisionModel: groqVisionModelSelect.value,
      groqTranslateBackend: groqTranslateBackendSelect.value,
      groqTranslateBaseUrl: groqTranslateBaseUrlInput.value,
      groqTranslateApiKey: groqTranslateApiKeyInput.value,
      groqTranslateModel: groqTranslateModelInput.value,
      groqTranslateGeminiApiKey: groqTranslateGeminiApiKeyInput.value,
      groqTranslateGeminiModel: groqTranslateGeminiModelSelect.value,
      ocrSpaceApiKey: ocrSpaceApiKeyInput.value,
      ocrTranslateBackend: ocrTranslateBackendSelect.value,
      ocrTranslateBaseUrl: ocrTranslateBaseUrlInput.value,
      ocrTranslateApiKey: ocrTranslateApiKeyInput.value,
      ocrTranslateModel: ocrTranslateModelInput.value,
      ocrTranslateGeminiApiKey: ocrTranslateGeminiApiKeyInput.value,
      ocrTranslateGeminiModel: ocrTranslateGeminiModelSelect.value,
      cvllmApiKey: cvllmApiKeyInput.value,
      cvllmTranslateBackend: cvllmTranslateBackendSelect.value,
      cvllmGeminiApiKey: cvllmGeminiApiKeyInput.value,
      cvllmGeminiModel: cvllmGeminiModelSelect.value,
      cvllmBaseUrl: cvllmBaseUrlInput.value,
      cvllmLlmApiKey: cvllmLlmApiKeyInput.value,
      cvllmLlmModel: cvllmLlmModelInput.value,
      customShortcut: shortcutInput.value,
      showToolbar: showToolbarCheckbox.checked,
      continuousMode: continuousModeCheckbox.checked,
    });
    updateSummary();
    statusMsg.classList.add('show');
    setTimeout(() => statusMsg.classList.remove('show'), 1500);
  }

  // 翻譯服務切換
  translationServiceSelect.addEventListener('change', () => {
    showServiceSettings(translationServiceSelect.value);
    saveSettings();
  });

  // Groq 翻譯後端切換
  groqTranslateBackendSelect.addEventListener('change', () => {
    showGroqTranslateBackend(groqTranslateBackendSelect.value);
    saveSettings();
  });

  // 快捷鍵錄製
  shortcutInput.addEventListener('keydown', (e) => {
    e.preventDefault();
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Cmd');
    const key = e.key;
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      parts.push(key.length === 1 ? key.toUpperCase() : key);
      shortcutInput.value = parts.join('+');
      saveSettings();
    }
  });

  // 所有設定變更自動儲存
  sourceLangSelect.addEventListener('change', saveSettings);
  textDirectionSelect.addEventListener('change', saveSettings);
  geminiApiKeyInput.addEventListener('change', saveSettings);
  geminiModelSelect.addEventListener('change', saveSettings);
  claudeProxyUrlInput.addEventListener('change', saveSettings);
  claudeModelInput.addEventListener('change', saveSettings);
  openaiBaseUrlInput.addEventListener('change', saveSettings);
  openaiApiKeyInput.addEventListener('change', saveSettings);
  openaiModelInput.addEventListener('change', saveSettings);
  ocrOnlyEngineSelect.addEventListener('change', () => {
    showOcrOnlyEngine(ocrOnlyEngineSelect.value);
    saveSettings();
  });
  ocrOnlyGeminiApiKeyInput.addEventListener('change', saveSettings);
  ocrOnlyGeminiModelSelect.addEventListener('change', saveSettings);
  ocrOnlyGroqApiKeyInput.addEventListener('change', saveSettings);
  ocrOnlyCloudvisionApiKeyInput.addEventListener('change', saveSettings);
  ocrOnlyOcrspaceApiKeyInput.addEventListener('change', saveSettings);
  groqVisionApiKeyInput.addEventListener('change', saveSettings);
  groqVisionModelSelect.addEventListener('change', saveSettings);
  groqTranslateBaseUrlInput.addEventListener('change', saveSettings);
  groqTranslateApiKeyInput.addEventListener('change', saveSettings);
  groqTranslateModelInput.addEventListener('change', saveSettings);
  groqTranslateGeminiApiKeyInput.addEventListener('change', saveSettings);
  groqTranslateGeminiModelSelect.addEventListener('change', saveSettings);
  cvllmApiKeyInput.addEventListener('change', saveSettings);
  cvllmTranslateBackendSelect.addEventListener('change', () => {
    showCvllmTranslateBackend(cvllmTranslateBackendSelect.value);
    saveSettings();
  });
  cvllmGeminiApiKeyInput.addEventListener('change', saveSettings);
  cvllmGeminiModelSelect.addEventListener('change', saveSettings);
  cvllmBaseUrlInput.addEventListener('change', saveSettings);
  cvllmLlmApiKeyInput.addEventListener('change', saveSettings);
  cvllmLlmModelInput.addEventListener('change', saveSettings);
  ocrSpaceApiKeyInput.addEventListener('change', saveSettings);
  ocrTranslateBackendSelect.addEventListener('change', () => {
    showOcrTranslateBackend(ocrTranslateBackendSelect.value);
    saveSettings();
  });
  ocrTranslateGeminiApiKeyInput.addEventListener('change', saveSettings);
  ocrTranslateGeminiModelSelect.addEventListener('change', saveSettings);
  ocrTranslateBaseUrlInput.addEventListener('change', saveSettings);
  ocrTranslateApiKeyInput.addEventListener('change', saveSettings);
  ocrTranslateModelInput.addEventListener('change', saveSettings);
  showToolbarCheckbox.addEventListener('change', saveSettings);

  continuousModeCheckbox.addEventListener('change', saveSettings);

  // 設定摘要
  function updateSummary() {
    const serviceNames = {
      gemini: 'Gemini',
      claude: 'Local Proxy',
      openai: 'OpenAI 相容',
      ocronly: '純 OCR',
      groqvision: 'Groq Vision + LLM',
      cloudvisionllm: 'Cloud Vision + LLM',
      ocrspace: 'OCR Space',
    };
    const langNames = { ko: '韓文', ja: '日文' };
    const service = translationServiceSelect.value || 'gemini';
    const lang = sourceLangSelect.value || 'ko';
    settingsSummary.textContent = `${serviceNames[service] || service} · ${langNames[lang] || lang}`;
  }

  // 開始框選
  startBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'startSelectionFromPopup' });
    window.close();
  });
});
