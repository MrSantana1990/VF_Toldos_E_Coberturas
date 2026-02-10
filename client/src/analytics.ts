type AnalyticsEnv = {
  endpoint?: string;
  websiteId?: string;
};

function readAnalyticsEnv(): AnalyticsEnv {
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT as
    | string
    | undefined;
  const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID as
    | string
    | undefined;

  return {
    endpoint: endpoint?.trim() || undefined,
    websiteId: websiteId?.trim() || undefined,
  };
}

export function initAnalytics() {
  if (typeof document === "undefined") return;

  const { endpoint, websiteId } = readAnalyticsEnv();
  if (!endpoint || !websiteId) return;

  // Avoid double-injecting when HMR reloads
  if (document.querySelector('script[data-analytics="umami"]')) return;

  const script = document.createElement("script");
  script.defer = true;
  script.src = `${endpoint.replace(/\/+$/, "")}/umami`;
  script.dataset.websiteId = websiteId;
  script.dataset.analytics = "umami";
  document.head.appendChild(script);
}
