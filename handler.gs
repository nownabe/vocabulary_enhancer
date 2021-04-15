/* Global Variables */

const ss = SpreadsheetApp.getActiveSpreadsheet();
const config = ss.getSheetByName("Config");

/*
  HTTP Handlers
*/

function doGet(e) {
  return ContentService.createTextOutput("ok");
}

function doPost(e) {
  try {
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
  if (event.type === "follow") { return; }
  
  reply(event.replyToken, `${event.message.text}!!`);
}


/*
  Line API

  https://developers.line.biz/en/reference/messaging-api
*/

const REPLY_URL = "https://api.line.me/v2/bot/message/reply"

const accessToken = config.getRange(1, 2).getValue();

function reply(replyToken, message) {
  try {
    const response = UrlFetchApp.fetch(REPLY_URL, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${accessToken}`,
      },
      method: "post",
      payload: JSON.stringify({
        replyToken: replyToken,
        messages: [{
          type: "text",
          text: message,
        }],
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
  Utility functions
*/

function log(msg) {
  const sheet = ss.getSheetByName("Log");
  sheet.getRange(sheet.getLastRow() + 1, 1).setValue(msg);
}