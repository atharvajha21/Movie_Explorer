// Movie Explorer — Basic 4-feature version
// Features: 1) Search  2) View Details  3) Watchlist  4) Filter by Type

const API_KEY = "dcdd2fa2";
const API_BASE = "https://www.omdbapi.com/";

// DOM
const searchInput     = document.getElementById("searchInput");
const searchBtn       = document.getElementById("searchBtn");
const filterType      = document.getElementById("filterType");
const moviesContainer = document.getElementById("moviesContainer");
const emptyMsg        = document.getElementById("emptyMsg");
const watchlistBtn    = document.getElementById("watchlistBtn");
const watchlistCount  = document.getElementById("watchlistCount");
const watchlistPanel  = document.getElementById("watchlistPanel");
const closeWatchlist  = document.getElementById("closeWatchlist");
const watchlistContent= document.getElementById("watchlistContent");


const DEFAULT_QUERIES = ["avengers", "batman", "inception", "joker"];

// -------------------------------------------------------
// 1. SEARCH — Fetch movies from OMDb API
// -------------------------------------------------------

async function searchMovies(query, type) {
  const typeParam = type ? `&type=${type}` : "";
  const res = await fetch(`${API_BASE}?s=${encodeURIComponent(query)}&apikey=${API_KEY}${typeParam}`);
  const data = await res.json();
  if (data.Response === "False") return [];
  return data.Search || [];
}

async function doSearch() {
  const query = searchInput.value.trim();
  const type  = filterType.value;
  if (!query) return;

  moviesContainer.innerHTML = "<p style='padding:20px;'>Loading...</p>";
  emptyMsg.classList.add("hidden");

  const movies = await searchMovies(query, type);
  const filtered = movies.filter(m => m.Poster && m.Poster !== "N/A");

  renderMovies(filtered);
}

async function loadDefaultMovies() {
  moviesContainer.innerHTML = "<p style='padding:20px;'>Loading...</p>";
  const type = filterType.value;

  const results = await Promise.all(DEFAULT_QUERIES.map(q => searchMovies(q, type)));
  const all = results
    .flat()
    .filter(m => m.Poster && m.Poster !== "N/A")
    .filter((m, i, arr) => arr.findIndex(x => x.imdbID === m.imdbID) === i);

  renderMovies(all);
}

// -------------------------------------------------------
// RENDER MOVIE CARDS
// -------------------------------------------------------

function renderMovies(movies) {
  moviesContainer.innerHTML = "";
  const watchlist = getWatchlist();

  if (movies.length === 0) {
    emptyMsg.classList.remove("hidden");
    return;
  }

  emptyMsg.classList.add("hidden");

  movies.forEach(movie => {
    const inWL = watchlist.some(m => m.imdbID === movie.imdbID);
    const card = document.createElement("div");
    card.className = "movie-card";

    card.innerHTML = `
      <img src="${movie.Poster}" alt="${movie.Title}" onerror="this.src='https://placehold.co/160x230/ddd/666?text=No+Image'" />
      <div class="card-info">
        <h3 title="${movie.Title}">${movie.Title}</h3>
        <p>${movie.Year} &bull; ${movie.Type || ""}</p>
        <button class="wl-btn ${inWL ? "added" : ""}" data-id="${movie.imdbID}">
          ${inWL ? "✓ In Watchlist" : "+ Watchlist"}
        </button>
      </div>
    `;

    // Watchlist toggle
    card.querySelector(".wl-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleWatchlist(movie, e.target);
    });

    moviesContainer.appendChild(card);
  });
}

// -------------------------------------------------------
// 2. WATCHLIST — Add / Remove / View
// -------------------------------------------------------

function getWatchlist() {
  return JSON.parse(localStorage.getItem("watchlist")) || [];
}

function saveWatchlist(list) {
  localStorage.setItem("watchlist", JSON.stringify(list));
}

function toggleWatchlist(movie, btn) {
  let list = getWatchlist();
  const exists = list.some(m => m.imdbID === movie.imdbID);

  if (exists) {
    list = list.filter(m => m.imdbID !== movie.imdbID);
    btn.textContent = "+ Watchlist";
    btn.classList.remove("added");
  } else {
    list.push(movie);
    btn.textContent = "✓ In Watchlist";
    btn.classList.add("added");
  }

  saveWatchlist(list);
  updateWatchlistCount();
}

function updateWatchlistCount() {
  watchlistCount.textContent = getWatchlist().length;
}

function openWatchlistPanel() {
  watchlistPanel.classList.remove("hidden");
  renderWatchlist();
}

function renderWatchlist() {
  const list = getWatchlist();

  if (list.length === 0) {
    watchlistContent.innerHTML = "<p style='color:#666;padding:10px 0;'>Your watchlist is empty.</p>";
    return;
  }

  watchlistContent.innerHTML = list.map(movie => `
    <div class="watchlist-item">
      <img src="${movie.Poster !== "N/A" ? movie.Poster : "https://placehold.co/44x60/ddd/666?text=?"}"
           alt="${movie.Title}"
           onerror="this.src='https://placehold.co/44x60/ddd/666?text=?'" />
      <div class="watchlist-item-info">
        <h4>${movie.Title}</h4>
        <p>${movie.Year}</p>
      </div>
      <button class="remove-btn" data-id="${movie.imdbID}">Remove</button>
    </div>
  `).join("");

  watchlistContent.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      let list = getWatchlist().filter(m => m.imdbID !== btn.dataset.id);
      saveWatchlist(list);
      updateWatchlistCount();
      renderWatchlist();
    });
  });
}

// -------------------------------------------------------
// 4. FILTER BY TYPE — Reload on change
// -------------------------------------------------------

filterType.addEventListener("change", () => {
  const query = searchInput.value.trim();
  if (query) {
    doSearch();
  } else {
    loadDefaultMovies();
  }
});

// -------------------------------------------------------
// EVENT LISTENERS
// -------------------------------------------------------

searchBtn.addEventListener("click", doSearch);
searchInput.addEventListener("keypress", e => { if (e.key === "Enter") doSearch(); });

watchlistBtn.addEventListener("click", openWatchlistPanel);
closeWatchlist.addEventListener("click", () => watchlistPanel.classList.add("hidden"));
watchlistPanel.addEventListener("click", e => { if (e.target === watchlistPanel) watchlistPanel.classList.add("hidden"); });

// Close panel with Escape key
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    watchlistPanel.classList.add("hidden");
  }
});

// -------------------------------------------------------
// INIT
// -------------------------------------------------------

updateWatchlistCount();
loadDefaultMovies();