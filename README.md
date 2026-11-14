# ama-site

Live question board for Convex founder AMAs. People drop questions before and during the stream, upvote the ones they want answered, and the host works the list from the top.

Live at [intent-kingfisher-185.convex.site](https://intent-kingfisher-185.convex.site/).

The whole thing runs on one Convex deployment: database, backend functions, auth, and the static site itself. No separate frontend host.

## What it does

- Browse active events on the homepage
- Ask a question (249 characters max). Asking needs an account.
- Upvote questions without signing in. Votes are tracked per browser session, one per question.
- Search an event's questions
- Comment on a question. Signed-out visitors add a name with it.

Updates show up live, since every list is a Convex query.

## Stack

| Part | What |
|---|---|
| Frontend | React 19, Vite, Tailwind, React Router |
| Backend | [Convex](https://convex.dev) queries and mutations in `convex/` |
| Auth | [Convex Auth v2](https://docs.convex.dev/auth/convex-auth), username and password |
| Hosting | [`@convex-dev/static-hosting`](https://www.convex.dev/components/static-hosting) |

Convex Auth v2 keeps usernames and password hashes in its own components, so the app's `users` table only holds an optional `isAdmin` flag. There are no JWT keys to set: the deployment signs its own tokens.

## Run it locally

Needs Node 22 or newer.

```sh
npm install
npx convex dev    # log in, pick a team, create or link a project
npx convex env set ADMIN_USERNAMES "your-username"
npm run dev       # Vite plus convex dev, side by side
```

`npx convex dev` writes the deployment URL to `.env.local`. Sign up in the app with the username you put in `ADMIN_USERNAMES` and the Admin link shows up in the header.

## Admins

A user is an admin when either is true:

- their username is in the `ADMIN_USERNAMES` env var (comma-separated, case-insensitive)
- their row in the `users` table has `isAdmin: true`, set by hand in the Convex dashboard

Env vars are per deployment. Set `ADMIN_USERNAMES` on production too:

```sh
npx convex env set ADMIN_USERNAMES "your-username" --prod
```

Claim the admin username on a new deployment before you share the link. Whoever registers it first gets admin.

## Deploy

```sh
npx convex deploy --yes
npx @convex-dev/static-hosting upload --build --prod
```

The first command pushes the backend to production. The second builds the site against the production URL and uploads it. `npm run deploy` does both in one go, but it stops at a confirm prompt, so it only works in an interactive terminal.

The static-hosting component owns `/` on the `.convex.site` URL and serves React Router pages with an `index.html` fallback. Any HTTP routes you add in `convex/http.ts` live under `/api`.

`npm run deploy:dev` uploads a full build to the dev deployment for a quick check. Between checks, the dev URL is parked: `/` shows a page that links to production and every other path returns 404.

## Project layout

```
convex/
  auth.ts             Convex Auth v2 setup and the loggedInUser query
  users.ts            createUser callback and the admin check
  functions.ts        events, questions, votes, comments, admin actions
  schema.ts           app tables
  convex.config.ts    auth, password, username, and static-hosting components
src/
  pages/              Home, Event, Admin, Admin event, Sign in
  SignInForm.tsx      sign in and sign up form
design/
  og-preview.html     source for the link preview card
public/               favicons and og-preview.png
```

## Link preview card

`public/og-preview.png` is a screenshot of `design/og-preview.html` at 1200 by 630. To change it, edit the HTML and render it again:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --window-size=1200,630 --virtual-time-budget=5000 \
  --screenshot=public/og-preview.png "file://$PWD/design/og-preview.html"
```

Then bump the `?v=` on the image URLs in `index.html`. X caches cards by URL and keeps showing the old one otherwise. Those URLs are absolute and point at the production site, so change them if you move to a custom domain.
