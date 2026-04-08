const SHEET_NAME = "Signups";
const CONFIG_SHEET_NAME = "Config";
const ADMIN_EMAIL = "priyavratbhardwaj4455@gmail.com";
const ADMIN_NOTIFY_WEBHOOK = "";
const ADMIN_LOGIN_USERNAME = "admin";
const ADMIN_LOGIN_PASSWORD = "Admin@7700";
const ADMIN_SESSION_TOKEN = "admin_session_token_change_me";

function doGet(e) {
  const action = sanitize_(e && e.parameter && e.parameter.action) || "status";

  if (action === "login") {
    const username = sanitize_(e && e.parameter && e.parameter.username);
    const password = sanitize_(e && e.parameter && e.parameter.password);

    if (username !== ADMIN_LOGIN_USERNAME || password !== ADMIN_LOGIN_PASSWORD) {
      return jsonResponse_({ ok: false, error: "Invalid admin credentials" });
    }

    return jsonResponse_({
      ok: true,
      token: ADMIN_SESSION_TOKEN,
      admin: ADMIN_LOGIN_USERNAME
    });
  }

  if (action === "list") {
    const token = sanitize_(e && e.parameter && e.parameter.token);
    if (!token || token !== ADMIN_SESSION_TOKEN) {
      return jsonResponse_({ ok: false, error: "Unauthorized" });
    }

    const sheet = getSheet_();
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      return jsonResponse_({ ok: true, total: 0, rows: [] });
    }

    const headers = values[0];
    const rows = values
      .slice(1)
      .filter(function (row) {
        return row.some(function (cell) {
          return String(cell).trim() !== "";
        });
      })
      .map(function (row) {
        return mapRow_(headers, row);
      })
      .reverse();

    return jsonResponse_({ ok: true, total: rows.length, rows: rows });
  }

  if (action === "config") {
    const config = readConfig_();
    return jsonResponse_({
      ok: true,
      websites: config.websites,
      whatsappHelpline: config.whatsappHelpline
    });
  }

  if (action === "save_config") {
    const token = sanitize_(e && e.parameter && e.parameter.token);
    if (!token || token !== ADMIN_SESSION_TOKEN) {
      return jsonResponse_({ ok: false, error: "Unauthorized" });
    }

    const current = readConfig_();
    const websitesRaw = e && e.parameter ? (e.parameter.websites_json || e.parameter.websites) : "";
    const helplineRaw = e && e.parameter ? e.parameter.whatsapp_helpline : "";

    const parsedWebsites = parseWebsites_(websitesRaw);
    const websites = parsedWebsites.length ? parsedWebsites : current.websites;
    const nextHelpline = normalizePhone_(helplineRaw) || current.whatsappHelpline;

    if (!websites.length) {
      return jsonResponse_({ ok: false, error: "At least one website is required" });
    }

    writeConfig_(websites, nextHelpline);

    return jsonResponse_({
      ok: true,
      message: "Config saved",
      websites: websites,
      whatsappHelpline: nextHelpline
    });
  }

  return jsonResponse_({ ok: true, message: "Signup endpoint is running." });
}

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    const data = JSON.parse(raw);

    const username = sanitize_(data.username);
    const mobileNumber = sanitize_(data.mobileNumber);
    const password = sanitize_(data.password);
    const website = sanitize_(data.website);
    const submittedAt = sanitize_(data.submittedAt) || new Date().toISOString();

    const sheet = getSheet_();
    sheet.appendRow([submittedAt, username, mobileNumber, password, website]);

    const subject = "New Signup Alert";
    const body =
      "Kisi ne sign up kiya hai.\n\n" +
      "Username: " + username + "\n" +
      "Mobile Number: " + mobileNumber + "\n" +
      "Website: " + website + "\n" +
      "Submitted At: " + submittedAt;

    MailApp.sendEmail(ADMIN_EMAIL, subject, body);

    if (ADMIN_NOTIFY_WEBHOOK) {
      UrlFetchApp.fetch(ADMIN_NOTIFY_WEBHOOK, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({
          text:
            "New signup received\n" +
            "Username: " + username + "\n" +
            "Mobile: " + mobileNumber + "\n" +
            "Website: " + website
        }),
        muteHttpExceptions: true
      });
    }

    return jsonResponse_({ ok: true });
  } catch (error) {
    return jsonResponse_({ ok: false, error: String(error) });
  }
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (sheet) {
    return sheet;
  }

  const created = spreadsheet.insertSheet(SHEET_NAME);
  created.appendRow(["Submitted At", "Username", "Mobile Number", "Password", "Website"]);
  return created;
}

function getConfigSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(CONFIG_SHEET_NAME);
  if (sheet) {
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Key", "Value"]);
    }
    return sheet;
  }

  const created = spreadsheet.insertSheet(CONFIG_SHEET_NAME);
  created.appendRow(["Key", "Value"]);
  return created;
}

function readConfig_() {
  const sheet = getConfigSheet_();
  const values = sheet.getDataRange().getValues();
  const map = {};

  for (let i = 1; i < values.length; i++) {
    const key = sanitize_(values[i][0]);
    const value = sanitize_(values[i][1]);
    if (key) {
      map[key] = value;
    }
  }

  let websites = parseWebsites_(map.websites_json);
  if (!websites.length) {
    websites = ["bpexch"];
  }

  let whatsappHelpline = normalizePhone_(map.whatsapp_helpline);
  if (!whatsappHelpline) {
    whatsappHelpline = "919999999999";
  }

  if (!map.websites_json || !map.whatsapp_helpline) {
    writeConfig_(websites, whatsappHelpline);
  }

  return {
    websites: websites,
    whatsappHelpline: whatsappHelpline
  };
}

function writeConfig_(websites, whatsappHelpline) {
  const safeWebsites = parseWebsites_(JSON.stringify(websites));
  const safeHelpline = normalizePhone_(whatsappHelpline) || "919999999999";
  const sheet = getConfigSheet_();

  const rows = [
    ["Key", "Value"],
    ["websites_json", JSON.stringify(safeWebsites)],
    ["whatsapp_helpline", safeHelpline]
  ];

  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
}

function parseWebsites_(value) {
  if (Array.isArray(value)) {
    return sanitizeWebsites_(value);
  }

  const raw = sanitize_(value);
  if (!raw) {
    return [];
  }

  let parsed = [];
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    parsed = raw.split(",");
  }

  return sanitizeWebsites_(parsed);
}

function sanitizeWebsites_(list) {
  const seen = {};
  const clean = [];

  for (let i = 0; i < list.length; i++) {
    const site = sanitize_(list[i]);
    if (!site) {
      continue;
    }

    const key = site.toLowerCase();
    if (seen[key]) {
      continue;
    }

    seen[key] = true;
    clean.push(site);
  }

  return clean;
}

function normalizePhone_(value) {
  const digits = sanitize_(value).replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  if (digits.length === 10) {
    return "91" + digits;
  }

  if (digits.length >= 11 && digits.length <= 15) {
    return digits;
  }

  return "";
}

function sanitize_(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function mapRow_(headers, row) {
  const obj = {};
  headers.forEach(function (header, index) {
    obj[sanitize_(header)] = formatCell_(row[index]);
  });
  return obj;
}

function formatCell_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  }
  return sanitize_(value);
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
