/**
 * Innotive Conferences - BROCHURE + ABSTRACT forms (starter backend).
 * A superset of BrochureOnly.gs: paste it into Extensions > Apps Script of the response Sheet.
 *
 *   action=brochure -> row in the "ICPH2026 Brochure" tab, returns the brochure link
 *   action=abstract -> the .doc/.docx is saved in a Google Drive folder and a row is added to the
 *                      "ICPH2026 Abstracts" tab with the file's Drive link in the "File Link" column
 *
 * Register + payment still need the full backend (apps-script/Code.gs).
 * Fill the two IDs below in the Apps Script editor; keep real IDs out of the repo.
 */

const CONFERENCE_ID = 'icph2026';
const CONFERENCE_NAME = 'ICPH2026';

// Drive FILE_ID of the brochure (text between /d/ and /view in its share link).
const BROCHURE_FILE_ID = '';
// Drive folder that receives the uploaded abstracts (text after /folders/ in the folder's URL).
const ABSTRACT_FOLDER_ID = '';

const MAX_ABSTRACT_BYTES = 5 * 1024 * 1024; // keep in sync with maxAbstractMB in data/site.json
const MIME_DOC = 'application/msword';
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const TABS = {
  brochure: {
    name: 'ICPH2026 Brochure',
    headers: ['Timestamp', 'Title', 'Name', 'Email', 'Phone', 'Organization', 'Country', 'Postal Address'],
  },
  abstracts: {
    name: 'ICPH2026 Abstracts',
    headers: ['Timestamp', 'Reference', 'Title', 'Name', 'Email', 'Phone', 'Organization', 'Country', 'Postal Address', 'File Name', 'File Link'],
  },
};

// ---------------------------------------------------------------------------
// Web app entry points
// ---------------------------------------------------------------------------
function doGet() {
  return json_({ status: 'ok', message: 'Brochure + abstract backend is running.' });
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.conferenceId !== CONFERENCE_ID) fail_('Unknown conference.');

    switch (p.action) {
      case 'brochure': return json_(handleBrochure_(p));
      case 'abstract': return json_(handleAbstract_(p));
      default: fail_('This form is not available yet. Please email the organisers.');
    }
  } catch (err) {
    if (err instanceof UserError) return json_({ status: 'error', message: err.message });
    console.error(err && err.stack ? err.stack : err);
    return json_({ status: 'error', message: 'Something went wrong on our side. Please try again later.' });
  }
}

// ---------------------------------------------------------------------------
// Brochure
// ---------------------------------------------------------------------------
function handleBrochure_(p) {
  const person = validatePerson_(p);
  if (!BROCHURE_FILE_ID) throw new Error('BROCHURE_FILE_ID is not set.');

  appendRow_(TABS.brochure, [
    now_(), person.title, person.fullName, person.email, person.phone, person.organization, person.country,
    clean_(p.address, 1000),
  ]);

  return { status: 'success', downloadUrl: 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(BROCHURE_FILE_ID) };
}

// ---------------------------------------------------------------------------
// Abstract
// ---------------------------------------------------------------------------
function handleAbstract_(p) {
  const person = validatePerson_(p);

  const fileName = clean_(p.fileName, 150);
  const ext = (fileName.match(/\.(docx?)$/i) || [])[1];
  if (!ext) fail_('Only .doc or .docx files are accepted.');
  if (!p.fileBase64) fail_('Please attach your abstract file.');

  let bytes;
  try {
    bytes = Utilities.base64Decode(String(p.fileBase64));
  } catch (err) {
    fail_('The uploaded file could not be read. Please try again.');
  }
  if (!bytes.length) fail_('The uploaded file is empty.');
  if (bytes.length > MAX_ABSTRACT_BYTES) fail_('File is too large (max ' + MAX_ABSTRACT_BYTES / 1024 / 1024 + ' MB).');

  // Check the real file signature: .docx is a zip ("PK"), .doc is an OLE2 file.
  const at = function (i) { return bytes[i] & 0xff; };
  const isDocx = ext.toLowerCase() === 'docx';
  const looksValid = isDocx
    ? at(0) === 0x50 && at(1) === 0x4b
    : at(0) === 0xd0 && at(1) === 0xcf && at(2) === 0x11 && at(3) === 0xe0;
  if (!looksValid) fail_('The file does not look like a valid Word document.');

  if (!ABSTRACT_FOLDER_ID) throw new Error('ABSTRACT_FOLDER_ID is not set.');
  const reference = reference_();
  const safeName = fileName.replace(/[^A-Za-z0-9._ -]/g, '_');
  const file = DriveApp.getFolderById(ABSTRACT_FOLDER_ID).createFile(
    Utilities.newBlob(bytes, isDocx ? MIME_DOCX : MIME_DOC, reference + '_' + safeName)
  );

  try {
    appendRow_(TABS.abstracts, [
      now_(), reference, person.title, person.fullName, person.email, person.phone, person.organization, person.country,
      clean_(p.address, 1000), fileName, file.getUrl(),
    ]);
  } catch (err) {
    file.setTrashed(true); // don't leave an orphan file that has no row
    throw err;
  }

  return { status: 'success', reference: reference };
}

// ---------------------------------------------------------------------------
// One-time setup (run from the Apps Script editor)
// ---------------------------------------------------------------------------
/** Creates both tabs with their header rows and asks for the Sheets + Drive permissions. */
function setup() {
  sheet_(TABS.brochure);
  sheet_(TABS.abstracts);
  if (ABSTRACT_FOLDER_ID) console.log('Abstract folder: ' + DriveApp.getFolderById(ABSTRACT_FOLDER_ID).getName());
  console.log('Setup complete.');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
class UserError extends Error {}

function fail_(message) {
  throw new UserError(message);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clean_(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max || 500);
}

function now_() {
  return Utilities.formatDate(new Date(), 'UTC', "yyyy-MM-dd HH:mm:ss 'UTC'");
}

function reference_() {
  return CONFERENCE_NAME + '-' + Utilities.formatDate(new Date(), 'UTC', 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
}

/** Returns the tab, creating it (with its header row) the first time. */
function sheet_(tab) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(tab.name) || ss.insertSheet(tab.name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, tab.headers.length).setValues([tab.headers]).setFontWeight('bold').setBackground('#E2E8F0');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Stops text like =HYPERLINK(...) or +91... from being treated as a formula.
function safeCell_(value) {
  return typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
}

function appendRow_(tab, values) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    sheet_(tab).appendRow(values.map(safeCell_));
  } finally {
    lock.releaseLock();
  }
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
  if (!v.title) fail_('Please select a title.');
  if (v.fullName.length < 2) fail_('Please enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) fail_('Please enter a valid email address.');
  const digits = v.phone.replace(/\D/g, '').length;
  if (!/^\+?[\d\s().-]+$/.test(v.phone) || digits < 7 || digits > 15) fail_('Please enter a valid phone number.');
  if (v.organization.length < 2) fail_('Please enter your organization.');
  if (!v.country) fail_('Please select a country.');
  return v;
}
