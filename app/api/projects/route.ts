import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getProjects, createProject, deleteProject, updateProject } from "@/lib/db";
import fs from "fs";
import path from "path";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-brutalist-key-change-me";

// Verify admin helper
function verifyAdmin(request: NextRequest): boolean {
  const tokenCookie = request.cookies.get("admin_token");
  if (!tokenCookie) return false;
  try {
    const decoded = jwt.verify(tokenCookie.value, JWT_SECRET);
    return !!(decoded && typeof decoded === "object" && decoded.username === "matsganz@gmail.com");
  } catch (err) {
    return false;
  }
}

export async function GET() {
  try {
    const projects = await getProjects();
    return NextResponse.json({ projects });
  } catch (err) {
    console.error("Failed to get projects:", err);
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    
    let title = "";
    let category = "";
    let year = "";
    let description = "";
    let projectUrl = "";
    let imageUrl = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      title = formData.get("title") as string || "";
      category = formData.get("category") as string || "";
      year = formData.get("year") as string || "";
      description = formData.get("description") as string || "";
      projectUrl = formData.get("projectUrl") as string || "";
      
      const directUrl = formData.get("imageUrl") as string || "";
      const file = formData.get("imageFile") as File | null;

      if (file && file.size > 0) {
        try {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const base64Data = buffer.toString("base64");
          const mimeType = file.type || "image/jpeg";
          imageUrl = `data:${mimeType};base64,${base64Data}`;
        } catch (uploadError) {
          console.error("Base64 conversion failed:", uploadError);
          return NextResponse.json({ 
            error: "Failed to process uploaded file." 
          }, { status: 400 });
        }
      } else {
        imageUrl = directUrl;
      }
    } else {
      const body = await request.json();
      title = body.title || "";
      category = body.category || "";
      year = body.year || "";
      description = body.description || "";
      projectUrl = body.projectUrl || "";
      imageUrl = body.imageUrl || "";
    }

    if (!title || !category || !year || !description || !imageUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    
    // Load projects to calculate sortOrder
    const projects = await getProjects();
    const sortOrder = projects.length > 0 ? Math.max(...projects.map(p => p.sortOrder)) + 1 : 1;

    const newProject = await createProject({
      title,
      slug,
      category,
      year,
      description,
      projectUrl: projectUrl || null,
      sortOrder,
      images: [
        {
          id: `img-${Date.now()}`,
          url: imageUrl,
          isCover: true
        }
      ]
    });

    return NextResponse.json({ success: true, project: newProject });
  } catch (err) {
    console.error("Failed to create project:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    
    let id = "";
    let title = "";
    let category = "";
    let year = "";
    let description = "";
    let projectUrl = "";
    let imageUrl = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      id = formData.get("id") as string || "";
      title = formData.get("title") as string || "";
      category = formData.get("category") as string || "";
      year = formData.get("year") as string || "";
      description = formData.get("description") as string || "";
      projectUrl = formData.get("projectUrl") as string || "";
      
      const directUrl = formData.get("imageUrl") as string || "";
      const file = formData.get("imageFile") as File | null;

      if (file && file.size > 0) {
        try {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const base64Data = buffer.toString("base64");
          const mimeType = file.type || "image/jpeg";
          imageUrl = `data:${mimeType};base64,${base64Data}`;
        } catch (uploadError) {
          console.error("Base64 conversion failed:", uploadError);
          return NextResponse.json({ error: "Failed to process uploaded file." }, { status: 400 });
        }
      } else {
        imageUrl = directUrl;
      }
    } else {
      const body = await request.json();
      id = body.id || "";
      title = body.title || "";
      category = body.category || "";
      year = body.year || "";
      description = body.description || "";
      projectUrl = body.projectUrl || "";
      imageUrl = body.imageUrl || "";
    }

    if (!id || !title || !category || !year || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const updateData: any = {
      title,
      slug,
      category,
      year,
      description,
      projectUrl: projectUrl || null,
    };

    if (imageUrl) {
      updateData.images = [
        {
          id: `img-${Date.now()}`,
          url: imageUrl,
          isCover: true
        }
      ];
    }

    const updated = await updateProject(id, updateData);

    if (updated) {
      return NextResponse.json({ success: true, project: updated });
    }
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  } catch (err) {
    console.error("Failed to update project:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing project ID" }, { status: 400 });
    }

    const success = await deleteProject(id);
    if (success) {
      return NextResponse.json({ success: true, message: "Project deleted successfully" });
    }
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  } catch (err) {
    console.error("Failed to delete project:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
