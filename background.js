/**
 * background.js
 * 
 * コンテキストメニューの作成と、クリック時のタグコピージョブの実行を担当します。
 */

// 拡張機能のインストール時や更新時にコンテキストメニューを（再）作成します。
chrome.runtime.onInstalled.addListener(() => {
  // 既存のメニューを一度削除してから作成することで、重複によるエラーを防ぎます。
  chrome.contextMenus.remove("copyDanbooruTags", () => {
    // コールバック内で lastError をチェックすることで "Unchecked runtime.lastError" を防ぎます。
    if (chrome.runtime.lastError) {
        // console.log('古いメニュー項目はありませんでした。');
    }

    // 新しいコンテキストメニューを作成します。
    chrome.contextMenus.create({
      id: "copyDanbooruTags",
      title: "Danbooruタグをコピー (一般/キャラのみ)",
      contexts: ["page", "image"],
      documentUrlPatterns: ["*://danbooru.donmai.us/posts/*"]
    });
  });
});

// コンテキストメニューがクリックされたときの処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // 作成したメニューがクリックされたか確認
  if (info.menuItemId === "copyDanbooruTags") {
    // 現在のタブでスクリプトを実行
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: copyTagsToClipboard // ページ上で実行する関数
    });
  }
});

/**
 * ページ上で実行され、タグをクリップボードにコピーする関数
 */
function copyTagsToClipboard() {
  // === ▼ 修正箇所 ▼ ===
  /**
   * ページ上にカスタム通知を表示し、自動で消す関数
   * @param {string} message 表示するメッセージ
   * @param {number} duration 表示時間（ミリ秒）。デフォルトは3000ms (3秒)。
   */
  function showNotification(message, duration = 3000) {
    // 通知用のdiv要素を作成
    const notification = document.createElement('div');
    notification.textContent = message;

    // スタイルを設定（画面右上に固定表示）
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: 'rgba(28, 32, 37, 0.9)', // DanbooruのUIに合わせた色
      color: 'white',
      padding: '12px 20px',
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: '999999', // 他の要素より手前に表示
      fontSize: '14px',
      opacity: '0', // 初期状態は透明
      transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out', // フェードイン/アウト効果
      transform: 'translateY(-20px)'
    });

    // bodyに要素を追加
    document.body.appendChild(notification);

    // 少し遅らせてからフェードインと移動アニメーションを開始
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    }, 10);

    // 指定時間後にフェードアウトして削除
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-20px)';
      // transitionアニメーションが終わった後にDOMから要素を削除
      notification.addEventListener('transitionend', () => {
        notification.remove();
      });
    }, duration);
  }

  // タグリスト全体のセクションを取得
  const tagListSection = document.getElementById('tag-list');
  if (!tagListSection) {
    showNotification('エラー: タグリストが見つかりませんでした。');
    return;
  }

  // 「キャラクタータグ」と「一般タグ」のリスト内にあるタグ要素のみを選択します。
  const tagElements = tagListSection.querySelectorAll(
    '.character-tag-list li[data-tag-name], .general-tag-list li[data-tag-name]'
  );
  
  // 各要素からタグ名 (data-tag-name) を抽出して配列にする
  const tags = Array.from(tagElements).map(li => li.dataset.tagName);

  if (tags.length === 0) {
    showNotification('コピーするタグが見つかりませんでした。(一般/キャラタグなし)');
    return;
  }

  // タグを「, 」(カンマ + 半角スペース)区切りの一つの文字列に結合
  const tagString = tags.join(', ');

  // 結合した文字列をクリップボードにコピー
  navigator.clipboard.writeText(tagString).then(() => {
    // 成功したことをユーザーにカスタム通知で知らせる
    showNotification(`${tags.length}個のタグをクリップボードにコピーしました。`);
  }).catch(err => {
    // 失敗したことをユーザーに通知
    console.error('タグのコピーに失敗しました:', err);
    showNotification('エラー: タグのコピーに失敗しました。');
  });
  // === ▲ 修正箇所 ▲ ===
}
