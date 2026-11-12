import aiSummit from "../data/conferences/icai2026.json";
import cancerSummit from "../data/conferences/iccan2026.json";
import cardiovascularSummit from "../data/conferences/iccm2026.json";
import infectiousSummit from "../data/conferences/icid2026.json";
import publicHealthSummit from "../data/conferences/icph2026.json";
import renewableEnergySummit from "../data/conferences/icre2026.json";
import {
  fetchAllConferenceContent,
  fetchSummitDates,
  formatEventDate,
  getCachedConferenceContent,
  getCachedSummitDates,
} from "./event-dates.js";

const summitConfigs = {
  [aiSummit.id]: aiSummit,
  [cancerSummit.id]: cancerSummit,
  [cardiovascularSummit.id]: cardiovascularSummit,
  [infectiousSummit.id]: infectiousSummit,
  [publicHealthSummit.id]: publicHealthSummit,
  [renewableEnergySummit.id]: renewableEnergySummit,
};

document.querySelectorAll("[data-conference-card]").forEach((card) => {
  const conferenceId = card.dataset.conferenceCard;
  const config = summitConfigs[conferenceId];
  const dateLabel = card.querySelector("[data-event-date]");
  const action = card.querySelector("[data-event-action]");
  if (!config || !dateLabel || !action) return;
  let conferenceName = config.name;
  let shouldNotifyForNextEvent = false;
  let nextEventDateForNotification;
  const originalActionText = action.textContent;
  const originalActionHref = action.getAttribute("href");

  action.addEventListener("click", () => {
    if (!shouldNotifyForNextEvent) return;
    const message = nextEventDateForNotification
      ? `Please notify me about the next ${conferenceName} scheduled for ${formatEventDate(nextEventDateForNotification)}.`
      : `Please notify me when the next ${conferenceName} is scheduled.`;
    const messageField = document.getElementById("formMessage");
    if (!messageField) return;
    messageField.value = message;
    messageField.dispatchEvent(new Event("input", { bubbles: true }));
  });

  const cardLink = document.createElement("a");
  cardLink.className = "conf-card-link";
  cardLink.href = `conferences/${config.slug}.html`;
  cardLink.setAttribute("aria-label", `View ${conferenceName} details`);
  card.prepend(cardLink);

  const cachedContent = getCachedConferenceContent(conferenceId);
  if (cachedContent && cachedContent.name) {
    conferenceName = cachedContent.name;
    const title = card.querySelector(".conf-title");
    if (title) title.textContent = conferenceName;
    cardLink.setAttribute("aria-label", `View ${conferenceName} details`);
  }

  fetchAllConferenceContent()
    .then((contentById) => {
      const content = contentById[conferenceId];
      if (!content) throw new Error("Conference content is unavailable.");
      conferenceName = content.name || conferenceName;
      const title = card.querySelector(".conf-title");
      if (title) title.textContent = conferenceName;
      cardLink.setAttribute("aria-label", `View ${conferenceName} details`);
    })
    .catch((error) => {
      console.error(`Could not load content for ${conferenceId}.`, error);
    });

  const updateCard = (settings) => {
    const eventDate = settings?.eventDate || config.date;
    const nextEventDate = settings
      ? settings.nextEventDate
      : config.nextEventDate;
    const eventEnd = new Date(`${eventDate}T23:59:59.999Z`);

    if (Date.now() <= eventEnd) {
      dateLabel.textContent = formatEventDate(eventDate);
      shouldNotifyForNextEvent = false;
      action.textContent = originalActionText;
      if (originalActionHref === null) action.removeAttribute("href");
      else action.setAttribute("href", originalActionHref);
      return;
    }

    dateLabel.textContent = nextEventDate
      ? `Next event: ${formatEventDate(nextEventDate)}`
      : "Next event date to be announced";
    action.textContent = "Notify me for the next event";
    action.href = "#contact";
    shouldNotifyForNextEvent = true;
    nextEventDateForNotification = nextEventDate;
  };

  updateCard(getCachedSummitDates(conferenceId));
  fetchSummitDates(conferenceId)
    .then(updateCard)
    .catch((error) => {
      console.error(`Could not load dates for ${conferenceId}.`, error);
    });
});
