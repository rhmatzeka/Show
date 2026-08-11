"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ProjectData } from "@/lib/db";
import { X, ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import gsap from "gsap";

export default function HomePage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation / Detail overlay state
  const [activeProject, setActiveProject] = useState<ProjectData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Canvas movement state
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  
  // Current translation offsets
  const [translateX, setTranslateX] = useState(-300);
  const [translateY, setTranslateY] = useState(-200);
  const posX = useRef(-300);
  const posY = useRef(-200);
  
  // Velocity for inertia
  const velX = useRef(0);
  const velY = useRef(0);
  const lastTime = useRef(0);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const animationFrameId = useRef<number | null>(null);

  // Card items refs for GSAP animations
  const projectRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const detailImageRef = useRef<HTMLDivElement>(null);

  // FLIP Transition States
  const [flipActive, setFlipActive] = useState(false);
  const [flipImage, setFlipImage] = useState<string | null>(null);
  const [flipRect, setFlipRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [hiddenCardId, setHiddenCardId] = useState<string | null>(null);

  // Fetch projects from API
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch("/api/projects");
        const data = await res.json();
        if (data.projects) {
          setProjects(data.projects);
        }
      } catch (err) {
        console.error("Error fetching projects:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  // Infinite canvas physics loop (requestAnimationFrame) for inertia
  useEffect(() => {
    const updatePhysics = () => {
      if (!isDragging.current && (Math.abs(velX.current) > 0.05 || Math.abs(velY.current) > 0.05)) {
        // Apply friction
        velX.current *= 0.94;
        velY.current *= 0.94;

        // Apply translation
        posX.current += velX.current;
        posY.current += velY.current;

        setTranslateX(posX.current);
        setTranslateY(posY.current);
      }

      animationFrameId.current = requestAnimationFrame(updatePhysics);
    };

    animationFrameId.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Trackpad / Mouse wheel scroll handler to pan the canvas
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isDetailOpen || showInfo) return;
      e.preventDefault();

      // Update positions
      posX.current -= e.deltaX * 0.55;
      posY.current -= e.deltaY * 0.55;

      setTranslateX(posX.current);
      setTranslateY(posY.current);

      // Add temporary velocity so inertia takes over slightly when scrolling stops
      velX.current = -e.deltaX * 0.12;
      velY.current = -e.deltaY * 0.12;
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener("wheel", handleWheel);
      }
    };
  }, [isDetailOpen, showInfo]);

  // Pointer event handlers (Mouse and Touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isDetailOpen || showInfo) return; // Disable canvas pan when detail/info is open
    
    // Check if clicked an interactive element
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest(".project-card-interactive") || target.closest("a")) return;

    isDragging.current = true;
    startX.current = e.clientX - posX.current;
    startY.current = e.clientY - posY.current;
    
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    lastTime.current = Date.now();
    velX.current = 0;
    velY.current = 0;
    
    if (canvasRef.current) {
      canvasRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;

    const x = e.clientX;
    const y = e.clientY;
    const now = Date.now();
    const dt = now - lastTime.current;

    // Calculate instantaneous velocity
    if (dt > 0) {
      const instantVelX = (x - lastX.current);
      const instantVelY = (y - lastY.current);
      velX.current = velX.current * 0.25 + instantVelX * 0.75;
      velY.current = velY.current * 0.25 + instantVelY * 0.75;
    }

    posX.current = x - startX.current;
    posY.current = y - startY.current;

    setTranslateX(posX.current);
    setTranslateY(posY.current);

    lastX.current = x;
    lastY.current = y;
    lastTime.current = now;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    // If pointer up happened but the drag duration was long without moving, reset velocity
    if (Date.now() - lastTime.current > 100) {
      velX.current = 0;
      velY.current = 0;
    }

    if (canvasRef.current) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // Open project detail with FLIP transition
  const openProject = (project: ProjectData, itemId: string) => {
    if (isDetailOpen || showInfo) return;
    
    const cardEl = projectRefs.current[itemId];
    if (cardEl) {
      const imgEl = cardEl.querySelector(".flip-source-el");
      const rect = imgEl ? imgEl.getBoundingClientRect() : cardEl.getBoundingClientRect();
      
      const coverImg = project.images.find(img => img.isCover) || project.images[0];
      setFlipImage(coverImg ? coverImg.url : null);
      setFlipRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
      setFlipActive(true);
      setHiddenCardId(itemId); // Hide card contents to simulate image flying away
    }

    setActiveProject(project);
    setIsDetailOpen(true);
    
    // Update browser URL query path/state cleanly
    window.history.pushState(null, "", `/work/${project.slug}`);
  };

  // Execute FLIP Animation when opening
  useEffect(() => {
    if (flipActive && !isClosing && isDetailOpen && detailImageRef.current && flipRect) {
      const destRect = detailImageRef.current.getBoundingClientRect();
      
      // Animate clone from original card coordinates to the detail view coordinates
      gsap.fromTo(
        ".flip-clone",
        {
          top: flipRect.top,
          left: flipRect.left,
          width: flipRect.width,
          height: flipRect.height,
        },
        {
          top: destRect.top,
          left: destRect.left,
          width: destRect.width,
          height: destRect.height,
          duration: 0.6,
          ease: "power3.inOut",
          onComplete: () => {
            setFlipActive(false);
            // Fade in text elements on detail pane
            gsap.fromTo(
              ".detail-pane-text",
              { opacity: 0, y: 25 },
              { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: "power2.out" }
            );
            // Fade in actual image
            gsap.to(".detail-image-actual", { opacity: 1, duration: 0.3 });
          }
        }
      );
    }
  }, [flipActive, isClosing, isDetailOpen, flipRect]);

  // Close project detail with reverse FLIP transition
  const closeProject = () => {
    if (!activeProject) return;
    setIsClosing(true);

    // Fade out text elements in the detail panel first
    gsap.to(".detail-pane-text", {
      opacity: 0,
      y: 15,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => {
        // Locate where the card is currently rendered on screen
        const matchedItem = canvasItems.find(item => item.type === "project" && item.slug === activeProject.slug);
        const itemId = matchedItem ? matchedItem.id : "";
        const cardEl = matchedItem ? projectRefs.current[matchedItem.id] : null;
        
        if (cardEl && detailImageRef.current) {
          const imgEl = cardEl.querySelector(".flip-source-el");
          const targetRect = imgEl ? imgEl.getBoundingClientRect() : cardEl.getBoundingClientRect();
          const currentDestRect = detailImageRef.current.getBoundingClientRect();

          const coverImg = activeProject.images.find(img => img.isCover) || activeProject.images[0];
          setFlipImage(coverImg ? coverImg.url : null);
          setFlipRect({
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height
          });
          setFlipActive(true);
          setHiddenCardId(itemId); // Keep hidden during reverse animation

          // Hide actual image in detail
          gsap.set(".detail-image-actual", { opacity: 0 });

          // Animate clone back to the card position
          gsap.fromTo(
            ".flip-clone",
            {
              top: currentDestRect.top,
              left: currentDestRect.left,
              width: currentDestRect.width,
              height: currentDestRect.height,
            },
            {
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
              duration: 0.5,
              ease: "power3.inOut",
              onComplete: () => {
                setFlipActive(false);
                setHiddenCardId(null); // Restore original card visibility
                setIsDetailOpen(false);
                setActiveProject(null);
                setIsClosing(false);
                window.history.pushState(null, "", "/");
              }
            }
          );
        } else {
          // Fallback if elements not found
          setHiddenCardId(null);
          setIsDetailOpen(false);
          setActiveProject(null);
          setIsClosing(false);
          window.history.pushState(null, "", "/");
        }
      }
    });
  };

  // Navigate next/prev projects in detail view
  const navigateProject = (direction: "next" | "prev") => {
    if (!activeProject || projects.length === 0) return;
    const currentIndex = projects.findIndex((p) => p.slug === activeProject.slug);
    let nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex >= projects.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = projects.length - 1;

    const nextProj = projects[nextIndex];
    
    // Smooth transition
    gsap.to([".detail-pane-text", ".detail-image-actual"], {
      opacity: 0,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => {
        setActiveProject(nextProj);
        window.history.pushState(null, "", `/work/${nextProj.slug}`);
        
        gsap.fromTo(
          ".detail-pane-text",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: "power2.out" }
        );
        gsap.fromTo(
          ".detail-image-actual",
          { opacity: 0 },
          { opacity: 1, duration: 0.4 }
        );
      }
    });
  };

  // Listen for escape key to close detail or info
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDetailOpen && !isClosing) closeProject();
        if (showInfo) setShowInfo(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDetailOpen, showInfo, activeProject]);

  // Virtual Canvas dimensions for infinite wrapping boundaries
  const canvasWidth = 2000;
  const canvasHeight = 1200;

  // Modulo-based Wrapping function to achieve a smooth 360-degree panning layout
  const getWrappedPosition = (baseX: number, baseY: number, itemWidth: number, itemHeight: number) => {
    // Wrap screen position in boundaries [-itemWidth, canvasWidth - itemWidth]
    const screenX = ((baseX + translateX + itemWidth) % canvasWidth + canvasWidth) % canvasWidth - itemWidth;
    const screenY = ((baseY + translateY + itemHeight) % canvasHeight + canvasHeight) % canvasHeight - itemHeight;

    // Convert back to canvas-relative coordinates since the container itself is translated
    return {
      left: screenX - translateX,
      top: screenY - translateY
    };
  };

  // Define layout items: sized correctly to match Image 2
  const canvasItems = [
    // Column 1
    {
      id: "item-einstoffen",
      type: "project" as const,
      slug: "einstoffen",
      left: 100,
      top: 150,
      width: 320,
      height: 200
    },
    {
      id: "item-logo-three-pronged",
      type: "text" as const,
      left: 100,
      top: 700,
      width: 250,
      height: 220,
      content: (
        <div className="w-full h-full bg-[#FFFFFF] border border-black p-6 flex flex-col justify-end items-start relative select-text">
          {/* A cool brutalist custom logo / three prongs */}
          <div className="flex flex-col gap-1.5 items-start w-20">
            <div className="h-2 w-16 bg-black"></div>
            <div className="h-2 w-20 bg-black"></div>
            <div className="h-2 w-10 bg-black"></div>
          </div>
        </div>
      )
    },
    // Column 2
    {
      id: "item-colecao",
      type: "project" as const,
      slug: "colecao",
      left: 480,
      top: 180,
      width: 300,
      height: 400
    },
    {
      id: "item-rampant",
      type: "project" as const,
      slug: "rampant-studio",
      left: 480,
      top: 720,
      width: 300,
      height: 400
    },
    // Column 3
    {
      id: "item-arca-logo",
      type: "project" as const,
      slug: "ab-arca",
      left: 840,
      top: 130,
      width: 320,
      height: 220
    },
    {
      id: "item-alphabet",
      type: "text" as const,
      left: 840,
      top: 720,
      width: 300,
      height: 250,
      content: (
        <div className="w-full h-full bg-[#000000] p-6 flex flex-col justify-center items-start border border-black">
          <div className="font-display font-black text-2xl tracking-[0.2em] text-white uppercase leading-[1.2] break-all select-text font-stretch-ultra-condensed">
            ABCDEFGHIKL<br />
            MNÑOPQRSTUV<br />
            WXYZ
          </div>
        </div>
      )
    },
    // Column 4
    {
      id: "item-macbeth",
      type: "project" as const,
      slug: "macbeth",
      left: 1200,
      top: 160,
      width: 300,
      height: 420
    },
    {
      id: "item-brand-identity-mm26",
      type: "project" as const,
      slug: "brand-identity-mm26",
      left: 1200,
      top: 720,
      width: 300,
      height: 200
    }
  ];

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-white select-none">
      {/* 1. Minimal Header (TRANSPARENT background to let cards go underneath) */}
      <header className="fixed top-0 left-0 right-0 h-16 flex justify-between items-center px-6 md:px-12 bg-transparent z-40">
        <div className="font-sans font-bold text-lg md:text-xl tracking-tight flex items-center gap-2">
          <span>Selection</span>
        </div>
        <nav className="flex gap-8 font-sans font-medium text-sm md:text-base uppercase tracking-wider">
          <button 
            onClick={() => {
              setIsDetailOpen(false);
              setShowInfo(false);
              // Reset canvas back to original coordinate
              posX.current = -300;
              posY.current = -200;
              setTranslateX(-300);
              setTranslateY(-200);
              velX.current = 0;
              velY.current = 0;
            }} 
            className="hover:underline hover:opacity-75 transition-opacity"
          >
            Home
          </button>
          <button 
            onClick={() => setShowInfo(true)} 
            className={`hover:underline hover:opacity-75 transition-opacity ${showInfo ? 'line-through' : ''}`}
          >
            Info
          </button>
          <button 
            onClick={() => {
              // Focus / pan to the center of the first project
              setIsDetailOpen(false);
              setShowInfo(false);
              posX.current = -100;
              posY.current = -150;
              setTranslateX(-100);
              setTranslateY(-150);
              velX.current = 0;
              velY.current = 0;
            }} 
            className="hover:underline hover:opacity-75 transition-opacity"
          >
            Work
          </button>
        </nav>
      </header>

      {/* 2. STATIONARY / FIXED BACKGROUND TEXT LAYER (Behind the draggable canvas, z-0) */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        
        {/* Desktop Vertical BRIGANTI banner on the left background */}
        <div className="hidden md:block absolute top-16 left-0 bottom-0 w-24 overflow-hidden pt-8">
          <div className="text-[12vh] font-black text-black tracking-tighter leading-none uppercase font-display sidebar-text-vertical">
            BRIGANTI
          </div>
        </div>

        {/* Mobile Bottom Stationary BRIGANTI marquee in background */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 h-20 bg-white flex items-center overflow-hidden px-6">
          <div className="text-6xl font-black text-black whitespace-nowrap tracking-tighter uppercase font-display flex gap-8">
            <span>BRIGANTI</span>
            <span>BRIGANTI</span>
          </div>
        </div>

        {/* Stationary version indicator */}
        <div className="absolute left-28 top-[50vh] font-sans font-bold text-xs uppercase tracking-widest text-black">
          <span className="opacity-40">Version</span>
          <span className="ml-8 text-black">MM25.1.1</span>
        </div>
        
        {/* Stationary brand identity label */}
        <div className="absolute left-28 top-[55vh] font-sans font-bold text-xs uppercase tracking-widest leading-snug text-black">
          Brand Identity &<br />Visual Communication
        </div>

        {/* Stationary bio text block */}
        <div className="absolute left-[840px] top-[50vh] max-w-sm font-sans font-bold text-xs leading-relaxed text-black select-text pointer-events-auto">
          Andrés Briganti is a designer specializing in brand identity and the visual systems that support it. He works across editorial design, digital experiences, and custom typefaces to deliver clear, cohesive communication for brands.
        </div>

        {/* Copyright notice in background */}
        <div className="absolute right-16 bottom-8 font-sans font-bold text-xs uppercase tracking-wider text-black">
          © MM26
        </div>
      </div>

      {/* 3. Infinite Panning Canvas (z-10, draws OVER the background text, UNDER the header text) */}
      {loading ? (
        <div className="w-full h-full flex justify-center items-center font-sans font-bold text-xl uppercase tracking-widest bg-white z-10">
          Loading Portfolio...
        </div>
      ) : (
        <main
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full relative z-10"
          style={{ touchAction: "none" }}
        >
          <div
            className="absolute top-0 left-0 w-[4000px] h-[3000px] bg-transparent cursor-grab active:cursor-grabbing"
            style={{
              transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
              transition: isDragging.current ? "none" : "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              willChange: "transform"
            }}
          >
            {canvasItems.map((item) => {
              // Get wrapped coordinate of this card
              const pos = getWrappedPosition(item.left, item.top, item.width, item.height);

              if (item.type === "text") {
                return (
                  <div
                    key={item.id}
                    className="absolute"
                    style={{
                      left: pos.left,
                      top: pos.top,
                      width: item.width,
                      height: item.height,
                    }}
                  >
                    {item.content}
                  </div>
                );
              }

              // Project rendering
              const project = projects.find((p) => p.slug === item.slug);
              if (!project) return null;

              const coverImg = project.images.find(img => img.isCover) || project.images[0];
              const isHidden = hiddenCardId === item.id;

              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    projectRefs.current[item.id] = el;
                  }}
                  onClick={() => openProject(project, item.id)}
                  className="absolute border border-black bg-white group cursor-pointer overflow-hidden project-card-interactive shadow-sm hover:border-black/70 transition-colors"
                  style={{
                    left: pos.left,
                    top: pos.top,
                    width: item.width,
                    height: item.height,
                  }}
                >
                  <div className={`w-full h-full relative flex flex-col justify-between transition-opacity duration-200 ${isHidden ? "opacity-0" : "opacity-100"}`}>
                    
                    {/* Custom project card styling matching visual screenshots */}
                    {project.slug === "einstoffen" ? (
                      // Einstoffen custom split visual
                      <div className="w-full h-full flex items-stretch flip-source-el">
                        <div className="w-[55%] relative overflow-hidden bg-black/5 border-r border-black">
                          {coverImg && (
                            <Image
                              src={coverImg.url}
                              alt={project.title}
                              fill
                              sizes="300px"
                              className="object-cover grayscale contrast-125 group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                            />
                          )}
                          <div className="absolute bottom-4 left-0 right-0 text-center z-10">
                            <span className="font-display font-black text-white text-xl tracking-wider uppercase">
                              EINSTOFFEN
                            </span>
                          </div>
                        </div>
                        <div className="w-[45%] bg-[#0B0B0B] p-4 flex flex-col justify-between items-end">
                          {/* Top right icon */}
                          <div className="w-6 h-6 border border-white/20 rounded-sm flex items-center justify-center text-white/55 text-[10px] font-bold">
                            R
                          </div>
                          <span className="text-[10px] text-white/30 font-mono">03:04</span>
                        </div>
                      </div>
                    ) : project.slug === "colecao" ? (
                      // Coleção cover visual with font overlay
                      <div className="w-full h-full relative overflow-hidden bg-black/5 flip-source-el">
                        {coverImg && (
                          <Image
                            src={coverImg.url}
                            alt={project.title}
                            fill
                            sizes="300px"
                            className="object-cover grayscale contrast-115 group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                          />
                        )}
                        {/* Outlined OLEÇÃO font overlay */}
                        <div className="absolute top-10 left-0 right-0 flex flex-col items-center justify-start z-10 pointer-events-none select-none">
                          <span className="text-[8px] font-bold text-black uppercase tracking-[0.2em] mb-1.5">
                            AB &nbsp; &nbsp; &nbsp; SETIMA &nbsp; &nbsp; &nbsp; AB &nbsp; &nbsp; &nbsp; SETIMA
                          </span>
                          <h3 className="font-display font-black text-6xl tracking-tight leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            OLEÇÃO
                          </h3>
                        </div>
                      </div>
                    ) : project.slug === "ab-arca" ? (
                      // AB Arca Logo card representation
                      <div className="w-full h-full bg-[#0B0B0B] flex flex-col justify-between p-5 flip-source-el">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold text-white/50">AB</span>
                          <span className="text-[10px] font-bold text-white/50">ARCA</span>
                        </div>
                        {/* Custom vector SVG symbol */}
                        <div className="my-auto flex justify-center items-center">
                          <svg className="w-20 h-20 text-[#D4E157]" viewBox="0 0 100 100" fill="currentColor">
                            <path d="M20 20 h35 a25 25 0 0 1 0 50 h-10 l15 20 h-20 l-13 -20 h-7 v20 h-15 z M35 35 v18 h15 a9 9 0 0 0 0 -18 z" />
                          </svg>
                        </div>
                        <div className="flex justify-between items-end">
                          <span className="text-[9px] font-mono text-white/40">TYPE DESIGN</span>
                          <span className="text-[9px] font-mono text-white/40">MM24</span>
                        </div>
                      </div>
                    ) : project.slug === "macbeth" ? (
                      // Macbeth poster representation
                      <div className="w-full h-full bg-white flex flex-col justify-between p-8 flip-source-el border border-black">
                        <div>
                          <span className="font-display font-black text-[9px] text-red-600 uppercase tracking-widest block mb-2.5 leading-none">
                            THE TRAGEDY OF
                          </span>
                          <h4 className="font-sans font-black text-3xl leading-[0.85] text-black tracking-tight font-stretch-ultra-condensed select-text">
                            AaBb<br />
                            CcDd<br />
                            0123<br />
                            <span className="text-red-600">MACBETH</span>
                          </h4>
                        </div>
                        <div>
                          <span className="font-sans font-bold text-[9px] text-red-600 block uppercase leading-none mb-1">
                            BY WILLIAM
                          </span>
                          <span className="font-sans font-black text-xl text-black block uppercase leading-none tracking-tighter">
                            SHAKESPEARE
                          </span>
                          <span className="font-sans font-bold text-[8px] text-black/60 uppercase mt-3 block">
                            NATIONAL THEATER
                          </span>
                        </div>
                      </div>
                    ) : project.slug === "rampant-studio" ? (
                      // Rampant Studio red multiply photo representation
                      <div className="w-full h-full relative overflow-hidden bg-red-600/30 mix-blend-multiply flip-source-el">
                        {coverImg && (
                          <Image
                            src={coverImg.url}
                            alt={project.title}
                            fill
                            sizes="300px"
                            className="object-cover grayscale contrast-125 mix-blend-multiply group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                          />
                        )}
                        {/* Red background overlay to enforce styling */}
                        <div className="absolute inset-0 bg-[#E64A19]/30 pointer-events-none mix-blend-color"></div>
                        <div className="absolute bottom-8 left-8 z-10">
                          <h3 className="font-sans font-bold italic text-4xl text-white tracking-wide">
                            Rampant
                          </h3>
                        </div>
                      </div>
                    ) : project.slug === "brand-identity-mm26" ? (
                      // Brand Identity MM26 horizontal stripes emblem
                      <div className="w-full h-full bg-white flex flex-col justify-between p-8 flip-source-el">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold text-black/60 uppercase">IDENTITY</span>
                          <span className="text-[10px] font-bold text-black/60 uppercase">MM26</span>
                        </div>
                        {/* Brutalist horizontal black stripes logo */}
                        <div className="flex flex-col gap-4.5 w-full items-stretch">
                          <div className="h-4 bg-black"></div>
                          <div className="h-4 bg-black"></div>
                          <div className="h-4 bg-black"></div>
                        </div>
                        <div className="flex justify-between items-end">
                          <span className="text-[9px] font-mono text-black/40">BRAND SYSTEM</span>
                          <span className="text-[10px] font-sans font-black text-black">© BRIGANTI</span>
                        </div>
                      </div>
                    ) : (
                      // Default layout fallback
                      <div className="w-full h-full relative overflow-hidden bg-black/5 flip-source-el">
                        {coverImg ? (
                          <Image
                            src={coverImg.url}
                            alt={project.title}
                            fill
                            sizes="300px"
                            className="object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-black/5 text-black/30 font-sans font-bold">
                            NO IMAGE
                          </div>
                        )}
                      </div>
                    )}

                    {/* Brutalist overlay on hover */}
                    <div className="portfolio-card-mask absolute inset-0 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-6 z-20 pointer-events-none">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest border border-white px-2 py-0.5">
                          {project.category.split(',')[0] || "Project"}
                        </span>
                        <span className="text-[10px] font-bold text-white uppercase">
                          MM{project.year}
                        </span>
                      </div>

                      <div className="text-left">
                        <h3 className="text-2xl font-black text-white font-display uppercase tracking-tight leading-none mb-1.5">
                          {project.title}
                        </h3>
                        <p className="text-[11px] text-white/70 font-sans">
                          Click to View Details
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* 4. Project Detail View Overlay (ONE FULL SCREEN / ONE PAGE SIZE) */}
      {isDetailOpen && activeProject && (
        <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-[#F7F7F7] overflow-hidden select-text">
          {/* Left panel (Info) */}
          <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-between border-b md:border-b-0 md:border-r border-black min-h-[40vh] md:min-h-0 bg-white">
            {/* Top row */}
            <div className="flex justify-between items-center mb-8">
              <span className="font-sans font-bold uppercase tracking-wider text-xs md:text-sm">
                Selection
              </span>
              <button 
                onClick={closeProject}
                className="p-2 border border-black hover:bg-black hover:text-white transition-colors duration-200 focus:outline-none"
              >
                <X className="w-4 h-4 md:w-5 h-5" />
              </button>
            </div>

            {/* Middle detailed metadata */}
            <div className="my-auto max-w-lg">
              {/* Layout labels */}
              <div className="grid grid-cols-3 border-b border-black pb-4 mb-6 font-sans text-xs uppercase tracking-wider font-bold text-black/60">
                <span className="detail-pane-text">Title</span>
                <span className="detail-pane-text">Category</span>
                <span className="detail-pane-text">Year</span>
              </div>

              {/* Layout values */}
              <div className="grid grid-cols-3 mb-10 font-sans text-[11px] uppercase font-bold">
                <span className="detail-pane-text pr-2 truncate">{activeProject.title}</span>
                <span className="detail-pane-text pr-2">{activeProject.category}</span>
                <span className="detail-pane-text">{activeProject.year}</span>
              </div>

              {/* Giant Title */}
              <h2 className="detail-pane-text text-4xl md:text-6xl font-black font-display uppercase tracking-tighter leading-none mb-6">
                {activeProject.title}
              </h2>

              {/* Description */}
              <p className="detail-pane-text font-sans text-sm md:text-base leading-relaxed text-black/80 mb-8">
                {activeProject.description}
              </p>

              {/* Client URL link */}
              {activeProject.projectUrl && (
                <div className="detail-pane-text">
                  <a
                    href={activeProject.projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-black px-6 py-3 font-sans font-bold text-xs uppercase tracking-wider hover:bg-black hover:text-white transition-colors duration-200"
                  >
                    <span>Visit Project</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Bottom slider controls */}
            <div className="flex justify-between items-center mt-12 border-t border-black pt-6">
              <span className="font-sans font-bold text-xs uppercase tracking-wider text-black/60">
                {projects.findIndex((p) => p.slug === activeProject.slug) + 1} / {projects.length}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => navigateProject("prev")}
                  className="p-3 border border-black hover:bg-black hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={closeProject}
                  className="p-3 border border-black hover:bg-black hover:text-white transition-colors font-sans font-bold text-xs uppercase tracking-widest px-6"
                >
                  Close
                </button>
                <button
                  onClick={() => navigateProject("next")}
                  className="p-3 border border-black hover:bg-black hover:text-white transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right panel (Image Container taking up ONE FULL SCREEN on the right, md:w-1/2) */}
          <div className="w-full md:w-1/2 h-[60vh] md:h-full bg-[#FFFFFF] flex items-center justify-center p-0 relative overflow-hidden">
            <div 
              ref={detailImageRef}
              className="w-full h-full relative overflow-hidden"
            >
              {activeProject.images && activeProject.images.length > 0 ? (
                <Image
                  src={activeProject.images.find(img => img.isCover)?.url || activeProject.images[0].url}
                  alt={activeProject.title}
                  fill
                  priority
                  className="object-cover detail-image-actual opacity-0 grayscale contrast-110"
                  sizes="50vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-black/20 font-bold uppercase tracking-wider">
                  No Image
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FLIP Animation overlay clone */}
      {flipActive && flipImage && (
        <div 
          className="flip-clone fixed z-50 overflow-hidden bg-white shadow-lg pointer-events-none"
          style={{ willChange: "top, left, width, height" }}
        >
          <div className="relative w-full h-full">
            <Image
              src={flipImage}
              alt="Transitioning Visual"
              fill
              className="object-cover grayscale contrast-115"
              sizes="50vw"
              priority
            />
          </div>
        </div>
      )}

      {/* 5. Info Overlay Drawer */}
      {showInfo && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-white border-l border-black p-8 md:p-16 flex flex-col justify-between h-full select-text shadow-2xl">
            <div className="flex justify-between items-center border-b border-black pb-6">
              <span className="font-sans font-black text-xl uppercase tracking-tight">
                Information
              </span>
              <button 
                onClick={() => setShowInfo(false)}
                className="p-2 border border-black hover:bg-black hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-auto space-y-8 py-8">
              <p className="font-sans text-lg md:text-xl leading-relaxed text-black font-medium">
                Andrés Briganti is a designer specializing in brand identity and the visual systems that support it. He works across editorial design, digital experiences, and custom typefaces to deliver clear, cohesive communication for brands.
              </p>
              
              <div className="space-y-4 font-sans text-sm">
                <div className="grid grid-cols-3 border-b border-black/10 pb-2">
                  <span className="font-bold uppercase text-black/60">Version</span>
                  <span className="col-span-2 font-medium">MM26.1.1</span>
                </div>
                <div className="grid grid-cols-3 border-b border-black/10 pb-2">
                  <span className="font-bold uppercase text-black/60">Services</span>
                  <span className="col-span-2 font-medium">Brand Identity, Art Direction, Web Development, Type Design</span>
                </div>
                <div className="grid grid-cols-3 border-b border-black/10 pb-2">
                  <span className="font-bold uppercase text-black/60">Contact</span>
                  <span className="col-span-2 font-medium">hello@briganti.works</span>
                </div>
              </div>
            </div>

            <div className="border-t border-black pt-6">
              <button
                onClick={() => setShowInfo(false)}
                className="w-full py-4 border border-black font-sans font-bold text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
              >
                Close Info
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
