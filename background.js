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
      title: "Danbooruタグをコピー",
      // === ▼ 修正箇所 ▼ ===
      // contextsに "image" を追加し、画像の上でもメニューが表示されるようにする
      contexts: ["page", "image"],
      // === ▲ 修正箇所 ▲ ===
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
  // タグリスト全体のセクションを取得
  const tagListSection = document.getElementById('tag-list');
  if (!tagListSection) {
    alert('エラー: タグリストが見つかりませんでした。');
    return;
  }

  // 「キャラクタータグ」と「一般タグ」のリスト内にあるタグ要素のみを選択します。
  const tagElements = tagListSection.querySelectorAll(
    '.character-tag-list li[data-tag-name], .general-tag-list li[data-tag-name]'
  );
  
  // 各要素からタグ名 (data-tag-name) を抽出して配列にする
  const tags = Array.from(tagElements).map(li => li.dataset.tagName);

  if (tags.length === 0) {
    alert('コピーするタグが見つかりませんでした。\n(一般タグまたはキャラクタータグがありません)');
    return;
  }

  // タグを「, 」(カンマ + 半角スペース)区切りの一つの文字列に結合
  const tagString = tags.join(', ');

  // 結合した文字列をクリップボードにコピー
  navigator.clipboard.writeText(tagString).then(() => {
    // 成功したことをユーザーに通知
    alert(`${tags.length}個のタグをクリップボードにコピーしました。\n\n${tagString.substring(0, 200)}...`);
  }).catch(err => {
    // 失敗したことをユーザーに通知
    console.error('タグのコピーに失敗しました:', err);
    alert('タグのコピーに失敗しました。詳細はコンソールを確認してください。');
  });
}