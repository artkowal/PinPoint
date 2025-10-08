# 🗺️ PinPoint — Discover Poland by Voivodeship

[![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=flat-square&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![React-Leaflet](https://img.shields.io/badge/React--Leaflet-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react-leaflet.js.org/)
[![MediaWiki API](https://img.shields.io/badge/MediaWiki%20API-36C?style=flat-square)](https://www.mediawiki.org/wiki/API:Main_page)
[![OpenStreetMap Tiles](https://img.shields.io/badge/OSM%20Tiles-7EBC6F?style=flat-square&logo=openstreetmap&logoColor=white)](https://operations.osmfoundation.org/policies/tiles/)

**PinPoint** is a fast, front-end-only map app that helps you discover the most interesting places in a selected Polish voivodeship. Click a region to load evenly distributed points (landmarks, churches, nature, mountains), ranked by a simple popularity heuristic — all in a few seconds, with no custom backend.

---

## 🔗 Live Demo

**Demo:** https://artkowal.github.io/PinPoint/

---

## ✨ Features

- **One-click region exploration** — select a voivodeship and see top places.
- **Smart distribution** — hexagonal sampling across the entire region (no pin clusters in a single corner).
- **Categories & filters** — Landmarks, Churches, Nature, Mountains.
- **Fast & offline-friendly** — in-memory cache for instant re-filtering.
- **No backend required** — data fetched directly from public APIs.

---

## 🧠 How it works (in short)

1. The selected voivodeship is covered with **hexagonal query centers** (~10 km spacing).
2. For each center, the app calls **Wikipedia / MediaWiki API** (geosearch).
3. Results are **filtered & classified** into 4 categories (administrative/locality pages are excluded).
4. Places are **scored** (Wikidata present, has description, has thumbnail) and **limited per category**.
5. Results are cached in memory so **filter changes don’t trigger extra requests**.

---

## 🛠️ Tech & Data

- **Frontend:** React + Vite, Tailwind CSS, react-icons
- **Map:** Leaflet + react-leaflet, react-leaflet-cluster
- **Base map tiles:** OpenStreetMap’s public tile service (via Leaflet)
- **Data source:** Wikipedia via MediaWiki API (geosearch, pageimages, categories)

---

## 📚 Key Docs

- **MediaWiki API – Geosearch:** https://www.mediawiki.org/wiki/API:Geosearch
- **MediaWiki API – Page images:** https://www.mediawiki.org/wiki/API:Page_images
- **Leaflet (JS map library):** https://leafletjs.com/
- **OpenStreetMap tile usage policy:** https://operations.osmfoundation.org/policies/tiles/

---

## 🖥️ Local Development

```bash
# Clone
git clone https://github.com/artkowal/PinPoint.git
cd PinPoint

# Install
npm install

# Start dev server
npm run dev
```

---

_artKowal — © 2025. All rights reserved._
