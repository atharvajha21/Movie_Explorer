const API_KEY = "dcdd2fa2";

// DOM
const container = document.getElementById("moviesContainer");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const loading = document.getElementById("loading");
const sortSelect = document.getElementById("sort");
const filterYear = document.getElementById("filterYear");
const themeToggle = document.getElementById("themeToggle");

let allMovies = [];

// 🎬 Fetch
async function fetchMovies(query) {
  const res = await fetch(`https://www.omdbapi.com/?s=${query}&apikey=${API_KEY}`);
  const data = await res.json();
  return data.Search || [];
}

// 🏠 Load Home Movies
async function loadHome() {
  loading.classList.remove("hidden");

  const queries = ["avengers", "batman", "spiderman", "harry potter"];

  const results = await Promise.all(queries.map(q => fetchMovies(q)));

  allMovies = results
    .flat()
    .filter(m => m.Poster !== "N/A")
    .filter((m, i, self) =>
      i === self.findIndex(x => x.imdbID === m.imdbID)
    );

  renderMovies(allMovies);

  loading.classList.add("hidden");
}

// 🎥 Render
function renderMovies(movies) {
  container.innerHTML = "";

  movies.forEach(movie => {
    const card = document.createElement("div");
    card.className = "movie";

    card.innerHTML = `
      <img src="${movie.Poster}" 
           onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'" />
      <h3>${movie.Title}</h3>
      <p>${movie.Year}</p>
      <button class="watch-btn">ADD TO WATCHLIST</button>
    `;

    const btn = card.querySelector(".watch-btn");
    btn.addEventListener("click", () => addToWatchlist(movie, btn));

    container.appendChild(card);
  });
}

// ⭐ Watchlist
function addToWatchlist(movie, btn) {
  let list = JSON.parse(localStorage.getItem("watchlist")) || [];

  if (list.some(m => m.imdbID === movie.imdbID)) {
    alert("Already added!");
    return;
  }

  list.push(movie);
  localStorage.setItem("watchlist", JSON.stringify(list));

  btn.textContent = "ADDED ✓";
  btn.style.background = "green";
}

// 🔍 Search
searchBtn.addEventListener("click", async () => {
  const query = searchInput.value.trim();
  if (!query) return;

  loading.classList.remove("hidden");

  allMovies = (await fetchMovies(query)).filter(m => m.Poster !== "N/A");

  renderMovies(allMovies);

  loading.classList.add("hidden");
});

// ⌨️ Enter key
searchInput.addEventListener("keypress", e => {
  if (e.key === "Enter") searchBtn.click();
});

// 🔽 Sort
sortSelect.addEventListener("change", () => {
  let sorted = [...allMovies];

  if (sortSelect.value === "az") {
    sorted.sort((a, b) => a.Title.localeCompare(b.Title));
  } else {
    sorted.sort((a, b) => b.Title.localeCompare(a.Title));
  }

  renderMovies(sorted);
});

// 🎯 Filter
filterYear.addEventListener("change", () => {
  const year = filterYear.value;

  const filtered = allMovies.filter(m => !year || m.Year === year);

  renderMovies(filtered);
});

// 🌙 Theme
window.addEventListener("load", () => {
  const saved = localStorage.getItem("theme");
  if (saved === "light") {
    document.body.classList.add("light");
    themeToggle.textContent = "☀️";
  }

  loadHome();
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");

  if (document.body.classList.contains("light")) {
    localStorage.setItem("theme", "light");
    themeToggle.textContent = "☀️";
  } else {
    localStorage.setItem("theme", "dark");
    themeToggle.textContent = "🌙";
  }
});