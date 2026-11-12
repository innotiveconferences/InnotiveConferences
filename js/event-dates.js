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
let allConferenceContentRequest;
const conferenceContentRequests = new Map();
const conferenceContentCacheKey = (conferenceId) =>
  `innotive-conference-content-v2:${conferenceId}`;
const summitDatesCacheKey = "innotive-summit-dates-v1";

export function getCachedConferenceContent(conferenceId) {
  const key = conferenceContentCacheKey(conferenceId);
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const content = JSON.parse(cached);
    if (
      content &&
      typeof content === "object" &&
      !Array.isArray(content)
    ) {
      return content;
    }
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Could not read cached conference content.", error);
  }
  return null;
}

export function getCachedSummitDates(conferenceId) {
  try {
    const cached = localStorage.getItem(summitDatesCacheKey);
    if (!cached) return null;
    const events = JSON.parse(cached);
    if (events && typeof events === "object" && !Array.isArray(events)) {
      return events[conferenceId] || null;
    }
    localStorage.removeItem(summitDatesCacheKey);
  } catch (error) {
    console.error("Could not read cached summit dates.", error);
  }
  return null;
}

function cacheConferenceContent(contentById) {
  Object.entries(contentById).forEach(([conferenceId, content]) => {
    try {
      localStorage.setItem(
        conferenceContentCacheKey(conferenceId),
        JSON.stringify(content),
      );
    } catch (error) {
      console.error(`Could not cache conference content for ${conferenceId}.`, error);
    }
  });
}

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
        const events = result.events || {};
        try {
          localStorage.setItem(summitDatesCacheKey, JSON.stringify(events));
        } catch (error) {
          console.error("Could not cache summit dates.", error);
        }
        return events;
      });
  }

  return summitDatesRequest.then((events) => events[conferenceId] || null);
}

export function fetchConferencePricing(conferenceId) {
  const endpoint = site.apiEndpoints && site.apiEndpoints.register;
  if (!endpoint) {
    return Promise.reject(new Error("Conference pricing endpoint is not configured."));
  }

  const url = new URL(endpoint);
  url.searchParams.set("action", "pricing");
  url.searchParams.set("conferenceId", conferenceId);
  url.searchParams.set("_", String(Date.now()));

  return fetch(url, { cache: "no-store" }).then((response) => {
    if (!response.ok) throw new Error("Could not load conference pricing.");
    return response.json();
  }).then((result) => {
    if (result.status !== "success" || !result.pricing) {
      throw new Error(result.message || "Conference pricing is unavailable.");
    }
    return result.pricing;
  });
}

function requestConferenceContent(conferenceId) {
  const endpoint = site.apiEndpoints && site.apiEndpoints.register;
  if (!endpoint) {
    return Promise.reject(new Error("Conference content endpoint is not configured."));
  }

  const url = new URL(endpoint);
  url.searchParams.set("action", "conferenceContent");
  if (conferenceId) url.searchParams.set("conferenceId", conferenceId);
  url.searchParams.set("_", String(Date.now()));

  return fetch(url, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Could not load conference content.");
      return response.json();
    })
    .then((result) => {
      if (result.status !== "success" || !result.content) {
        throw new Error(result.message || "Conference content is unavailable.");
      }
      return result;
    });
}

export function fetchAllConferenceContent() {
  if (!allConferenceContentRequest) {
    allConferenceContentRequest = requestConferenceContent().then((result) => {
      cacheConferenceContent(result.content);
      return result.content;
    });
  }
  return allConferenceContentRequest;
}

export function fetchConferenceContent(conferenceId) {
  if (!conferenceContentRequests.has(conferenceId)) {
    const request = requestConferenceContent(conferenceId).then((result) => {
      const content = result.content[conferenceId];
      if (!content) {
        throw new Error(
          result.errors?.[conferenceId] || "Conference content is unavailable.",
        );
      }
      cacheConferenceContent({ [conferenceId]: content });
      return content;
    });
    conferenceContentRequests.set(conferenceId, request);
  }
  return conferenceContentRequests.get(conferenceId);
}
