/**
 * background.js
 * (説明は省略)
 */

// 拡張機能のインストール/更新時にコンテキストメニューを再作成する
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.remove("copyDanbooruTags", () => {
    if (chrome.runtime.lastError) { /* No-op */ }
    chrome.contextMenus.create({
      id: "copyDanbooruTags",
      title: "Danbooruタグを分類してコピー",
      contexts: ["page", "image"],
      documentUrlPatterns: ["*://danbooru.donmai.us/posts/*"]
    });
  });
});

// コンテキストメニューがクリックされたときの処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "copyDanbooruTags") {
    chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["main.css"]
    }, () => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
    });
  }
});

// ツールバーアイコンクリックでオプションページを開く
chrome.action.onClicked.addListener((tab) => {
  chrome.runtime.openOptionsPage();
});

// content.jsからのメッセージを待機
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "classifyWithAI") {
    classifyTags(request.tags)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Gemini APIにリクエストを送信する関数 (プロンプトを修正)
async function classifyTags(tags) {
  const { apiKey } = await chrome.storage.sync.get('apiKey');
  if (!apiKey) {
    throw new Error("APIキーが設定されていません。拡張機能のオプションページで設定してください。");
  }

  // === ▼ 修正箇所 ▼ ===
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  const prompt = `
あなたは、与えられたタグリストを特定のカテゴリに分類する専門家です。
以下の「General Tags」を、指定されたカテゴリに分類し、結果を厳密なJSON形式で出力してください。

# 制約条件
- 出力は必ずJSONオブジェクトそのものだけにしてください。Markdownのコードブロック( \`\`\`json ... \`\`\` )や、その他の説明文は一切含めないでください。
- 分類先のカテゴリ名は、指定された日本語のキー（「身体」「服装」など）をそのまま使用してください。
- 各カテゴリに属するタグがない場合は、そのカテゴリのキー自体をJSONに含めないでください。
- タグは元の英語のまま、配列（Array）に格納してください。

# General Tags
${tags.join(', ')}

# 分類カテゴリとJSONのキー
- 身体 (body): 髪, ヘアスタイル, 髪色, 顔, 目, 肩, 体, 胸, 手, 性器, 尻, 肌の色, 羽, しっぽ, 体型, 身体的特徴, など
- 服装 (attire): 服, 帽子, 眼鏡等, ピアス, ドレス, 袖, ブラ, パンツ, 靴下など, 性交衣装, 裸, 水着, コスプレ, 衣装, 耳首・ネクタイ, 小物など
- 構図 (composition): 姿勢, ジェスチャー, 動作, 表情, カメラワーク,など
- 背景 (background): 場所, 祝日, ブランド名, 人物, 仕事など
- その他 (misc): 漫画的表現, テキストなど

# 出力形式のJSONスキーマ
{
  "body"?: string[],
  "attire"?: string[],
  "composition"?: string[],
  "background"?: string[],
  "misc"?: string[]
}

# 出力例
{
  "body": ["1girl", "ahoge", "brown hair", "pink eyes"],
  "attire": ["backpack", "bag", "beret", "black hat", "jacket"],
  "composition": ["blush", "sitting", "smile"],
  "background": ["car interior", "gift", "happy birthday"],
  "misc": ["english text"]
}
`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.0, // 再現性を最大限に高める
            response_mime_type: "application/json", // JSON出力を強制
        }
      })
    });
  // === ▲ 修正箇所 ▲ ===

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`APIエラー (ステータス: ${response.status}): ${errorData.error?.message || '不明なエラー'}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error("APIからのレスポンス形式が不正です。");
    }
    
    return text;

  } catch (error) {
    throw new Error(error.message || "ネットワークエラーが発生しました。");
  }
}