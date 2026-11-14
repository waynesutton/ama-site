# ama-site
  
This is a project built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.
 You can find docs about Chef with useful information like how to deploy to production [here](https://docs.convex.dev/chef).
  
## First run on a new Convex team

```sh
npm install
npx convex dev   # log in, pick the team, create a new project
npx convex env set ADMIN_USERNAMES "your-username"
npm run dev
```

`npx convex dev` writes `.env.local` with the new deployment. The old Chef deployment pointer is saved in `.env.local.chef-backup`.

## Project structure
  
The frontend code is in the `app` directory and is built with [Vite](https://vitejs.dev/).
  
The backend code is in the `convex` directory.
  
`npm run dev` will start the frontend and backend servers.

## App authentication

The app uses [Convex Auth v2](https://docs.convex.dev/auth/convex-auth) with username and password sign-in. Usernames and password hashes live in the auth components, not in app tables. There are no signing keys to configure.

Admins are users whose username is listed in the `ADMIN_USERNAMES` env var (comma-separated), or whose `users` row has `isAdmin: true` (set it in the dashboard).

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve you app further

## Hosting

The frontend is served by [`@convex-dev/static-hosting`](https://www.convex.dev/components/static-hosting) from the deployment's `.convex.site` URL. The component owns `/`; any app HTTP routes you add in `convex/http.ts` are served under `/api`.

```sh
npm run deploy:dev   # build and upload to the dev deployment for a smoke test
npm run deploy       # deploy backend + upload the site to production
```

Keep using `npm run dev` for day-to-day work. Static files in `public/` (favicons, `og-preview.png`) are served from the root. Production lives at https://intent-kingfisher-185.convex.site, and the `og:` and `twitter:` image tags in `index.html` point there with absolute URLs, which X needs for the preview card. Update them if you add a custom domain.

The preview card source is `design/og-preview.html`. To re-render it:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --window-size=1200,630 --virtual-time-budget=5000 \
  --screenshot=public/og-preview.png "file://$PWD/design/og-preview.html"
```

Bump the `?v=` on the image URLs in `index.html` after changing it, since X caches cards by URL.

The dev deployment's `.convex.site` URL is parked: `/` shows a "Nothing here" page linking to production, and every other path returns 404. Running `npm run deploy:dev` publishes the full app there again.
