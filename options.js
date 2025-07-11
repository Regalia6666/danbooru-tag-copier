// 保存されたAPIキーを読み込んで入力フィールドに表示
function restoreOptions() {
  chrome.storage.sync.get({ apiKey: '' }, (items) => {
    document.getElementById('api-key').value = items.apiKey;
  });
}

// フォームの入力を保存
function saveOptions() {
  const apiKey = document.getElementById('api-key').value;
  chrome.storage.sync.set({ apiKey: apiKey }, () => {
    // 保存されたことをユーザーに通知
    const status = document.getElementById('status');
    status.textContent = 'APIキーを保存しました。';
    status.style.opacity = 1;
    setTimeout(() => {
      status.style.opacity = 0;
    }, 1500);
    setTimeout(() => {
        status.textContent = '';
    }, 2500);
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);