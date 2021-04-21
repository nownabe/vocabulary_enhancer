/* Global Variables */

const ss = SpreadsheetApp.getActiveSpreadsheet();
const configSheet = ss.getSheetByName("Config");
const vocabularySheet = ss.getSheetByName("Vocabulary");
let logSheet;

const config = Object.fromEntries(configSheet.getRange(1, 1, configSheet.getLastRow(), 2).getValues());
const vocabulary = getVocabulary();


/*
  HTTP Handlers
*/

function doGet(e) {
  return ContentService.createTextOutput("ok");
}

function doPost(e) {
  try {
    log(JSON.stringify(e))
    const events = JSON.parse(e.postData.contents).events;

    for (const event of events) {
      handleEvent(event);
    }
  } catch (e) {
    log(e);
  }
  return ContentService.createTextOutput("ok");
}

function handleEvent(event) {
  if (event.type === "follow") { 
    register(event);
    return;
  }

  if (event.message.text.match(/^(start|開始|スタート)$/)) {
    reply(event.replyToken, [makeQuizMessage()]);
  } else if (event.message.text.match(/^certain: /)) {
    certain(event);
  } else if (event.message.text.match(/^uncertain: /)) {
    uncertain(event);
  } else {
    addWord(event);
  }
}

function certain(event) {
  const [_, word] = /^certain: (.+)$/.exec(event.message.text);
  updateVocabulary(word, true);
  const index = findVocabularyIndex(word);

  const messages = [{ type: "text", text: `正解は「${vocabulary[index][1]}」でした`}];

  const quizMessage = makeQuizMessage(word);
  if (quizMessage) {
    messages.push(quizMessage);
  } else {
    messages.push({ type: "text", text: "本日の復習は以上です"})
  }

  reply(event.replyToken, messages);
}

function uncertain(event) {
  const [_, word] = /^uncertain: (.+)$/.exec(event.message.text);
  updateVocabulary(word, false);
  const index = findVocabularyIndex(word);

  const messages = [{ type: "text", text: `正解は「${vocabulary[index][1]}」でした`}];

  const quizMessage = makeQuizMessage(word);
    if (quizMessage) {
    messages.push(quizMessage);
  } else {
    messages.push({ type: "text", text: "本日の復習は以上です"})
  }

  reply(event.replyToken, messages);
}

function makeQuizMessage(skipWord = null) {
  const vocab = getNextWord(skipWord);

  if (vocab === null) {
    return { type: "text", text: "本日復習できる単語はありません"};
  } else {
    const [word, description, count, lastSolved] = vocab;

    return {
      type: "template",
      altText: "単語クイズ",
      template: {
        type: "buttons",
        title: word,
        text: `連続正解数:${count}\n前回回答日:${lastSolved}`,
        actions: [
          {
            type: "message",
            label: "わかる",
            text: `certain: ${word}`,
          },
          {
            type: "message",
            label: "自信ない",
            text: `uncertain: ${word}`
          }
        ]
      }
    }
  };
}

function register(event) {
  const userId = event.source.userId;

  const metadataSheet = ss.getSheetByName("Metadata");
  metadataSheet.getRange(1, 2).setValue(userId);
}

function addWord(event) {
  const [word, description] = event.message.text.split("\n");
  if (!word || !description) {
    return;
  }

  if (existVocabulary(word)) {
    reply(event.replyToken, `"${word}" は既に登録されています`);
    return;
  }

  const row = vocabularySheet.getLastRow() + 1;
  vocabularySheet.getRange(row, 1).setValue(word);
  vocabularySheet.getRange(row, 2).setValue(description);
  
  const messages = [{
    type: "text",
    text: "単語を追加しました",
  }];

  reply(event.replyToken, messages);
}


/*
  Line API

  https://developers.line.biz/en/reference/messaging-api
*/

const REPLY_URL = "https://api.line.me/v2/bot/message/reply";

function reply(replyToken, messages) {
  try {
    const response = UrlFetchApp.fetch(REPLY_URL, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${config.accessToken}`,
      },
      method: "post",
      payload: JSON.stringify({
        replyToken,
        messages,
      }),
    });
    response.getResponseCode
    log(response);
  } catch (e) {
    log(JSON.stringify(event));
    log(e);
  }
}


/*
  Vocabulary
*/

function getVocabulary() {
  const rows = vocabularySheet.getLastRow() - 1;
  return vocabularySheet.getRange(2, 1, rows, 4).getValues();
}

function existVocabulary(word) {
  return vocabulary.some((vocab) => vocab[0] === word);
}

function findVocabularyIndex(word) {
  return vocabulary.findIndex((vocab) => vocab[0] === word);
}

function updateVocabulary(word, correct) {
  const row = findVocabularyIndex(word) + 2;

  if (correct) {
    const count = parseInt(vocabularySheet.getRange(row, 3).getValue() || "0");
    vocabularySheet.getRange(row, 3).setValue(count + 1);
    vocabularySheet.getRange(row, 4).setValue(new Date().toISOString());
  } else {
    vocabularySheet.getRange(row, 3).setValue(0);
    vocabularySheet.getRange(row, 4).setValue(new Date().toISOString());
  }
}

const daysToRepeat = [1, 3, 7, 14, 28, 56, 84];

function getNextWord(skipWord = null) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const vocab of vocabulary) {
    if (vocab[0] === skipWord) { continue; }

    const count = parseInt(vocab[2] || "0");

    if (!vocab[3]) { return vocab; }

    const lastSolvedAt = new Date(vocab[3]);
    const lastSolvedOn = new Date(lastSolvedAt.getFullYear(), lastSolvedAt.getMonth(), lastSolvedAt.getDate());
    const diffDays = (today - lastSolvedOn) / 86400000; // 1000 * 60 * 60 * 24;

    if (diffDays < 1) { continue; }

    if (count === 0 && (!lastSolvedOn || diffDays >= 1)) {
      return vocab;
    }

    for (let i = 0; i < daysToRepeat.length; i++) {
      if (count === i + 1 && diffDays >= daysToRepeat[i]) {
        return vocab;
      }
    }

    if (count > daysToRepeat.length && diffDays >= daysToRepeat[daysToRepeat.length - 1]) {
      return vocab;
    }
  }

  return null;
}


/*
  Utility functions
*/

function log(msg) {
  if (!logSheet) {
    logSheet = ss.getSheetByName("Log");
  }
  logSheet.getRange(logSheet.getLastRow() + 1, 1).setValue(msg);
}