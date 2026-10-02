const ENDPOINT = "https://rtbatvkghjnuwmgienqv.supabase.co/functions/v1/scoreboard?client=closera&dash=";

export function dashboardMode(search = window.location.search) {
  const params = new URLSearchParams(search);
  return { demo: params.get("demo") === "1", key: params.get("k") ?? "" };
}

export async function loadDashboard(search = window.location.search, fetcher = fetch) {
  const mode = dashboardMode(search);
  try {
    if (mode.demo) {
      const response = await fetcher("sample.json", { cache: "no-store", referrerPolicy: "no-referrer" });
      if (!response.ok) throw new Error("sample");
      return { data: await response.json(), demo: true };
    }
    if (!mode.key) throw new Error("missing-key");
    const response = await fetcher(ENDPOINT + encodeURIComponent(mode.key), {
      cache: "no-store", referrerPolicy: "no-referrer",
    });
    if (!response.ok) throw new Error("response");
    return { data: await response.json(), demo: false };
  } catch (error) {
    if (error instanceof Error && error.message === "missing-key") {
      throw new Error("Missing dashboard key. Add ?k=YOUR_KEY to this URL.");
    }
    if (mode.demo) throw new Error("Sample data could not be loaded.");
    throw new Error("Dashboard data is unavailable. Check access and retry.");
  }
}
