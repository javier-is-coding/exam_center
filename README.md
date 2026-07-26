[README.md](https://github.com/user-attachments/files/30384797/README.md)
# Exam Command Center

A local offline study dashboard for Form 1 exam preparation.

## What is included

- Dashboard with today's tasks, exam countdown, weekly progress, streak, reviews, and motivation.
- Study planner with today and week views.
- Smart task generator that mixes hard and easy subjects.
- Subject tracker with confidence, difficulty, progress, weak topics, and revision dates.
- Chapter tracker with Not Started, Learning, Reviewing, and Mastered states.
- Spaced repetition review scheduling.
- Mistake log that feeds weak topics and review dates.
- Flashcards with confidence ratings and harder-card repetition.
- Simple analytics.
- Calendar export using `.ics`.
- Permanent offline storage with browser LocalStorage.

## How to run

Open `index.html` in a browser.

No installation, build step, account, or internet connection is required.

## How data is saved

Your data is stored in the same browser on the same computer using LocalStorage. Use **Export data** before changing browsers or resetting the app.

## Recommended daily flow

1. Open the dashboard.
2. Press **Generate today** if there are no tasks.
3. Complete the first task shown in **Right now**.
4. Log mistakes after practice.
5. Review due chapters or flashcards.
6. Stop when today's plan is complete.

## Calendar integration

The app cannot directly edit Apple Calendar, Google Calendar, or Outlook while staying fully offline and browser-only. Use **Download calendar file** in Settings, then import the `.ics` file into your calendar app.
