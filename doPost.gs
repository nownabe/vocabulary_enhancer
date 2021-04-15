/*
  https://developers.line.biz/en/reference/messaging-api
*/

const REPLY_URL = "https://api.line.me/v2/bot/message/reply"

const ss = SpreadsheetApp.getActiveSpreadsheet();
const config = ss.getSheetByName("Config");
const accessToken = config.getRange(1, 2).getValue();

function doGet(e) {
  return ContentService.createTextOutput("ok");
}

function doPost(e) {
  const events = JSON.parse(e.postData.contents).events;

  for (const event of events) {
    handleEvent(event);
  }

  return ContentService.createTextOutput("ok");
}

function handleEvent(event) {
  if (event.type === "follow") { return; }

  try {
    UrlFetchApp.fetch(REPLY_URL, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${accessToken}`,
      },
      method: "post",
      payload: JSON.stringify({
        replyToken: event.replyToken,
        messages: [{
          type: "text",
          text: `${event.message.text}!`,
        }],
      }),
    });
  } catch (e) {
    log(JSON.stringify(event));
    log(e);
  }
}

function log(msg) {
  const sheet = ss.getSheetByName("Log");
  sheet.getRange(sheet.getLastRow() + 1, 1).setValue(msg);
}