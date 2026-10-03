/**
 * Innotive Conferences - BROCHURE + ABSTRACT + REGISTRATION backend.
 * Paste it into Extensions > Apps Script of the response Sheet.
 *
 *   action=brochure -> row in the "ICPH2026 Brochure" tab, returns the brochure link
 *   action=abstract -> the .doc/.docx is saved in a Google Drive folder and a row is added to the
 *                      "ICPH2026 Abstracts" tab with the file's Drive link in the "File Link" column
 *
 * Configure ABSTRACT_FOLDER_ID, BROCHURE_FILE_ID_ICPH2026, RAZORPAY_KEY_ID, and
 * RAZORPAY_KEY_SECRET in Script Properties. Never commit real IDs or secrets.
 */

const CONFERENCE_ID = "icph2026";
const CONFERENCE_NAME = "ICPH2026";

const MAX_ABSTRACT_BYTES = 5 * 1024 * 1024; // keep in sync with maxAbstractMB in data/site.json
const PAYMENT_LINK_HOURS = 24;
const PAYMENT_CONFIG = {
  currency: "USD",
  registrationOpens: "2026-07-31",
  callbackUrl: "https://innotiveconferences.com/conferences/icph2026.html",
  tiers: [
    { id: "earlybird", label: "Earlybird Registration", endsOn: "2026-09-30" },
    { id: "second", label: "Second Term Registration", endsOn: "2026-10-31" },
    { id: "final", label: "Final Registration", endsOn: "2026-11-10" },
  ],
  categories: {
    oral: {
      label: "Oral/Keynote/Plenary/Poster Presentation",
      prices: { earlybird: 199, second: 299, final: 399 },
    },
    "student-oral": {
      label: "Student Oral/Poster Presentation",
      prices: { earlybird: 99, second: 199, final: 299 },
    },
    recorded: {
      label: "Recorded Video Presentation",
      prices: { earlybird: 99, second: 199, final: 299 },
    },
    workshop: {
      label: "Workshop",
      prices: { earlybird: 99, second: 199, final: 299 },
    },
    delegate: {
      label: "Delegate",
      prices: { earlybird: 99, second: 199, final: 299 },
    },
    group: {
      label: "Group Registration (Participants - 3 to 5 Members)",
      prices: { earlybird: 500, second: 600, final: 700 },
    },
    "group-student": {
      label: "Group Registration (Students - 3 to 5 Members)",
      prices: { earlybird: 300, second: 400, final: 500 },
    },
  },
};
const MIME_DOC = "application/msword";
const MIME_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const TABS = {
  brochure: {
    name: "ICPH2026 Brochure",
    headers: [
      "Timestamp",
      "Title",
      "Name",
      "Email",
      "Phone",
      "Organization",
      "Country",
      "Postal Address",
    ],
  },
  abstracts: {
    name: "ICPH2026 Abstracts",
    headers: [
      "Timestamp",
      "Reference",
      "Title",
      "Name",
      "Email",
      "Phone",
      "Organization",
      "Country",
      "Postal Address",
      "File Name",
      "File Link",
    ],
  },
  registrations: {
    name: "ICPH2026 Registrations",
    headers: [
      "Timestamp",
      "Reference",
      "Title",
      "Name",
      "Email",
      "Phone",
      "University",
      "Address 1",
      "Address 2",
      "City",
      "State/Province",
      "Zip",
      "Country",
      "Rate",
      "Registration Types",
      "Currency",
      "Total",
      "Status",
      "Payment Link ID",
      "Payment Link",
      "Payment ID",
      "Paid At",
    ],
  },
};

// ---------------------------------------------------------------------------
// Web app entry points
// ---------------------------------------------------------------------------
function doGet() {
  return json_({
    status: "ok",
    message: "Brochure + abstract backend is running.",
  });
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.conferenceId !== CONFERENCE_ID) fail_("Unknown conference.");

    switch (p.action) {
      case "brochure":
        return json_(handleBrochure_(p));
      case "abstract":
        return json_(handleAbstract_(p));
      case "register":
        return json_(handleRegister_(p));
      case "verify":
        return json_(handleVerify_(p));
      default:
        fail_("This form is not available yet. Please email the organisers.");
    }
  } catch (err) {
    if (err instanceof UserError)
      return json_({ status: "error", message: err.message });
    console.error(err && err.stack ? err.stack : err);
    return json_({
      status: "error",
      message: "Something went wrong on our side. Please try again later.",
    });
  }
}

// ---------------------------------------------------------------------------
// Brochure
// ---------------------------------------------------------------------------
function handleBrochure_(p) {
  const person = validatePerson_(p);
  const brochureFileId = prop_("BROCHURE_FILE_ID_" + CONFERENCE_NAME);
  if (!brochureFileId)
    throw new Error("BROCHURE_FILE_ID_" + CONFERENCE_NAME + " is not set.");

  appendRow_(TABS.brochure, [
    now_(),
    person.title,
    person.fullName,
    person.email,
    person.phone,
    person.organization,
    person.country,
    clean_(p.address, 1000),
  ]);

  return {
    status: "success",
    downloadUrl:
      "https://drive.google.com/uc?export=download&id=" +
      encodeURIComponent(brochureFileId),
  };
}

// ---------------------------------------------------------------------------
// Abstract
// ---------------------------------------------------------------------------
function handleAbstract_(p) {
  const person = validatePerson_(p);

  const fileName = clean_(p.fileName, 150);
  const ext = (fileName.match(/\.(docx?)$/i) || [])[1];
  if (!ext) fail_("Only .doc or .docx files are accepted.");
  if (!p.fileBase64) fail_("Please attach your abstract file.");

  let bytes;
  try {
    bytes = Utilities.base64Decode(String(p.fileBase64));
  } catch (err) {
    fail_("The uploaded file could not be read. Please try again.");
  }
  if (!bytes.length) fail_("The uploaded file is empty.");
  if (bytes.length > MAX_ABSTRACT_BYTES)
    fail_(
      "File is too large (max " + MAX_ABSTRACT_BYTES / 1024 / 1024 + " MB).",
    );

  // Check the real file signature: .docx is a zip ("PK"), .doc is an OLE2 file.
  const at = function (i) {
    return bytes[i] & 0xff;
  };
  const isDocx = ext.toLowerCase() === "docx";
  const looksValid = isDocx
    ? at(0) === 0x50 && at(1) === 0x4b
    : at(0) === 0xd0 && at(1) === 0xcf && at(2) === 0x11 && at(3) === 0xe0;
  if (!looksValid) fail_("The file does not look like a valid Word document.");

  const folderId = prop_("ABSTRACT_FOLDER_ID");
  if (!folderId) throw new Error("ABSTRACT_FOLDER_ID is not set.");
  const reference = reference_();
  const safeName = fileName.replace(/[^A-Za-z0-9._ -]/g, "_");
  const file = DriveApp.getFolderById(folderId).createFile(
    Utilities.newBlob(
      bytes,
      isDocx ? MIME_DOCX : MIME_DOC,
      reference + "_" + safeName,
    ),
  );

  try {
    appendRow_(TABS.abstracts, [
      now_(),
      reference,
      person.title,
      person.fullName,
      person.email,
      person.phone,
      person.organization,
      person.country,
      clean_(p.address, 1000),
      fileName,
      file.getUrl(),
    ]);
  } catch (err) {
    file.setTrashed(true); // don't leave an orphan file that has no row
    throw err;
  }

  return { status: "success", reference: reference };
}

// ---------------------------------------------------------------------------
// Registration and Razorpay payments
// ---------------------------------------------------------------------------
function handleRegister_(p) {
  const person = validatePerson_(p);
  const address = {
    address1: clean_(p.address1, 120),
    address2: clean_(p.address2, 120),
    city: clean_(p.city, 80),
    state: clean_(p.state, 80),
    zip: clean_(p.zip, 12),
  };
  if (
    address.address1.length < 2 ||
    address.address2.length < 2 ||
    address.city.length < 2 ||
    address.state.length < 2 ||
    address.zip.length < 3
  ) {
    fail_("Please complete all address fields.");
  }

  const today =
    prop_("TEST_TODAY") ||
    Utilities.formatDate(new Date(), "UTC", "yyyy-MM-dd");
  if (today < PAYMENT_CONFIG.registrationOpens)
    fail_("Registration is not open yet.");
  const tier = PAYMENT_CONFIG.tiers.filter(function (item) {
    return today <= item.endsOn;
  })[0];
  if (!tier) fail_("Registration is closed.");

  const ids = String(p.categories || "")
    .split(",")
    .map(function (id) {
      return id.trim();
    })
    .filter(String);
  if (!ids.length) fail_("Please select at least one registration type.");
  const seen = {};
  let total = 0;
  const labels = [];
  ids.forEach(function (id) {
    if (!Object.prototype.hasOwnProperty.call(PAYMENT_CONFIG.categories, id))
      fail_("Unknown registration type.");
    if (seen[id]) return;
    seen[id] = true;
    total += PAYMENT_CONFIG.categories[id].prices[tier.id];
    labels.push(PAYMENT_CONFIG.categories[id].label);
  });
  if (clean_(p.tier, 30) !== tier.id || Number(p.clientTotal) !== total) {
    fail_(
      "The registration rate changed while this page was open. Please reload the page and try again.",
    );
  }

  const tab = TABS.registrations;
  const reference = reference_();
  const sheet = sheet_(tab);
  const row = appendRow_(tab, [
    now_(),
    reference,
    person.title,
    person.fullName,
    person.email,
    person.phone,
    person.organization,
    address.address1,
    address.address2,
    address.city,
    address.state,
    address.zip,
    person.country,
    tier.label,
    labels.join("; "),
    PAYMENT_CONFIG.currency,
    total,
    "Pending",
    "",
    "",
    "",
    "",
  ]);

  let paymentLink;
  try {
    paymentLink = createPaymentLink_(reference, tier, labels, total, person);
  } catch (err) {
    setCell_(sheet, row, tab, "Status", "Payment link failed");
    throw err;
  }
  setCell_(sheet, row, tab, "Payment Link ID", paymentLink.id);
  setCell_(sheet, row, tab, "Payment Link", paymentLink.short_url);
  return {
    status: "success",
    paymentUrl: paymentLink.short_url,
    reference: reference,
    total: total,
  };
}

function handleVerify_(p) {
  const linkId = clean_(p.razorpay_payment_link_id, 60);
  if (!/^plink_[A-Za-z0-9]+$/.test(linkId)) fail_("Invalid payment reference.");

  const signature = clean_(p.razorpay_signature, 200);
  if (signature) {
    const payload = [
      linkId,
      clean_(p.razorpay_payment_link_reference_id, 80),
      clean_(p.razorpay_payment_link_status, 30),
      clean_(p.razorpay_payment_id, 60),
    ].join("|");
    if (!safeEqual_(hmacHex_(payload, paymentSecret_()), signature))
      fail_("Payment signature mismatch.");
  }

  const link = razorpay_("get", "/payment_links/" + encodeURIComponent(linkId));
  const tab = TABS.registrations;
  const sheet = sheet_(tab);
  const row = findRow_(sheet, tab, "Reference", link.reference_id);
  if (!row) fail_("We could not find this registration.");
  if (link.status === "paid") markPaid_(sheet, row, tab, link);
  return {
    status: "success",
    paymentStatus: link.status,
    reference: link.reference_id,
  };
}

function createPaymentLink_(reference, tier, labels, total, person) {
  const customer = { name: person.fullName, email: person.email };
  const phone = person.phone.replace(/[^\d+]/g, "");
  if (/^\+\d{8,15}$/.test(phone)) customer.contact = phone;
  return razorpay_("post", "/payment_links", {
    amount: Math.round(total * 100),
    currency: PAYMENT_CONFIG.currency,
    accept_partial: false,
    reference_id: reference,
    description: (
      CONFERENCE_NAME +
      " registration - " +
      labels.join(", ") +
      " (" +
      tier.label +
      ")"
    ).slice(0, 250),
    customer: customer,
    notify: { sms: false, email: true },
    reminder_enable: false,
    expire_by: Math.floor(Date.now() / 1000) + PAYMENT_LINK_HOURS * 3600,
    notes: {
      conference: CONFERENCE_NAME,
      reference: reference,
      rate: tier.label,
    },
    callback_url: PAYMENT_CONFIG.callbackUrl,
    callback_method: "get",
  });
}

function razorpay_(method, path, payload) {
  const auth = Utilities.base64Encode(paymentKeyId_() + ":" + paymentSecret_());
  const options = {
    method: method,
    headers: { Authorization: "Basic " + auth },
    muteHttpExceptions: true,
  };
  if (payload) {
    options.contentType = "application/json";
    options.payload = JSON.stringify(payload);
  }
  const response = UrlFetchApp.fetch(
    "https://api.razorpay.com/v1" + path,
    options,
  );
  const body = JSON.parse(response.getContentText() || "{}");
  if (response.getResponseCode() >= 300) {
    throw new Error(
      "Razorpay " +
        response.getResponseCode() +
        ": " +
        (body.error ? body.error.description : response.getContentText()),
    );
  }
  return body;
}

function markPaid_(sheet, row, tab, link) {
  if (getCell_(sheet, row, tab, "Status") === "Paid") return;
  const payment = (link.payments || [])[0] || {};
  setCell_(sheet, row, tab, "Status", "Paid");
  setCell_(sheet, row, tab, "Payment ID", payment.payment_id || "");
  setCell_(sheet, row, tab, "Paid At", now_());
}

/** Time-driven reconciliation for payments completed after the visitor leaves the site. */
function reconcilePending() {
  const tab = TABS.registrations;
  const sheet = sheet_(tab);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const rows = sheet
    .getRange(2, 1, lastRow - 1, tab.headers.length)
    .getValues();
  rows.forEach(function (values, index) {
    if (values[tab.headers.indexOf("Status")] !== "Pending") return;
    const linkId = values[tab.headers.indexOf("Payment Link ID")];
    if (!linkId) return;
    try {
      const link = razorpay_(
        "get",
        "/payment_links/" + encodeURIComponent(linkId),
      );
      const row = index + 2;
      if (link.status === "paid") markPaid_(sheet, row, tab, link);
      else if (link.status === "expired" || link.status === "cancelled") {
        setCell_(
          sheet,
          row,
          tab,
          "Status",
          link.status.charAt(0).toUpperCase() + link.status.slice(1),
        );
      }
    } catch (err) {
      console.error("reconcile " + linkId + ": " + err);
    }
  });
}

function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "reconcilePending")
      ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("reconcilePending")
    .timeBased()
    .everyMinutes(30)
    .create();
}

// ---------------------------------------------------------------------------
// One-time setup (run from the Apps Script editor)
// ---------------------------------------------------------------------------
/** Creates both tabs with their header rows and asks for the Sheets + Drive permissions. */
function setup() {
  sheet_(TABS.brochure);
  sheet_(TABS.abstracts);
  sheet_(TABS.registrations);
  const folderId = prop_("ABSTRACT_FOLDER_ID");
  if (folderId)
    console.log(
      "Abstract folder: " + DriveApp.getFolderById(folderId).getName(),
    );
  UrlFetchApp.fetch("https://www.google.com/generate_204", {
    muteHttpExceptions: true,
  });
  console.log("Setup complete.");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
class UserError extends Error {}

function fail_(message) {
  throw new UserError(message);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function clean_(value, max) {
  return String(value == null ? "" : value)
    .trim()
    .slice(0, max || 500);
}

function prop_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function paymentKeyId_() {
  const value = prop_("RAZORPAY_KEY_ID");
  if (!value)
    throw new Error("RAZORPAY_KEY_ID is not set in Script Properties.");
  return value;
}

function paymentSecret_() {
  const value = prop_("RAZORPAY_KEY_SECRET");
  if (!value)
    throw new Error("RAZORPAY_KEY_SECRET is not set in Script Properties.");
  return value;
}

function now_() {
  return Utilities.formatDate(new Date(), "UTC", "yyyy-MM-dd HH:mm:ss 'UTC'");
}

function reference_() {
  return (
    CONFERENCE_NAME +
    "-" +
    Utilities.formatDate(new Date(), "UTC", "yyMMdd") +
    "-" +
    Utilities.getUuid().slice(0, 6).toUpperCase()
  );
}

/** Returns the tab, creating it (with its header row) the first time. */
function sheet_(tab) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(tab.name) || ss.insertSheet(tab.name);
  if (sheet.getLastRow() === 0) {
    sheet
      .getRange(1, 1, 1, tab.headers.length)
      .setValues([tab.headers])
      .setFontWeight("bold")
      .setBackground("#E2E8F0");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function colIndex_(tab, header) {
  const index = tab.headers.indexOf(header);
  if (index < 0) throw new Error("Unknown column " + header);
  return index + 1;
}

function setCell_(sheet, row, tab, header, value) {
  sheet.getRange(row, colIndex_(tab, header)).setValue(safeCell_(value));
}

function getCell_(sheet, row, tab, header) {
  return sheet.getRange(row, colIndex_(tab, header)).getValue();
}

function findRow_(sheet, tab, header, value) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const found = sheet
    .getRange(2, colIndex_(tab, header), lastRow - 1, 1)
    .createTextFinder(String(value))
    .matchEntireCell(true)
    .findNext();
  return found ? found.getRow() : null;
}

// Stops text like =HYPERLINK(...) or +91... from being treated as a formula.
function safeCell_(value) {
  return typeof value === "string" && /^[=+\-@\t\r]/.test(value)
    ? "'" + value
    : value;
}

function appendRow_(tab, values) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = sheet_(tab);
    sheet.appendRow(values.map(safeCell_));
    return sheet.getLastRow();
  } finally {
    lock.releaseLock();
  }
}

function hmacHex_(message, secret) {
  return Utilities.computeHmacSha256Signature(message, secret)
    .map(function (byte) {
      return ("0" + (byte & 0xff).toString(16)).slice(-2);
    })
    .join("");
}

function safeEqual_(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function validatePerson_(p) {
  const v = {
    title: clean_(p.title, 20),
    fullName: clean_(p.fullName, 80),
    email: clean_(p.email, 254),
    phone: clean_(p.phone, 30),
    organization: clean_(p.organization, 120),
    country: clean_(p.country, 80),
  };
  if (!v.title) fail_("Please select a title.");
  if (v.fullName.length < 2) fail_("Please enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email))
    fail_("Please enter a valid email address.");
  const digits = v.phone.replace(/\D/g, "").length;
  if (!/^\+?[\d\s().-]+$/.test(v.phone) || digits < 7 || digits > 15)
    fail_("Please enter a valid phone number.");
  if (v.organization.length < 2) fail_("Please enter your organization.");
  if (!v.country) fail_("Please select a country.");
  return v;
}
