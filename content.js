/**
 * content.js
 * (説明は省略)
 */
(function() {
  if (document.getElementById('danbooru-tag-copier-modal')) return;

  const categorizedTags = collectTags();
  if (!categorizedTags) {
    alert('エラー: タグリストが見つかりませんでした。');
    return;
  }
  
  createModal(categorizedTags);

  function collectTags() {
    // ... (この関数に変更はありません)
    const tagListSection = document.getElementById('tag-list');
    if (!tagListSection) return null;
    const tagData = {
      copyrights: { selector: '.copyright-tag-list li[data-tag-name]', name: 'Copyrights', tags: [] },
      character: { selector: '.character-tag-list li[data-tag-name]', name: 'Characters', tags: [] },
      artist: { selector: '.artist-tag-list li[data-tag-name]', name: 'Artist', tags: [] },
      general: { selector: '.general-tag-list li[data-tag-name]', name: 'General Tags', tags: [] },
      meta: { selector: '.meta-tag-list li[data-tag-name]', name: 'Meta', tags: [] }
    };
    for (const key in tagData) {
      const elements = tagListSection.querySelectorAll(tagData[key].selector);
      tagData[key].tags = Array.from(elements).map(li => li.dataset.tagName.replace(/_/g, ' '));
    }
    return tagData;
  }

  function createModal(tags) {
    // ... (この関数に変更はありません)
    let sectionsHtml = '';
    const categoryOrder = ['copyrights', 'character', 'artist', 'general', 'meta'];
    for (const key of categoryOrder) {
      const category = tags[key];
      if (category.tags.length > 0) {
        const aiButton = key === 'general' ? '<button class="tag-copier-ai-button">AIで属性分類</button>' : '';
        sectionsHtml += `
          <div class="tag-copier-category" id="category-section-${key}">
            <div class="tag-copier-header">
              <h3 class="tag-copier-title">${category.name} (${category.tags.length})</h3>
              <div class="tag-copier-actions">
                ${aiButton}
                <button class="tag-copier-button" data-copy-target="tags-for-${key}">Copy</button>
              </div>
            </div>
            <div class="tag-copier-tags" id="tags-for-${key}">${category.tags.join(', ')}</div>
          </div>`;
      }
    }
    if (sectionsHtml === '') { alert('コピー対象のタグが見つかりませんでした。'); return; }
    const modalHtml = `
      <div id="danbooru-tag-copier-modal">
        <div id="danbooru-tag-copier-overlay"></div>
        <div id="danbooru-tag-copier-content">
          <div id="danbooru-tag-copier-main-header"><h2>Danbooru Tag Copier</h2><button id="danbooru-tag-copier-close">×</button></div>
          <div id="danbooru-tag-copier-body">${sectionsHtml}</div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    addEventListeners();
  }

  function addEventListeners() {
    // ... (この関数に変更はありません)
    const modal = document.getElementById('danbooru-tag-copier-modal');
    if(!modal) return;
    const closeModal = () => modal.remove();
    modal.querySelector('#danbooru-tag-copier-overlay').addEventListener('click', closeModal);
    modal.querySelector('#danbooru-tag-copier-close').addEventListener('click', closeModal);
    modal.querySelectorAll('.tag-copier-button').forEach(button => button.addEventListener('click', handleCopyClick));
    const aiButton = modal.querySelector('.tag-copier-ai-button');
    if (aiButton) aiButton.addEventListener('click', handleAiClassifyClick);
  }

  function handleCopyClick(e) {
    // ... (この関数に変更はありません)
    const btn = e.target;
    const targetId = btn.dataset.copyTarget;
    const tagContainer = document.getElementById(targetId);
    if (tagContainer) {
      navigator.clipboard.writeText(tagContainer.textContent).then(() => {
        const originalText = btn.textContent;
        btn.textContent = 'Copied!'; btn.classList.add('copied');
        setTimeout(() => { btn.textContent = originalText; btn.classList.remove('copied'); }, 1500);
      }).catch(err => { console.error('Failed to copy tags: ', err); btn.textContent = 'Error!'; });
    }
  }

  // === ▼ 全面的に修正・機能追加 ▼ ===

  /**
   * AI分類ボタンのクリック処理（プログレスバー対応）
   */
  function handleAiClassifyClick(e) {
    const generalSection = document.getElementById('category-section-general');
    const tagsToClassify = document.getElementById('tags-for-general').textContent.split(', ');

    // プログレスバーUIを生成して表示
    const progressContainer = createProgressUI();
    generalSection.innerHTML = ''; // 元のUIをクリア
    generalSection.appendChild(progressContainer);

    const updateProgress = (percentage, text) => {
      progressContainer.querySelector('.progress-bar-inner').style.width = `${percentage}%`;
      progressContainer.querySelector('.progress-status-text').textContent = text;
    };

    updateProgress(10, '処理を開始...');

    setTimeout(() => {
      updateProgress(25, 'AIに分類をリクエスト中...');
      
      // background.jsにメッセージを送信してAI分類を依頼
      chrome.runtime.sendMessage({ type: "classifyWithAI", tags: tagsToClassify }, (response) => {
        if (response && response.success) {
          updateProgress(75, '応答を解析中...');
          try {
            const classifiedData = JSON.parse(response.data);
            const classifiedHtml = renderClassifiedTagsFromJSON(classifiedData);
            
            updateProgress(100, '分類が完了しました！');
            setTimeout(() => {
              generalSection.innerHTML = classifiedHtml;
              generalSection.querySelectorAll('.tag-copier-button').forEach(button => {
                button.addEventListener('click', handleCopyClick);
              });
            }, 500);

          } catch (parseError) {
            console.error("JSON Parse Error:", parseError, "Raw data:", response.data);
            const errorMessage = `AIの応答形式が不正です: ${parseError.message}`;
            renderErrorState(generalSection, errorMessage);
          }
        } else {
          // 失敗した場合、エラーメッセージを表示
          const errorMessage = response ? response.error : "不明なエラーが発生しました。";
          console.error("AI Classification Error:", errorMessage);
          renderErrorState(generalSection, errorMessage);
        }
      });
    }, 200);
  }

  /**
   * プログレスバーのHTMLを生成する
   * @returns {HTMLElement} プログレスバーのコンテナ要素
   */
  function createProgressUI() {
    const container = document.createElement('div');
    container.className = 'progress-container';
    container.innerHTML = `
      <div class="progress-status-text"></div>
      <div class="progress-bar-wrapper">
        <div class="progress-bar-inner"></div>
      </div>
    `;
    return container;
  }

  /**
   * エラー状態のUIを表示する
   * @param {HTMLElement} container 表示先のコンテナ
   * @param {string} message エラーメッセージ
   */
  function renderErrorState(container, message) {
      container.innerHTML = `<div class="tag-copier-error">エラー: ${message}</div>`;
  }
  
  /**
   * AIからのJSONレスポンスを解析してHTMLを生成する
   * @param {object} classifiedData パース済みのJSONオブジェクト
   * @returns {string} 生成されたHTML文字列
   */
  function renderClassifiedTagsFromJSON(classifiedData) {
    // 順番を定義
    const categoryOrder = {
        body: "身体的特徴",
        attire: "服装",
        composition: "構図・表情・姿勢",
        background: "背景",
        misc: "その他"
    };

    let html = '';
    for (const key in categoryOrder) {
      if (classifiedData[key] && classifiedData[key].length > 0) {
        const categoryName = categoryOrder[key];
        const tags = classifiedData[key].join(', ');
        const categoryId = `ai-cat-${key}`;
        
        html += `
          <div class="tag-copier-category">
            <div class="tag-copier-header">
              <h3 class="tag-copier-title">${categoryName} (${classifiedData[key].length})</h3>
              <button class="tag-copier-button" data-copy-target="${categoryId}">Copy</button>
            </div>
            <div class="tag-copier-tags" id="${categoryId}">${tags}</div>
          </div>
        `;
      }
    }
    return html === '' ? '<div class="tag-copier-error">AIはどのタグも分類できませんでした。</div>' : html;
  }

  // === ▲ 全面的に修正・機能追加 ▲ ===
})();