import site from "../data/site.json";

export function formatEventDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

let summitDatesRequest;

export function fetchSummitDates(conferenceId) {
  const endpoint = site.apiEndpoints && site.apiEndpoints.summitDates;
  if (!endpoint) return Promise.resolve(null);

  if (!summitDatesRequest) {
    const url = new URL(endpoint);
    url.searchParams.set("action", "summitDates");
    url.searchParams.set("_", String(Date.now()));

    summitDatesRequest = fetch(url, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load summit dates.");
        return response.json();
      })
      .then((result) => {
        if (result.status !== "success")
          throw new Error("Summit dates are unavailable.");
        return result.events || {};
      });
  }

  return summitDatesRequest.then((events) => events[conferenceId] || null);
}
