/**
 * Conference page template. Pure function: (conference data, site data, footer) -> HTML string.
 * Content lives in data/conferences/<slug>.json; edit that, not the generated HTML.
 */

// ---------------------------------------------------------------- helpers
const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const parseDate = (iso) => new Date(`${iso}T00:00:00Z`);

const longDate = (iso) =>
  parseDate(iso).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const ordinal = (n) => {
  const rem = n % 100;
  if (rem >= 11 && rem <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"}`;
};

const ordinalDate = (iso) => {
  const d = parseDate(iso);
  const month = d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
  });
  return `${ordinal(d.getUTCDate())} ${month}, ${d.getUTCFullYear()}`;
};

const CURRENCY_SYMBOL = { USD: "$", EUR: "â‚¬" };
const money = (amount, currency) =>
  `${CURRENCY_SYMBOL[currency] ?? ""}${Number(amount).toFixed(2)}`;

/** Escapes text, then turns [label](url) and bare e-mail addresses into links. `@abstractTemplate` resolves to the site-wide template URL. */
const linkify = (text, site) =>
  esc(text).replace(
    /\[([^\]]+)\]\(([^)]+)\)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g,
    (_, label, url, email) => {
      if (email) return `<a href="mailto:${email}">${email}</a>`;
      const href =
        url === "@abstractTemplate" ? site.abstractTemplateUrl || "#" : url;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    },
  );

const scheduleTime = (slot, tz) => {
  const startMer = slot.endMeridiem ? ` ${slot.meridiem}` : "";
  const endMer = slot.endMeridiem ?? slot.meridiem;
  return `${slot.start}${startMer} â€“ ${slot.end} ${endMer} (${tz})`;
};

// ------------------------------------------------------------ form pieces
const AUTOCOMPLETE = {
  title: "honorific-prefix",
  fullName: "name",
  email: "email",
  phone: "tel",
  organization: "organization",
  address1: "address-line1",
  address2: "address-line2",
  city: "address-level2",
  state: "address-level1",
  zip: "postal-code",
  country: "country-name",
};

/** One labelled form control. `col` is the width in a 12-column grid. */
const field = ({
  prefix,
  name,
  label,
  col,
  type = "text",
  required = true,
  placeholder = "",
  options = "",
  extra = "",
}) => {
  const id = `${prefix}-${name}`;
  const common = `id="${id}" name="${name}" class="form-control"${required ? " required" : ""}`;
  const auto = AUTOCOMPLETE[name]
    ? ` autocomplete="${AUTOCOMPLETE[name]}"`
    : "";
  let control;
  if (type === "select") {
    control = `<select ${common}${auto}><option value="">Select</option>${options}</select>`;
  } else if (type === "textarea") {
    control = `<textarea ${common} maxlength="1000" placeholder="${esc(placeholder)}"${auto}></textarea>`;
  } else {
    control = `<input type="${type}" ${common} placeholder="${esc(placeholder)}"${auto} />`;
  }
  const star = required ? ' <span class="req" aria-hidden="true">*</span>' : "";
  return `<div class="form-group col-${col}"><label for="${id}">${label}${star}</label>${control}${extra}</div>`;
};

const counter = (prefix) =>
  `<span class="char-count" data-count-for="${prefix}-address">0/1000</span>`;

const modalShell = ({ id, title, intro = "", wide = false, body }) => `
    <div class="modal" id="modal-${id}" role="dialog" aria-modal="true" aria-labelledby="modal-${id}-title" aria-hidden="true">
      <div class="modal-dialog${wide ? " modal-dialog--wide" : ""}">
        <button type="button" class="modal-close" data-modal-close aria-label="Close dialog">&times;</button>
        <div class="modal-header">
          <h3 id="modal-${id}-title">${title}</h3>
          ${intro ? `<p>${intro}</p>` : ""}
        </div>
        <div class="modal-body">${body}</div>
      </div>
    </div>`;

// ---------------------------------------------------------------- sections
const heroActions = () => `
              <button type="button" class="btn btn-primary btn-grow-outline" data-modal-open="register"><i data-lucide="ticket"></i> Register Now</button>
              <button type="button" class="btn btn-accent" data-modal-open="abstract"><i data-lucide="file-up"></i> Submit Abstract</button>
              <button type="button" class="btn btn-secondary conf-btn-light" data-modal-open="brochure"><i data-lucide="download"></i> Download Brochure</button>
              <a href="#guidelines" class="btn btn-secondary conf-btn-light"><i data-lucide="book-open"></i> Guidelines</a>`;

const header = () => `
    <header class="site-header" id="header">
      <div class="container header-container">
        <a href="/" class="logo" id="logoLink">
          <img
            src="../assets/images/logo_Inno.png"
            alt=""
            class="logo-icon home-logo-image"
          />
          <span>Innotive Conferences</span>
        </a>

        <nav class="site-navigation conf-navigation" id="navigation" aria-label="Main Navigation">
          <ul class="nav-menu" id="navMenu">
            <li><a href="#about" class="nav-link">About</a></li>
            <li><a href="#sessions" class="nav-link">Sessions</a></li>
            <li><a href="#schedule" class="nav-link">Schedule</a></li>
            <li><a href="#speakers" class="nav-link">Speakers</a></li>
            <li><a href="#guidelines" class="nav-link">Guidelines</a></li>
            <li><a href="#faqs" class="nav-link">FAQs</a></li>
          </ul>
        </nav>

        <div class="nav-actions">
          <button type="button" class="btn btn-primary" id="headerCtaBtn" data-modal-open="register">Register Now</button>
          <button class="menu-toggle" id="menuToggle" aria-expanded="false" aria-controls="navigation" aria-label="Toggle navigation menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>`;

const hero = ({ conf, up }) => `
      <section class="hero-section conf-hero" id="home">
        <div class="hero-carousel">
          <div class="hero-slide active" data-conference-hero-image style="background-image: url(&quot;${up}${esc(conf.heroImage)}&quot;)"></div>
        </div>
        <div class="overlay-dark"></div>
        <div class="floating-shape shape-1 parallax-shape"></div>
        <div class="floating-shape shape-2 parallax-shape"></div>

        <div class="container">
          <div class="hero-content-wrapper reveal-up">
              <span class="badge badge-glass-white hero-badge"><i data-lucide="calendar-days"></i> <span data-event-date>${esc(longDate(conf.date))}</span></span>
            <h1 class="hero-heading"><span data-conference-page-heading>${esc(conf.displayTitle || `${conf.name} (${conf.shortName})`)}</span></h1>
            <p class="hero-desc" data-conference-theme>${esc(conf.theme)}</p>
            <ul class="conf-hero-meta">
              <li><i data-lucide="video"></i> <span data-conference-mode>${esc(conf.mode)}</span></li>
              <li><i data-lucide="clock"></i> <span data-conference-time>${esc(conf.timeDisplay)}</span></li>
              <li><i data-lucide="globe"></i> <span data-conference-time-note>${esc(conf.timeNote)}</span></li>
            </ul>
            <div class="hero-actions conf-actions">${heroActions()}
            </div>
          </div>
        </div>
      </section>`;

const about = ({ conf, up }) => `
      <section id="about" class="about-section" data-conference-section="about"${conf.about?.length ? "" : " hidden"}>
        <div class="container">
          <div class="grid-2">
            <div class="reveal-left">
              <img src="${up}${esc(conf.aboutImage)}" alt="${esc(conf.shortName)} conference" class="conf-about-img" data-conference-about-image loading="lazy" />
            </div>
            <div class="about-content reveal-right">
              <span class="badge badge-glass-primary">About the Conference</span>
              <h2 class="conf-heading">About <span data-conference-about-short-name>${esc(conf.shortName)}</span></h2>
              <div data-conference-about-content>${conf.about.map((p) => `<p class="conf-about-text">${esc(p)}</p>`).join("\n              ")}</div>
            </div>
          </div>
        </div>
      </section>`;

const sessions = ({ conf }) => `
      <section id="sessions" class="section-dark" data-conference-section="sessions"${conf.topics?.length ? "" : " hidden"}>
        <div class="container">
          <div class="section-header reveal-up">
            <span class="badge badge-glass-accent">Topics</span>
            <h2>Scientific Sessions</h2>
            <p>Submit your research under any of the <span data-conference-topic-count>${conf.topics.length}</span> scientific session topics below.</p>
          </div>
          <ul class="topic-grid" data-conference-topics>
            ${conf.topics.map((t) => `<li class="topic-chip reveal-up">${esc(t)}</li>`).join("\n            ")}
          </ul>
        </div>
      </section>`;

const schedule = ({ conf }) => `
      <section id="schedule" data-conference-section="schedule"${conf.schedule?.length || conf.scheduleNotes?.length ? "" : " hidden"}>
        <div class="container">
          <div class="section-header reveal-up">
            <span class="badge badge-glass-primary">Program</span>
            <h2>Event Schedule</h2>
            <p><span data-event-date>${esc(longDate(conf.date))}</span> Â· <span data-conference-mode>${esc(conf.mode)}</span> Â· <span data-conference-time-note>${esc(conf.timeNote)}</span></p>
          </div>
          <ol class="sched-list" data-conference-schedule>
            ${conf.schedule
              .map(
                (
                  slot,
                ) => `<li class="sched-item reveal-up${slot.type === "break" ? " sched-break" : ""}">
              <div class="sched-time"><i data-lucide="clock"></i> ${esc(scheduleTime(slot, conf.timezoneLabel))}</div>
              <div class="sched-card">
                <h3>${esc(slot.title)}</h3>
                ${slot.description ? `<p>${esc(slot.description)}</p>` : ""}
              </div>
            </li>`,
              )
              .join("\n            ")}
          </ol>
          <div class="sched-notes reveal-up" data-conference-schedule-notes${conf.scheduleNotes?.length ? "" : " hidden"}>
            <h4>Note</h4>
            <ul class="check-list">
              ${conf.scheduleNotes.map((n) => `<li>${esc(n)}</li>`).join("\n              ")}
            </ul>
          </div>
        </div>
      </section>`;

const personCard = (member, up) => {
  const image = `${up}${esc(member.image || "assets/images/Common_Conference_Image.jpg")}`;
  const inner = `
                <div class="person-photo"><img src="${image}" alt="${esc(member.name)}" loading="lazy" /></div>
                <div class="person-body">
                  <h4 class="person-name">${esc(member.name)}</h4>
                  <p class="person-role">${esc(member.role)}</p>
                  ${member.url ? '<span class="person-more">View profile <i data-lucide="arrow-up-right"></i></span>' : ""}
                </div>`;
  return member.url
    ? `<a class="person-card person-card--link reveal-up" href="${esc(member.url)}" target="_blank" rel="noopener noreferrer">${inner}
              </a>`
    : `<div class="person-card reveal-up">${inner}
              </div>`;
};

const speakers = ({ conf, up }) => `
      <section id="speakers" class="section-dark" data-conference-section="speakers">
        <div class="container">
          <div class="section-header reveal-up">
            <span class="badge badge-glass-accent">Speakers</span>
            <h2>Meet Our Speakers</h2>
            <p>Leading experts, researchers and practitioners joining <span data-conference-speaker-short-name>${esc(conf.shortName)}</span>.</p>
          </div>
          <div data-conference-speaker-groups>${conf.speakerGroups?.length
            ? conf.speakerGroups
                .map(
                  (group) => `<div class="people-group" id="${esc(group.id)}">
            <h3 class="people-group-title reveal-up">${esc(group.title)}</h3>
            <div class="people-grid">
              ${group.members.map((m) => personCard(m, up)).join("\n              ")}
            </div>
          </div>`,
                )
                .join("\n          ")
            : '<p class="speakers-update-notice" role="status">Will update soon</p>'}</div>
        </div>
      </section>`;

const guidelines = ({ conf }) => `
      <section id="guidelines" data-conference-section="guidelines"${conf.guidelines?.length ? "" : " hidden"}>
        <div class="container">
          <div class="section-header reveal-up">
            <span class="badge badge-glass-primary">Guidelines</span>
            <h2>Presentation Guidelines</h2>
            <p>Please review these before the event to make the most of your session.</p>
          </div>
          <div class="guideline-grid" data-conference-guidelines>
            ${conf.guidelines
              .map(
                (g) => `<article class="guideline-card reveal-up">
              <h3>${esc(g.title)}</h3>
              <ul class="check-list">
                ${g.items.map((i) => `<li>${esc(i)}</li>`).join("\n                ")}
              </ul>
            </article>`,
              )
              .join("\n            ")}
          </div>
        </div>
      </section>`;

const faqs = ({ conf, site }) => `
      <section id="faqs" class="section-alt" data-conference-section="faqs"${conf.faqs?.length ? "" : " hidden"}>
        <div class="container">
          <div class="section-header reveal-up">
            <span class="badge badge-glass-accent">FAQs</span>
            <h2>Frequently Asked Questions</h2>
          </div>
          <div class="faq-list" data-conference-faqs>
            ${conf.faqs
              .map(
                (f) => `<details class="faq-item reveal-up">
              <summary>${esc(f.q)}</summary>
              <div class="faq-answer">${
                Array.isArray(f.a)
                  ? `<ul class="check-list">${f.a.map((line) => `<li>${linkify(line, site)}</li>`).join("")}</ul>`
                  : `<p>${linkify(f.a, site)}</p>`
              }</div>
            </details>`,
              )
              .join("\n            ")}
          </div>
        </div>
      </section>`;

const cta = ({ conf }) => `
      <section class="conf-cta-section">
        <div class="container">
          <div class="cta-box reveal-scale">
            <h2>Join <span data-conference-cta-short-name>${esc(conf.shortName)}</span> on <span data-event-date>${esc(longDate(conf.date))}</span></h2>
            <p>Register today, submit your abstract, or download the brochure to learn more.</p>
            <div class="hero-actions conf-actions">${heroActions()}
            </div>
            <p class="cta-help">Questions? <a data-conference-support href="mailto:${esc(conf.supportEmail)}">${esc(conf.supportEmail)}</a></p>
          </div>
        </div>
      </section>`;

// ------------------------------------------------------------------ modals
const brochureModal = ({ formBits }) =>
  modalShell({
    id: "brochure",
    title: "Download Brochure",
    intro: "Fill in your details and the brochure download will be enabled.",
    body: `
        <form class="conf-form" id="form-brochure" data-form="brochure" novalidate>
          <div class="form-grid">
            ${field({ prefix: "br", name: "title", label: "Title", col: 3, type: "select", options: formBits.titleOptions })}
            ${field({ prefix: "br", name: "fullName", label: "Name", col: 5, placeholder: "Your Name" })}
            ${field({ prefix: "br", name: "email", label: "Email", col: 4, type: "email", placeholder: "Your Mail" })}
            ${field({ prefix: "br", name: "phone", label: "Phone", col: 4, type: "tel", placeholder: "Phone" })}
            ${field({ prefix: "br", name: "organization", label: "Organization", col: 4, placeholder: "Organization" })}
            ${field({ prefix: "br", name: "country", label: "Country", col: 4, type: "select", options: formBits.countryOptions })}
            ${field({ prefix: "br", name: "address", label: "Postal Address", col: 12, type: "textarea", required: false, placeholder: "Your Address..", extra: counter("br") })}
          </div>
          <div class="form-alert" role="alert" hidden></div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" data-submit><i data-lucide="send"></i> Submit</button>
            <a class="btn btn-accent is-disabled" data-download aria-disabled="true" tabindex="-1" target="_blank" rel="noopener noreferrer"><i data-lucide="download"></i> Download Brochure</a>
          </div>
          <p class="form-success" data-success hidden>Thank you! Your brochure download is now enabled.</p>
        </form>`,
  });

const abstractModal = ({ site, formBits }) =>
  modalShell({
    id: "abstract",
    title: "Submit Abstract",
    intro: "Download the abstract template, fill it in and upload it below.",
    body: `
        <form class="conf-form" id="form-abstract" data-form="abstract" novalidate>
          <div class="form-grid">
            ${field({ prefix: "ab", name: "title", label: "Title", col: 3, type: "select", options: formBits.titleOptions })}
            ${field({ prefix: "ab", name: "fullName", label: "Name", col: 5, placeholder: "Your Name" })}
            ${field({ prefix: "ab", name: "email", label: "Email", col: 4, type: "email", placeholder: "Your Mail" })}
            ${field({ prefix: "ab", name: "phone", label: "Phone", col: 4, type: "tel", placeholder: "Phone" })}
            ${field({ prefix: "ab", name: "organization", label: "Organization", col: 4, placeholder: "Organization" })}
            ${field({ prefix: "ab", name: "country", label: "Country", col: 4, type: "select", options: formBits.countryOptions })}
            ${field({ prefix: "ab", name: "address", label: "Postal Address", col: 6, type: "textarea", required: false, placeholder: "Your Address..", extra: counter("ab") })}
            <div class="form-group col-6">
              <label for="ab-abstractFile">Select a file <span class="req" aria-hidden="true">*</span></label>
              <input type="file" id="ab-abstractFile" name="abstractFile" class="form-control" accept=".doc,.docx" required />
              <span class="field-hint">.doc or .docx, max ${site.maxAbstractMB} MB</span>
              <div class="template-row">
                <span>Abstract Template:</span>
                ${
                  site.abstractTemplateUrl
                    ? `<a class="btn btn-secondary btn-sm" href="${esc(site.abstractTemplateUrl)}" target="_blank" rel="noopener noreferrer" download><i data-lucide="download"></i> Download</a>`
                    : '<a class="btn btn-secondary btn-sm is-disabled" aria-disabled="true" tabindex="-1" title="Template link not configured yet"><i data-lucide="download"></i> Download</a>'
                }
              </div>
            </div>
          </div>
          <div class="form-alert" role="alert" hidden></div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" data-submit><i data-lucide="send"></i> Submit Abstract</button>
          </div>
        </form>`,
  });

const registerModal = ({ conf, site, formBits }) => {
  const { pricing } = conf;
  const tiers = pricing.tiers;
  const terms = site.termsUrl
    ? `<a href="${esc(site.termsUrl)}" target="_blank" rel="noopener noreferrer">Terms and Conditions</a>`
    : "Terms and Conditions";

  const table = `
            <div class="price-table-wrap" data-price-table-wrap hidden>
              <table class="price-table" data-price-table>
                <thead>
                  <tr>
                    <th scope="col">Specifics</th>
                    ${tiers.map((t) => `<th scope="col" data-tier="${t.id}">${esc(t.label)}<small>on/before ${ordinalDate(t.endsOn)}</small></th>`).join("\n                    ")}
                  </tr>
                </thead>
                <tbody>
                  ${pricing.categories
                    .map(
                      (c) => `<tr data-category="${c.id}">
                    <th scope="row"><label class="check"><input type="checkbox" name="categories" value="${c.id}" /> <span>${esc(c.label)}</span></label></th>
                    ${tiers.map((t) => `<td data-tier="${t.id}"><span class="price-dot" aria-hidden="true"></span>${money(c.prices[t.id], pricing.currency)}</td>`).join("\n                    ")}
                  </tr>`,
                    )
                    .join("\n                  ")}
                </tbody>
              </table>
            </div>`;

  return modalShell({
    id: "register",
    title: `Register for ${esc(conf.shortName)}`,
    wide: true,
    body: `
        <form class="conf-form" id="form-register" data-form="register" novalidate>
          <div class="form-grid">
            ${field({ prefix: "rg", name: "title", label: "Title", col: 3, type: "select", options: formBits.titleOptions })}
            ${field({ prefix: "rg", name: "fullName", label: "Name", col: 5, placeholder: "Your Name" })}
            ${field({ prefix: "rg", name: "email", label: "Email", col: 4, type: "email", placeholder: "Your Mail" })}
            ${field({ prefix: "rg", name: "phone", label: "Phone", col: 4, type: "tel", placeholder: "Phone" })}
            ${field({ prefix: "rg", name: "organization", label: "University", col: 8, placeholder: "University" })}
            ${field({ prefix: "rg", name: "address1", label: "Address - 1", col: 4, placeholder: "Your Address.." })}
            ${field({ prefix: "rg", name: "address2", label: "Address - 2", col: 4, placeholder: "Your Address.." })}
            ${field({ prefix: "rg", name: "city", label: "City", col: 4, placeholder: "City" })}
            ${field({ prefix: "rg", name: "state", label: "State/Province", col: 4, placeholder: "State/Province" })}
            ${field({ prefix: "rg", name: "zip", label: "Postal/Zip Code", col: 4, placeholder: "Zip Code" })}
            ${field({ prefix: "rg", name: "country", label: "Country", col: 4, type: "select", options: formBits.countryOptions })}
          </div>

          <div class="price-block">
            <div class="price-head">
              <span>Currency: <strong data-pricing-currency>${esc(pricing.currency)}</strong></span>
              <span class="price-status" data-price-status>Loading current pricing...</span>
            </div>${table}
            <p class="field-error" data-categories-error hidden>Please select at least one registration type.</p>
            <div class="price-total" data-price-total-wrap hidden>Total Amount = <strong data-total>0.00</strong> <span data-pricing-currency>${esc(pricing.currency)}</span></div>
          </div>

          <div class="form-group terms-row">
            <label class="check"><input type="checkbox" name="terms" required /> <span>I accept the ${terms}</span></label>
          </div>

          <div class="form-alert" role="alert" hidden></div>
          <div class="form-actions">
            <button type="submit" class="btn btn-accent" data-submit><i data-lucide="credit-card"></i> Enroll Now</button>
          </div>
        </form>

        <div class="reg-info" data-conference-policy${conf.benefits?.length || conf.cancellationPolicy?.length ? "" : " hidden"}>
          <div data-conference-benefits${conf.benefits?.length ? "" : " hidden"}>
            <h4>Benefits of Joining Webinar :</h4>
            <ul class="check-list">${(conf.benefits || []).map((b) => `<li>${esc(b)}</li>`).join("\n              ")}</ul>
          </div>
          <div data-conference-cancellation${conf.cancellationPolicy?.length ? "" : " hidden"}>
            <h4>Cancellation Policy :</h4>
            <ul class="check-list">${(conf.cancellationPolicy || []).map((c) => `<li>${esc(c)}</li>`).join("\n              ")}</ul>
          </div>
        </div>`,
  });
};

const statusModal = () => `
    <div class="modal modal--status" id="modal-status" role="dialog" aria-modal="true" aria-labelledby="statusTitle" aria-hidden="true">
      <div class="modal-dialog modal-dialog--narrow">
        <button type="button" class="modal-close" data-modal-close aria-label="Close dialog">&times;</button>
        <div class="status-body">
          <div class="status-icon" data-status-icon></div>
          <h3 id="statusTitle" data-status-title></h3>
          <p data-status-message></p>
          <button type="button" class="btn btn-primary" data-modal-close>Close</button>
        </div>
      </div>
    </div>`;

// -------------------------------------------------------------------- page
export function renderConference({ conf, site, countries, footer }) {
  const up = "../"; // pages are written to conferences/<slug>.html
  const pageUrl = `${site.siteUrl}/conferences/${conf.slug}.html`;
  const formBits = {
    titleOptions: site.titles
      .map((t) => `<option value="${esc(t)}">${esc(t)}</option>`)
      .join(""),
    countryOptions: countries
      .map((c) => `<option value="${esc(c)}">${esc(c)}</option>`)
      .join(""),
  };

  // Only what the browser needs. `<` is escaped so the JSON can never close its <script> tag.
  const runtime = {
    id: conf.id,
    shortName: conf.shortName,
    supportEmail: conf.supportEmail,
    apiEndpoints: site.apiEndpoints,
    abstractTemplateUrl: site.abstractTemplateUrl,
    brochureUrl: conf.brochureUrl || "",
    maxAbstractBytes: site.maxAbstractMB * 1024 * 1024,
    registrationOpens: conf.registrationOpens,
    pricing: conf.pricing,
  };
  const runtimeJson = JSON.stringify(runtime).replace(/</g, "\\u003c");

  return `<!doctype html>
<!-- GENERATED FILE: edit data/conferences/${conf.slug}.json or scripts/templates/conference.mjs, then run \`npm run generate\`. -->
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(conf.seo.title)}</title>
    <meta name="description" content="${esc(conf.seo.description)}" />
    <meta name="author" content="Innotive Conferences LLC" />
    <link rel="canonical" href="${esc(pageUrl)}" />

    <meta property="og:title" content="${esc(conf.seo.title)}" />
    <meta property="og:description" content="${esc(conf.seo.description)}" />
    <meta property="og:image" content="${esc(`${site.siteUrl}/${conf.heroImage}`)}" />
    <meta property="og:url" content="${esc(pageUrl)}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />

    <link rel="stylesheet" href="${up}css/variables.css" />
    <link rel="stylesheet" href="${up}css/global.css" />
    <link rel="stylesheet" href="${up}css/layout.css" />
    <link rel="stylesheet" href="${up}css/components.css" />
    <link rel="stylesheet" href="${up}css/animations.css" />
    <link rel="stylesheet" href="${up}css/conference.css" />

    <script defer src="https://unpkg.com/lucide@0.469.0"></script>
    <script src="${up}js/app.js" type="module" defer></script>
    <script src="${up}js/animations.js" type="module" defer></script>
    <script src="${up}js/conference.js" type="module" defer></script>
  </head>
  <body class="conference-page">${header()}

    <main>${hero({ conf, up })}
  ${about({ conf, up })}
  ${sessions({ conf })}
  ${schedule({ conf })}
  ${speakers({ conf, up })}
  ${guidelines({ conf })}
  ${faqs({ conf, site })}
  ${cta({ conf })}
    </main>

    ${footer}
${brochureModal({ formBits })}
${abstractModal({ site, formBits })}
${registerModal({ conf, site, formBits })}
${statusModal()}

    <script id="conf-data" type="application/json">${runtimeJson}</script>
  </body>
</html>
`;
}
