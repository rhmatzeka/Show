# PROJECT PLAN: BRUTALIST SWISS EDITORIAL PORTFOLIO

This document outlines the detailed architecture, tech stack, design specifications, and implementation steps for building the interactive, high-contrast brutalist editorial portfolio website inspired by Swiss graphic design and `briganti.works`.

---

## 1. Core Architecture & Tech Stack

We will build this project as a modern, high-performance web application utilizing:

*   **Frontend Framework:** **Next.js 14+ (App Router)** with React for routing, Server Component performance, and layout management.
*   **Styling:** **Tailwind CSS** for rapid brutalist styling (high-contrast grid lines, strict typographic hierarchy, responsive viewport controls).
*   **Animation Engine:** **GSAP (GreenSock)** with:
    *   `Draggable` + `InertiaPlugin` (or custom physics) for the infinite 360-degree panning canvas.
    *   `Flip` plugin for the layout transition (flying clicked image from grid coordinates to the detail view).
    *   `ScrollTrigger` / `Observer` for scroll-linked animations and sidebar typography synchronization.
*   **Database & ORM:** **Prisma** with **SQLite** (file-based database) for seamless zero-config local storage. It can easily switch to PostgreSQL/Supabase for production.
*   **Authentication:** Custom lightweight JWT/Cookie-based session gate for the Admin panel (no external complex auth setups needed).
*   **Media Storage:** Local file system upload (stored in `public/uploads/`) with automated fallback placeholders.

---

## 2. Design System & Typography

To replicate the striking Swiss Brutalist aesthetic, the design will adhere to:

### Color Palette
*   **Background:** Stark White (`#FFFFFF` / `bg-white`)
*   **Typography / Borders / Accents:** Deep Black (`#000000` / `text-black`, `border-black`)
*   **Faded / Overlay Background:** High-contrast washed overlay (e.g., `#F4F4F4` or `#EFEFEF` with slight opacity) for the detail panel layout.

### Typography
*   **Display Titles (Heavy & Compressed):** 
    *   *Primary:* Custom font files if provided, OR fallback to Google Fonts **"Syne" (ExtraBold/900)** or **"Impact"** styled with `tracking-tighter uppercase font-black stretch-compressed`.
*   **Body & Navigational Elements:** 
    *   *Primary:* **"Space Grotesk"** or **"Inter"** (clean, crisp Swiss-style sans-serif) for high legibility in small size blocks.
*   **Borders:** Clean, solid 1px or 2px black lines (`border border-black` / `divide-y divide-black`) representing strict grid structures.

---

## 3. Layout & User Experience (UX)

### Desktop View
1.  **Fixed Left Sidebar:** Giant vertical bold compressed typography spelling "BRIGANTI" (or custom text) running vertically down the left edge. The letters rotate or slide down dynamically in sync with the horizontal/vertical panning velocity.
2.  **Top Header Bar:** Minimalist horizontal header displaying "Selection" on the left and navigation menu ("Home", "Info", "Work") on the right.
3.  **Infinite 360-Degree Canvas:** A grid container that can be clicked-and-dragged in any direction. The canvas loops/repeats project cards as you pan, using inertia physics so it glides to a stop smoothly when released.
4.  **Portfolio Cards:** Asymmetrical masonry placement. Hovering triggers a smooth black mask overlay that slides or fades to reveal project details (version number, tags, title).

### Mobile View
1.  **Sticky Bottom Marquee:** The vertical sidebar transforms into a fixed bottom marquee banner displaying "BRIGANTI". It slides horizontally, with its velocity matching the user's touch swipe speed.
2.  **Touch Canvas:** Multi-directional touch-and-drag panning remains active, allowing users to navigate the masonry grid freely on mobile viewports instead of collapsing into a single vertical column.

### Project Detail Transition (The Click Interaction)
1.  **Initiation:** Clicking a portfolio card pauses the canvas physics.
2.  **FLIP Transition (GSAP):**
    *   The clicked image's bounding box is calculated.
    *   A white/light-grey backdrop layer fades in, washing out the main canvas.
    *   The clicked image smoothly "flies" and resizes from its grid coordinate to the right side of the detail layout.
    *   The browser URL updates to `/work/[slug]` without a full page reload (using Next.js shallow routing/intercepting routes).
3.  **Detail Panel (Left Side):**
    *   Title, Category, and Year fade in.
    *   Description text block, call-to-action link, and slide count (e.g. "1/8") slide up.
    *   Navigation controllers (Left, Right, and Close `X` buttons) fade in.
4.  **Closing:** Clicking the `X` button reverse-animates the image back to its exact grid coordinate and fades out the detail panel, restoring infinite panning.

---

## 4. Database Schema (Prisma / SQLite)

We will define the following models:

```prisma
model Project {
  id          String   @id @default(uuid())
  title       String
  slug        String   @unique
  category    String
  year        String
  description String
  projectUrl  String?
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  images      Image[]
}

model Image {
  id        String   @id @default(uuid())
  url       String
  isCover   Boolean  @default(false)
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model Admin {
  id       String @id @default(uuid())
  username String @unique
  password String // Hashed
}
```

---

## 5. Implementation Roadmap

### Step 1: Initialization & Configurations
*   Scaffold the Next.js project with Tailwind CSS, TypeScript, and Prisma.
*   Setup font pairings using Next.js `next/font/google` for "Syne" and "Space Grotesk".
*   Create directory structure and initialize Prisma SQLite database.

### Step 2: Database Setup & Seed Data
*   Run Prisma migrations.
*   Write a seeding script to populate the database with default projects (Rampant Studio, AB Arca, Coleção, Einstoffen, etc.) and cover images.
*   Setup local media directory `/public/uploads`.

### Step 3: Admin CMS Panel & Auth
*   Build the Admin Login Page (`/admin/login`).
*   Build the Admin Dashboard (`/admin/dashboard`):
    *   Form to add/edit projects (input text, multi-file image uploader).
    *   Project list with delete and sort controls.
*   Create Next.js API Routes for authentication (`/api/auth`) and project management (`/api/projects`).

### Step 4: Infinite 360-Degree Panning Canvas
*   Develop the Canvas grid container populated with projects fetched from the database.
*   Implement multi-directional click-and-drag panning.
*   Build the infinite wrapping logic: when a card pans out of viewport bounds, it recalculates its coordinate to wrap around to the opposite side.
*   Integrate inertia friction decay so dragging feels organic and premium.

### Step 5: Header, Sidebar, & Hover Effects
*   Implement the fixed header.
*   Build the dynamic vertical sidebar (Desktop) that rotates/scrolls letters in sync with canvas position, and the horizontal sticky marquee (Mobile).
*   Add hover transitions on masonry cards (high-contrast brutalist black mask overlay).

### Step 6: Detailed Transition Animation (GSAP Flip)
*   Develop the page interceptor/modal layout for project detail.
*   Apply GSAP Flip to animate the card image from its canvas state to the detail state.
*   Fade in project details (meta-data, description) and navigation arrows.
*   Build navigation logic (swapping to next/previous project images smoothly).

### Step 7: Testing, Responsive Optimization & Final Polish
*   Ensure smooth 60fps scrolling and touch velocity calculations on iOS and Android browsers.
*   Add build-time optimizations and run linter check commands.

---

## 6. Verification Plan
*   **Verification Command:** `npm run build` to verify there are no TypeScript or compilation errors.
*   **Visual Check:** Ensure high-contrast colors match `#FFFFFF` and `#000000` exactly.
*   **Interaction Check:** Ensure click transitions run without stuttering.
