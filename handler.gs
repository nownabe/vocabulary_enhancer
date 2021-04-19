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

  if (event.message.text.match(/^start$/)) {
    // reply(event.replyToken, makeQuizMessage());
  } else if (event.message.text.match(/^certain/)) {
    // certain(event);
  } else if (event.message.text.match(/^uncertain/)) {
    // uncertain(event);
  } else {
    addWord(event);
  }
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


/*
  Utility functions
*/

function log(msg) {
  if (!logSheet) {
    logSheet = ss.getSheetByName("Log");
  }
  logSheet.getRange(logSheet.getLastRow() + 1, 1).setValue(msg);
}