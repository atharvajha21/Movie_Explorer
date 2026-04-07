/* ============================================================
   MOVIE EXPLORER — script.js
   Full-featured: Search, Sort, Filter, Watchlist, Detail Modal,
   Pagination, Skeleton Loading, Toast, IMDb links
   ============================================================ */

const API_KEY = "dcdd2fa2";
const API_BASE = "https://www.omdbapi.com/";

// ===== DOM REFERENCES =====
const container        = document.getElementById("moviesContainer");
const searchInput      = document.getElementById("searchInput");
const searchBtn        = document.getElementById("searchBtn");
const skeletonGrid     = document.getElementById("skeletonGrid");
const sortSelect       = document.getElementById("sort");
const filterYear       = document.getElementById("filterYear");
const filterType       = document.getElementById("filterType");
const themeToggle      = document.getElementById("themeToggle");
const watchlistBtn     = document.getElementById("watchlistBtn");
const watchlistCount   = document.getElementById("watchlistCount");
const watchlistModal   = document.getElementById("watchlistModal");
const closeWatchlist   = document.getElementById("closeWatchlist");
const watchlistContent = document.getElementById("watchlistContent");
const detailModal      = document.getElementById("detailModal");
const closeDetail      = document.getElementById("closeDetail");
const detailContent    = document.getElementById("detailContent");
const emptyState       = document.getElementById("emptyState");
const emptySearchBtn   = document.getElementById("emptySearchBtn");
const pagination       = document.getElementById("pagination");
const prevPage         = document.getElementById("prevPage");
const nextPage         = document.getElementById("nextPage");
const pageInfo         = document.getElementById("pageInfo");
const resultsInfo      = document.getElementById("resultsInfo");
const clearFiltersBtn  = document.getElementById("clearFiltersBtn");
const heroSection      = document.getElementById("heroSection");
const toast            = document.getElementById("toast");

// ===== STATE =====
// Watchlist is persisted in localStorage
let allMovies        = [];
let filteredMovies   = [];
let currentPage      = 1;
const PAGE_SIZE      = 12; // Movies per page
let currentQuery     = "";
let toastTimer       = null; // Holds setTimeout ref for toast auto-hide

const DEFAULT_QUERIES = ["avengers", "batman", "spiderman", "inception", "joker", "interstellar"];

// ===================================================
// API HELPERS
// ===================================================

async function fetchMovies(query, type = "") {
  const typeParam = type ? `&type=${type}` : "";
  const res  = await fetch(`${API_BASE}?s=${encodeURIComponent(query)}&apikey=${API_KEY}${typeParam}`);
  const data = await res.json();
  if (data.Response === "False") return [];
  return data.Search || [];
}

async function fetchMovieDetail(imdbID) {
  const res  = await fetch(`${API_BASE}?i=${imdbID}&apikey=${API_KEY}&plot=full`);
  const data = await res.json();
  return data.Response === "True" ? data : null;
}

// ===================================================
// LOAD HOME MOVIES
// ===================================================

async function loadHome() {
  currentQuery = "";
  showSkeleton();

  const type = filterType.value;
  const results = await Promise.all(DEFAULT_QUERIES.map(q => fetchMovies(q, type)));

  allMovies = results
    .flat()
    .filter(m => m.Poster && m.Poster !== "N/A")
    .filter((m, i, self) => i === self.findIndex(x => x.imdbID === m.imdbID));

  applyFiltersAndRender();
  hideSkeleton();
  heroSection.classList.remove("hidden");
}

// ===================================================
// SEARCH
// ===================================================

async function doSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  currentQuery = query;
  currentPage  = 1;
  showSkeleton();
  heroSection.classList.add("hidden");

  const type   = filterType.value;
  const movies = await fetchMovies(query, type);

  allMovies = movies.filter(m => m.Poster && m.Poster !== "N/A");
  applyFiltersAndRender();
  hideSkeleton();
}

// ===================================================
// FILTER + SORT + RENDER PIPELINE
// ===================================================

function applyFiltersAndRender() {
  let result = [...allMovies];

  // Year filter
  const year = filterYear.value;
  if (year) result = result.filter(m => m.Year === year || m.Year.startsWith(year));

  // Sort
  const sort = sortSelect.value;
  if (sort === "az")     result.sort((a, b) => a.Title.localeCompare(b.Title));
  if (sort === "za")     result.sort((a, b) => b.Title.localeCompare(a.Title));
  if (sort === "newest") result.sort((a, b) => parseInt(b.Year) - parseInt(a.Year));
  if (sort === "oldest") result.sort((a, b) => parseInt(a.Year) - parseInt(b.Year));

  filteredMovies = result;

  if (filteredMovies.length === 0) {
    showEmptyState();
    updateResultsInfo(0);
    pagination.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  updateResultsInfo(filteredMovies.length);
  renderPage();
}

function renderPage() {
  const start     = (currentPage - 1) * PAGE_SIZE;
  const end       = start + PAGE_SIZE;
  const pageItems = filteredMovies.slice(start, end);

  renderMovies(pageItems);
  updatePagination();
}

function renderMovies(movies) {
  container.innerHTML = "";

  const watchlist = getWatchlist();

  movies.forEach((movie, idx) => {
    const card = document.createElement("div");
    card.className = "movie";
    card.style.animationDelay = `${idx * 0.04}s`;

    const inWatchlist = watchlist.some(m => m.imdbID === movie.imdbID);
    const typeName    = formatType(movie.Type);

    card.innerHTML = `
      <div class="movie-poster-wrap">
        <img src="${movie.Poster}"
             alt="${movie.Title} poster"
             onerror="this.src='https://placehold.co/300x400/1a1a26/9090b0?text=No+Image'" />
        <div class="movie-overlay"><span class="overlay-hint">View Details</span></div>
        ${typeName ? `<span class="type-badge">${typeName}</span>` : ""}
      </div>
      <div class="movie-info">
        <h3 title="${movie.Title}">${movie.Title}</h3>
        <div class="movie-meta">
          <span class="movie-year">${movie.Year}</span>
        </div>
        <button class="watch-btn ${inWatchlist ? "added" : ""}" aria-label="${inWatchlist ? "Added to watchlist" : "Add to watchlist"}">
          ${inWatchlist ? "✓ In Watchlist" : "+ Add to Watchlist"}
        </button>
      </div>
    `;

    // Open detail modal on card click (not on button)
    card.addEventListener("click", (e) => {
      if (!e.target.classList.contains("watch-btn")) {
        openDetailModal(movie);
      }
    });

    const btn = card.querySelector(".watch-btn");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleWatchlist(movie, btn);
    });

    container.appendChild(card);
  });

  updateWatchlistCount();
}

// ===================================================
// DETAIL MODAL
// ===================================================

async function openDetailModal(movie) {
  detailModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  detailContent.innerHTML = `
    <div class="detail-loading">
      <div class="spinner"></div>
      <p>Loading details…</p>
    </div>
  `;

  const detail = await fetchMovieDetail(movie.imdbID);

  if (!detail) {
    detailContent.innerHTML = `<div class="detail-loading"><p>Could not load details.</p></div>`;
    return;
  }

  const imdbRating = detail.imdbRating !== "N/A" ? detail.imdbRating : null;
  const genres     = detail.Genre     !== "N/A" ? detail.Genre.split(", ") : [];
  const inWL       = getWatchlist().some(m => m.imdbID === detail.imdbID);

  detailContent.innerHTML = `
    <div class="detail-layout">
      <img class="detail-poster"
           src="${detail.Poster !== "N/A" ? detail.Poster : "https://placehold.co/200x300/1a1a26/9090b0?text=No+Image"}"
           alt="${detail.Title} poster" />
      <div class="detail-info">
        <h2 id="detailTitle">${detail.Title}</h2>
        <div class="detail-tags">
          ${detail.Year    !== "N/A" ? `<span class="tag">📅 ${detail.Year}</span>`    : ""}
          ${detail.Runtime !== "N/A" ? `<span class="tag">⏱ ${detail.Runtime}</span>` : ""}
          ${detail.Rated   !== "N/A" ? `<span class="tag">${detail.Rated}</span>`      : ""}
          ${genres.map(g => `<span class="tag">${g}</span>`).join("")}
        </div>
        ${imdbRating ? `
          <div class="rating-row">
            <span class="imdb-badge">IMDb</span>
            <span class="rating-number">${imdbRating}</span>
            <span class="rating-max">/ 10</span>
          </div>
        ` : ""}
        <p class="detail-plot">${detail.Plot !== "N/A" ? detail.Plot : "No plot available."}</p>
        ${detail.Director !== "N/A" ? `<p class="detail-meta"><strong>Director:</strong> ${detail.Director}</p>` : ""}
        ${detail.Actors   !== "N/A" ? `<p class="detail-meta"><strong>Cast:</strong> ${detail.Actors}</p>`     : ""}
        ${detail.Language !== "N/A" ? `<p class="detail-meta"><strong>Language:</strong> ${detail.Language}</p>` : ""}
        ${detail.Country  !== "N/A" ? `<p class="detail-meta"><strong>Country:</strong> ${detail.Country}</p>`  : ""}
        <div class="detail-actions">
          <button class="watch-btn ${inWL ? "added" : ""}" id="detailWLBtn">
            ${inWL ? "✓ In Watchlist" : "+ Add to Watchlist"}
          </button>
          <a class="imdb-link"
             href="https://www.imdb.com/title/${detail.imdbID}/"
             target="_blank"
             rel="noopener"
             aria-label="View on IMDb">
            🎬 IMDb Page
          </a>
        </div>
      </div>
    </div>
  `;

  document.getElementById("detailWLBtn").addEventListener("click", () => {
    const btn = document.getElementById("detailWLBtn");
    toggleWatchlist(movie, btn);
  });
}

function closeDetailModal() {
  detailModal.classList.add("hidden");
  document.body.style.overflow = "";
}

// ===================================================
// WATCHLIST
// ===================================================

function getWatchlist() {
  return JSON.parse(localStorage.getItem("watchlist")) || [];
}

function saveWatchlist(list) {
  localStorage.setItem("watchlist", JSON.stringify(list));
}

function toggleWatchlist(movie, btn) {
  let list  = getWatchlist();
  const exists = list.some(m => m.imdbID === movie.imdbID);

  if (exists) {
    list = list.filter(m => m.imdbID !== movie.imdbID);
    saveWatchlist(list);
    btn.textContent = "+ Add to Watchlist";
    btn.classList.remove("added");
    showToast(`"${movie.Title}" removed from watchlist`);
  } else {
    list.push(movie);
    saveWatchlist(list);
    btn.textContent = "✓ In Watchlist";
    btn.classList.add("added");
    showToast(`"${movie.Title}" added to watchlist! ❤️`);
  }

  updateWatchlistCount();
  syncWatchlistButtons();
}

function syncWatchlistButtons() {
  const list = getWatchlist();
  container.querySelectorAll(".movie").forEach(card => {
    const btn = card.querySelector(".watch-btn");
    const h3  = card.querySelector("h3");
    if (!btn || !h3) return;
    const title = h3.title || h3.textContent;
    const inWL  = list.some(m => m.Title === title);
    if (inWL) {
      btn.textContent = "✓ In Watchlist";
      btn.classList.add("added");
    } else {
      btn.textContent = "+ Add to Watchlist";
      btn.classList.remove("added");
    }
  });
}

function updateWatchlistCount() {
  const count = getWatchlist().length;
  watchlistCount.textContent = count;
  watchlistCount.style.display = count > 0 ? "inline-flex" : "none";
}

function openWatchlistModal() {
  watchlistModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  renderWatchlistModal();
}

function renderWatchlistModal() {
  const list = getWatchlist();

  if (list.length === 0) {
    watchlistContent.innerHTML = `
      <div class="watchlist-empty">
        <div class="empty-icon">❤️</div>
        <p>Your watchlist is empty.</p>
        <p style="font-size:13px; margin-top:6px;">Add movies to see them here!</p>
      </div>
    `;
    return;
  }

  watchlistContent.innerHTML = list.map(movie => `
    <div class="watchlist-item" data-id="${movie.imdbID}">
      <img src="${movie.Poster !== "N/A" ? movie.Poster : "https://placehold.co/46x64/1a1a26/9090b0?text=?"}"
           alt="${movie.Title}"
           onerror="this.src='https://placehold.co/46x64/1a1a26/9090b0?text=?'" />
      <div class="watchlist-item-info">
        <h4>${movie.Title}</h4>
        <p>${movie.Year}</p>
      </div>
      <button class="remove-btn" data-id="${movie.imdbID}" aria-label="Remove ${movie.Title} from watchlist">Remove</button>
    </div>
  `).join("");

  watchlistContent.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      let list = getWatchlist().filter(m => m.imdbID !== id);
      saveWatchlist(list);
      updateWatchlistCount();
      syncWatchlistButtons();
      renderWatchlistModal();
    });
  });
}

// ===================================================
// PAGINATION
// ===================================================

function updatePagination() {
  const totalPages = Math.ceil(filteredMovies.length / PAGE_SIZE);

  if (totalPages <= 1) {
    pagination.classList.add("hidden");
    return;
  }

  pagination.classList.remove("hidden");
  pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;
  prevPage.disabled = currentPage <= 1;
  nextPage.disabled = currentPage >= totalPages;
}

// ===================================================
// UI HELPERS
// ===================================================

function showSkeleton() {
  skeletonGrid.classList.remove("hidden");
  container.innerHTML = "";
  emptyState.classList.add("hidden");
  pagination.classList.add("hidden");
  resultsInfo.classList.add("hidden");
}

function hideSkeleton() {
  skeletonGrid.classList.add("hidden");
}

function showEmptyState() {
  container.innerHTML = "";
  emptyState.classList.remove("hidden");
}

function updateResultsInfo(count) {
  if (count === 0) {
    resultsInfo.classList.add("hidden");
    return;
  }
  const label = currentQuery ? `results for "<strong>${currentQuery}</strong>"` : "trending movies";
  resultsInfo.innerHTML = `Showing <strong>${count}</strong> ${label}`;
  resultsInfo.classList.remove("hidden");
}

function showToast(message) {
  toast.classList.remove("hidden");
  toast.textContent = message;
  requestAnimationFrame(() => toast.classList.add("show"));

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.classList.add("hidden"), 350);
  }, 2800);
}

function formatType(type) {
  if (!type) return "";
  if (type === "movie")   return "Movie";
  if (type === "series")  return "Series";
  if (type === "episode") return "Episode";
  return type;
}

// ===================================================
// THEME
// ===================================================

function applyTheme(theme) {
  document.body.classList.toggle("light", theme === "light");
  document.body.classList.toggle("dark",  theme !== "light");
  themeToggle.textContent = theme === "light" ? "☀️" : "🌙";
}

// ===================================================
// EVENT LISTENERS
// ===================================================

// Search
searchBtn.addEventListener("click", doSearch);
searchInput.addEventListener("keypress", e => { if (e.key === "Enter") doSearch(); });

// Filters & Sort
sortSelect.addEventListener("change",  () => { currentPage = 1; applyFiltersAndRender(); });
filterYear.addEventListener("change",  () => { currentPage = 1; applyFiltersAndRender(); });
filterType.addEventListener("change",  () => { currentPage = 1; loadHome(); });

// Clear filters
clearFiltersBtn.addEventListener("click", () => {
  sortSelect.value = "";
  filterYear.value = "";
  filterType.value = "";
  currentPage = 1;
  applyFiltersAndRender();
});

// Pagination
prevPage.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});
nextPage.addEventListener("click", () => {
  const total = Math.ceil(filteredMovies.length / PAGE_SIZE);
  if (currentPage < total) {
    currentPage++;
    renderPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

// Watchlist modal
watchlistBtn.addEventListener("click", openWatchlistModal);
closeWatchlist.addEventListener("click", () => {
  watchlistModal.classList.add("hidden");
  document.body.style.overflow = "";
});
watchlistModal.addEventListener("click", e => {
  if (e.target === watchlistModal) {
    watchlistModal.classList.add("hidden");
    document.body.style.overflow = "";
  }
});

// Detail modal
closeDetail.addEventListener("click", closeDetailModal);
detailModal.addEventListener("click", e => {
  if (e.target === detailModal) closeDetailModal();
});

// Empty state
emptySearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  filterYear.value  = "";
  sortSelect.value  = "";
  filterType.value  = "";
  emptyState.classList.add("hidden");
  loadHome();
});

// Theme toggle
themeToggle.addEventListener("click", () => {
  const isLight  = document.body.classList.contains("light");
  const newTheme = isLight ? "dark" : "light";
  localStorage.setItem("theme", newTheme);
  applyTheme(newTheme);
});

// Keyboard: close modals on Escape
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if (!detailModal.classList.contains("hidden"))    closeDetailModal();
    if (!watchlistModal.classList.contains("hidden")) {
      watchlistModal.classList.add("hidden");
      document.body.style.overflow = "";
    }
  }
});

// ===================================================
// INIT
// ===================================================

window.addEventListener("load", () => {
  const saved = localStorage.getItem("theme") || "dark";
  applyTheme(saved);
  updateWatchlistCount();
  loadHome();
});