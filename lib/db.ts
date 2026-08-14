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
    id: "symbol-card",
    title: "Symbol Logo",
    slug: "symbol-card",
    category: "Brand Identity & Visual Communication",
    year: "MM25.1.1",
    description: "The official brand symbol representing Rahmat's design practice.",
    projectUrl: null,
    sortOrder: 1,
    images: []
  },
  {
    id: "1",
    title: "Rampant Studio",
    slug: "rampant-studio",
    category: "Identity, Graphic Design",
    year: "2024",
    description: "Rampant is a creative bureau specializing in creative direction, brand development, and digital design for brands in fashion and lifestyle. The studio helps up-and-coming brands find their voice and assist established ones in discovering a renewed way of expression.",
    projectUrl: "https://rampant.work",
    sortOrder: 2,
    images: [
      { id: "img-1a", url: "https://assets.basehub.com/467cc7ea/473e69a044283cdd09f463dac8033a47/2024.ramp.id.01.01.png", isCover: true }
    ]
  },
  {
    id: "alphabet-card",
    title: "Alphabet Poster",
    slug: "alphabet-card",
    category: "Typography & Display",
    year: "014",
    description: "Rahmat Eka is a fullstack web3 developer and UI/UX designer, specializing in building decentralized applications, smart contracts, and high-fidelity brutalist interfaces.",
    projectUrl: null,
    sortOrder: 3,
    images: []
  },
  {
    id: "6",
    title: "Brand Identity MM26",
    slug: "brand-identity-mm26",
    category: "Brand Identity, Typography",
    year: "2026",
    description: "Comprehensive corporate identity redesign including custom corporate typefaces, editorial styleguides, and packaging accents, emphasizing high-contrast stark geometry.",
    projectUrl: null,
    sortOrder: 4,
    images: [
      { id: "img-6a", url: "https://assets.basehub.com/467cc7ea/3b56ce0cac898b8ff7117fc689587bce/2024.arca.td.02.08.png", isCover: true }
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
    sortOrder: 5,
    images: [
      { id: "img-4a", url: "https://assets.basehub.com/467cc7ea/5a5e07e6c32d228c14c6b3bbe4c28c3c/2023.eins.id.03.01.png", isCover: true }
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
    sortOrder: 6,
    images: [
      { id: "img-3a", url: "https://assets.basehub.com/467cc7ea/4d145209f988cda07cb493824527d52f/2024.seti.td.02.01.png", isCover: true }
    ]
  },
  {
    id: "2",
    title: "AB Arca",
    slug: "ab-arca",
    category: "Type Design",
    year: "2024",
    description: "Arca is a modular typeface rooted in mid-century geometric explorations from the 50s and 60s. Its precisely squared letterforms come in lowercase, unicase, and uppercase variations, offering systematic typographic control. Built on a strict grid system, the font includes alternative glyphs that introduce subtle variations to headlines and logotypes. With extensive diacritic support spanning multiple languages, Arca commands attention at large scales—a typeface that honors historical grid-based design while functioning as a distinctive display option.",
    projectUrl: "https://github.com/rhmatzeka",
    sortOrder: 7,
    images: [
      { id: "img-2a", url: "https://assets.basehub.com/467cc7ea/4d421afb9781e883ab8ae0d96cd7cdf2/2024.arca.td.02.04.png", isCover: true }
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
    sortOrder: 8,
    images: [
      { id: "img-5a", url: "https://assets.basehub.com/467cc7ea/08c83f0fd4a42b622e75b05be393cea7/2023.eins.id.03.08.png", isCover: true }
    ]
  }
];

// Default hashed admin: "matsganz@gmail.com" / "Rahmat123!"
const DEFAULT_ADMIN: AdminData = {
  id: "admin-1",
  username: "matsganz@gmail.com",
  passwordHash: "$2a$10$lqodWUHP/rThIHR15Cq.Len3Q2F5YVccZbo5Aw8gupMADRoEdS7Na" // bcrypt for Rahmat123!
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

export async function updateProject(id: string, data: Partial<Omit<ProjectData, "id">>): Promise<ProjectData | null> {
  if (prisma && isPrismaEnabled) {
    try {
      const updateData: any = {
        title: data.title,
        slug: data.slug,
        category: data.category,
        year: data.year,
        description: data.description,
        projectUrl: data.projectUrl,
        sortOrder: data.sortOrder,
      };

      // If new images are provided
      if (data.images && data.images.length > 0) {
        // Delete old images first
        await prisma.image.deleteMany({
          where: { projectId: id }
        });
        updateData.images = {
          create: data.images.map(img => ({
            url: img.url,
            isCover: img.isCover
          }))
        };
      }

      const updated = await prisma.project.update({
        where: { id },
        data: updateData,
        include: { images: true }
      });

      return {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        category: updated.category,
        year: updated.year,
        description: updated.description,
        projectUrl: updated.projectUrl,
        sortOrder: updated.sortOrder,
        images: updated.images.map(img => ({ id: img.id, url: img.url, isCover: img.isCover }))
      };
    } catch (err) {
      console.error("Prisma update failed, using JSON DB fallback", err);
    }
  }

  const db = readJsonDb();
  const projIndex = db.projects.findIndex(p => p.id === id);
  if (projIndex === -1) return null;

  const currentProj = db.projects[projIndex];
  const updatedProj: ProjectData = {
    ...currentProj,
    title: data.title !== undefined ? data.title : currentProj.title,
    slug: data.slug !== undefined ? data.slug : currentProj.slug,
    category: data.category !== undefined ? data.category : currentProj.category,
    year: data.year !== undefined ? data.year : currentProj.year,
    description: data.description !== undefined ? data.description : currentProj.description,
    projectUrl: data.projectUrl !== undefined ? data.projectUrl : currentProj.projectUrl,
    sortOrder: data.sortOrder !== undefined ? data.sortOrder : currentProj.sortOrder,
    images: data.images !== undefined ? data.images : currentProj.images
  };

  db.projects[projIndex] = updatedProj;
  writeJsonDb(db);
  return updatedProj;
}

export async function getAdminByUsername(username: string): Promise<AdminData | null> {
  if (prisma && isPrismaEnabled) {
    try {
      let admin = await prisma.admin.findUnique({
        where: { username }
      });
      
      // Auto-seed admin if database is connected but no admin user exists yet
      if (!admin && username === "matsganz@gmail.com") {
        try {
          admin = await prisma.admin.create({
            data: {
              username: "matsganz@gmail.com",
              password: "$2a$10$lqodWUHP/rThIHR15Cq.Len3Q2F5YVccZbo5Aw8gupMADRoEdS7Na" // bcrypt for Rahmat123!
            }
          });
        } catch (createErr) {
          console.error("Auto-seeding admin failed:", createErr);
        }
      }

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
