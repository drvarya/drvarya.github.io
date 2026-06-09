# Dhruv Arya Site

Minimal personal site with an Eleventy thoughts archive.

## Edit

- Update `index.html` with real experience, links, email, and bio.
- Add Markdown thoughts in `posts/` with `theme` frontmatter for filtering.
- Adjust colors and spacing in `styles.css`.
- Run `npm run dev` to preview locally.
- Run `npm run build` to generate the static site into `_site/`.

## Publish on GitHub Pages

1. Install dependencies with `npm install`.
2. Build locally with `npm run build`.
3. Publish `_site/` to GitHub Pages.

You can publish manually, or use `npm run deploy` after configuring the repo.

## Use a Custom Domain

1. Add your domain in `Settings > Pages > Custom domain`.
2. Create a `CNAME` file in this repo containing only your domain, for example:

   ```text
   dhruvarya.com
   ```

3. Add the DNS records GitHub shows for your domain provider.
