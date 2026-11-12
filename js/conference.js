/* Conference page behaviour: modals, brochure / abstract / registration forms,
   pricing calculator and Razorpay payment return. Content comes from the
   <script id="conf-data"> JSON written by scripts/templates/conference.mjs. */

import { createValidator } from "./form-validation.js";
import {
  fetchConferenceContent,
  fetchConferencePricing,
  fetchSummitDates,
  formatEventDate,
  getCachedConferenceContent,
  getCachedSummitDates,
} from "./event-dates.js";

import commonConferenceImage from "../assets/images/Common_Conference_Image.jpg";
import heroAiImage from "../assets/images/hero_ai.png";
import heroHealthImage from "../assets/images/hero_health.png";
import cancerImage from "../assets/images/conf_cancer.png";
import cardiovascularImage from "../assets/images/conf_card.png";
import infectiousDiseaseImage from "../assets/images/conf_infec.png";
import renewableEnergyImage from "../assets/images/conf_renew.png";

const conferenceImageAssets = {
  "assets/images/Common_Conference_Image.jpg": commonConferenceImage,
  "assets/images/hero_ai.png": heroAiImage,
  "assets/images/hero_health.png": heroHealthImage,
  "assets/images/conf_cancer.png": cancerImage,
  "assets/images/conf_card.png": cardiovascularImage,
  "assets/images/conf_infec.png": infectiousDiseaseImage,
  "assets/images/conf_renew.png": renewableEnergyImage,
};

/** An error whose message is safe to show to the visitor. */
class UserError extends Error {}

/** The form was sent, but the server's reply never became readable, so we can't say whether it was saved. */
class UnconfirmedError extends UserError {
  constructor() {
    super("Unexpected response from the server. Please try again.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const dataEl = document.getElementById("conf-data");
  if (!dataEl) return;

  const conf = JSON.parse(dataEl.textContent);
  const cachedContent = getCachedConferenceContent(conf.id);
  if (cachedContent) {
    Object.assign(conf, cachedContent);
    renderConferenceContent(conf);
  }

  fetchConferenceContent(conf.id)
    .then((content) => {
      Object.assign(conf, content);
      renderConferenceContent(conf);
    })
    .catch((error) => {
      console.error("Could not load conference content.", error);
    });

  const renderEventSettings = (settings, updateActions) => {
    if (settings?.brochureUrl) conf.brochureUrl = settings.brochureUrl;

    const eventDate = settings?.eventDate || conf.date;
    const nextEventDate = settings
      ? settings.nextEventDate
      : conf.nextEventDate;
    const eventHasPassed = getToday() > eventDate;

    document.querySelectorAll("[data-event-date]").forEach((element) => {
      element.textContent = eventHasPassed
        ? nextEventDate
          ? `Next event: ${formatEventDate(nextEventDate)}`
          : "Next event date to be announced"
        : formatEventDate(eventDate);
    });

    if (updateActions && eventHasPassed) {
      setNotifyActions(conf, nextEventDate);
    }
  };

  const cachedSettings = getCachedSummitDates(conf.id);
  if (cachedSettings) renderEventSettings(cachedSettings, false);
  fetchSummitDates(conf.id)
    .then((settings) => renderEventSettings(settings, true))
    .catch((error) => {
      console.error("Could not load summit dates.", error);
    });

  const pricing = await fetchConferencePricing(conf.id).catch((error) => {
    console.error("Could not load conference pricing.", error);
    return null;
  });
  if (pricing) {
    conf.registrationOpens = pricing.registrationOpens;
    conf.pricing = pricing;
    renderPricingTable(pricing);
  }

  const modals = initModals();
  const ctx = { conf, modals };

  initCharCounters();
  initBrochureForm(ctx);
  initAbstractForm(ctx);
  initRegisterForm(ctx, Boolean(pricing));
  handlePaymentReturn(ctx);

  // Deep links, e.g. conferences/icph2026.html#register
  const fromHash = location.hash.slice(1);
  if (["register", "abstract", "brochure"].includes(fromHash))
    modals.open(fromHash);
});

/* ------------------------------------------------------------------ modals */

function initModals() {
  let active = null;
  let returnFocus = null;

  const focusables = (modal) =>
    [
      ...modal.querySelectorAll(
        "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
      ),
    ].filter((el) => el.offsetParent !== null && el.tabIndex !== -1);

  const close = () => {
    if (!active) return;
    active.classList.remove("active");
    active.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    active = null;
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
    returnFocus = null;
  };

  const open = (id) => {
    const modal = document.getElementById(`modal-${id}`);
    if (!modal || modal === active) return;
    if (active) {
      active.classList.remove("active");
      active.setAttribute("aria-hidden", "true");
    } else {
      returnFocus = document.activeElement;
    }
    active = modal;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    modal.scrollTop = 0; // .modal is the scroll container
    document.dispatchEvent(new CustomEvent("modal:open", { detail: { id } }));
    (
      focusables(modal).find((el) => !el.classList.contains("modal-close")) ||
      modal
    ).focus?.();
  };

  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-modal-open]");
    if (opener) {
      e.preventDefault();
      open(opener.dataset.modalOpen);
      return;
    }
    if (e.target.closest("[data-modal-close]") || e.target === active) close();
  });

  document.addEventListener("keydown", (e) => {
    if (!active) return;
    if (e.key === "Escape") {
      close();
    } else if (e.key === "Tab") {
      const items = focusables(active);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  return { open, close };
}

/** Generic result dialog: type is 'success' | 'error' | 'loading'. */
function openStatus(modals, { type, title, message }) {
  const modal = document.getElementById("modal-status");
  modal.dataset.type = type;
  modal.querySelector("[data-status-title]").textContent = title;
  modal.querySelector("[data-status-message]").textContent = message;

  const icons = { success: "check-circle-2", error: "alert-circle" };
  const iconBox = modal.querySelector("[data-status-icon]");
  iconBox.innerHTML =
    type === "loading"
      ? '<span class="spinner"></span>'
      : `<i data-lucide="${icons[type]}"></i>`;
  window.lucide?.createIcons();

  modals.open("status");
}

/* ------------------------------------------------------------- shared bits */

function initCharCounters() {
  document.querySelectorAll("[data-count-for]").forEach((counter) => {
    const area = document.getElementById(counter.dataset.countFor);
    if (!area) return;
    const update = () =>
      (counter.textContent = `${area.value.length}/${area.maxLength}`);
    area.addEventListener("input", update);
    area.form?.addEventListener("reset", () => setTimeout(update));
    update();
  });
}

const showAlert = (form, message) => {
  const box = form.querySelector(".form-alert");
  box.textContent = message;
  box.hidden = false;
  box.scrollIntoView({ block: "nearest", behavior: "smooth" });
};

const clearAlert = (form) => {
  form.querySelector(".form-alert").hidden = true;
};

/** Only follow https links returned by the server. */
const safeUrl = (value) => {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return url.href;
  } catch {
    /* fall through */
  }
  throw new UserError(
    "The server returned an invalid link. Please contact support.",
  );
};

/** Text fields of a form as a plain object (checkboxes named `categories` and file inputs are left out). */
function textFields(form) {
  const out = {};
  for (const [name, value] of new FormData(form)) {
    if (typeof value === "string" && name !== "categories") out[name] = value;
  }
  return out;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Parsed JSON body, or null when the body is not JSON (e.g. Google's "unable to open the file" page). */
const readJson = (response) => response.json().catch(() => null);

/**
 * POSTs to the Apps Script web app and returns its JSON reply.
 *
 * Apps Script saves the data quickly, but its reply is slow and sometimes flaky: it answers with a redirect
 * to a result URL that can take several seconds, or 404 for a moment (the data is still saved).
 *
 * - Default: wait for the reply. If the result URL returns a 404, re-fetch it a few times over ~6 s (GET only,
 *   so nothing is saved twice), then throw UnconfirmedError. Use this when the page needs the reply.
 * - `sentAfterMs`: don't wait for the reply. Resolve `{ status: 'success', unverified: true }` once that
 *   many ms have passed, or as soon as the reply turns out to be unreadable. A network failure or a
 *   readable error reply that arrives in time still rejects.
 */
async function postToApi(conf, fields, { sentAfterMs = 0 } = {}) {
  // Each form (brochure / abstract / register) can have its own Apps Script web app: see apiEndpoints in data/site.json.
  const endpoint = conf.apiEndpoints && conf.apiEndpoints[fields.action];
  if (!endpoint) {
    throw new UserError(
      `This form is not connected to the server yet. Please email ${conf.supportEmail}.`,
    );
  }

  const body = new FormData();
  Object.entries(fields).forEach(([key, value]) => body.set(key, value));

  const reply = fetch(endpoint, { method: "POST", body })
    .catch(() => {
      throw new UserError(
        "Network error. Please check your connection and try again.",
      );
    })
    .then(async (response) => {
      let data = await readJson(response);
      if (!data && !sentAfterMs && response.redirected) {
        for (const delay of [1000, 2000, 3000]) {
          await sleep(delay);
          data = await fetch(response.url).then(readJson, () => null);
          if (data) break;
        }
      }
      return data;
    });
  reply.catch(() => {}); // a failure after we stopped waiting must not surface as an unhandled rejection

  const data = sentAfterMs
    ? await Promise.race([reply, sleep(sentAfterMs).then(() => null)])
    : await reply;

  if (!data) {
    if (sentAfterMs) return { status: "success", unverified: true };
    throw new UnconfirmedError();
  }
  if (data.status !== "success")
    throw new UserError(data.message || "Submission failed. Please try again.");
  return data;
}

/** Disables the submit button while `task` runs and shows any error inside the form. */
async function runSubmit(form, task) {
  const button = form.querySelector("[data-submit]");
  const label = button.innerHTML;
  button.disabled = true;
  button.textContent = "Please wait…";
  clearAlert(form);

  try {
    await task();
  } catch (err) {
    if (!(err instanceof UserError)) console.error(err);
    showAlert(
      form,
      err instanceof UserError
        ? err.message
        : "Something went wrong. Please try again later.",
    );
  } finally {
    button.innerHTML = label;
    button.disabled = form.dataset.done === "1";
  }
}

/** Validates every field and focuses the first problem. Returns true when the form can be sent. */
function isValid(validator) {
  const invalid = validator.validateAll();
  if (invalid) invalid.focus();
  return !invalid;
}

/* --------------------------------------------------------------- brochure */

function initBrochureForm({ conf, modals }) {
  const form = document.getElementById("form-brochure");
  if (!form) return;

  const validator = createValidator(form);
  const download = form.querySelector("[data-download]");
  const success = form.querySelector("[data-success]");

  // Every visit starts locked: the download only enables after the form is submitted again.
  const lockDownload = () => {
    download.removeAttribute("href");
    download.classList.add("is-disabled");
    download.setAttribute("aria-disabled", "true");
    download.setAttribute("tabindex", "-1");
    success.hidden = true;
    clearAlert(form);
  };
  document.addEventListener("modal:open", (e) => {
    if (e.detail.id === "brochure") lockDownload();
  });

  // Once the visitor clicks Download, close the popup (the link itself still opens/downloads as normal).
  download.addEventListener("click", () => {
    if (download.hasAttribute("href")) modals.close();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isValid(validator)) return;

    // Enable the download right after the form has been sent instead of waiting for Google's slow reply
    // (see postToApi). If no readable reply arrives, the link from the page config is used.
    await runSubmit(form, async () => {
      const data = await postToApi(
        conf,
        { ...textFields(form), action: "brochure", conferenceId: conf.id },
        { sentAfterMs: 1500 },
      );

      let link = data.downloadUrl || conf.brochureUrl;
      if (!link) {
        const settings = await fetchSummitDates(conf.id).catch(() => null);
        link = settings && settings.brochureUrl;
      }
      if (!link)
        throw new UserError(
          `Your details were sent, but the brochure link is not available yet. Please email ${conf.supportEmail}.`,
        );
      download.href = safeUrl(link);
      download.classList.remove("is-disabled");
      download.removeAttribute("aria-disabled");
      download.removeAttribute("tabindex");
      success.hidden = false;
      form.reset(); // clear the entered details; the download button stays enabled
      download.focus();
    });
  });
}

/* --------------------------------------------------------------- abstract */

const readBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () =>
      reject(
        new UserError("Could not read the selected file. Please try again."),
      );
    reader.readAsDataURL(file);
  });

function initAbstractForm({ conf, modals }) {
  const form = document.getElementById("form-abstract");
  if (!form) return;

  const validator = createValidator(form, {
    maxFileBytes: conf.maxAbstractBytes,
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isValid(validator)) return;

    await runSubmit(form, async () => {
      const file = form.elements.abstractFile.files[0];
      const fields = {
        ...textFields(form),
        action: "abstract",
        conferenceId: conf.id,
        fileName: file.name,
        fileBase64: await readBase64(file),
      };

      let data;
      try {
        data = await postToApi(conf, fields);
      } catch (err) {
        if (!(err instanceof UnconfirmedError)) throw err;
        // The upload was sent but Google's reply never became readable. Don't invite a re-submit
        // (that could save the abstract twice); ask them to confirm by email instead.
        form.reset();
        openStatus(modals, {
          type: "error",
          title: "Please confirm your submission",
          message: `Your abstract was sent, but we could not get a confirmation from the server. To avoid duplicates please do not submit it again; email ${conf.supportEmail} and we will confirm it.`,
        });
        return;
      }

      form.reset();
      openStatus(modals, {
        type: "success",
        title: "Abstract submitted",
        message: `Thank you! We have received your abstract${data.reference ? ` (reference ${data.reference})` : ""}. We will let you know the acceptance in 2-3 business days.`,
      });
    });
  });
}

/* ---------------------------------------------------------- registration */

/** Today as YYYY-MM-DD in UTC (deadlines are end-of-day UTC). Local dev only: ?asof=YYYY-MM-DD. */
function getToday() {
  if (import.meta.env && import.meta.env.DEV) {
    const asof = new URLSearchParams(location.search).get("asof");
    if (/^\d{4}-\d{2}-\d{2}$/.test(asof || "")) return asof;
  }
  return new Date().toISOString().slice(0, 10);
}

function setNotifyActions(conf, nextEventDate) {
  const message = nextEventDate
    ? `Please notify me about the next ${conf.name} scheduled for ${formatEventDate(nextEventDate)}.`
    : `Please notify me when the next ${conf.name} is scheduled.`;
  const notifyUrl = `/?message=${encodeURIComponent(message)}#contact`;

  document.querySelectorAll('[data-modal-open="register"]').forEach((button) => {
    button.textContent = "Notify Me";
    button.removeAttribute("data-modal-open");
    button.addEventListener("click", () => {
      window.location.assign(notifyUrl);
    });
  });
}

function renderConferenceContent(conf) {
  const setText = (selector, value) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = value || "";
    });
  };
  const setMeta = (selector, value) => {
    const element = document.querySelector(selector);
    if (element && value) element.content = value;
  };
  const about = conf.about || [];
  const topics = conf.topics || [];
  const schedule = conf.schedule || [];
  const scheduleNotes = conf.scheduleNotes || [];
  const speakerGroups = conf.speakerGroups || [];
  const confirmedSpeakerGroups = speakerGroups
    .map((group) => ({
      ...group,
      members: (group.members || []).filter((member) => {
        const name = typeof member.name === "string" ? member.name.trim() : "";
        return (
          name &&
          !/^(?:(?:committee\s+)?member|(?:(?:plenary|keynote)\s+)?speaker)\s*\d*$/i.test(
            name,
          ) &&
          !/^(?:tba|tbd|to be announced|will update soon)$/i.test(name)
        );
      }),
    }))
    .filter((group) => group.members.length > 0);
  const guidelines = conf.guidelines || [];
  const faqs = conf.faqs || [];
  const benefits = conf.benefits || [];
  const cancellationPolicy = conf.cancellationPolicy || [];

  document.title = conf.seo?.title || document.title;
  setMeta('meta[name="description"]', conf.seo?.description);
  setMeta('meta[property="og:title"]', conf.seo?.title);
  setMeta('meta[property="og:description"]', conf.seo?.description);
  setMeta('meta[property="og:image"]', conferenceImageUrl(conf.heroImage));

  setText(
    "[data-conference-page-heading]",
    conf.displayTitle || `${conf.name} (${conf.shortName})`,
  );
  setText("[data-conference-about-short-name]", conf.shortName);
  setText("[data-conference-speaker-short-name]", conf.shortName);
  setText("[data-conference-cta-short-name]", conf.shortName);
  setText("[data-conference-theme]", conf.theme);
  setText("[data-conference-mode]", conf.mode);
  setText("[data-conference-time]", conf.timeDisplay);
  setText("[data-conference-time-note]", conf.timeNote);

  const heroImage = document.querySelector("[data-conference-hero-image]");
  const heroImageUrl = conferenceImageUrl(conf.heroImage);
  if (heroImage && heroImageUrl)
    heroImage.style.backgroundImage = `url("${heroImageUrl}")`;
  const aboutImage = document.querySelector("[data-conference-about-image]");
  const aboutImageUrl = conferenceImageUrl(conf.aboutImage);
  if (aboutImage && aboutImageUrl) {
    aboutImage.src = aboutImageUrl;
    aboutImage.alt = `${conf.shortName} conference`;
  }

  const aboutContent = document.querySelector(
    "[data-conference-about-content]",
  );
  if (aboutContent) {
    aboutContent.replaceChildren(
      ...about.map((text) => {
        const paragraph = document.createElement("p");
        paragraph.className = "conf-about-text";
        paragraph.textContent = text;
        return paragraph;
      }),
    );
  }
  setContentSection("about", about.length > 0);

  const topicList = document.querySelector("[data-conference-topics]");
  if (topicList) {
    topicList.replaceChildren(
      ...topics.map((text) => {
        const item = document.createElement("li");
        item.className = "topic-chip reveal-up reveal-active";
        item.textContent = text;
        return item;
      }),
    );
  }
  setText("[data-conference-topic-count]", String(topics.length));
  setContentSection("sessions", topics.length > 0);

  const scheduleList = document.querySelector("[data-conference-schedule]");
  if (scheduleList) {
    scheduleList.replaceChildren(
      ...schedule.map((slot) => {
        const item = document.createElement("li");
        item.className = `sched-item reveal-up reveal-active${slot.type === "break" ? " sched-break" : ""}`;
        const time = document.createElement("div");
        time.className = "sched-time";
        const icon = document.createElement("i");
        icon.dataset.lucide = "clock";
        time.append(icon, document.createTextNode(formatScheduleTime(slot, conf.timezoneLabel)));
        const card = document.createElement("div");
        card.className = "sched-card";
        const title = document.createElement("h3");
        title.textContent = slot.title || "";
        card.append(title);
        if (slot.description) {
          const description = document.createElement("p");
          description.textContent = slot.description;
          card.append(description);
        }
        item.append(time, card);
        return item;
      }),
    );
  }
  const notesList = document.querySelector(
    "[data-conference-schedule-notes] ul",
  );
  if (notesList) {
    notesList.replaceChildren(
      ...scheduleNotes.map((text) => {
        const item = document.createElement("li");
        item.textContent = text;
        return item;
      }),
    );
  }
  const notesContainer = document.querySelector(
    "[data-conference-schedule-notes]",
  );
  if (notesContainer) notesContainer.hidden = scheduleNotes.length === 0;
  setContentSection("schedule", schedule.length > 0 || scheduleNotes.length > 0);

  const speakerContainer = document.querySelector(
    "[data-conference-speaker-groups]",
  );
  if (speakerContainer) {
    const groupElements = confirmedSpeakerGroups.map((group) => {
      const section = document.createElement("div");
      section.className = "people-group";
      section.id = safeElementId(group.id);
      const heading = document.createElement("h3");
      heading.className = "people-group-title reveal-up reveal-active";
      heading.textContent = group.title || "";
      const people = document.createElement("div");
      people.className = "people-grid";
      group.members.forEach((member) => {
        people.append(createPersonCard(member));
      });
      section.append(heading, people);
      return section;
    });
    if (groupElements.length) {
      speakerContainer.replaceChildren(...groupElements);
    } else {
      const notice = document.createElement("p");
      notice.className = "speakers-update-notice reveal-up reveal-active";
      notice.setAttribute("role", "status");
      notice.textContent = "Will update soon";
      speakerContainer.replaceChildren(notice);
    }
  }
  setContentSection("speakers", true);

  const guidelineContainer = document.querySelector(
    "[data-conference-guidelines]",
  );
  if (guidelineContainer) {
    guidelineContainer.replaceChildren(
      ...guidelines.map((guideline) => {
        const card = document.createElement("article");
        card.className = "guideline-card reveal-up reveal-active";
        const heading = document.createElement("h3");
        heading.textContent = guideline.title || "";
        const list = document.createElement("ul");
        list.className = "check-list";
        (guideline.items || []).forEach((text) => {
          const item = document.createElement("li");
          item.textContent = text;
          list.append(item);
        });
        card.append(heading, list);
        return card;
      }),
    );
  }
  setContentSection("guidelines", guidelines.length > 0);

  const faqContainer = document.querySelector("[data-conference-faqs]");
  if (faqContainer) {
    faqContainer.replaceChildren(
      ...faqs.map((faq) => createFaqItem(faq, conf)),
    );
  }
  setContentSection("faqs", faqs.length > 0);

  const supportLink = document.querySelector("[data-conference-support]");
  if (supportLink) {
    supportLink.textContent = conf.supportEmail || "";
    supportLink.href = conf.supportEmail
      ? `mailto:${conf.supportEmail}`
      : "#";
  }
  const registerTitle = document.getElementById("modal-register-title");
  if (registerTitle) registerTitle.textContent = `Register for ${conf.shortName}`;

  renderListContent("[data-conference-benefits] ul", benefits);
  renderListContent(
    "[data-conference-cancellation] ul",
    cancellationPolicy,
  );
  const benefitsBox = document.querySelector("[data-conference-benefits]");
  const cancellationBox = document.querySelector(
    "[data-conference-cancellation]",
  );
  if (benefitsBox) benefitsBox.hidden = benefits.length === 0;
  if (cancellationBox)
    cancellationBox.hidden = cancellationPolicy.length === 0;
  const policyBox = document.querySelector("[data-conference-policy]");
  if (policyBox)
    policyBox.hidden = benefits.length === 0 && cancellationPolicy.length === 0;

  window.lucide?.createIcons();
}

function setContentSection(name, visible) {
  const section = document.querySelector(
    `[data-conference-section="${name}"]`,
  );
  if (section) section.hidden = !visible;
}

function renderListContent(selector, values) {
  const list = document.querySelector(selector);
  if (!list) return;
  list.replaceChildren(
    ...values.map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    }),
  );
}

function formatScheduleTime(slot, timezoneLabel) {
  const formatTime = (value, meridiem) => {
    const text = String(value || "").trim();
    const match = text.match(/(\d{1,2}):(\d{1,2})(?::\d{2})?/);
    if (!match) return text;

    let hour = Number(match[1]);
    const minutes = match[2].padStart(2, "0");
    const suffix =
      (text.match(/\b(AM|PM)\b/i) || [])[1] ||
      meridiem ||
      (hour > 12 ? "PM" : "");
    if (hour > 12) hour -= 12;
    if (hour === 0 && suffix) hour = 12;
    return `${hour}:${minutes}${suffix ? ` ${suffix.toUpperCase()}` : ""}`;
  };
  const startMeridiem = slot.meridiem || slot.endMeridiem;
  const endMeridiem = slot.endMeridiem || slot.meridiem;
  return `${formatTime(slot.start, startMeridiem)} – ${formatTime(slot.end, endMeridiem)} (${timezoneLabel})`;
}

function safeElementId(value) {
  return String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "-");
}

function conferenceImageUrl(value) {
  let image = String(value || "").trim();
  if (image.endsWith("placeholder-about.svg")) {
    image = "assets/images/Common_Conference_Image.jpg";
  }
  if (/^https:\/\//i.test(image)) return new URL(image).href;
  const assetPath = image.replace(/^\/+/, "");
  if (conferenceImageAssets[assetPath]) return conferenceImageAssets[assetPath];
  if (image.startsWith("/")) return new URL(image, location.origin).href;
  if (image.startsWith("assets/"))
    return new URL(`../${image}`, location.href).href;
  return "";
}

function createPersonCard(member) {
  const profileUrl = safeContentLink(member.url);
  const card = document.createElement(profileUrl ? "a" : "div");
  card.className = profileUrl
    ? "person-card person-card--link reveal-up reveal-active"
    : "person-card reveal-up reveal-active";
  if (profileUrl) {
    card.href = profileUrl;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
  }

  const photo = document.createElement("div");
  photo.className = "person-photo";
  const image = document.createElement("img");
  image.src =
    conferenceImageUrl(member.image) ||
    new URL("../assets/images/Common_Conference_Image.jpg", location.href).href;
  image.alt = member.name || "";
  image.loading = "lazy";
  photo.append(image);

  const body = document.createElement("div");
  body.className = "person-body";
  const name = document.createElement("h4");
  name.className = "person-name";
  name.textContent = member.name || "";
  const role = document.createElement("p");
  role.className = "person-role";
  role.textContent = member.role || "";
  body.append(name, role);
  if (profileUrl) {
    const more = document.createElement("span");
    more.className = "person-more";
    more.textContent = "View profile ";
    const icon = document.createElement("i");
    icon.dataset.lucide = "arrow-up-right";
    more.append(icon);
    body.append(more);
  }
  card.append(photo, body);
  return card;
}

function createFaqItem(faq, conf) {
  const details = document.createElement("details");
  details.className = "faq-item reveal-up reveal-active";
  const question = document.createElement("summary");
  question.textContent = faq.q || "";
  const answer = document.createElement("div");
  answer.className = "faq-answer";
  if (Array.isArray(faq.a)) {
    const list = document.createElement("ul");
    list.className = "check-list";
    faq.a.forEach((text) => {
      const item = document.createElement("li");
      appendFaqLinks(item, text, conf);
      list.append(item);
    });
    answer.append(list);
  } else {
    const paragraph = document.createElement("p");
    appendFaqLinks(paragraph, faq.a || "", conf);
    answer.append(paragraph);
  }
  details.append(question, answer);
  return details;
}

function appendFaqLinks(container, text, conf) {
  const pattern =
    /\[([^\]]+)\]\(([^)]+)\)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
  const source = String(text || "");
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    container.append(document.createTextNode(source.slice(cursor, match.index)));
    const label = match[1] || match[3];
    const href = match[3]
      ? `mailto:${match[3]}`
      : match[2] === "@abstractTemplate"
        ? conf.abstractTemplateUrl
        : safeContentLink(match[2]);
    if (href) {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = label;
      if (/^https:/i.test(href)) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      container.append(link);
    } else {
      container.append(document.createTextNode(match[0]));
    }
    cursor = match.index + match[0].length;
  }
  container.append(document.createTextNode(source.slice(cursor)));
}

function safeContentLink(value) {
  const link = String(value || "").trim();
  if (!link || link === "@abstractTemplate") return "";
  try {
    const url = new URL(link, location.href);
    return ["https:", "mailto:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function renderPricingTable(pricing) {
  const table = document.querySelector("[data-price-table]");
  const headerRow = table?.tHead?.rows[0];
  const body = table?.tBodies[0];
  if (!table || !headerRow || !body) {
    throw new Error("The registration pricing table is missing.");
  }

  const specifics = document.createElement("th");
  specifics.scope = "col";
  specifics.textContent = "Specifics";
  headerRow.replaceChildren(specifics);

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: pricing.currency,
  });

  pricing.tiers.forEach((tier) => {
    const heading = document.createElement("th");
    heading.scope = "col";
    heading.dataset.tier = tier.id;
    heading.append(document.createTextNode(tier.label));
    const deadline = document.createElement("small");
    deadline.textContent = `on/before ${dateFormatter.format(new Date(`${tier.endsOn}T00:00:00Z`))}`;
    heading.append(deadline);
    headerRow.append(heading);
  });

  body.replaceChildren();
  pricing.categories.forEach((category) => {
    const row = document.createElement("tr");
    row.dataset.category = category.id;

    const labelCell = document.createElement("th");
    labelCell.scope = "row";
    const label = document.createElement("label");
    label.className = "check";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "categories";
    checkbox.value = category.id;
    const labelText = document.createElement("span");
    labelText.textContent = category.label;
    label.append(checkbox, labelText);
    labelCell.append(label);
    row.append(labelCell);

    pricing.tiers.forEach((tier) => {
      const cell = document.createElement("td");
      cell.dataset.tier = tier.id;
      const dot = document.createElement("span");
      dot.className = "price-dot";
      dot.setAttribute("aria-hidden", "true");
      cell.append(dot, document.createTextNode(currencyFormatter.format(category.prices[tier.id])));
      row.append(cell);
    });
    body.append(row);
  });

  document.querySelectorAll("[data-pricing-currency]").forEach((element) => {
    element.textContent = pricing.currency;
  });
  table.closest("[data-price-table-wrap]").hidden = false;
  document.querySelector("[data-price-total-wrap]").hidden = false;
}

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

function initRegisterForm({ conf, modals }, pricingAvailable) {
  const form = document.getElementById("form-register");
  if (!form) return;

  const { pricing } = conf;
  const table = form.querySelector("[data-price-table]");
  const totalEl = form.querySelector("[data-total]");
  const statusEl = form.querySelector("[data-price-status]");
  const categoriesError = form.querySelector("[data-categories-error]");
  const checkboxes = [...form.querySelectorAll('input[name="categories"]')];
  const submitBtn = form.querySelector("[data-submit]");
  const validator = createValidator(form);

  if (!pricingAvailable) {
    statusEl.textContent = "Pricing is unavailable. Please try again later.";
    statusEl.classList.add("is-closed");
    checkboxes.forEach((box) => (box.disabled = true));
    submitBtn.disabled = true;
    table.closest("[data-price-table-wrap]").hidden = true;
    document.querySelector("[data-price-total-wrap]").hidden = true;
    form.addEventListener("submit", (event) => event.preventDefault());
    return;
  }

  // Which rate applies today?
  const today = getToday();
  const tier = pricing.tiers.find((t) => today <= t.endsOn) || null;
  const open = today >= conf.registrationOpens && tier !== null;

  pricing.tiers.forEach((t) => {
    table.querySelectorAll(`[data-tier="${t.id}"]`).forEach((cell) => {
      cell.classList.toggle("is-active", open && tier.id === t.id);
      cell.classList.toggle("is-past", today > t.endsOn);
    });
  });

  if (!open) {
    statusEl.textContent =
      today < conf.registrationOpens
        ? `Registration opens on ${formatDate(conf.registrationOpens)}.`
        : "Registration is closed.";
    statusEl.classList.add("is-closed");
    checkboxes.forEach((box) => (box.disabled = true));
    submitBtn.disabled = true;
  } else {
    statusEl.textContent = `Current rate: ${tier.label}`;
  }

  const selectedIds = () =>
    checkboxes.filter((box) => box.checked).map((box) => box.value);

  const totalFor = (ids) =>
    ids.reduce(
      (sum, id) =>
        sum +
        (pricing.categories.find((c) => c.id === id)?.prices[tier.id] ?? 0),
      0,
    );

  const recalc = () => {
    const ids = selectedIds();
    totalEl.textContent = (open ? totalFor(ids) : 0).toFixed(2);
    table.querySelectorAll("tr[data-category]").forEach((row) => {
      row.classList.toggle("is-selected", ids.includes(row.dataset.category));
    });
    if (ids.length) categoriesError.hidden = true;
  };

  checkboxes.forEach((box) => box.addEventListener("change", recalc));
  form.addEventListener("reset", () => setTimeout(recalc));
  recalc();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!open) return;

    const ids = selectedIds();
    const fieldsOk = isValid(validator);
    if (ids.length === 0) {
      categoriesError.hidden = false;
      if (fieldsOk)
        categoriesError.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    if (!fieldsOk || ids.length === 0) return;

    await runSubmit(form, async () => {
      const total = totalFor(ids);
      const data = await postToApi(conf, {
        ...textFields(form),
        action: "register",
        conferenceId: conf.id,
        categories: ids.join(","),
        tier: tier.id,
        currency: pricing.currency,
        clientTotal: total.toFixed(2),
      });

      const paymentUrl = safeUrl(data.paymentUrl);
      form.dataset.done = "1";
      openStatus(modals, {
        type: "loading",
        title: "Redirecting to secure payment…",
        message: `Your registration reference is ${data.reference}. Please do not close this window.`,
      });
      window.location.assign(paymentUrl);
    });
  });
}

/* ---------------------------------------------------------- payment return */

/** Razorpay sends the visitor back here with ?razorpay_* params; ask the server to confirm the payment. */
function handlePaymentReturn({ conf, modals }) {
  const query = new URLSearchParams(location.search);
  const linkId = query.get("razorpay_payment_link_id");
  if (!linkId) return;

  openStatus(modals, {
    type: "loading",
    title: "Confirming your payment…",
    message: "This only takes a moment.",
  });

  const help = `If any amount was deducted, please email ${conf.supportEmail} with your reference.`;

  postToApi(conf, {
    action: "verify",
    conferenceId: conf.id,
    razorpay_payment_link_id: linkId,
    razorpay_payment_link_reference_id:
      query.get("razorpay_payment_link_reference_id") || "",
    razorpay_payment_link_status:
      query.get("razorpay_payment_link_status") || "",
    razorpay_payment_id: query.get("razorpay_payment_id") || "",
    razorpay_signature: query.get("razorpay_signature") || "",
  })
    .then((data) => {
      if (data.paymentStatus === "paid") {
        openStatus(modals, {
          type: "success",
          title: "Registration confirmed",
          message: `Thank you for registering for ${conf.shortName}. Your reference is ${data.reference}. You will receive your meeting invite by email (please check your junk folder if it is not in your inbox).`,
        });
      } else {
        openStatus(modals, {
          type: "error",
          title: "Payment not completed",
          message: `Your payment was not completed (status: ${data.paymentStatus}). You can register again at any time. ${help}`,
        });
      }
    })
    .catch((err) => {
      if (!(err instanceof UserError)) console.error(err);
      openStatus(modals, {
        type: "error",
        title: "We could not confirm your payment",
        message: `${err instanceof UserError ? err.message : "Something went wrong."} ${help}`,
      });
    })
    .finally(() =>
      history.replaceState(null, "", location.pathname + location.hash),
    );
}
