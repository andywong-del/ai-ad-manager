# AI Ad Manager 使用說明書

## 呢個工具係做咩嘅？

AI Ad Manager 係一個 **AI 廣告顧問 + 執行助手**，直接連住你嘅 Meta 廣告帳戶。你只需要用對話方式同 AI 講你想做咩，佢就會幫你搞掂晒 — 由開 campaign 到出 report，全部用真嘅 Meta Marketing API 去執行。

簡單講：**你講，佢做。**

---

## 而家做到啲咩？

### 1. 廣告活動管理 (Campaign)
- 睇晒所有 campaign、新增、修改、刪除、複製
- 睇某個 campaign 入面嘅 ad set 同 ad
- 支援所有廣告目標：流量、銷售、潛在客戶、互動、品牌知名度、應用程式推廣

### 2. 廣告組合管理 (Ad Set)
- 完整 CRUD（新增、睇、改、刪）+ 複製
- 設定受眾定位、預算、優化目標、收費方式
- 預估投放效果（曝光量、預計成本）

### 3. 廣告管理 (Ad)
- 完整 CRUD + 複製
- 攞 Lead Ad 嘅潛在客戶資料
- 預覽廣告效果（Desktop Feed、Mobile Feed、Stories 等）

### 4. 創意素材管理 (Creative)
- 建立圖片、影片、輪播 (Carousel) 廣告創意
- 支援所有常用 CTA 按鈕：立即購買、了解更多、立即註冊等

### 5. 素材上傳
- **圖片**：直接拖入對話框 → 自動上傳到 Meta → 攞返 image_hash
- **影片**：透過 URL 上傳 → Meta 處理後返回 video_id
- 支援批量上傳
- 可以查影片處理狀態

### 6. 數據分析 (Insights & Analytics)
- 帳戶級數據：花費、曝光、點擊、ROAS、轉換，任何日期範圍
- 物件級數據，可以按年齡、性別、國家、版位、裝置分拆

### 7. 受眾管理 (Audience)
- **自訂受眾**：網站訪客（Pixel）、互動受眾（睇過影片嘅人）、客戶名單（email/電話 hash）
- **類似受眾 (Lookalike)**：由現有受眾建立，覆蓋目標市場 1-20%
- **已儲存受眾**：儲存定位設定，下次直接用
- 可以加/移除客戶名單入面嘅用戶

> 留意：透過 API 建立嘅受眾，喺 Meta Ads Manager 嘅 UI 下拉選單唔會顯示，但係用 API 建立嘅 Ad Set 可以正常使用。工具會自動生成 Business Suite 嘅連結俾你去驗證。

### 8. 受眾定位工具 (Targeting)
- 用關鍵字搜尋興趣、行為、人口統計
- 瀏覽所有定位類別
- 根據現有定位攞建議
- 用之前驗證定位設定
- 預估觸及人數同投放效果

### 9. 自動化規則 (Automated Rules)
- 建立自動規則，例如「如果 CPA 連續 3 日超過 $X，就暫停」
- 完整 CRUD + 查睇執行記錄

### 10. Pixel 同轉換追蹤
- 建立同管理追蹤 Pixel
- 傳送 Conversions API (CAPI) 事件：Purchase、Lead、ViewContent、AddToCart 等
- 用 test_event_code 測試事件
- 建立自訂轉換
- 有引導式設定流程，一步步教你裝 Pixel

### 11. 潛在客戶表單 (Lead Forms)
- 列出所有表單、攞已提交嘅潛在客戶資料
- 建立新表單（名稱、問題、私隱政策、感謝頁面）

### 12. 產品目錄 (Catalogs)
- 列出目錄同產品
- 攞產品集合（動態產品廣告用）
- 目錄健康診斷

### 13. 競爭對手研究 (Ad Library)
- 用關鍵字搜尋競爭對手嘅廣告
- 顯示視覺化卡片：專頁名稱、標題、內文、平台、投放日期
- AI 會分析對手策略，建議你點樣應對

### 14. 標籤管理 (Labels)
- 建立標籤，貼喺 campaign / ad set / ad 上面方便管理

### 15. Instagram 帳戶
- 列出已連接嘅 Instagram 帳戶，用於 IG 專屬廣告版位

### 16. 商業帳戶同專頁
- 列出 Business Portfolio、廣告帳戶、Facebook 專頁

### 17. A/B 測試
- 一鍵複製 campaign 建立 Variant B
- AI 會引導你改邊個變數（受眾、創意、文案、預算、版位、出價策略）
- 兩個 campaign 用相同預算同時跑，AI 幫你分析結果

**總共：72 個 AI 工具**

---

## 介面卡片類型（9 種）

呢個工具唔會淨係俾你一大段文字，而係用唔同類型嘅卡片嚟呈現資料：

| 卡片類型 | 幾時出現 | 你可以做咩 |
|---------|---------|-----------|
| 指標卡 (metrics) | 顯示 KPI（花費、ROAS、CTR、CPA） | 睇 + 下載 CSV |
| 建議卡 (insights) | AI 分析建議（嚴重/警告/正常） | 撳按鈕執行建議 |
| 評分卡 (score) | 帳戶健康評分 + 清單 | 睇 |
| 選項卡 (options) | 策略選擇（A/B/C 方案） | 撳揀一個 |
| 文案卡 (copyvariations) | 廣告文案 A/B/C 版本 | 撳「使用呢個」 |
| 步驟卡 (steps) | 優先行動清單（高/中/低） | 睇 |
| 快速回覆 (quickreplies) | 跟進操作按鈕 | 撳就會自動發送 |
| 廣告庫卡 (adlib) | 競爭對手廣告 | 睇 + 撳去 Meta |
| 表格 (table) | 數據表格（campaign、ad set 等） | 睇 + 下載 CSV |

---

## 重點功能

### 對話式執行
你只需要講：「幫我開一個 campaign，target 美國 25-34 歲女性，興趣係瑜伽，每日預算 $50，用呢啲圖」— AI 就會透過真正嘅 Meta API 幫你建好成個 campaign stack（campaign → ad set → creative → ad）。

### 拖放素材上傳
將圖片拖入對話框 → 自動上傳到 Meta → AI 生成廣告文案 → 建立完整 campaign。亦支援上傳 PDF/TXT 策略文件作為品牌參考。

### 智能輸出格式
每個回覆都用結構化卡片顯示（唔係一大段文字）。每次都會附帶可撳嘅快速回覆按鈕，你撳就得，唔使打字。顯示數據之後會自動跟住分析。

### 報告匯出
任何卡片或表格都可以下載做 CSV，亦可以儲存做圖片分享。

### 策略文件上傳
上傳 PDF/TXT 品牌指引或 campaign brief，AI 會提取內容，根據你嘅品牌風格制定策略。

### 深度研究模式
可以切換「Fast」（快速回答）同「Deep Research」（多工具綜合分析）模式。

### 確認機制
所有寫入操作（暫停、刪除、修改、建立）都會先問你確認先至執行，唔會亂嚟。

---

## 需要嘅 Meta 權限

| 權限 | 級別 | 用途 |
|-----|------|------|
| pages_show_list | Standard | 列出 Facebook 專頁 |
| business_management | Standard | 商業帳戶、廣告帳戶、目錄 |
| ads_read | Standard | 讀取 campaign、數據、受眾、定位 |
| pages_read_engagement | Standard | 專頁互動數據、Lead Form |
| ads_management | Standard | 建立/修改/刪除 campaign、廣告、受眾、規則 |
| Ads Management Standard Access | Advanced | 更高嘅 API 調用限額 |

---

## 技術架構
- **前端**：React + Vite + Tailwind CSS
- **後端**：Express.js (port 3001)
- **AI 引擎**：Google Gemini 2.5 Flash（透過 @google/adk）
- **登入驗證**：Facebook OAuth → short-lived → long-lived token 交換
- **即時串流**：Server-Sent Events (SSE)
- **Meta API**：v19.0 (graph.facebook.com)
