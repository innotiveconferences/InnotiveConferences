/**
 * Innotive Conferences - BROCHURE FORM ONLY (starter backend).
 *
 * Paste this into Extensions > Apps Script of the Google Sheet that should store the responses.
 * When the "Download Brochure" form on conferences/icph2026.html is submitted, this script:
 *   1. validates the details,
 *   2. saves them as a new row in the "ICPH2026 Brochure" tab,
 *   3. only then returns the brochure download link (which enables the button on the page).
 *
 * The Abstract and Register forms get a friendly "not available yet" message until you replace this
 * with the full backend (apps-script/Code.gs). The tab name and columns match Code.gs, so the same
 * Sheet keeps working. Steps: docs/icph2026-setup.md.
 */

const CONFERENCE_ID = 'icph2026';
const TAB_NAME = 'ICPH2026 Brochure';
const HEADERS = ['Timestamp', 'Title', 'Name', 'Email', 'Phone', 'Organization', 'Country', 'Postal Address'];

// Drive FILE_ID of the brochure: the text between /d/ and /view in its share link.
// Paste it between the quotes below (or set a Script Property named BROCHURE_FILE_ID).
// The file must be shared as "Anyone with the link".
const BROCHURE_FILE_ID = '';

// ---------------------------------------------------------------------------
// Web app entry points
// ---------------------------------------------------------------------------
function doGet() {
  return json_({ status: 'ok', message: 'Brochure form backend is running.' });
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.conferenceId !== CONFERENCE_ID) fail_('Unknown conference.');
    if (p.action !== 'brochure') fail_('This form is not available yet. Please email the organisers.');
    return json_(handleBrochure_(p));
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
  const fileId = prop_('BROCHURE_FILE_ID') || BROCHURE_FILE_ID;
  if (!fileId) throw new Error('BROCHURE_FILE_ID is not set.');

  appendRow_([
    now_(), person.title, person.fullName, person.email, person.phone, person.organization, person.country,
    clean_(p.address, 1000),
  ]);

  // Only reached after the row was saved.
  return { status: 'success', downloadUrl: 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(fileId) };
}

// ---------------------------------------------------------------------------
// One-time setup (run from the Apps Script editor)
// ---------------------------------------------------------------------------
/** Creates the "ICPH2026 Brochure" tab with its header row and triggers the permission prompt. */
function setup() {
  sheet_();
  console.log('Setup complete: tab "' + TAB_NAME + '" is ready.');
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

function prop_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function clean_(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max || 500);
}

function now_() {
  return Utilities.formatDate(new Date(), 'UTC', "yyyy-MM-dd HH:mm:ss 'UTC'");
}

/** The Sheet this script is attached to (or the one named by an optional SHEET_ID property). */
function spreadsheet_() {
  const id = prop_('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

/** Returns the brochure tab, creating it (with headers) the first time. */
function sheet_() {
  const ss = spreadsheet_();
  const sheet = ss.getSheetByName(TAB_NAME) || ss.insertSheet(TAB_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#E2E8F0');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Stops a visitor's text from being run as a spreadsheet formula (=, +, -, @ at the start). */
function safeCell_(value) {
  return typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
}

function appendRow_(values) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    sheet_().appendRow(values.map(safeCell_));
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
