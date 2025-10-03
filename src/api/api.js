import axios from "axios";

const ENDPOINTS = [
  "https://overpass.kumi.systems/api",
  "https://overpass-api.de/api",
  "https://overpass.openstreetmap.ru/api",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function overpass(query, signal) {
  const q = query.replace(/\n\s+/g, " ").trim();

  let lastErr = null;
  for (let i = 0; i < ENDPOINTS.length; i++) {
    const baseURL = ENDPOINTS[i];
    try {
      console.debug(`[Overpass] ${baseURL}/interpreter?data=`, q);
      const res = await axios.get(`${baseURL}/interpreter`, {
        params: { data: q },
        timeout: 60000,
        signal,
      });
      return res;
    } catch (err) {
      lastErr = err;
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED")
        throw err;
      const status = err?.response?.status;
      if (status && status < 500 && status !== 429) break;
      await sleep(350);
    }
  }
  throw lastErr || new Error("Overpass request failed");
}

export default { overpass };
