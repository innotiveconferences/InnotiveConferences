# ICPH2026 page: setup guide

The conference page is static (GitHub Pages). Everything that needs a secret or a database lives in one **Google Apps Script web app** (`apps-script/Code.gs`). The browser talks to it exactly like the existing contact / newsletter forms do.

```
Visitor's browser (GitHub Pages)  ──POST──▶  Apps Script web app  ──▶  Google Sheet  (form responses)
                                                     │              ──▶  Google Drive  (abstract files)
                                                     └────────────────▶  Razorpay API  (payment link)
```

Do these in order. Sections 1-2 are enough to run the Brochure and Abstract forms; section 3 adds payments for Register.

There is no reCAPTCHA. The endpoint is a public URL, so anyone who finds it can post to it; see the note at the end of section 3.

---

## 1. Google Drive: direct download links

The **brochure** and the **abstract template** are files in your Drive. A normal share link opens a preview page; a _direct download link_ starts the download.

1. In Drive, right-click the file → **Share** → **General access** → **Anyone with the link** (role **Viewer**) → **Copy link**. It looks like
   `https://drive.google.com/file/d/`**`FILE_ID`**`/view?usp=sharing`
2. Copy the `FILE_ID` (the long text between `/d/` and `/view`).
3. Direct download link:
   `https://drive.google.com/uc?export=download&id=FILE_ID`
   - If the file is larger than about 25 MB Google shows a "can't scan for viruses" page. Use
     `https://drive.usercontent.google.com/download?id=FILE_ID&export=download&confirm=t` instead.
   - If the **abstract template is a Google Doc** (not an uploaded .docx), use
     `https://docs.google.com/document/d/DOC_ID/export?format=docx`
4. Where each link goes:
   - **Abstract template** (same for every conference) → `abstractTemplateUrl` in `data/site.json`. This link is public by design (the Download button next to "Select a file").
   - **Brochure** → the direct link goes in `brochureUrl` in `data/conferences/<slug>.json`. The page enables the download button as soon as the form is submitted. (The full backend also returns the link once the row is saved and the page prefers that, so `BROCHURE_FILE_ID_ICPH2026` in step 2 should match.)

> The brochure link is in the page's source, and an "Anyone with the link" file can be shared by anyone who has the link, so the form is a lead-capture step, not access control. If the brochure must be truly private, keep it "Restricted" and email it instead.

## 2. Google Sheet + Drive folder + Apps Script

1. **Sheet**: create a Google Sheet named `ICPH2026 Responses`. Copy its id from the URL (`docs.google.com/spreadsheets/d/`**`SHEET_ID`**`/edit`).
   You never edit it by hand; the script creates the tabs (`ICPH2026 Brochure`, `ICPH2026 Abstracts`, `ICPH2026 Registrations`).
   To get an Excel file at any time: **File → Download → Microsoft Excel (.xlsx)**.
2. **Drive folder**: create a folder `ICPH2026 Abstracts`. Copy its id from the URL (`drive.google.com/drive/folders/`**`FOLDER_ID`**). Uploaded abstracts land here (private to you).
3. **Script**: in the Sheet choose **Extensions → Apps Script**. Delete the sample code, paste all of `apps-script/Code.gs`, save.
4. **Script Properties**: ⚙ **Project Settings → Script Properties → Add script property**:

   | Property                                  | Value                                                                                       |
   | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
   | `SHEET_ID`                                | the Sheet id from step 1                                                                    |
   | `ABSTRACT_FOLDER_ID`                      | the folder id from step 2                                                                   |
   | `BROCHURE_FILE_ID_ICPH2026`               | `12tC-61KIYmourmH6Gf1AeqJQPKLmfWVV` (legacy seed; `setup()` copies it into Summit Settings) |
   | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | from section 3 (only needed for Register)                                                   |

5. Run **`setup`** once (select `setup` in the toolbar → **Run**) and accept the permission prompts. Check the Sheet now has the brochure, abstract, registration, and `Summit Settings` tabs.
6. Run **`installTriggers`** once. It adds a 30-minute check that marks payments as Paid even if a visitor closes the tab before returning to the site.
7. **Deploy → New deployment → type: Web app** → _Execute as_: **Me**, _Who has access_: **Anyone** → **Deploy**. Copy the **Web app URL** (ends in `/exec`).
8. Put that URL in `data/site.json` under `apiEndpoints`, then commit and push. GitHub Actions rebuilds the site.
   Set `brochure`, `abstract`, `register`, `verify`, and `summitDates` to the appropriate web app URLs. The payment actions and date feed can share one URL.
9. After **any later change** to `Code.gs`: **Deploy → Manage deployments → ✏ → Version: New version → Deploy** (the URL stays the same).

Quick check: open the `/exec` URL in a browser. You should see `{"status":"ok", ...}`.

### Admin-managed summit dates

The `Summit Settings` tab is the admin control panel for event dates. Share the Google Sheet only with trusted admins. The public website can read the dates through the `summitDates` action, but that endpoint does not allow edits and returns no registration data.

Each row contains a conference ID, `Event Date (YYYY-MM-DD)`, optional `Next Event Date (YYYY-MM-DD)`, and `Brochure File ID`. `setup()` seeds existing brochure IDs from Script Properties when available. For a new or changed brochure, copy its file ID from the Drive URL into the summit's `Brochure File ID` cell. Edit the date cells here too; do not edit the JSON or Apps Script for routine date or brochure changes. The homepage cards, summit detail pages, and brochure forms read these settings when loaded/submitted, so updates do not require a rebuild or redeployment. Leave the next-event date blank until it is scheduled.

## 3. Razorpay dynamic payment link

How it works: the visitor picks what they want and clicks **Enroll Now**. Apps Script recomputes the total from its own price table (the browser's total is never trusted), creates a **Razorpay Payment Link** for exactly that amount, and sends the visitor to Razorpay's hosted payment page. After paying, Razorpay sends them back to `https://innotiveconferences.com/conferences/icph2026.html`, where the page asks Apps Script to confirm the payment and the row turns **Paid**.

1. Razorpay Dashboard → switch to **Test Mode** (top of the dashboard) while you try things.
2. **Account & Settings → API Keys → Generate Test Key**. Copy the **Key Id** and **Key Secret** (the secret is shown once). Save them as Script Properties `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Never put them in GitHub or in `data/site.json`.
3. Test it: on the page click **Register Now**, fill the form, pick a type, **Enroll Now**. Pay with a Razorpay test card (see Razorpay's _Test Cards_ docs). You should return to the site with "Registration confirmed", and the Sheet row shows `Paid` with the payment id.
4. **Going live** (needed to take real money):
   - Complete Razorpay **KYC / account activation**.
   - Prices are in **USD**, and your account is Indian, so also request **International Payments** (Dashboard → Account & Settings → _International payments_ / _Payment methods_). Without it USD payments are declined.
   - Generate **Live** keys and replace the two Script Properties. Delete `TEST_TODAY` if set.
   - Redeploy the web app (section 2, step 9).
5. Links expire after 24 hours (`PAYMENT_LINK_HOURS` in `Code.gs`), so an old Early-bird link cannot be paid after the rate changes.

Why no Razorpay webhook? Apps Script cannot read HTTP headers, and Razorpay puts its webhook signature in a header. Instead the page confirms on return **and** the 30-minute trigger checks every Pending row with Razorpay's API.

**Without reCAPTCHA:** a bot that finds the `/exec` URL can add junk rows, upload junk files, and, through Register, make Razorpay email payment links to arbitrary addresses. The server validates every field and never trusts the browser's price, but it cannot tell a bot from a person. If you see junk in the Sheet, tell us and we'll add a captcha or a hidden honeypot field back.

## 4. Keeping prices in sync

Prices, deadlines and the callback URL exist in two places because the browser shows them and the server enforces them:

- `data/conferences/icph2026.json` → what visitors see
- `apps-script/Code.gs` → `CONFERENCES.icph2026` → what is charged

Change both, redeploy the web app, push the site. If they ever disagree the server refuses the order with "rate changed, reload the page", so a mistake cannot under-charge.

To test other dates without waiting, set Script Property `TEST_TODAY` = `2026-10-15` (server) and open the page locally with `?asof=2026-10-15` (dev server only). Remove `TEST_TODAY` afterwards.

## 5. Editing content / adding another conference

- Content (about text, topics, schedule, speakers, FAQs, prices) is in `data/conferences/icph2026.json`. Add a speaker photo/profile link by giving that person `"image"` and `"url"` (the card becomes a link).
- New conference: copy the JSON to `data/conferences/<slug>.json`, change the content and `id`/`slug`, add the matching block to `CONFERENCES` in `Code.gs`, add its brochure property, run `setup()` again. The page appears at `/conferences/<slug>.html` after the next build.
- Local preview: `npm run dev` (pages are generated automatically). `npm run generate` regenerates without starting the server.
