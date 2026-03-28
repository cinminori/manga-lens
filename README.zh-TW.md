# MangaLens

> 漫畫翻譯 Chrome 擴充套件 — 框選漫畫區域，即時翻譯。

MangaLens 讓你在漫畫／韓漫頁面上框選任意區域，自動 OCR 辨識韓文或日文文字並翻譯為繁體中文。支援桌面版 Chrome 和 Android 手機瀏覽器。

---

## 功能特色

- **框選即翻譯** — 在漫畫頁面上拖曳矩形區域，自動截圖、OCR、翻譯一氣呵成
- **7 種翻譯引擎** — Gemini Vision、OpenAI 相容、Groq Vision + LLM、Cloud Vision + LLM、本機 API Proxy、OCR Space、純 OCR 模式
- **連續框選模式** — 翻譯完一格後繼續框選下一格，不需重複啟動
- **結果框互動** — 拖曳移位、長按透明對照原文、一鍵重翻或複製
- **手機支援** — 支援 Android 觸控操作（Kiwi Browser 等支援擴充套件的瀏覽器）
- **自訂快捷鍵** — 預設 `Alt+S`，可自行設定

---

## 安裝方式

### 桌面版 Chrome
1. 前往 `chrome://extensions/`
2. 右上角開啟「開發人員模式」
3. 點擊「載入未封裝項目」
4. 選擇 `manga-lens` 資料夾
5. 完成！每個網頁右下角會出現浮動工具列

### Android 手機（Kiwi Browser 等）
1. 將 `manga-lens` 資料夾打包成 `.zip`
2. 在瀏覽器的擴充功能頁面匯入 zip 檔
3. 用手指觸控操作框選翻譯

> 更新擴充套件後，需要**重新整理網頁（F5）**才會生效。

---

## 支援引擎

| # | 引擎 | 運作方式 | 適用場景 |
|---|------|---------|---------|
| 1 | **Gemini Vision** | 單一模型完成 OCR + 翻譯 | 一般使用（推薦） |
| 2 | **本機 API Proxy** | 自架 OpenAI 相容代理 | 自架模型 / 自訂模型 |
| 3 | **OpenAI 相容** | 任何 OpenAI 格式 API（Groq、OpenRouter...） | 彈性選擇模型 |
| 4 | **Groq Vision + LLM** | Llama 4 Scout OCR → 另一個 LLM 翻譯 | 免費且快速 |
| 5 | **Cloud Vision + LLM** | Google Cloud Vision OCR → Gemini/LLM 翻譯 | 印刷體 OCR 最精準 |
| 6 | **純 OCR** | 只辨識文字，不翻譯 | 校對原文 |
| 7 | **OCR Space + 翻譯** | OCR Space → Google 翻譯/Gemini/LLM | 免費 OCR 方案 |

### 引擎比較

| 引擎 | 手寫字辨識 | 印刷體精準度 | 翻譯品質 | 速度 | 費用 |
|------|-----------|-------------|---------|------|------|
| Gemini Vision | ★★★ | ★★★ | ★★★ | ★★☆ | 免費額度 |
| 本機 API Proxy | ★★★ | ★★★ | ★★★ | ★★☆ | 自架 |
| OpenAI 相容 | ★★☆ | ★★★ | ★★☆ | ★★★ | 依服務而定 |
| Groq Vision + LLM | ★★☆ | ★★☆ | ★★☆ | ★★★ | 免費 |
| Cloud Vision + LLM | ★☆☆ | ★★★ | ★★★ | ★★☆ | 免費額度 |
| OCR Space + 翻譯 | ★☆☆ | ★★☆ | ★★☆ | ★★☆ | 免費 |

> **提醒：** 傳統 OCR 引擎（Cloud Vision、OCR Space）無法辨識漫畫中常見的手寫字和藝術字體。遇到這類文字請使用 Gemini 或 Groq Vision。
>
> **提醒：** OCR Space 不支援直排文字（日漫常見）。日文直排漫畫請改用 Gemini Vision、Groq Vision 或 Cloud Vision。

### 選擇建議
- **一般使用** → Gemini Vision（最省事，手寫字也能辨識）
- **印刷體為主的漫畫** → Cloud Vision + Gemini 翻譯（OCR 最精準）
- **免費快速** → Groq Vision + LLM（完全免費，速度最快）
- **最高翻譯品質** → Gemini Vision 或自架 Proxy
- **只需原文** → 純 OCR 模式

---

## API Key 取得方式

| 服務 | 取得方式 | 費用 |
|------|----------|------|
| Gemini | [Google AI Studio](https://aistudio.google.com/apikey) | 免費額度 |
| Groq | [Groq Console](https://console.groq.com/keys) | 免費額度 |
| Cloud Vision | [GCP Console](https://console.cloud.google.com/apis/library/vision.googleapis.com) | 每月 1,000 次免費 |
| OCR Space | [ocr.space](https://ocr.space/ocrapi/freekey) | 免費（或留白使用公用金鑰） |

---

## 使用教學

### 基本流程
1. 點擊浮動工具列按鈕、按 `Alt+S`、或從 Popup 按鈕啟動
2. 畫面出現半透明遮罩 + 十字游標
3. 按住滑鼠左鍵（或手指）拖曳出矩形區域
4. 放開後自動辨識翻譯
5. 按 `Esc` 取消框選

### 翻譯結果框操作
| 操作 | 桌面 | 手機 |
|------|------|------|
| 移動結果框 | 拖曳結果框 | 手指拖曳 |
| 對照原文 | 長按結果框 0.4 秒變透明 | 長按變透明 |
| 重新翻譯 | hover 出現按鈕 →「🔄 重翻」 | 點一下 →「🔄 重翻」 |
| 複製翻譯 | hover →「📋 複製」 | 點一下 →「📋 複製」 |
| 關閉單個 | hover →「✕ 關閉」 | 點一下 →「✕ 關閉」 |
| 清除全部 | 工具列「🗑 清除」 | 工具列「🗑 清除」 |

### 連續框選模式
在工具列或 Popup 開啟「連續」模式。翻譯完成後按鈕變為「▶ 繼續框選」，先捲動頁面到下一格，再點擊繼續框選。

---

## 設定說明

點擊擴充套件圖示開啟 Popup 設定，所有變更自動儲存：

- **來源語言** — 韓文或日文
- **文字方向** — 自動偵測、直排、橫排
- **翻譯引擎** — 7 種引擎自由選擇
- **頁內快捷鍵** — 點擊輸入框後按下組合鍵設定
- **顯示浮動工具列** — 網頁右下角的工具列開關
- **連續框選模式** — 翻譯完自動進入等待狀態

---

## 錯誤排除

| 錯誤訊息 | 解決方式 |
|----------|---------|
| API Key 無效或已過期 | 確認 Key 正確，或重新申請 |
| 權限不足，需要啟用 API | 到 GCP Console 啟用對應 API |
| 模型名稱錯誤或不存在 | 確認模型名稱拼寫正確 |
| 請求過於頻繁 | 等待後再試，或更換 API Key |
| 截圖失敗（手機端） | 手機瀏覽器不支援截圖 API，需確保頁面上有可見的圖片元素 |
| 無法連線 | 檢查網路，或確認 Proxy URL 正確且服務正在運行 |
| 未辨識到文字 | 框選區域可能沒有文字，或 OCR 引擎無法辨識手寫字（改用 Gemini/Groq Vision） |

---

## 授權

MIT License
