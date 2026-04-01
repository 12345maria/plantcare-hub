(function () {
  "use strict";

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  /* ---------- Nav ---------- */
  const topBar = $(".top");
  $("#nav-toggle")?.addEventListener("click", () => {
    topBar.classList.toggle("nav-open");
  });
  $$(".nav a").forEach((a) =>
    a.addEventListener("click", () => topBar.classList.remove("nav-open"))
  );

  /* ---------- Weather ---------- */
  const weatherStatus = $("#weather-status");
  const weatherGrid = $("#weather-grid");
  let lastLat = null;
  let lastLon = null;
  let lastTempC = null;

  const WMO = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail",
  };

  async function fetchWeather(lat, lon, label = "") {
    weatherStatus.textContent = "Loading weather…";
    weatherGrid.hidden = true;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&wind_speed_unit=kmh`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Weather request failed");
      const data = await res.json();
      const c = data.current;
      lastLat = lat;
      lastLon = lon;
      lastTempC = c.temperature_2m;

      $("#w-temp").textContent = `${Math.round(c.temperature_2m)}°C`;
      $("#w-hum").textContent = `${c.relative_humidity_2m}%`;
      $("#w-rain").textContent = `${c.precipitation} mm`;
      $("#w-wind").textContent = `${Math.round(c.wind_speed_10m)} km/h`;
      $("#w-desc").textContent = `${WMO[c.weather_code] || "Unknown"}${label ? ` · ${label}` : ""}`;

      weatherGrid.hidden = false;
      weatherStatus.textContent = "";
      renderPlantingSuggestions();
    } catch (e) {
      weatherStatus.textContent = "Could not load weather. Try again or use another city.";
      console.error(e);
    }
  }

  $("#btn-locate")?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      weatherStatus.textContent = "Geolocation not available in this browser.";
      return;
    }
    weatherStatus.textContent = "Requesting location…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeather(pos.coords.latitude, pos.coords.longitude, "your location");
      },
      () => {
        weatherStatus.textContent = "Location denied. Enter a city instead.";
      }
    );
  });

  $("#btn-city-weather")?.addEventListener("click", async () => {
    const q = $("#city-input").value.trim();
    if (!q) {
      weatherStatus.textContent = "Type a city name.";
      return;
    }
    weatherStatus.textContent = "Looking up city…";
    try {
      const g = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`
      );
      const geo = await g.json();
      if (!geo.results?.length) {
        weatherStatus.textContent = "City not found. Try another spelling.";
        return;
      }
      const r = geo.results[0];
      await fetchWeather(r.latitude, r.longitude, r.name);
    } catch (e) {
      weatherStatus.textContent = "Geocoding failed. Check connection.";
      console.error(e);
    }
  });

  /* ---------- Planting by month + temp ---------- */
  const MONTH_PLANTS = [
    { m: [11, 0, 1], cool: ["Garlic (fall plant where climate allows)", "Onion sets (zones permitting)", "Microgreens indoors"], warm: ["Herbs on windowsill", "Cool-season greens under cover"] },
    { m: [2, 3, 4], cool: ["Peas", "Spinach", "Kale", "Lettuce", "Radish"], warm: ["Tomatoes indoors (6–8 wks before last frost)", "Peppers indoors", "Brassica transplants"] },
    { m: [5, 6, 7], cool: ["Beans", "Squash", "Cucumbers", "Basil after frost passed"], warm: ["Sweet corn", "Okra", "Melons", "Heat-loving herbs"] },
    { m: [8, 9, 10], cool: ["Fall lettuce & radish", "Cover crops (clover, rye)", "Garlic for next year"], warm: ["Late beans (short season)", "Kale for winter harvest"] },
  ];

  function plantsForMonth(monthIndex) {
    for (const block of MONTH_PLANTS) {
      if (block.m.includes(monthIndex)) return { cool: block.cool, warm: block.warm };
    }
    return { cool: ["Salad greens"], warm: ["Seasonal flowers"] };
  }

  function renderPlantingSuggestions() {
    const el = $("#planting-cards");
    if (!el) return;
    const month = new Date().getMonth();
    const { cool, warm } = plantsForMonth(month);
    const temp = lastTempC;
    const frostRisk = temp != null && temp < 5;
    const hot = temp != null && temp > 28;

    let focus = "Balanced ideas for typical spring–summer conditions.";
    if (frostRisk) focus = "Cold snap risk: prioritize frost-hardy crops, indoor starts, or wait to transplant.";
    if (hot) focus = "Hot spell: favor heat-tolerant varieties; increase watering checks; mulch pots.";

    el.innerHTML = `
      <article class="plant-card">
        <h3>This month (calendar)</h3>
        <p class="muted" style="margin-bottom:0.5rem">${focus}</p>
        <strong style="color:var(--text)">Cool-season friendly</strong>
        <ul>${cool.map((p) => `<li>${p}</li>`).join("")}</ul>
      </article>
      <article class="plant-card">
        <h3>Warm / transplant timing</h3>
        <ul>${warm.map((p) => `<li>${p}</li>`).join("")}</ul>
      </article>
      <article class="plant-card">
        <h3>Potting &amp; seeds now</h3>
        <ul>
          <li>Use <strong>seed mix</strong> for new sowings (see Potting mix lab).</li>
          <li>If nights are cold, harden off gradually before moving pots outside.</li>
          <li>Match pot size to root depth—deeper for tomatoes, shallow for lettuce.</li>
        </ul>
      </article>
    `;
  }

  renderPlantingSuggestions();

  /* ---------- Growth journal ---------- */
  const STORAGE_KEY = "leaflog-journal-v1";
  $("#entry-date").valueAsDate = new Date();

  function loadJournal() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveJournal(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function renderJournal() {
    const list = $("#journal-list");
    const entries = loadJournal().sort((a, b) => (a.date < b.date ? 1 : -1));
    if (!entries.length) {
      list.innerHTML = '<li class="muted">No entries yet. Add your first check-in above.</li>';
      return;
    }
    list.innerHTML = entries
      .map(
        (e) => `
      <li class="journal-item" data-id="${e.id}">
        ${e.photo ? `<img src="${e.photo}" alt="" />` : '<div style="width:100px;height:100px;background:var(--bg2);border-radius:8px"></div>'}
        <div>
          <strong>${escapeHtml(e.plant)}</strong>
          <div class="meta">${e.date}${e.size ? ` · ${escapeHtml(e.size)}` : ""}</div>
          ${e.notes ? `<p style="margin:0.4rem 0 0;font-size:0.92rem">${escapeHtml(e.notes)}</p>` : ""}
        </div>
        <button type="button" data-del="${e.id}">Remove</button>
      </li>`
      )
      .join("");
    list.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-del");
        saveJournal(loadJournal().filter((x) => x.id !== id));
        renderJournal();
      });
    });
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  $("#journal-form")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const file = fd.get("photo");
    const entry = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `e-${Date.now()}`,
      date: fd.get("date"),
      plant: fd.get("plant").trim(),
      size: (fd.get("size") || "").trim(),
      notes: (fd.get("notes") || "").trim(),
      photo: null,
    };
    if (!entry.plant) return;

    const finish = () => {
      saveJournal([entry, ...loadJournal()]);
      renderJournal();
      ev.target.reset();
      $("#entry-date").valueAsDate = new Date();
    };

    if (file && file.size > 0) {
      if (file.size > 1.5 * 1024 * 1024) {
        alert("Photo is large; please use an image under ~1.5 MB for browser storage.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        entry.photo = reader.result;
        finish();
      };
      reader.readAsDataURL(file);
    } else {
      finish();
    }
  });

  renderJournal();

  /* ---------- Deficiency table ---------- */
  const DEFICIENCY_ROWS = [
    {
      signs: "Older leaves pale yellow; veins may stay green late (general chlorosis)",
      lack: "Nitrogen (N)",
      fert:
        "Compost, worm castings, well-rotted manure; <strong>compost tea</strong>; diluted <strong>nettle / weed tea</strong>; mild <strong>cooled coffee</strong> or spent-ground soak (acid-tolerant plants only).",
      when: "Active growth: weak tea every 7–14 days; top-dress compost monthly in pots. Ease up if growth is overly soft or no flowers form.",
    },
    {
      signs: "Purple/reddish older leaves, dark green tops; stunted roots",
      lack: "Phosphorus (P)",
      fert:
        "<strong>Bone meal</strong> or fish bone meal worked into top soil; <strong>rock phosphate</strong> (slow); compost rich in fruit/veg scraps; avoid piling fresh high-N teas alone.",
      when: "Mix small amounts into root zone before planting; reapply per product guidance—organic P is slow-release.",
    },
    {
      signs: "Leaf edges yellow/brown, weak stems, poor drought tolerance",
      lack: "Potassium (K)",
      fert:
        "<strong>Banana peel tea</strong>; tiny amounts of <strong>wood ash</strong> (raises pH—use sparingly); <strong>kelp meal</strong> tea; composted fruit &amp; veg.",
      when: "During flowering/fruit: diluted banana tea weekly at most; ash: pinch per pot only if pH allows.",
    },
    {
      signs: "Yellow between veins on older leaves (interveinal)",
      lack: "Magnesium (Mg)",
      fert:
        "Many organic growers use a little <strong>Epsom salt</strong> dissolved in water (1 tbsp / 4 L) as soil drench—occasional; plus <strong>compost</strong> and mulch to feed soil life.",
      when: "Once, then reassess in 2 weeks; don’t repeat blindly without checking other issues (light, roots, pH).",
    },
    {
      signs: "New leaves yellow/white while veins stay green",
      lack: "Iron (Fe) — often high pH lockout",
      fert:
        "Improve organic matter with <strong>compost</strong>; <strong>pine needle mulch</strong> or sulfur (organic) to gently lower pH over time; foliar <strong>compost tea</strong> (very dilute). Avoid synthetic chelated iron if staying strictly organic.",
      when: "Long-term soil building; short-term, verify pH/drainage—iron availability often follows fixing those.",
    },
    {
      signs: "Twisted/new growth distorted; tip burn",
      lack: "Calcium (Ca) or uneven watering",
      fert:
        "Crushed <strong>eggshells</strong> worked in long-term; <strong>gypsum</strong> (organic-approved); <strong>bone meal</strong> in small doses; consistent water beats foliar shortcuts.",
      when: "Eggshell tea or vinegar-activated shell rinse—heavily diluted; steady watering every day matters most.",
    },
  ];

  const tbody = $("#deficiency-table tbody");
  if (tbody) {
    tbody.innerHTML = DEFICIENCY_ROWS.map(
      (r) =>
        `<tr><td>${r.signs}</td><td>${r.lack}</td><td>${r.fert}</td><td>${r.when}</td></tr>`
    ).join("");
  }

  /* ---------- Photo demo analysis ---------- */
  const uploadZone = $("#upload-zone");
  const fileInput = $("#check-photo");
  const canvas = $("#check-canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const analysisPanel = $("#analysis-panel");

  uploadZone.addEventListener("click", () => fileInput.click());
  uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.classList.add("drag");
  });
  uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("drag"));
  uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.classList.remove("drag");
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) analyzeFile(f);
  });

  fileInput.addEventListener("change", () => {
    const f = fileInput.files[0];
    if (f) analyzeFile(f);
  });

  function analyzeFile(file) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxW = 320;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      let r = 0,
        g = 0,
        b = 0,
        n = 0;
      for (let i = 0; i < data.length; i += 16) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n++;
      }
      r /= n;
      g /= n;
      b /= n;

      const brightness = (r + g + b) / 3;
      const greenDominance = g / (r + b + 1);
      const yellowScore = (r + g) / 2 - b;

      const hints = [];
      let tags = [];

      if (brightness > 200) {
        tags.push("Very bright image");
        hints.push("Photo may be overexposed—try softer light so leaf color is visible.");
      } else if (brightness < 60) {
        tags.push("Dark image");
        hints.push("Low light in photo—hard to judge leaf color; retake in daylight.");
      }

      if (greenDominance > 0.95 && g > 80) {
        tags.push("Strong green");
        hints.push("Overall green tone: no obvious yellowing in this rough average—keep monitoring older leaves.");
      }

      if (yellowScore > 35 && g < r * 1.05) {
        tags.push("Yellow shift in pixels");
        hints.push(
          "Average color leans yellow: <strong>consider nitrogen or magnesium deficiency</strong> (or natural variegation/senescence). Compare oldest vs newest leaves."
        );
        hints.push(
          "Organic idea: one watering with <strong>very dilute compost tea</strong> or <strong>weak nettle tea</strong>, then reassess in 7–10 days—only if watering and light are already good."
        );
      }

      if (greenDominance < 0.75 && brightness < 140) {
        tags.push("Muted green");
        hints.push(
          "Could indicate low chlorophyll from low light, overwatering, or root stress—not only nutrient lack."
        );
      }

      if (!hints.length) {
        hints.push(
          "No strong color signal in this demo scan. Compare your plant to the table below and consider a soil test."
        );
      }

      analysisPanel.innerHTML = `
        <p><strong>Browser demo scan</strong> (not AI): averaged RGB ≈ R${r.toFixed(0)} G${g.toFixed(
        0
      )} B${b.toFixed(0)}</p>
        <p>${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</p>
        <ul>${hints.map((h) => `<li>${h}</li>`).join("")}</ul>
        <p class="muted" style="margin-top:1rem;margin-bottom:0">Always cross-check pests, roots, and watering before changing feeding. This app suggests <strong>organic-only</strong> options.</p>
      `;
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      analysisPanel.innerHTML = "<p>Could not read that image.</p>";
    };
    img.src = url;
  }

  /* ---------- Potting mix recipes ---------- */
  const MIXES = {
    general: {
      title: "General containers / vegetables",
      parts: [
        ["High-quality peat or coco coir", "40%"],
        ["Compost or worm castings", "30%"],
        ["Perlite or pumice (drainage)", "20%"],
        ["Optional: coarse sand / bark fines", "10%"],
      ],
      note: "Aim for moist-but-not-soggy. Increase perlite in wet climates.",
    },
    seed: {
      title: "Seed starting",
      parts: [
        ["Fine coco coir or peat", "50%"],
        ["Perlite or vermiculite", "40%"],
        ["Worm castings (light)", "10%"],
      ],
      note: "Sterile commercial seed mix is easiest; keep surface evenly moist until germination.",
    },
    succulent: {
      title: "Succulents & cactus",
      parts: [
        ["Potting soil base", "40%"],
        ["Coarse sand or fine grit", "40%"],
        ["Perlite / pumice", "20%"],
      ],
      note: "Water deeply but rarely; pot must drain freely.",
    },
    acid: {
      title: "Acid-loving (blueberries, azaleas)",
      parts: [
        ["Pine bark fines", "40%"],
        ["Peat or coco coir (acidic)", "30%"],
        ["Composted pine needles", "20%"],
        ["Perlite", "10%"],
      ],
      note: "Check pH toward 4.5–5.5 for blueberries; sulfur adjusts slowly—test yearly.",
    },
  };

  function renderMix() {
    const type = $("#mix-type").value;
    const m = MIXES[type];
    const dl = m.parts.map(([name, pct]) => `<dt>${pct}</dt><dd>${name}</dd>`).join("");
    $("#mix-output").innerHTML = `<h3 style="margin-top:0;color:var(--accent)">${m.title}</h3><dl>${dl}</dl><p class="muted" style="margin-top:1rem;margin-bottom:0">${m.note}</p>`;
  }

  $("#mix-type")?.addEventListener("change", renderMix);
  renderMix();

  /* ---------- Vegetable crop guide ---------- */
  function initVegetableGuide() {
    const grid = $("#vegetable-grid");
    const data = window.LEAFLOG_VEGETABLES;
    if (!grid || !Array.isArray(data) || !data.length) return;

    grid.innerHTML = data
      .map(
        (v) => `
      <button type="button" class="veg-card" data-veg-id="${escapeHtml(v.id)}" aria-label="Open full guide: ${escapeHtml(v.name)}">
        <div class="veg-card-img-wrap">
          <img src="${v.image}" alt="" loading="lazy" width="320" height="240" />
        </div>
        <span class="veg-card-caption">${escapeHtml(v.name)}</span>
        <span class="veg-tap-hint">Tap for full flow → harvest</span>
      </button>`
      )
      .join("");

    const modal = $("#veg-modal");
    const backdrop = $("#veg-modal-backdrop");
    const closeBtn = $("#veg-modal-close");
    const title = $("#veg-modal-title");
    const img = $("#veg-modal-img");
    const flow = $("#veg-modal-flow");
    if (!modal || !backdrop || !closeBtn || !title || !img || !flow) return;

    function openModal(veg) {
      title.textContent = veg.name;
      img.src = veg.image;
      img.alt = veg.name;
      flow.innerHTML = veg.sections
        .map(
          (s) =>
            `<article class="veg-step"><h3>${escapeHtml(s.h)}</h3><p>${escapeHtml(s.t)}</p></article>`
        )
        .join("");
      modal.hidden = false;
      document.body.classList.add("veg-modal-open");
      closeBtn.focus();
    }

    function closeModal() {
      modal.hidden = true;
      document.body.classList.remove("veg-modal-open");
      img.removeAttribute("src");
      img.alt = "";
    }

    grid.addEventListener("click", (e) => {
      const btn = e.target.closest(".veg-card[data-veg-id]");
      if (!btn) return;
      const id = btn.getAttribute("data-veg-id");
      const veg = data.find((x) => x.id === id);
      if (veg) openModal(veg);
    });

    backdrop.addEventListener("click", closeModal);
    closeBtn.addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.hidden) closeModal();
    });
  }

  initVegetableGuide();

  /* ---------- PWA: service worker + install ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {});
    });
  }

  function initInstallUI() {
    const banner = $("#install-banner");
    if (!banner) return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (standalone) return;

    if (sessionStorage.getItem("leaflog-install-dismissed")) return;

    const btnInstall = $("#btn-install");
    const btnDismiss = $("#btn-install-dismiss");
    const iosHint = $("#install-ios-hint");

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    let deferredPrompt = null;

    function showPad() {
      document.body.classList.add("install-pad");
    }
    function hidePad() {
      document.body.classList.remove("install-pad");
    }

    if (isIOS) {
      banner.hidden = false;
      if (iosHint) iosHint.hidden = false;
      if (btnInstall) btnInstall.hidden = true;
      showPad();
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      banner.hidden = false;
      if (btnInstall) btnInstall.hidden = false;
      if (iosHint) iosHint.hidden = true;
      showPad();
    });

    btnInstall?.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      banner.hidden = true;
      hidePad();
    });

    btnDismiss?.addEventListener("click", () => {
      banner.hidden = true;
      hidePad();
      sessionStorage.setItem("leaflog-install-dismissed", "1");
    });
  }

  initInstallUI();
})();
