import axios from "axios";

export const WIKI_ENDPOINT = "https://pl.wikipedia.org/w/api.php";

export async function wikiQuery(params = {}, signal) {
  // MediaWiki CORS wymaga origin=*
  const finalParams = {
    origin: "*",
    format: "json",
    ...params,
  };

  // retry na wypadek flakiness (1 dodatkowa próba)
  let lastErr = null;
  for (let i = 0; i < 2; i++) {
    try {
      const res = await axios.get(WIKI_ENDPOINT, {
        params: finalParams,
        timeout: 20000,
        signal,
      });
      return res;
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      if (status && status < 500 && status !== 429) break;
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw lastErr || new Error("Wikipedia request failed");
}

export default { wikiQuery };
