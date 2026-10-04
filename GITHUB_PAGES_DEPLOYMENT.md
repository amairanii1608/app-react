# Dependency reinstall and GitHub Pages deployment

This guide explains how to restore the exact npm dependency set and publish the NYSL app from this directory to GitHub Pages. GitHub Pages serves the built frontend; Firebase Authentication and Realtime Database plus Cloudinary continue to provide sign-in, private records, and photo storage.

## Reinstall dependencies

Use Node.js 22 for the cleanest install and Firebase CLI compatibility. Node.js 20 can build the frontend, but may print engine warnings for current CLI dependencies. From this directory, run:

```sh
npm ci
npm run start
```

`npm ci` recreates `node_modules` from `package-lock.json`, so it is the right command after a failed install or when checking out a fresh copy. Keep `package-lock.json`; deleting it would make npm resolve a different dependency tree. Stop the development server before reinstalling. If a synced folder reports a permissions error, close editors and terminals that may hold files open, remove the generated `node_modules` folder, then run `npm ci` again.

The full npm audit currently reports advisories in the Firebase command-line tool’s development dependency tree; the production dependency audit (`npm audit --omit=dev`) is clean. Check `npm audit` for current counts because advisories change over time. Avoid `npm audit fix --force`: its suggested CLI downgrade produced a worse audit result in a clean install test.

To verify the production build locally:

```sh
npm run build
npm run preview
```

The local preview is available at the address Vite prints, usually `http://localhost:4173`.

## Prepare the GitHub repository

Create or choose a repository and put the contents of this `Entregable` directory at the repository root. That includes `package.json`, `package-lock.json`, `src/`, `public/`, and `.github/workflows/deploy-pages.yml`. Do not upload `node_modules`, `dist`, or `.env.local`; `.gitignore` excludes them.

The included workflow builds the app and publishes `dist` on each push to `main`, and can also be run manually from the repository’s **Actions** tab. If the default branch has another name, change `main` in the workflow before pushing.

In GitHub, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. The workflow requests the minimum Pages deployment permissions and publishes its built artifact through GitHub’s Pages actions. GitHub documents this workflow-based publishing process and the required deployment permissions in its [Pages publishing guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and the [`deploy-pages` action](https://github.com/actions/deploy-pages).

## Configure the app services

In the repository, open **Settings → Secrets and variables → Actions → Variables** and add these client configuration values. The workflow passes them into Vite at build time:

| Variable | Value source |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase project web app config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase project web app config |
| `VITE_FIREBASE_DATABASE_URL` | Realtime Database URL |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project web app config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase project web app config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase project web app config |
| `VITE_FIREBASE_APP_ID` | Firebase project web app config |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary account |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary unsigned upload preset |

These `VITE_` values are included in the public JavaScript bundle; GitHub Variables keep them out of source control, but do not make them secret from site visitors. Never put Firebase service-account keys, private API tokens, or other server credentials in `VITE_` variables. Keep Firebase Realtime Database rules enabled to authorize data access, and restrict the Cloudinary unsigned preset to the image formats and upload limits the app needs.

In Firebase Authentication, enable Google sign-in and add the GitHub Pages hostname (for example, `owner.github.io`) under **Authorized domains**. Use the hostname only; the repository path is not part of the authorized domain. Deploy the database rules from this project separately with `npx firebase deploy --only database` after selecting the correct Firebase project.

## Publish and check the result

Commit and push the repository. Open **Actions**, select **Deploy GitHub Pages**, and wait for both the build and deploy jobs to finish. The deployed address appears in the `github-pages` environment and in **Settings → Pages**.

The workflow reads GitHub’s Pages base path when it builds. This supports both a project site such as `https://owner.github.io/repository/` and an account site such as `https://owner.github.io/`. It also writes `dist/404.html` from the built app so React Router routes continue to render when a visitor opens or refreshes a nested link.

GitHub Pages only hosts static files. The workflow does not deploy Firebase rules or create Firebase/Cloudinary projects; those services must already be configured. Firebase Hosting remains available as the alternative configured in `firebase.json` and uses the existing `npm run build` and Firebase deploy instructions in `README.md`.
