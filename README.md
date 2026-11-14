# CoverTrack - School of Computing QA Tracking System

React + Vite app that replaces the QA Excel workbook: enter or import course coverage reports (lecture and lab),
calculate performance rate and status automatically, and view dashboards and course reports.

## Run locally
    npm install
    npm run dev          # http://localhost:5173
    npm run build        # production files in /dist

## Deploy (free)
Vercel or Netlify: push this folder to GitHub, import the repository, build command `npm run build`, output folder `dist`.
Any static host works (vite base is "./").

## Notes
- Data is stored in each user's browser (localStorage). Teams share data by exporting/importing the Excel files.
- Edit `src/config.js` for departments, status bands and the lecture/lab weight.
