import aiSummit from "../data/conferences/icai2026.json";
import cancerSummit from "../data/conferences/iccan2026.json";
import cardiovascularSummit from "../data/conferences/iccm2026.json";
import infectiousSummit from "../data/conferences/icid2026.json";
import publicHealthSummit from "../data/conferences/icph2026.json";
import renewableEnergySummit from "../data/conferences/icre2026.json";
import { fetchSummitDates, formatEventDate } from "./event-dates.js";

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

  const updateCard = async () => {
    const settings = await fetchSummitDates(conferenceId).catch(() => null);
    const eventDate = settings?.eventDate || config.date;
    const nextEventDate = settings
      ? settings.nextEventDate
      : config.nextEventDate;
    const eventEnd = new Date(`${eventDate}T23:59:59.999Z`);

    dateLabel.textContent = formatEventDate(eventDate);
    if (Date.now() <= eventEnd) return;

    dateLabel.textContent = nextEventDate
      ? `Next event: ${formatEventDate(nextEventDate)}`
      : "Next event date to be announced";
    action.textContent = "Notify me for the next event";
    action.href = "#contact";
    action.addEventListener("click", () => {
      const message = document.getElementById("formMessage");
      if (!message) return;
      message.value = nextEventDate
        ? `Please notify me about the next ${config.name} scheduled for ${formatEventDate(nextEventDate)}.`
        : `Please notify me when the next ${config.name} is scheduled.`;
      message.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };

  updateCard();
});
