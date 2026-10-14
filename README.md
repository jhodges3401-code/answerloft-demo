# Answerloft

Self-hosted help center / knowledge base. Static files, free hosting on GitHub Pages, instant client-side search, Markdown articles, categories, related articles, and an `llms.txt` index for AI assistants. An independent alternative to subscription knowledge base tools; not affiliated with any of them.

## Setup (10 minutes)
1. Use this template, then Settings → Pages → Source: **GitHub Actions**.
2. Edit `articles.json` (title, category, tags, order, updated, body in Markdown, `draft: true` to hide).
3. Edit the header/brand in `index.html` (remove the buy button).
4. Commit. Tests run, then the site deploys. Custom domain: Settings → Pages.

Edit in GitHub's web editor, so every editor on your team is free. Tests: `npm test`.
