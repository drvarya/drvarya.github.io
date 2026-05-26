const input = document.querySelector("#search-input");
const results = document.querySelector("#search-results");

function renderResults(posts) {
  if (!posts.length) {
    results.innerHTML = "<li>No matching posts.</li>";
    return;
  }

  results.innerHTML = posts
    .map(post => {
      const detail = [post.date, post.description].filter(Boolean).join(" · ");
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
        results.innerHTML = "<li>Start typing to search posts.</li>";
        return;
      }

      renderResults(
        posts.filter(post => {
          return [post.title, post.description, post.content]
            .join(" ")
            .toLowerCase()
            .includes(query);
        })
      );
    });
  });
