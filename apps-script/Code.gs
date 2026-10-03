/**
 * Innotive Conferences - conference backend (Google Apps Script web app).
 *
 * Handles the forms on conferences/<slug>.html:
 *   action=brochure  -> saves the visitor to the "<CONF> Brochure" sheet, returns the brochure download link
 *   action=abstract  -> saves the .doc/.docx to Drive + a row in "<CONF> Abstracts"
 *   action=register  -> saves a Pending row in "<CONF> Registrations", creates a Razorpay Payment Link
 *   action=verify    -> called when Razorpay sends the visitor back; confirms payment and marks the row Paid
 *   reconcilePending -> time trigger; marks Paid any Pending row whose payment link was paid later
 *
 * Setup steps: docs/icph2026-setup.md. All secrets live in Script Properties, never in this file.
 *
 * Script Properties:
 *   SHEET_ID                    id of the Google Sheet that stores responses
 *   ABSTRACT_FOLDER_ID          id of the Drive folder for uploaded abstracts
 *   BROCHURE_FILE_ID_ICPH2026   Drive file id of the brochure (one property per conference: BROCHURE_FILE_ID_<NAME>)
 *   RAZORPAY_KEY_ID             Razorpay API key id
 *   RAZORPAY_KEY_SECRET         Razorpay API key secret
 *   TEST_TODAY   (optional)     YYYY-MM-DD to pretend it is that day when picking the rate. Remove for production.
 */

// ---------------------------------------------------------------------------
// Conference configuration.
// KEEP IN SYNC with data/conferences/<slug>.json (tiers, deadlines, prices).
// ---------------------------------------------------------------------------
const CONFERENCES = {
  icph2026: {
    name: "ICPH2026",
    currency: "USD",
    registrationOpens: "2026-07-31",
    eventDate: "2026-10-14",
    nextEventDate: "",
    callbackUrl: "https://innotiveconferences.com/conferences/icph2026.html",
    tiers: [
      {
        id: "earlybird",
        label: "Earlybird Registration",
        endsOn: "2026-09-30",
      },
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
  },
};

function addConferenceWithIcpPricing_(id) {
  CONFERENCES[id] = Object.assign({}, CONFERENCES.icph2026, {
    name: id.toUpperCase(),
    eventDate: id === "icai2026" ? "2026-12-27" : "2026-10-14",
    nextEventDate: "",
    callbackUrl: "https://innotiveconferences.com/conferences/" + id + ".html",
  });
}

["icai2026", "iccan2026", "iccm2026", "icid2026", "icre2026"].forEach(
  addConferenceWithIcpPricing_,
);

const MAX_ABSTRACT_BYTES = 5 * 1024 * 1024; // keep in sync with maxAbstractMB in data/site.json
const PAYMENT_LINK_HOURS = 24; // a link stops working after this long, so an old Earlybird link can't be paid weeks later
const MIME_DOC = "application/msword";
const MIME_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const SHEET_HEADERS = {
  Brochure: [
    "Timestamp",
    "Title",
    "Name",
    "Email",
    "Phone",
    "Organization",
    "Country",
    "Postal Address",
  ],
  Abstracts: [
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
  Registrations: [
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
};

// ---------------------------------------------------------------------------
// Web app entry points
// ---------------------------------------------------------------------------
function doGet(e) {
  if (e && e.parameter && e.parameter.action === "summitDates") {
    return json_(getSummitDates_());
  }
  return json_({
    status: "ok",
    message: "Innotive conference backend is running.",
  });
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    const conf = Object.prototype.hasOwnProperty.call(
      CONFERENCES,
      p.conferenceId,
    )
      ? CONFERENCES[p.conferenceId]
      : null;
    if (!conf) fail_("Unknown conference.");

    switch (p.action) {
      case "brochure":
        return json_(handleBrochure_(conf, p));
      case "abstract":
        return json_(handleAbstract_(conf, p));
      case "register":
        return json_(handleRegister_(conf, p));
      case "verify":
        return json_(handleVerify_(conf, p));
      default:
        fail_("Unknown action.");
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
// Handlers
// ---------------------------------------------------------------------------
function handleBrochure_(conf, p) {
  const person = validatePerson_(p);
  const fileId = brochureFileId_(conf);
  if (!fileId)
    throw new Error(
      "Script property BROCHURE_FILE_ID_" + conf.name + " is not set.",
    );

  appendRow_(sheet_(conf, "Brochure"), [
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
      encodeURIComponent(fileId),
  };
}

function handleAbstract_(conf, p) {
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

  const reference = reference_(conf);
  const safeName = fileName.replace(/[^A-Za-z0-9._ -]/g, "_");
  const file = folder_(conf).createFile(
    Utilities.newBlob(
      bytes,
      isDocx ? MIME_DOCX : MIME_DOC,
      reference + "_" + safeName,
    ),
  );

  appendRow_(sheet_(conf, "Abstracts"), [
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

  return { status: "success", reference: reference };
}

function handleRegister_(conf, p) {
  const person = validatePerson_(p);
  const addr = {
    address1: clean_(p.address1, 120),
    address2: clean_(p.address2, 120),
    city: clean_(p.city, 80),
    state: clean_(p.state, 80),
    zip: clean_(p.zip, 12),
  };
  if (
    addr.address1.length < 2 ||
    addr.address2.length < 2 ||
    addr.city.length < 2 ||
    addr.state.length < 2 ||
    addr.zip.length < 3
  ) {
    fail_("Please complete all address fields.");
  }

  // The price is always computed here, never taken from the browser.
  const today = today_();
  if (today < conf.registrationOpens)
    fail_("Registration opens on " + conf.registrationOpens + ".");
  const tier = conf.tiers.filter(function (t) {
    return today <= t.endsOn;
  })[0];
  if (!tier) fail_("Registration is closed.");

  const ids = String(p.categories || "")
    .split(",")
    .map(function (s) {
      return s.trim();
    })
    .filter(String);
  if (!ids.length) fail_("Please select at least one registration type.");
  const seen = {};
  let total = 0;
  const labels = [];
  ids.forEach(function (id) {
    if (!Object.prototype.hasOwnProperty.call(conf.categories, id))
      fail_("Unknown registration type.");
    if (seen[id]) return;
    seen[id] = true;
    total += conf.categories[id].prices[tier.id];
    labels.push(conf.categories[id].label);
  });

  if (clean_(p.tier, 30) !== tier.id || Number(p.clientTotal) !== total) {
    fail_(
      "The registration rate changed while this page was open. Please reload the page and try again.",
    );
  }

  const reference = reference_(conf);
  const sheet = sheet_(conf, "Registrations");
  const row = appendRow_(sheet, [
    now_(),
    reference,
    person.title,
    person.fullName,
    person.email,
    person.phone,
    person.organization,
    addr.address1,
    addr.address2,
    addr.city,
    addr.state,
    addr.zip,
    person.country,
    tier.label,
    labels.join("; "),
    conf.currency,
    total,
    "Pending",
    "",
    "",
    "",
    "",
  ]);

  let link;
  try {
    link = createPaymentLink_(conf, reference, tier, labels, total, person);
  } catch (err) {
    setCell_(sheet, row, "Registrations", "Status", "Payment link failed");
    throw err;
  }
  setCell_(sheet, row, "Registrations", "Payment Link ID", link.id);
  setCell_(sheet, row, "Registrations", "Payment Link", link.short_url);

  return {
    status: "success",
    paymentUrl: link.short_url,
    reference: reference,
    total: total,
  };
}

function handleVerify_(conf, p) {
  const linkId = clean_(p.razorpay_payment_link_id, 60);
  if (!/^plink_[A-Za-z0-9]+$/.test(linkId)) fail_("Invalid payment reference.");

  // When Razorpay sends a signature, it must match (proves the redirect came from Razorpay).
  const signature = clean_(p.razorpay_signature, 200);
  if (signature) {
    const payload = [
      linkId,
      clean_(p.razorpay_payment_link_reference_id, 80),
      clean_(p.razorpay_payment_link_status, 30),
      clean_(p.razorpay_payment_id, 60),
    ].join("|");
    if (!safeEqual_(hmacHex_(payload, prop_("RAZORPAY_KEY_SECRET")), signature))
      fail_("Payment signature mismatch.");
  }

  // Razorpay's own API is the source of truth for the status.
  const link = razorpay_("get", "/payment_links/" + linkId);
  const sheet = sheet_(conf, "Registrations");
  const row = findRow_(sheet, "Registrations", "Reference", link.reference_id);
  if (!row) fail_("We could not find this registration.");

  if (link.status === "paid") markPaid_(sheet, row, link);
  return {
    status: "success",
    paymentStatus: link.status,
    reference: link.reference_id,
  };
}

// ---------------------------------------------------------------------------
// Payments (Razorpay Payment Links)
// ---------------------------------------------------------------------------
function createPaymentLink_(conf, reference, tier, labels, total, person) {
  const customer = { name: person.fullName, email: person.email };
  const phone = person.phone.replace(/[^\d+]/g, "");
  if (/^\+\d{8,15}$/.test(phone)) customer.contact = phone; // Razorpay only accepts numbers with a country code

  return razorpay_("post", "/payment_links", {
    amount: Math.round(total * 100), // smallest currency unit (cents)
    currency: conf.currency,
    accept_partial: false,
    reference_id: reference,
    description: (
      conf.name +
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
    notes: { conference: conf.name, reference: reference, rate: tier.label },
    callback_url: conf.callbackUrl,
    callback_method: "get",
  });
}

function razorpay_(method, path, payload) {
  const auth = Utilities.base64Encode(
    prop_("RAZORPAY_KEY_ID") + ":" + prop_("RAZORPAY_KEY_SECRET"),
  );
  const options = {
    method: method,
    headers: { Authorization: "Basic " + auth },
    muteHttpExceptions: true,
  };
  if (payload) {
    options.contentType = "application/json";
    options.payload = JSON.stringify(payload);
  }
  const res = UrlFetchApp.fetch("https://api.razorpay.com/v1" + path, options);
  const body = JSON.parse(res.getContentText() || "{}");
  if (res.getResponseCode() >= 300) {
    throw new Error(
      "Razorpay " +
        res.getResponseCode() +
        ": " +
        (body.error ? body.error.description : res.getContentText()),
    );
  }
  return body;
}

function markPaid_(sheet, row, link) {
  const status = getCell_(sheet, row, "Registrations", "Status");
  if (status === "Paid") return;
  const payment = (link.payments || [])[0] || {};
  setCell_(sheet, row, "Registrations", "Status", "Paid");
  setCell_(sheet, row, "Registrations", "Payment ID", payment.payment_id || "");
  setCell_(sheet, row, "Registrations", "Paid At", now_());
}

/** Time-driven: settles Pending rows whose payment link was paid, expired or cancelled after the visitor left the page. */
function reconcilePending() {
  const started = Date.now();
  Object.keys(CONFERENCES).forEach(function (key) {
    const conf = CONFERENCES[key];
    const sheet = sheet_(conf, "Registrations");
    const last = sheet.getLastRow();
    if (last < 2) return;

    const H = SHEET_HEADERS.Registrations;
    const values = sheet.getRange(2, 1, last - 1, H.length).getValues();
    values.forEach(function (rowValues, i) {
      if (Date.now() - started > 4.5 * 60 * 1000) return; // stay inside the 6 minute limit
      const status = rowValues[H.indexOf("Status")];
      const linkId = rowValues[H.indexOf("Payment Link ID")];
      if (status !== "Pending" || !linkId) return;

      try {
        const link = razorpay_("get", "/payment_links/" + linkId);
        const row = i + 2;
        if (link.status === "paid") markPaid_(sheet, row, link);
        else if (link.status === "expired")
          setCell_(sheet, row, "Registrations", "Status", "Expired");
        else if (link.status === "cancelled")
          setCell_(sheet, row, "Registrations", "Status", "Cancelled");
      } catch (err) {
        console.error("reconcile " + linkId + ": " + err);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// One-time setup helpers (run from the Apps Script editor)
// ---------------------------------------------------------------------------
/** Creates the sheet tabs + Drive folders and triggers the permission prompt. */
function setup() {
  const ss = SpreadsheetApp.openById(prop_("SHEET_ID"));
  Object.keys(CONFERENCES).forEach(function (key) {
    const conf = CONFERENCES[key];
    Object.keys(SHEET_HEADERS).forEach(function (kind) {
      const name = tabName_(conf, kind);
      const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
      const headers = SHEET_HEADERS[kind];
      sheet
        .getRange(1, 1, 1, headers.length)
        .setValues([headers])
        .setFontWeight("bold")
        .setBackground("#E2E8F0");
      sheet.setFrozenRows(1);
    });
    folder_(conf);
  });
  setupSummitSettings_(ss);
  UrlFetchApp.fetch("https://www.google.com/generate_204", {
    muteHttpExceptions: true,
  }); // requests the external-request permission
  console.log("Setup complete.");
}

function setupSummitSettings_(ss) {
  const tabName = "Summit Settings";
  const headers = [
    "Conference ID",
    "Event Date (YYYY-MM-DD)",
    "Next Event Date (YYYY-MM-DD)",
    "Brochure File ID",
  ];
  const sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);
  if (sheet.getLastRow() === 0) {
    sheet
      .getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight("bold")
      .setBackground("#E2E8F0");
  } else {
    sheet
      .getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight("bold")
      .setBackground("#E2E8F0");
  }

  const lastRow = sheet.getLastRow();
  const existingIds =
    lastRow > 1
      ? sheet
          .getRange(2, 1, lastRow - 1, 1)
          .getValues()
          .map(function (row) {
            return String(row[0]).trim();
          })
      : [];
  const missing = Object.keys(CONFERENCES).filter(function (id) {
    return existingIds.indexOf(id) === -1;
  });
  if (missing.length) {
    sheet.getRange(lastRow + 1, 1, missing.length, headers.length).setValues(
      missing.map(function (id) {
        const conf = CONFERENCES[id];
        return [
          id,
          conf.eventDate || "",
          conf.nextEventDate || "",
          prop_("BROCHURE_FILE_ID_" + conf.name) || "",
        ];
      }),
    );
  }

  const dataLastRow = sheet.getLastRow();
  if (dataLastRow > 1) {
    const rows = sheet
      .getRange(2, 1, dataLastRow - 1, headers.length)
      .getValues();
    rows.forEach(function (row, index) {
      const id = clean_(row[0], 30);
      const conf = CONFERENCES[id];
      if (!conf || clean_(row[3], 200)) return;
      const legacyId = prop_("BROCHURE_FILE_ID_" + conf.name);
      if (legacyId) sheet.getRange(index + 2, 4).setValue(legacyId);
    });
  }
  sheet.setFrozenRows(1);
}

function getSummitDates_() {
  const ss = SpreadsheetApp.openById(prop_("SHEET_ID"));
  const sheet = ss.getSheetByName("Summit Settings");
  if (!sheet)
    throw new Error(
      'Sheet tab "Summit Settings" not found. Run setup() first.',
    );

  const lastRow = sheet.getLastRow();
  const timezone = ss.getSpreadsheetTimeZone() || "UTC";
  const events = {};
  if (lastRow > 1) {
    sheet
      .getRange(2, 1, lastRow - 1, 4)
      .getValues()
      .forEach(function (row) {
        const id = clean_(row[0], 30);
        if (!Object.prototype.hasOwnProperty.call(CONFERENCES, id)) return;
        const fileId =
          clean_(row[3], 200) ||
          prop_("BROCHURE_FILE_ID_" + CONFERENCES[id].name) ||
          "";
        events[id] = {
          eventDate: summitDateValue_(row[1], timezone),
          nextEventDate: summitDateValue_(row[2], timezone),
          brochureUrl: fileId
            ? "https://drive.google.com/uc?export=download&id=" +
              encodeURIComponent(fileId)
            : "",
        };
      });
  }
  return { status: "success", events: events };
}

function summitDateValue_(value, timezone) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, timezone, "yyyy-MM-dd");
  }
  const text = clean_(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function brochureFileId_(conf) {
  const ss = SpreadsheetApp.openById(prop_("SHEET_ID"));
  const sheet = ss.getSheetByName("Summit Settings");
  if (sheet && sheet.getLastRow() > 1) {
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
    for (let index = 0; index < rows.length; index++) {
      if (clean_(rows[index][0], 30) === conf.id) {
        const fileId = clean_(rows[index][3], 200);
        if (fileId) return fileId;
        break;
      }
    }
  }
  return prop_("BROCHURE_FILE_ID_" + conf.name);
}

/** Installs the 30-minute reconcile trigger (safe to run more than once). */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "reconcilePending")
      ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("reconcilePending")
    .timeBased()
    .everyMinutes(30)
    .create();
  console.log("Trigger installed.");
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

function prop_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function clean_(value, max) {
  return String(value == null ? "" : value)
    .trim()
    .slice(0, max || 500);
}

function now_() {
  return Utilities.formatDate(new Date(), "UTC", "yyyy-MM-dd HH:mm:ss 'UTC'");
}

function today_() {
  return (
    prop_("TEST_TODAY") || Utilities.formatDate(new Date(), "UTC", "yyyy-MM-dd")
  );
}

function reference_(conf) {
  return (
    conf.name +
    "-" +
    Utilities.formatDate(new Date(), "UTC", "yyMMdd") +
    "-" +
    Utilities.getUuid().slice(0, 6).toUpperCase()
  );
}

function tabName_(conf, kind) {
  return conf.name + " " + kind;
}

function sheet_(conf, kind) {
  const sheet = SpreadsheetApp.openById(prop_("SHEET_ID")).getSheetByName(
    tabName_(conf, kind),
  );
  if (!sheet)
    throw new Error(
      'Sheet tab "' + tabName_(conf, kind) + '" not found. Run setup() first.',
    );
  return sheet;
}

function folder_(conf) {
  const root = DriveApp.getFolderById(prop_("ABSTRACT_FOLDER_ID"));
  const existing = root.getFoldersByName(conf.name);
  return existing.hasNext() ? existing.next() : root.createFolder(conf.name);
}

/** Stops a visitor's text from being run as a spreadsheet formula (=, +, -, @ at the start). */
function safeCell_(value) {
  return typeof value === "string" && /^[=+\-@\t\r]/.test(value)
    ? "'" + value
    : value;
}

/** Appends a row under a lock and returns its row number. */
function appendRow_(sheet, values) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    sheet.appendRow(values.map(safeCell_));
    return sheet.getLastRow();
  } finally {
    lock.releaseLock();
  }
}

function colIndex_(kind, header) {
  const i = SHEET_HEADERS[kind].indexOf(header);
  if (i < 0) throw new Error("Unknown column " + header);
  return i + 1;
}

function setCell_(sheet, row, kind, header, value) {
  sheet.getRange(row, colIndex_(kind, header)).setValue(safeCell_(value));
}

function getCell_(sheet, row, kind, header) {
  return sheet.getRange(row, colIndex_(kind, header)).getValue();
}

function findRow_(sheet, kind, header, value) {
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const found = sheet
    .getRange(2, colIndex_(kind, header), last - 1, 1)
    .createTextFinder(String(value))
    .matchEntireCell(true)
    .findNext();
  return found ? found.getRow() : null;
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
  if (v.organization.length < 2)
    fail_("Please enter your organization / university.");
  if (!v.country) fail_("Please select a country.");
  return v;
}

function hmacHex_(message, secret) {
  return Utilities.computeHmacSha256Signature(message, secret)
    .map(function (b) {
      return ("0" + (b & 0xff).toString(16)).slice(-2);
    })
    .join("");
}

function safeEqual_(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
