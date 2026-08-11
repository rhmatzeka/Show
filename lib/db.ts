import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// Initialize Prisma
let prisma: PrismaClient | null = null;
const isPrismaEnabled = !!process.env.DATABASE_URL;

if (isPrismaEnabled) {
  if (process.env.NODE_ENV === "production") {
    prisma = new PrismaClient();
  } else {
    // Avoid multiple instances in dev
    const globalWithPrisma = global as typeof globalThis & {
      prisma?: PrismaClient;
    };
    if (!globalWithPrisma.prisma) {
      globalWithPrisma.prisma = new PrismaClient();
    }
    prisma = globalWithPrisma.prisma;
  }
}

// JSON file fallback path
const JSON_DB_PATH = path.join(process.cwd(), "database.json");

export interface ProjectData {
  id: string;
  title: string;
  slug: string;
  category: string;
  year: string;
  description: string;
  projectUrl?: string | null;
  sortOrder: number;
  createdAt?: string;
  images: { id: string; url: string; isCover: boolean }[];
}

export interface AdminData {
  id: string;
  username: string;
  passwordHash: string; // bcrypt hash
}

// Initial seed data for fallback
const DEFAULT_PROJECTS: ProjectData[] = [
  {
    id: "1",
    title: "Rampant Studio",
    slug: "rampant-studio",
    category: "Identity, Graphic Design",
    year: "2024",
    description: "Rampant is a creative bureau specializing in creative direction, brand development, and digital design for brands in fashion and lifestyle. The studio helps up-and-coming brands find their voice and assist established ones in discovering a renewed way of expression.",
    projectUrl: "https://rampant.work",
    sortOrder: 1,
    images: [
      { id: "img-1a", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80", isCover: true }
    ]
  },
  {
    id: "2",
    title: "AB Arca",
    slug: "ab-arca",
    category: "Type Design",
    year: "2024",
    description: "Arca is a modular typeface rooted in mid-century geometric explorations from the 50s and 60s. Its precisely squared letterforms come in lowercase, unicase, and uppercase variations, offering systematic typographic control. Built on a strict grid system, the font includes alternative glyphs that introduce subtle variations to headlines and logotypes. With extensive diacritic support spanning multiple languages, Arca commands attention at large scales—a typeface that honors historical grid-based design while functioning as a distinctive display option.",
    projectUrl: "https://briganti.works/work/ab-arca",
    sortOrder: 2,
    images: [
      { id: "img-2a", url: "https://images.unsplash.com/photo-1548345680-f5475ea5df84?auto=format&fit=crop&w=800&q=80", isCover: true }
    ]
  },
  {
    id: "3",
    title: "Coleção",
    slug: "colecao",
    category: "Editorial Design, Visual Identity",
    year: "2025",
    description: "A printed catalog showcasing architectural landmarks and editorial design structures in Porto. The layout strictly adheres to Swiss grid principles, using high-density typography and high-contrast photography to create an immersive visual rhythm.",
    projectUrl: null,
    sortOrder: 3,
    images: [
      { id: "img-3a", url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80", isCover: true }
    ]
  },
  {
    id: "4",
    title: "Einstoffen",
    slug: "einstoffen",
    category: "Art Direction, Packaging",
    year: "2024",
    description: "Visual identity and packaging series for Einstoffen's winter collection. Highlighting the textured surfaces of raw mountain rock combined with minimal typography elements, expressing Swiss alpine aesthetics in a contemporary lifestyle context.",
    projectUrl: "https://einstoffen.ch",
    sortOrder: 4,
    images: [
      { id: "img-4a", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80", isCover: true }
    ]
  },
  {
    id: "5",
    title: "The Tragedy of Macbeth",
    slug: "macbeth",
    category: "Poster Campaign, Typography",
    year: "2023",
    description: "Brutalist typographic poster campaign for the National Theater production of William Shakespeare's Macbeth. Built with heavy compressed display types colliding with crisp informational blocks.",
    projectUrl: null,
    sortOrder: 5,
    images: [
      { id: "img-5a", url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80", isCover: true }
    ]
  },
  {
    id: "6",
    title: "Brand Identity MM26",
    slug: "brand-identity-mm26",
    category: "Brand Identity, Typography",
    year: "2026",
    description: "Comprehensive corporate identity redesign including custom corporate typefaces, editorial styleguides, and packaging accents, emphasizing high-contrast stark geometry.",
    projectUrl: null,
    sortOrder: 6,
    images: [
      { id: "img-6a", url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80", isCover: true }
    ]
  }
];

// Default hashed admin: "admin" / "admin123"
const DEFAULT_ADMIN: AdminData = {
  id: "admin-1",
  username: "admin",
  passwordHash: "$2a$10$9s6/G.7gW5n7c.9mF6k3eeR30k/6.u0f8fH3dG5Z78mKq1Q/yWcOi" // bcrypt for admin123
};

function readJsonDb(): { projects: ProjectData[]; admins: AdminData[] } {
  try {
    if (fs.existsSync(JSON_DB_PATH)) {
      const data = fs.readFileSync(JSON_DB_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to read JSON DB:", err);
  }
  
  // Create default db
  const initialData = { projects: DEFAULT_PROJECTS, admins: [DEFAULT_ADMIN] };
  writeJsonDb(initialData);
  return initialData;
}

function writeJsonDb(data: { projects: ProjectData[]; admins: AdminData[] }) {
  try {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write JSON DB:", err);
  }
}

// Database helper operations
export async function getProjects(): Promise<ProjectData[]> {
  if (prisma && isPrismaEnabled) {
    try {
      const dbProjects = await prisma.project.findMany({
        orderBy: { sortOrder: "asc" },
        include: { images: true }
      });
      return dbProjects.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        category: p.category,
        year: p.year,
        description: p.description,
        projectUrl: p.projectUrl,
        sortOrder: p.sortOrder,
        createdAt: p.createdAt.toISOString(),
        images: p.images.map(img => ({ id: img.id, url: img.url, isCover: img.isCover }))
      }));
    } catch (err) {
      console.warn("Prisma failed, falling back to JSON db", err);
    }
  }

  return readJsonDb().projects.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getProjectBySlug(slug: string): Promise<ProjectData | null> {
  if (prisma && isPrismaEnabled) {
    try {
      const p = await prisma.project.findUnique({
        where: { slug },
        include: { images: true }
      });
      if (p) {
        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          category: p.category,
          year: p.year,
          description: p.description,
          projectUrl: p.projectUrl,
          sortOrder: p.sortOrder,
          createdAt: p.createdAt.toISOString(),
          images: p.images.map(img => ({ id: img.id, url: img.url, isCover: img.isCover }))
        };
      }
      return null;
    } catch (err) {
      console.warn("Prisma failed, falling back to JSON db", err);
    }
  }

  const projects = readJsonDb().projects;
  return projects.find(p => p.slug === slug) || null;
}

export async function createProject(data: Omit<ProjectData, "id">): Promise<ProjectData> {
  if (prisma && isPrismaEnabled) {
    try {
      const newProj = await prisma.project.create({
        data: {
          title: data.title,
          slug: data.slug,
          category: data.category,
          year: data.year,
          description: data.description,
          projectUrl: data.projectUrl,
          sortOrder: data.sortOrder,
          images: {
            create: data.images.map(img => ({
              url: img.url,
              isCover: img.isCover
            }))
          }
        },
        include: { images: true }
      });
      return {
        id: newProj.id,
        title: newProj.title,
        slug: newProj.slug,
        category: newProj.category,
        year: newProj.year,
        description: newProj.description,
        projectUrl: newProj.projectUrl,
        sortOrder: newProj.sortOrder,
        images: newProj.images.map(img => ({ id: img.id, url: img.url, isCover: img.isCover }))
      };
    } catch (err) {
      console.error("Prisma create failed, writing to JSON DB", err);
    }
  }

  const db = readJsonDb();
  const newProject: ProjectData = {
    ...data,
    id: `project-${Date.now()}`
  };
  db.projects.push(newProject);
  writeJsonDb(db);
  return newProject;
}

export async function deleteProject(id: string): Promise<boolean> {
  if (prisma && isPrismaEnabled) {
    try {
      await prisma.project.delete({
        where: { id }
      });
      return true;
    } catch (err) {
      console.error("Prisma delete failed, using JSON DB", err);
    }
  }

  const db = readJsonDb();
  const initialLength = db.projects.length;
  db.projects = db.projects.filter(p => p.id !== id);
  writeJsonDb(db);
  return db.projects.length < initialLength;
}

export async function getAdminByUsername(username: string): Promise<AdminData | null> {
  if (prisma && isPrismaEnabled) {
    try {
      const admin = await prisma.admin.findUnique({
        where: { username }
      });
      if (admin) {
        return {
          id: admin.id,
          username: admin.username,
          passwordHash: admin.password
        };
      }
      return null;
    } catch (err) {
      console.error("Prisma admin fetch failed, falling back to JSON DB", err);
    }
  }

  const db = readJsonDb();
  return db.admins.find(a => a.username === username) || null;
}
