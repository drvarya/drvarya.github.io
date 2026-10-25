const input = document.querySelector("#search-input");
const results = document.querySelector("#search-results");
const themeButtons = document.querySelectorAll(".theme-pill");
const thoughtItems = document.querySelectorAll(".link-list li[data-theme]");

if (input && results) {
  function renderResults(posts) {
    if (!posts.length) {
      results.innerHTML = "<li>No matching thoughts.</li>";
      return;
    }

    results.innerHTML = posts
      .map(post => {
        const detail = [post.date, post.theme, post.description].filter(Boolean).join(" · ");
        return `<li><a href="${post.url}">${post.title}</a><span>${detail}</span></li>`;
      })
      .join("");
  }

  fetch("/search.json")
    .then(response => response.json())
    .then(posts => {
      input.addEventListener("input", () => {
        const query = input.value.trim().toLowerCase();

        if (!query) {
          results.innerHTML = "<li>Start typing to search thoughts.</li>";
          return;
        }

        renderResults(
          posts.filter(post => {
            return [post.title, post.description, post.theme, post.content]
              .join(" ")
              .toLowerCase()
              .includes(query);
          })
        );
      });
    });
}

if (themeButtons.length && thoughtItems.length) {
  let activeTheme = "all";

  function applyThemeFilter() {
    thoughtItems.forEach(item => {
      const itemTheme = item.dataset.theme || "";
      item.hidden = activeTheme !== "all" && itemTheme !== activeTheme;
    });
  }

  themeButtons.forEach(button => {
    button.addEventListener("click", () => {
      activeTheme = button.dataset.theme || "all";
      themeButtons.forEach(btn => btn.classList.toggle("is-active", btn === button));
      applyThemeFilter();
    });
  });

  applyThemeFilter();
}
