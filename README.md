# Rahmat Eka - Portfolio Website

An interactive Swiss Editorial portfolio website built using Next.js, GSAP, Tailwind CSS, Prisma, and PostgreSQL fallback database structure. Featuring infinite seamless vertical scrolling, brutalist typography grid designs, custom transition effects, and a simple administrative CMS.

## Features

- **Infinite Scrolling Canvas:** Seamless, looped vertical scroll layout.
- **Brutalist UI Aesthetics:** Stark grids, high contrast, clean font styles.
- **Entrance Block Reveal Animation:** Staggered black blocks sliding up and down to reveal image media in a grid.
- **Interactive FLIP Animations:** Images scale and fly smoothly from the grids to the detail preview pane using GSAP.
- **Smart Mix-Blend Navbar:** Smart color inversion (`mix-blend-difference`) for header elements so navbar text remains fully legible regardless of overlapping card elements or color tones behind them.
- **Built-in Administrative CMS:** Full CRUD suite for managing portfolio listings (adding, modifying, deleting database projects) and cover photo uploads.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Animation:** GSAP (GreenSock Animation Platform)
- **Database:** Prisma ORM (fallback to local `database.json`)
- **Language:** TypeScript

## Getting Started

1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables in `.env` (like `DATABASE_URL` if using Prisma).
4. Build the project:
   ```bash
   npm run build
   ```
5. Run locally:
   ```bash
   npm run dev
   ```

## License

MIT License.
