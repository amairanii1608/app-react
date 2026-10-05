# NYSL Family Soccer App

A responsive Northside Youth Soccer League site for schedules, game venues, league information, player registration, messages, and photos.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env.local` and add the Firebase and Cloudinary values for your project.
3. Install dependencies with `npm ci`.
4. Start the development server with `npm run start` and open the local URL printed by Vite.

The app uses Firebase Authentication with Google, Firebase Realtime Database, and Cloudinary unsigned image uploads. Photo posting stays unavailable until Cloudinary is configured.

For dependency recovery and GitHub Pages hosting, follow [Dependency reinstall and GitHub Pages deployment](./GITHUB_PAGES_DEPLOYMENT.md).

## Firebase setup

Enable Google as a sign-in provider and add the development and production hostnames to Firebase Authentication’s authorized domains. Deploy database rules and Hosting with:

```sh
npx firebase login
npx firebase use --add
npm ci
npm run build
npx firebase deploy --only database,hosting
```

Registration records are written to `registrations/{userId}/{registrationId}`. Database rules allow a signed-in account to create and read only its own records. Authorized league administrators can review records in Firebase Console.

## Environment variables

See `.env.example` for the Firebase keys and Cloudinary upload preset. Do not commit a populated `.env.local` file.
