"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Edit, X as CloseIcon, LogOut, Globe, Folder, Calendar, Link, Image as ImageIcon } from "lucide-react";

interface ProjectImage {
  id: string;
  url: string;
  isCover: boolean;
}

interface Project {
  id: string;
  title: string;
  slug: string;
  category: string;
  year: string;
  description: string;
  projectUrl?: string | null;
  sortOrder: number;
  images: ProjectImage[];
}

export default function AdminDashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const router = useRouter();

  // Form states
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  
  // Image input options
  const [imageType, setImageType] = useState<"url" | "upload">("url");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Check auth
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/check");
        if (res.ok) {
          setAuthChecked(true);
          loadProjects();
        } else {
          router.push("/admin/login");
        }
      } catch (err) {
        router.push("/admin/login");
      }
    }
    checkAuth();
  }, [router]);

  // Load existing projects
  async function loadProjects() {
    try {
      setLoadingProjects(true);
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.projects) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoadingProjects(false);
    }
  }

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
    } catch (err) {
      console.error("Failed to logout:", err);
    }
  };

  // Start Editing a project
  const handleEditSelect = (project: Project) => {
    setEditingProject(project);
    setTitle(project.title);
    setCategory(project.category);
    setYear(project.year);
    setDescription(project.description);
    setProjectUrl(project.projectUrl || "");
    
    // Fill cover URL if exists
    const cover = project.images.find(img => img.isCover) || project.images[0];
    if (cover) {
      setImageUrl(cover.url);
      setImageType("url");
    } else {
      setImageUrl("");
    }
    
    setImageFile(null);
    setFormError("");
    setFormSuccess("");

    // Scroll smoothly to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingProject(null);
    setTitle("");
    setCategory("");
    setYear("");
    setDescription("");
    setProjectUrl("");
    setImageUrl("");
    setImageFile(null);
    setFormError("");
    setFormSuccess("");
  };

  // Submit project form (Add or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);

    if (!title || !category || !year || !description) {
      setFormError("Please fill out all required text fields.");
      setSubmitting(false);
      return;
    }

    // Cover image is optional when editing (keep old if not changed)
    if (!editingProject) {
      if (imageType === "url" && !imageUrl) {
        setFormError("Please provide an image URL.");
        setSubmitting(false);
        return;
      }
      if (imageType === "upload" && !imageFile) {
        setFormError("Please select an image file to upload.");
        setSubmitting(false);
        return;
      }
    }

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("category", category);
      formData.append("year", year);
      formData.append("description", description);
      formData.append("projectUrl", projectUrl);

      if (editingProject) {
        formData.append("id", editingProject.id);
      }

      if (imageType === "url" && imageUrl) {
        formData.append("imageUrl", imageUrl);
      } else if (imageType === "upload" && imageFile) {
        formData.append("imageFile", imageFile);
      }

      const method = editingProject ? "PUT" : "POST";
      const res = await fetch("/api/projects", {
        method,
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFormSuccess(editingProject ? "Project updated successfully!" : "Project created successfully!");
        
        // Reset form
        setEditingProject(null);
        setTitle("");
        setCategory("");
        setYear("");
        setDescription("");
        setProjectUrl("");
        setImageUrl("");
        setImageFile(null);
        
        // Refresh list
        loadProjects();
      } else {
        setFormError(data.error || "Failed to save project.");
      }
    } catch (err) {
      setFormError("Something went wrong during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete project
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      const res = await fetch(`/api/projects?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // If we were editing the deleted project, cancel editing
        if (editingProject?.id === id) {
          handleCancelEdit();
        }
        loadProjects();
      } else {
        alert(data.error || "Failed to delete project.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Something went wrong while deleting.");
    }
  };

  if (!authChecked) {
    return (
      <div className="w-screen h-screen flex justify-center items-center font-sans font-bold text-lg bg-white uppercase tracking-widest text-black">
        Verifying Session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-black pb-24 select-none">
      {/* Admin Navbar (Responsive Wrap) */}
      <header className="sticky top-0 left-0 right-0 min-h-[5rem] py-4 border-b border-black flex flex-col sm:flex-row gap-4 justify-between items-center px-6 md:px-12 bg-white z-40">
        <div className="flex items-center gap-4">
          <span className="font-display font-black text-2xl uppercase tracking-tight">
            CMS Dashboard
          </span>
          <span className="text-[10px] font-sans font-bold uppercase border border-black px-2 py-0.5 mt-0.5 bg-black text-white">
            Admin Mode
          </span>
        </div>
        <div className="flex gap-3">
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-2 border border-black px-4 py-2 font-sans font-bold text-xs uppercase hover:bg-black hover:text-white transition-colors duration-200"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>View Site</span>
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 border border-black px-4 py-2 font-sans font-bold text-xs uppercase bg-black text-white hover:bg-white hover:text-black transition-colors duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 md:px-12 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Form (5 Cols) */}
        <section className="lg:col-span-5">
          <div className="border border-black p-6 md:p-8 bg-white shadow-sm lg:sticky lg:top-28">
            <div className="border-b border-black pb-4 mb-6">
              <h2 className="text-xl font-black font-display uppercase tracking-tight flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <span>{editingProject ? `Edit: ${editingProject.title}` : "Add New Project"}</span>
              </h2>
              <p className="text-[10px] uppercase font-sans font-bold text-black/60 mt-1">
                {editingProject ? "Update existing project details and visual cover" : "Fill metadata and upload visual cover"}
              </p>
            </div>

            {formError && (
              <div className="border border-black bg-black text-white text-xs uppercase font-bold p-3 mb-6">
                Error: {formError}
              </div>
            )}

            {formSuccess && (
              <div className="border border-green-600 bg-green-600 text-white text-xs uppercase font-bold p-3 mb-6">
                Success: {formSuccess}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs uppercase font-sans font-bold text-black flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-black/60" />
                  <span>Project Title *</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-black p-2.5 font-sans text-sm focus:outline-none focus:bg-black/5"
                  placeholder="e.g. Rampant Studio"
                />
              </div>

              {/* Grid: Responsive 1 col on mobile, 2 col on tablet/desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase font-sans font-bold text-black flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-black/60" />
                    <span>Category *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-black p-2.5 font-sans text-sm focus:outline-none focus:bg-black/5"
                    placeholder="e.g. Identity, Branding"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs uppercase font-sans font-bold text-black flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-black/60" />
                    <span>Year *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full border border-black p-2.5 font-sans text-sm focus:outline-none focus:bg-black/5"
                    placeholder="e.g. 2026"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs uppercase font-sans font-bold text-black flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-black/60" />
                  <span>Project URL (Optional)</span>
                </label>
                <input
                  type="url"
                  value={projectUrl}
                  onChange={(e) => setProjectUrl(e.target.value)}
                  className="w-full border border-black p-2.5 font-sans text-sm focus:outline-none focus:bg-black/5"
                  placeholder="https://example.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs uppercase font-sans font-bold text-black">
                  Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-black p-2.5 font-sans text-sm focus:outline-none focus:bg-black/5 resize-y"
                  placeholder="Describe the project scope, font usage, and design elements..."
                />
              </div>

              {/* Image Input Selection */}
              <div className="border border-black p-4 space-y-4">
                <div className="flex justify-between items-center border-b border-black/10 pb-2">
                  <span className="text-xs uppercase font-sans font-bold text-black">
                    Cover Image Source
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setImageType("url")}
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 border border-black ${imageType === "url" ? "bg-black text-white" : "hover:bg-black/5"}`}
                    >
                      Image URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageType("upload")}
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 border border-black ${imageType === "upload" ? "bg-black text-white" : "hover:bg-black/5"}`}
                    >
                      File Upload
                    </button>
                  </div>
                </div>

                {imageType === "url" ? (
                  <div className="space-y-1.5">
                    <label className="block text-xs uppercase font-sans font-bold text-black flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-black/60" />
                      <span>Direct Image URL {editingProject && "(Optional - Leave empty to keep old)"}</span>
                    </label>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full border border-black p-2.5 font-sans text-sm focus:outline-none focus:bg-black/5"
                      placeholder="https://images.unsplash.com/photo-..."
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="block text-xs uppercase font-sans font-bold text-black flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-black/60" />
                      <span>Upload Local File {editingProject && "(Optional - Leave empty to keep old)"}</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full border border-black p-2 font-sans text-xs focus:outline-none file:mr-4 file:py-1 file:px-3 file:border file:border-black file:text-xs file:font-bold file:uppercase file:bg-black file:text-white hover:file:bg-white hover:file:text-black cursor-pointer"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 border border-black font-sans font-bold text-xs uppercase tracking-widest bg-black text-white hover:bg-white hover:text-black transition-colors duration-200"
                >
                  {submitting ? "Saving..." : editingProject ? "Save Changes" : "Add Project"}
                </button>
                
                {editingProject && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-full py-3 border border-black font-sans font-bold text-xs uppercase tracking-widest bg-white text-black hover:bg-black hover:text-white transition-colors duration-200"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>

        {/* Right Column: List of Projects (7 Cols) */}
        <section className="lg:col-span-7">
          <div className="border border-black p-6 md:p-8 bg-white shadow-sm h-full">
            <div className="border-b border-black pb-4 mb-6 flex justify-between items-end">
              <div>
                <h2 className="text-xl font-black font-display uppercase tracking-tight">
                  Portfolio List
                </h2>
                <p className="text-[10px] uppercase font-sans font-bold text-black/60 mt-1">
                  Manage published project coordinates
                </p>
              </div>
              <span className="font-sans font-bold text-xs uppercase tracking-wider text-black/40">
                Total: {projects.length}
              </span>
            </div>

            {loadingProjects ? (
              <div className="py-24 text-center font-sans font-bold text-black/60 uppercase tracking-widest">
                Loading database projects...
              </div>
            ) : projects.length === 0 ? (
              <div className="py-24 border border-dashed border-black/20 text-center font-sans font-bold text-black/60 uppercase tracking-widest">
                No projects published. Use the form to start.
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => {
                  const cover = project.images.find(img => img.isCover) || project.images[0];
                  return (
                    <div
                      key={project.id}
                      className="border border-black p-4 flex gap-4 bg-white hover:border-black/70 items-center justify-between transition-colors flex-wrap sm:flex-nowrap"
                    >
                      {/* Image Thumbnail */}
                      <div className="w-16 h-20 border border-black/10 relative overflow-hidden bg-black/5 shrink-0 mx-auto sm:mx-0">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover.url}
                            alt={project.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] font-bold">
                            NO IMG
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-grow min-w-0 pr-4 text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row items-center gap-2 mb-1">
                          <h3 className="font-sans font-black text-sm uppercase tracking-tight truncate">
                            {project.title}
                          </h3>
                          <span className="text-[9px] font-sans font-bold border border-black/20 px-1 text-black/60 uppercase shrink-0">
                            {project.year}
                          </span>
                        </div>
                        <p className="text-[10px] uppercase font-sans text-black/40 tracking-wider truncate mb-1">
                          {project.category}
                        </p>
                        <p className="text-[11px] font-sans text-black/70 line-clamp-2 italic">
                          {project.description}
                        </p>
                      </div>

                      {/* Actions (Responsive wrap) */}
                      <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0 justify-center sm:justify-start">
                        <button
                          onClick={() => handleEditSelect(project)}
                          className="flex-grow sm:flex-grow-0 p-3 border border-black bg-white hover:bg-black hover:text-white text-black transition-colors flex items-center justify-center gap-1.5 font-sans font-bold text-[10px] uppercase sm:p-2.5"
                          title="Edit Project"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span className="sm:hidden">Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="flex-grow sm:flex-grow-0 p-3 border border-black bg-white hover:bg-red-600 hover:text-white text-black transition-colors flex items-center justify-center gap-1.5 font-sans font-bold text-[10px] uppercase sm:p-2.5 sm:hover:bg-black"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="sm:hidden">Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
