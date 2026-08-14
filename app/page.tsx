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
  const [activeOverlay, setActiveOverlay] = useState<"about" | "contact" | null>(null);
  const [overlayRevealActive, setOverlayRevealActive] = useState(false);

  // Main scrollable container reference
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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
          
          // Set initial state on the next frame to guarantee CSS layout has resolved
          requestAnimationFrame(() => {
            gsap.set(".project-card-interactive-content", { opacity: 0 });
            
            // 1. Black blocks slide up to cover the card area
            gsap.fromTo(
              ".project-card-reveal-block",
              { scaleY: 0, transformOrigin: "bottom" },
              {
                scaleY: 1,
                duration: 1.0,
                stagger: {
                  amount: 0.6,
                  grid: "auto",
                  from: "start"
                },
                ease: "power3.out",
                onComplete: () => {
                  // Make actual card contents visible only after covered by the blocks
                  gsap.set(".project-card-interactive-content", { opacity: 1 });
                  
                  // 2. Black blocks slide down to reveal the images
                  gsap.to(
                    ".project-card-reveal-block",
                    {
                      scaleY: 0,
                      transformOrigin: "bottom",
                      duration: 1.2,
                      delay: 0.1,
                      stagger: {
                        amount: 0.6,
                        grid: "auto",
                        from: "start"
                      },
                      ease: "power4.inOut"
                    }
                  );
                }
              }
            );
          });
        }
      } catch (err) {
        console.error("Error fetching projects:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  // Position the scroll container to the middle set once loading is complete
  useEffect(() => {
    if (projects.length > 0 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const adjustScroll = () => {
        const setElements = container.querySelectorAll(".portfolio-set-row");
        if (setElements.length >= 3) {
          const singleSetHeight = (setElements[1] as HTMLDivElement).offsetHeight;
          const spacerHeight = 112; // h-28 = 112px
          container.scrollTop = spacerHeight + singleSetHeight;
        }
      };
      adjustScroll();
      // Double check after a small delay to handle image sizes setting in
      const timer = setTimeout(adjustScroll, 200);
      return () => clearTimeout(timer);
    }
  }, [projects]);

  // Smooth Scroll and Inertia properties
  const targetScrollTop = useRef(0);
  const currentScrollTop = useRef(0);
  const isAnimatingScroll = useRef(false);

  // Seamless Infinite Vertical Scroll Loop handler
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container || isDetailOpen || activeOverlay) return;

    const scrollTop = container.scrollTop;
    
    // Sync current values if the user manually drags the scrollbar
    if (!isAnimatingScroll.current) {
      targetScrollTop.current = scrollTop;
      currentScrollTop.current = scrollTop;
    }

    const setElements = container.querySelectorAll(".portfolio-set-row");
    if (setElements.length < 3) return;

    const singleSetHeight = (setElements[1] as HTMLDivElement).offsetHeight;
    const spacerHeight = 112; // h-28 = 112px

    // Boundary check for scrolling down: when crossing into the 3rd set, teleport back to the 2nd set
    if (scrollTop >= spacerHeight + singleSetHeight * 2) {
      container.scrollTop = scrollTop - singleSetHeight;
      targetScrollTop.current = container.scrollTop;
      currentScrollTop.current = container.scrollTop;
    }
    // Boundary check for scrolling up: when crossing into the 1st set, teleport down to the 2nd set
    else if (scrollTop <= spacerHeight + singleSetHeight - 150) {
      container.scrollTop = scrollTop + singleSetHeight;
      targetScrollTop.current = container.scrollTop;
      currentScrollTop.current = container.scrollTop;
    }
  };

  // Inertia scroll tick loop
  useEffect(() => {
    let animId: number;

    const updateScroll = () => {
      const container = scrollContainerRef.current;
      if (container && !isDetailOpen && !activeOverlay) {
        // Linear interpolation (lerp) for smooth dampening (higher divider = heavier scroll)
        const diff = targetScrollTop.current - currentScrollTop.current;
        if (Math.abs(diff) > 0.5) {
          isAnimatingScroll.current = true;
          // Lerp factor 0.065 makes it feel pleasantly heavy/weighted on both Desktop and Mobile touch
          currentScrollTop.current += diff * 0.065;
          container.scrollTop = currentScrollTop.current;
        } else {
          isAnimatingScroll.current = false;
        }
      }
      animId = requestAnimationFrame(updateScroll);
    };

    // Wheel event listener to intercept raw wheel scroll and apply custom inertia target
    const handleWheel = (e: WheelEvent) => {
      if (isDetailOpen || activeOverlay) return;
      e.preventDefault();
      // Accumulate wheel delta (multiply by 0.65 to make scroll heavier)
      targetScrollTop.current += e.deltaY * 0.65;
    };

    // Touch event listener to bring weighted heavy scrolling to mobile screens
    let startY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (isDetailOpen || activeOverlay) return;
      startY = e.touches[0].pageY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDetailOpen || activeOverlay) return;
      e.preventDefault();
      const currentY = e.touches[0].pageY;
      // Calculate delta movement
      const deltaY = startY - currentY;
      startY = currentY;

      // Multiply touch delta by 0.6 to make mobile drag feel heavy
      targetScrollTop.current += deltaY * 0.6;
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
      container.addEventListener("touchstart", handleTouchStart, { passive: true });
      container.addEventListener("touchmove", handleTouchMove, { passive: false });
    }

    animId = requestAnimationFrame(updateScroll);

    return () => {
      cancelAnimationFrame(animId);
      if (container) {
        container.removeEventListener("wheel", handleWheel);
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchmove", handleTouchMove);
      }
    };
  }, [isDetailOpen, activeOverlay, projects]);

  // Open project detail with FLIP transition
  const openProject = (project: ProjectData, itemId: string) => {
    if (isDetailOpen || activeOverlay) return;
    
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

  // Open About/Contact reveal overlay
  const handleOpenOverlayReveal = (type: "about" | "contact") => {
    if (overlayRevealActive) return;
    setOverlayRevealActive(true);
    
    // 1. Cover stage with black block elements
    gsap.fromTo(
      ".overlay-reveal-block",
      { scaleY: 0, transformOrigin: "bottom" },
      {
        scaleY: 1,
        duration: 0.6,
        stagger: 0.08,
        ease: "power3.out",
        onComplete: () => {
          // 2. Perform state swap when view is hidden
          setActiveOverlay(type);
          setIsDetailOpen(false);
          setActiveProject(null);
          
          // 3. Fade in text elements on new overlay
          gsap.set(".overlay-content-node", { opacity: 0 });
          
          // 4. Slide blocks away to reveal the view
          gsap.to(
            ".overlay-reveal-block",
            {
              scaleY: 0,
              transformOrigin: "top",
              duration: 0.6,
              stagger: 0.08,
              ease: "power3.inOut",
              onComplete: () => {
                setOverlayRevealActive(false);
                gsap.to(".overlay-content-node", { opacity: 1, duration: 0.35 });
              }
            }
          );
        }
      }
    );
  };

  // Close Reveal Overlay
  const handleCloseOverlayReveal = () => {
    if (overlayRevealActive) return;
    setOverlayRevealActive(true);

    gsap.fromTo(
      ".overlay-reveal-block",
      { scaleY: 0, transformOrigin: "bottom" },
      {
        scaleY: 1,
        duration: 0.6,
        stagger: 0.08,
        ease: "power3.out",
        onComplete: () => {
          setActiveOverlay(null);
          gsap.set(".overlay-content-node", { opacity: 0 });
          
          gsap.to(
            ".overlay-reveal-block",
            {
              scaleY: 0,
              transformOrigin: "top",
              duration: 0.6,
              stagger: 0.08,
              ease: "power3.inOut",
              onComplete: () => {
                setOverlayRevealActive(false);
              }
            }
          );
        }
      }
    );
  };

  const handleCloseOverlayDirect = () => {
    setActiveOverlay(null);
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
        // Find which card is active from the hiddenCardId
        const itemId = hiddenCardId || "";
        const cardEl = itemId ? projectRefs.current[itemId] : null;
        
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

  // Render the set of cards inside the column grid
  const renderCardsSet = (setId: number) => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 w-full px-6 md:px-12 md:pl-24">
        {/* Column 1 */}
        <div className="flex flex-col gap-12 md:gap-24">
          {/* Item 1: Symbol Card */}
          {(() => {
            const project = projects.find(p => p.slug === "symbol-card");
            const coverImg = project?.images?.find(img => img.isCover) || project?.images?.[0];
            const itemId = `item-symbol-logo-${setId}`;
            const isHidden = hiddenCardId === itemId;

            if (project && coverImg) {
              return (
                <div
                  key={itemId}
                  ref={(el) => { projectRefs.current[itemId] = el; }}
                  onClick={() => openProject(project, itemId)}
                  className="bg-white group cursor-pointer overflow-hidden project-card-interactive shadow-sm transition-colors w-full aspect-square relative"
                >
                <div className={`w-full h-full relative flex flex-col justify-between transition-opacity duration-200 project-card-interactive-content ${isHidden ? "opacity-0" : "opacity-100"}`}>
                  <div className="w-full h-full relative overflow-hidden bg-black/5 flip-source-el">
                    <Image
                      src={coverImg.url}
                      alt={project.title}
                      fill
                      sizes="(max-width: 768px) 50vw, 300px"
                      className="object-cover grayscale contrast-115 group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                    />
                  </div>
                </div>
                {/* Brutalist Block Reveal Cover */}
                <div className="absolute inset-0 bg-[#000000] z-20 origin-bottom project-card-reveal-block"></div>
              </div>
              );
            }

            return (
              <div
                key={itemId}
                ref={(el) => { projectRefs.current[itemId] = el; }}
                onClick={() => project && openProject(project, itemId)}
                className="w-full aspect-square bg-[#FFFFFF] p-6 flex flex-col justify-center items-center relative select-none project-card-interactive overflow-hidden"
              >
                {/* The brand icon: a symmetric three-pronged leaf/sprout symbol */}
                <div className="project-card-interactive-content flex flex-col justify-center items-center w-full h-full">
                  <svg className="w-16 h-16 text-black" viewBox="0 0 100 100" fill="currentColor">
                    <path d="M50 50 C40 30, 25 25, 15 40 C30 45, 45 45, 50 50 Z" />
                    <path d="M50 50 C60 30, 75 25, 85 40 C70 45, 55 45, 50 50 Z" />
                    <path d="M50 50 C50 20, 50 10, 50 5 C50 10, 50 20, 50 50 Z" stroke="currentColor" strokeWidth="4" />
                    <path d="M50 50 C45 30, 50 20, 55 10 C50 20, 50 30, 50 50 Z" />
                    <path d="M30 65 C40 60, 48 55, 50 50 C48 55, 40 60, 30 65 Z" stroke="currentColor" strokeWidth="3" />
                    <path d="M70 65 C60 60, 52 55, 50 50 C52 55, 60 60, 70 65 Z" stroke="currentColor" strokeWidth="3" />
                  </svg>
                </div>
                {/* Brutalist Block Reveal Cover */}
                <div className="absolute inset-0 bg-[#000000] z-20 origin-bottom project-card-reveal-block"></div>
              </div>
            );
          })()}

          {/* Item 5: Einstoffen project */}
          {(() => {
            const project = projects.find(p => p.slug === "einstoffen");
            if (!project) return null;
            const coverImg = project.images.find(img => img.isCover) || project.images[0];
            const itemId = `item-einstoffen-${setId}`;
            const isHidden = hiddenCardId === itemId;

            return (
              <div
                key={itemId}
                ref={(el) => { projectRefs.current[itemId] = el; }}
                onClick={() => openProject(project, itemId)}
                className="bg-white group cursor-pointer overflow-hidden project-card-interactive shadow-sm transition-colors w-full aspect-[4/3] md:aspect-[16/10] relative"
              >
                <div className={`w-full h-full relative flex flex-col justify-between transition-opacity duration-200 project-card-interactive-content ${isHidden ? "opacity-0" : "opacity-100"}`}>
                  <div className="w-full h-full flex items-stretch flip-source-el">
                    <div className="w-[55%] relative overflow-hidden bg-black/5">
                      {coverImg && (
                        <Image
                          src={coverImg.url}
                          alt={project.title}
                          fill
                          sizes="(max-width: 768px) 50vw, 300px"
                          className="object-cover grayscale contrast-125 group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                        />
                      )}
                      <div className="absolute bottom-2 md:bottom-4 left-0 right-0 text-center z-10">
                        <span className="font-display font-black text-white text-base md:text-xl tracking-wider uppercase">
                          EINSTOFFEN
                        </span>
                      </div>
                    </div>
                    <div className="w-[45%] bg-[#0B0B0B] p-2.5 md:p-4 flex flex-col justify-between items-end">
                      <div className="w-5 h-5 md:w-6 md:h-6 border border-white/20 rounded-sm flex items-center justify-center text-white/55 text-[8px] md:text-[10px] font-bold">
                        R
                      </div>
                      <span className="text-[8px] md:text-[10px] text-white/30 font-mono">03:04</span>
                    </div>
                  </div>
                </div>
                {/* Brutalist Block Reveal Cover */}
                <div className="absolute inset-0 bg-[#000000] z-20 origin-bottom project-card-reveal-block"></div>
              </div>
            );
          })()}
        </div>

        {/* Column 2 */}
        <div className="flex flex-col gap-12 md:gap-24 pt-16 md:pt-32">
          {/* Item 2: Rampant project */}
          {(() => {
            const project = projects.find(p => p.slug === "rampant-studio");
            if (!project) return null;
            const coverImg = project.images.find(img => img.isCover) || project.images[0];
            const itemId = `item-rampant-${setId}`;
            const isHidden = hiddenCardId === itemId;

            return (
              <div
                key={itemId}
                ref={(el) => { projectRefs.current[itemId] = el; }}
                onClick={() => openProject(project, itemId)}
                className="bg-white group cursor-pointer overflow-hidden project-card-interactive shadow-sm transition-colors w-full aspect-[3/4] relative"
              >
                <div className={`w-full h-full relative flex flex-col justify-between transition-opacity duration-200 project-card-interactive-content ${isHidden ? "opacity-0" : "opacity-100"}`}>
                  <div className="w-full h-full relative overflow-hidden bg-red-600/30 mix-blend-multiply flip-source-el">
                    {coverImg && (
                      <Image
                        src={coverImg.url}
                        alt={project.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 300px"
                        className="object-cover grayscale contrast-125 mix-blend-multiply group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                      />
                    )}
                    <div className="absolute inset-0 bg-[#E64A19]/30 pointer-events-none mix-blend-color"></div>
                    <div className="absolute bottom-4 left-4 z-10">
                      <h3 className="font-sans font-bold italic text-xl md:text-3xl text-white tracking-wide">
                        Rampant
                      </h3>
                    </div>
                  </div>
                </div>
                {/* Brutalist Block Reveal Cover */}
                <div className="absolute inset-0 bg-[#000000] z-20 origin-bottom project-card-reveal-block"></div>
              </div>
            );
          })()}

          {/* Item 6: Coleção project */}
          {(() => {
            const project = projects.find(p => p.slug === "colecao");
            if (!project) return null;
            const coverImg = project.images.find(img => img.isCover) || project.images[0];
            const itemId = `item-colecao-${setId}`;
            const isHidden = hiddenCardId === itemId;

            return (
              <div
                key={itemId}
                ref={(el) => { projectRefs.current[itemId] = el; }}
                onClick={() => openProject(project, itemId)}
                className="bg-white group cursor-pointer overflow-hidden project-card-interactive shadow-sm transition-colors w-full aspect-[3/4] relative"
              >
                <div className={`w-full h-full relative flex flex-col justify-between transition-opacity duration-200 project-card-interactive-content ${isHidden ? "opacity-0" : "opacity-100"}`}>
                  <div className="w-full h-full relative overflow-hidden bg-black/5 flip-source-el">
                    {coverImg && (
                      <Image
                        src={coverImg.url}
                        alt={project.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 300px"
                        className="object-cover grayscale contrast-115 group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                      />
                    )}
                    <div className="absolute top-6 md:top-10 left-0 right-0 flex flex-col items-center justify-start z-10 pointer-events-none select-none">
                      <span className="text-[6px] md:text-[8px] font-bold text-black uppercase tracking-[0.2em] mb-1">
                        AB &nbsp; &nbsp; &nbsp; SETIMA &nbsp; &nbsp; &nbsp; AB &nbsp; &nbsp; &nbsp; SETIMA
                      </span>
                      <h3 className="font-display font-black text-4xl md:text-6xl tracking-tight leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        OLEÇÃO
                      </h3>
                    </div>
                  </div>
                </div>
                {/* Brutalist Block Reveal Cover */}
                <div className="absolute inset-0 bg-[#000000] z-20 origin-bottom project-card-reveal-block"></div>
              </div>
            );
          })()}
        </div>

        {/* Column 3 */}
        <div className="flex flex-col gap-12 md:gap-24 pt-8 md:pt-16">
          {/* Item 3: Alphabet poster card */}
          {(() => {
            const project = projects.find(p => p.slug === "alphabet-card");
            const coverImg = project?.images?.find(img => img.isCover) || project?.images?.[0];
            const itemId = `item-alphabet-poster-${setId}`;
            const isHidden = hiddenCardId === itemId;

            if (project && coverImg) {
              return (
                <div
                  key={itemId}
                  ref={(el) => { projectRefs.current[itemId] = el; }}
                  onClick={() => openProject(project, itemId)}
                  className="bg-white group cursor-pointer overflow-hidden project-card-interactive shadow-sm transition-colors w-full aspect-[3/4] relative"
                >
                  <div className={`w-full h-full relative flex flex-col justify-between transition-opacity duration-200 project-card-interactive-content ${isHidden ? "opacity-0" : "opacity-100"}`}>
                    <div className="w-full h-full relative overflow-hidden bg-black/5 flip-source-el">
                      <Image
                        src={coverImg.url}
                        alt={project.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 300px"
                        className="object-cover grayscale contrast-115 group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                      />
                    </div>
                  </div>
                  {/* Brutalist Block Reveal Cover */}
                  <div className="absolute inset-0 bg-[#000000] z-20 origin-bottom project-card-reveal-block"></div>
                </div>
              );
            }

            return (
              <div
                key={itemId}
                ref={(el) => { projectRefs.current[itemId] = el; }}
                onClick={() => project && openProject(project, itemId)}
                className="w-full aspect-[3/4] bg-[#000000] p-6 flex flex-col justify-between items-start project-card-interactive relative overflow-hidden group cursor-pointer"
              >
                <div className="font-display font-black text-lg md:text-2xl tracking-[0.2em] text-white uppercase leading-[1.2] break-all select-text font-stretch-ultra-condensed project-card-interactive-content">
                  ABCDEFGHIKL<br />
                  MNÑOPQRSTUV<br />
                  WXYZ
                </div>
                <div className="text-[40px] md:text-[60px] font-display font-black text-white leading-none mt-4 project-card-interactive-content">
                  014
                </div>
                {/* Brutalist Block Reveal Cover */}
                <div className="absolute inset-0 bg-[#000000] z-20 origin-bottom project-card-reveal-block"></div>
              </div>
            );
          })()}

          {/* Item 7: AB Arca logo project */}
          {(() => {
            const project = projects.find(p => p.slug === "ab-arca");
            if (!project) return null;
            const coverImg = project.images.find(img => img.isCover) || project.images[0];
            const itemId = `item-arca-logo-${setId}`;
            const isHidden = hiddenCardId === itemId;

            return (
              <div
                key={itemId}
                ref={(el) => { projectRefs.current[itemId] = el; }}
                onClick={() => openProject(project, itemId)}
                className="bg-white group cursor-pointer overflow-hidden project-card-interactive shadow-sm transition-colors w-full aspect-[4/3] relative"
              >
                <div className={`w-full h-full relative flex flex-col justify-between transition-opacity duration-200 project-card-interactive-content ${isHidden ? "opacity-0" : "opacity-100"}`}>
                  {coverImg ? (
                    <div className="w-full h-full relative overflow-hidden bg-black/5 flip-source-el">
                      <Image
                        src={coverImg.url}
                        alt={project.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 300px"
                        className="object-cover grayscale contrast-115 group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-[#0B0B0B] flex flex-col justify-between p-4 flip-source-el">
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] md:text-[10px] font-bold text-white/50">AB</span>
                        <span className="text-[8px] md:text-[10px] font-bold text-white/50">ARCA</span>
                      </div>
                      <div className="my-auto flex justify-center items-center">
                        <svg className="w-12 h-12 md:w-16 md:h-16 text-[#D4E157]" viewBox="0 0 100 100" fill="currentColor">
                          <path d="M20 20 h35 a25 25 0 0 1 0 50 h-10 l15 20 h-20 l-13 -20 h-7 v20 h-15 z M35 35 v18 h15 a9 9 0 0 0 0 -18 z" />
                        </svg>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-[8px] md:text-[9px] font-mono text-white/40">TYPE DESIGN</span>
                        <span className="text-[8px] md:text-[9px] font-mono text-white/40">MM24</span>
                      </div>
                    </div>
                  )}
                </div>
                {/* Brutalist Block Reveal Cover */}
                <div className="absolute inset-0 bg-[#000000] z-20 origin-bottom project-card-reveal-block"></div>
              </div>
            );
          })()}
        </div>

        {/* Column 4 */}
        <div className="flex flex-col gap-12 md:gap-24 pt-24 md:pt-48">
          {/* Item 4: Brand Identity MM26 project */}
          {(() => {
            const project = projects.find(p => p.slug === "brand-identity-mm26");
            if (!project) return null;
            const coverImg = project.images.find(img => img.isCover) || project.images[0];
            const itemId = `item-brand-identity-mm26-${setId}`;
            const isHidden = hiddenCardId === itemId;

            return (
              <div
                key={itemId}
                ref={(el) => { projectRefs.current[itemId] = el; }}
                onClick={() => openProject(project, itemId)}
                className="bg-white group cursor-pointer overflow-hidden project-card-interactive shadow-sm transition-colors w-full aspect-square relative"
              >
                <div className={`w-full h-full relative flex flex-col justify-between transition-opacity duration-200 project-card-interactive-content ${isHidden ? "opacity-0" : "opacity-100"}`}>
                  {coverImg ? (
                    <div className="w-full h-full relative overflow-hidden bg-black/5 flip-source-el">
                      <Image
                        src={coverImg.url}
                        alt={project.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 300px"
                        className="object-cover grayscale contrast-115 group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-white flex flex-col justify-between p-4 md:p-6 flip-source-el">
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] md:text-[10px] font-bold text-black/60 uppercase">IDENTITY</span>
                        <span className="text-[8px] md:text-[10px] font-bold text-black/60 uppercase">MM26</span>
                      </div>
                      <div className="flex flex-col gap-2.5 w-full items-stretch">
                        <div className="h-2 bg-black"></div>
                        <div className="h-2 bg-black"></div>
                        <div className="h-2 bg-black"></div>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-[7px] md:text-[8px] font-mono text-black/40">BRAND SYSTEM</span>
                        <span className="text-[8px] md:text-[9px] font-sans font-black text-black">© RAHMAT</span>
                      </div>
                    </div>
                  )}
                </div>
                {/* Brutalist Block Reveal Cover */}
                <div className="absolute inset-0 bg-[#000000] z-20 origin-bottom project-card-reveal-block"></div>
              </div>
            );
          })()}

          {/* Item 8: Macbeth project */}
          {(() => {
            const project = projects.find(p => p.slug === "macbeth");
            if (!project) return null;
            const coverImg = project.images.find(img => img.isCover) || project.images[0];
            const itemId = `item-macbeth-${setId}`;
            const isHidden = hiddenCardId === itemId;

            return (
              <div
                key={itemId}
                ref={(el) => { projectRefs.current[itemId] = el; }}
                onClick={() => openProject(project, itemId)}
                className="bg-white group cursor-pointer overflow-hidden project-card-interactive shadow-sm transition-colors w-full aspect-[3/4] relative"
              >
                <div className={`w-full h-full relative flex flex-col justify-between transition-opacity duration-200 project-card-interactive-content ${isHidden ? "opacity-0" : "opacity-100"}`}>
                  {coverImg ? (
                    <div className="w-full h-full relative overflow-hidden bg-black/5 flip-source-el">
                      <Image
                        src={coverImg.url}
                        alt={project.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 300px"
                        className="object-cover grayscale contrast-115 group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-white flex flex-col justify-between p-4 md:p-6 flip-source-el">
                      <div>
                        <span className="font-display font-black text-[7px] md:text-[9px] text-red-600 uppercase tracking-widest block mb-1 leading-none">
                          THE TRAGEDY OF
                        </span>
                        <h4 className="font-sans font-black text-2xl md:text-3xl leading-[0.85] text-black tracking-tight font-stretch-ultra-condensed select-text">
                          AaBb<br />
                          CcDd<br />
                          0123<br />
                          <span className="text-red-600">MACBETH</span>
                        </h4>
                      </div>
                      <div>
                        <span className="font-sans font-bold text-[7px] md:text-[9px] text-red-600 block uppercase leading-none mb-0.5">
                          BY WILLIAM
                        </span>
                        <span className="font-sans font-black text-base md:text-lg text-black block uppercase leading-none tracking-tighter">
                          SHAKESPEARE
                        </span>
                        <span className="font-sans font-bold text-[7px] md:text-[8px] text-black/60 uppercase mt-2 block">
                          NATIONAL THEATER
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                {/* Brutalist Block Reveal Cover */}
                <div className="absolute inset-0 bg-[#000000] z-20 origin-bottom project-card-reveal-block"></div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-transparent select-none">
      {/* 1. Minimal Header (TRANSPARENT background to let cards go underneath) */}
      <header className="fixed top-0 left-0 right-0 h-16 flex justify-between items-center px-6 md:px-12 bg-transparent z-40 mix-blend-difference text-white">
        <div className="font-sans font-bold text-lg md:text-xl tracking-tight flex items-center gap-2">
          <span>Selection</span>
        </div>
        <nav className="flex gap-8 font-sans font-medium text-sm md:text-base uppercase tracking-wider">
          <button 
            onClick={() => {
              setIsDetailOpen(false);
              handleCloseOverlayDirect();
              const container = scrollContainerRef.current;
              if (container) {
                const setElements = container.querySelectorAll(".portfolio-set-row");
                if (setElements.length >= 3) {
                  const singleSetHeight = (setElements[1] as HTMLDivElement).offsetHeight;
                  const spacerHeight = 112; // h-28 = 112px
                  container.scrollTo({ top: spacerHeight + singleSetHeight, behavior: "smooth" });
                }
              }
            }} 
            className="hover:underline hover:opacity-75 transition-opacity"
          >
            Home
          </button>
          <button 
            onClick={() => handleOpenOverlayReveal("about")} 
            className={`hover:underline hover:opacity-75 transition-opacity ${activeOverlay === 'about' ? 'line-through' : ''}`}
          >
            About
          </button>
          <button 
            onClick={() => handleOpenOverlayReveal("contact")} 
            className={`hover:underline hover:opacity-75 transition-opacity ${activeOverlay === 'contact' ? 'line-through' : ''}`}
          >
            Contact
          </button>
        </nav>
      </header>

      {/* 2. STATIONARY / FIXED BACKGROUND TEXT LAYER (Behind the scrolling canvas, z-0) */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden bg-white">
        
        {/* Desktop Vertical BRIGANTI banner on the left background */}
        <div className="hidden md:block absolute top-[120px] left-0 bottom-0 w-32 overflow-hidden flex items-center">
          <div className="text-[25vh] font-black text-black tracking-tighter leading-none uppercase font-display sidebar-text-vertical select-none opacity-100">
            RAHMAT
          </div>
        </div>

        {/* Mobile Bottom Stationary BRIGANTI marquee in background */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 h-24 bg-transparent flex items-end overflow-hidden px-4 z-[1]">
          <div className="text-[17vw] font-black text-black whitespace-nowrap tracking-[0.15em] uppercase font-display flex w-full justify-between leading-none translate-y-2">
            <span>R</span>
            <span>A</span>
            <span>H</span>
            <span>M</span>
            <span>A</span>
            <span>T</span>
          </div>
        </div>

        {/* Stationary version indicator */}
        <div className="absolute left-[150px] md:left-[190px] top-[44vh] font-sans font-bold text-[10px] md:text-xs uppercase tracking-widest text-black">
          <span className="opacity-40">Version</span>
          <span className="ml-8 text-black">
            {projects.find(p => p.slug === "symbol-card")?.year || "MM25.1.1"}
          </span>
        </div>
        
        {/* Stationary brand identity label */}
        <div className="absolute left-[150px] md:left-[190px] top-[48vh] font-sans font-bold text-[10px] md:text-xs uppercase tracking-widest leading-snug text-black">
          {projects.find(p => p.slug === "symbol-card")?.category || "Brand Identity & Visual Communication"}
        </div>

        {/* Stationary bio text block */}
        <div className="absolute right-6 md:right-16 top-[55vh] max-w-[240px] md:max-w-xs font-sans font-bold text-[10px] md:text-xs leading-relaxed text-black select-text pointer-events-auto">
          {projects.find(p => p.slug === "alphabet-card")?.description || "Rahmat Eka is a designer and web developer specializing in brand identity, custom typefaces, and full-stack web experiences, building fast, robust applications."}
        </div>

        {/* Copyright notice in background */}
        <div className="absolute right-6 md:right-16 bottom-8 font-sans font-bold text-xs uppercase tracking-wider text-black">
          © MM26
        </div>
      </div>

      {/* 3. NATIVE VERTICAL SCROLL CANVAS (z-10, draws OVER the background text, UNDER the header text) */}
      {loading ? (
        <div className="w-full h-full flex justify-center items-center font-sans font-bold text-xl uppercase tracking-widest bg-white z-10">
          Loading Portfolio...
        </div>
      ) : (
        <main
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="w-full h-full overflow-y-auto overflow-x-hidden scrollbar-none relative z-10 bg-transparent"
        >
          {/* Flex column wrapper containing 3 duplicated sets of grid content to loop infinitely */}
          <div ref={contentRef} className="flex flex-col">
            
            {/* Top Spacer */}
            <div className="h-28 w-full flex-shrink-0" />

            {/* Set 1 (Top) */}
            <div className="portfolio-set-row max-w-[1440px] mx-auto py-8 w-full bg-transparent">
              {renderCardsSet(1)}
            </div>

            {/* Set 2 (Middle - Center target on mount) */}
            <div className="portfolio-set-row max-w-[1440px] mx-auto py-8 w-full bg-transparent">
              {renderCardsSet(2)}
            </div>

            {/* Set 3 (Bottom) */}
            <div className="portfolio-set-row max-w-[1440px] mx-auto py-8 w-full bg-transparent">
              {renderCardsSet(3)}
            </div>

            {/* Bottom Spacer */}
            <div className="h-28 w-full flex-shrink-0" />

          </div>
        </main>
      )}

      {/* 4. Project Detail View Overlay (ONE FULL SCREEN / ONE PAGE SIZE) */}
      {isDetailOpen && activeProject && (
        <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-[#F7F7F7] overflow-hidden select-text">
          {/* Left panel (Info) */}
          <div className="w-full md:w-1/2 h-[60vh] md:h-full p-6 md:p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-black bg-white z-10">
            {/* Top row (Static Header) */}
            <div className="flex justify-between items-center pb-4 border-b border-black/10">
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

            {/* Middle detailed metadata (Scrollable if content overflows, keeping the layout perfectly solid) */}
            <div className="flex-1 overflow-y-auto scrollbar-none py-6 my-2 max-w-lg w-full">
              {/* Layout labels */}
              <div className="grid grid-cols-3 border-b border-black pb-2 mb-4 font-sans text-[10px] md:text-xs uppercase tracking-wider font-bold text-black/60">
                <span className="detail-pane-text">Title</span>
                <span className="detail-pane-text">Category</span>
                <span className="detail-pane-text">Year</span>
              </div>

              {/* Layout values */}
              <div className="grid grid-cols-3 mb-8 font-sans text-[10px] md:text-xs uppercase font-bold text-black">
                <span className="detail-pane-text pr-2 truncate">{activeProject.title}</span>
                <span className="detail-pane-text pr-2">{activeProject.category}</span>
                <span className="detail-pane-text">{activeProject.year}</span>
              </div>

              {/* Giant Title */}
              <h2 className="detail-pane-text text-3xl md:text-5xl font-black font-display uppercase tracking-tighter leading-none mb-6">
                {activeProject.title}
              </h2>

              {/* Description */}
              <p className="detail-pane-text font-sans text-xs md:text-sm leading-relaxed text-black/80 mb-8">
                {activeProject.description}
              </p>

              {/* Client URL link */}
              {activeProject.projectUrl && (
                <div className="detail-pane-text">
                  <a
                    href={activeProject.projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-black px-4 py-2.5 font-sans font-bold text-[10px] md:text-xs uppercase tracking-wider hover:bg-black hover:text-white transition-colors duration-200"
                  >
                    <span>Visit Project</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Bottom slider controls (Static Footer) */}
            <div className="flex justify-between items-center pt-4 border-t border-black">
              <span className="font-sans font-bold text-[10px] md:text-xs uppercase tracking-wider text-black/60">
                {projects.findIndex((p) => p.slug === activeProject.slug) + 1} / {projects.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => navigateProject("prev")}
                  className="p-2 md:p-3 border border-black hover:bg-black hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 md:w-4 h-4" />
                </button>
                <button
                  onClick={closeProject}
                  className="p-2 md:p-3 border border-black hover:bg-black hover:text-white transition-colors font-sans font-bold text-[10px] md:text-xs uppercase tracking-widest px-4 md:px-6"
                >
                  Close
                </button>
                <button
                  onClick={() => navigateProject("next")}
                  className="p-2 md:p-3 border border-black hover:bg-black hover:text-white transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5 md:w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right panel (Image Container, responsive size) */}
          <div className="w-full md:w-1/2 h-[40vh] md:h-full bg-[#FFFFFF] flex items-center justify-center p-0 relative overflow-hidden">
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

      {/* 5. Custom Full Screen Reveal Overlays (About & Contact) */}
      {activeOverlay && (
        <div className="fixed inset-0 z-50 flex bg-white select-text overflow-y-auto">
          {/* Main Content Node */}
          <div className="w-full min-h-screen p-6 md:p-16 flex flex-col justify-between relative z-10 overlay-content-node">
            {/* Header row */}
            <div className="flex justify-between items-center pb-4 border-b border-black">
              <span className="font-sans font-bold uppercase tracking-wider text-xs md:text-sm">
                Selection
              </span>
              <button 
                onClick={handleCloseOverlayReveal}
                className="p-2 border border-black hover:bg-black hover:text-white transition-colors duration-200 focus:outline-none"
              >
                <X className="w-4 h-4 md:w-5 h-5" />
              </button>
            </div>

            {activeOverlay === "about" ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 my-auto py-12 items-center">
                {/* Left Column: Bio Details (7 Cols) */}
                <div className="lg:col-span-7 space-y-8 pr-0 lg:pr-8">
                  <h1 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight leading-none">
                    ABOUT@RAHMATEKA
                  </h1>
                  
                  <p className="font-sans text-lg md:text-xl leading-relaxed text-black font-medium">
                    Rahmat Eka is a designer and web developer specializing in brand identity, custom typefaces, and full-stack web experiences, building fast, robust, and beautiful applications.
                  </p>
                  
                  <div className="space-y-4 pt-4 font-sans text-sm border-t border-black/10">
                    <div className="grid grid-cols-3 pb-2 border-b border-black/5">
                      <span className="font-bold uppercase text-black/60">Services</span>
                      <span className="col-span-2 font-medium">Fullstack Web Development, Brand Identity, UI/UX Engineering, Database Accents</span>
                    </div>
                    <div className="grid grid-cols-3 pb-2 border-b border-black/5">
                      <span className="font-bold uppercase text-black/60">Skills</span>
                      <span className="col-span-2 font-medium">Next.js, React, Node.js, GSAP, Prisma, Tailwind CSS, SQL</span>
                    </div>
                    <div className="grid grid-cols-3 pb-2">
                      <span className="font-bold uppercase text-black/60">Bio Focus</span>
                      <span className="col-span-2 font-medium">Delivering clean, brutalist grids and high-performance interactive interfaces.</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Profile Picture (5 Cols) */}
                <div className="lg:col-span-5 flex justify-center items-center">
                  <div className="w-full max-w-[360px] aspect-square relative border border-black bg-black/5 overflow-hidden shadow-sm">
                    {/* Render custom upload or fallback */}
                    {projects.find(p => p.slug === "symbol-card")?.images?.length ? (
                      <Image
                        src={projects.find(p => p.slug === "symbol-card")?.images?.[0]?.url || ""}
                        alt="Rahmat Eka Profile Picture"
                        fill
                        className="object-cover grayscale contrast-110"
                        sizes="(max-width: 768px) 100vw, 360px"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col justify-center items-center p-6 text-center">
                        <svg className="w-16 h-16 text-black/40 mb-3" viewBox="0 0 100 100" fill="currentColor">
                          <path d="M50 50 C40 30, 25 25, 15 40 C30 45, 45 45, 50 50 Z" />
                          <path d="M50 50 C60 30, 75 25, 85 40 C70 45, 55 45, 50 50 Z" />
                        </svg>
                        <span className="font-sans font-bold text-xs uppercase text-black/40 tracking-wider">
                          Upload profile photo on Admin (Symbol Card cover image)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-xl mx-auto w-full my-auto py-12 space-y-8">
                <h1 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight leading-none text-center">
                  CONTACT@RAHMATEKA
                </h1>

                <p className="font-sans text-base md:text-lg leading-relaxed text-center text-black/80">
                  Feel free to reach out. Select any coordinate below to open a direct channel of communication.
                </p>

                <div className="space-y-4 font-sans text-sm md:text-base pt-6 border-t border-black">
                  <a 
                    href="mailto:matsganz@gmail.com"
                    className="flex justify-between items-center p-4 border border-black hover:bg-black hover:text-white transition-colors duration-200"
                  >
                    <span className="font-bold uppercase">Email</span>
                    <span className="font-medium font-mono text-xs md:text-sm">matsganz@gmail.com</span>
                  </a>

                  <a 
                    href="https://instagram.com/rhmat.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex justify-between items-center p-4 border border-black hover:bg-black hover:text-white transition-colors duration-200"
                  >
                    <span className="font-bold uppercase">Instagram</span>
                    <span className="font-medium font-mono text-xs md:text-sm">@rhmat.dev</span>
                  </a>

                  <a 
                    href="https://github.com/rhmatzeka"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex justify-between items-center p-4 border border-black hover:bg-black hover:text-white transition-colors duration-200"
                  >
                    <span className="font-bold uppercase">GitHub</span>
                    <span className="font-medium font-mono text-xs md:text-sm">@rhmatzeka</span>
                  </a>

                  <a 
                    href="https://t.me/luwakwhitecofeee"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex justify-between items-center p-4 border border-black hover:bg-black hover:text-white transition-colors duration-200"
                  >
                    <span className="font-bold uppercase">Telegram</span>
                    <span className="font-medium font-mono text-xs md:text-sm">@luwakwhitecofeee</span>
                  </a>
                </div>
              </div>
            )}

            {/* Footer row */}
            <div className="flex justify-between items-center pt-4 border-t border-black">
              <span className="font-sans font-bold text-[10px] md:text-xs uppercase tracking-wider text-black/60">
                MM26.1.1 — © RAHMAT EKA
              </span>
              <button 
                onClick={handleCloseOverlayReveal}
                className="py-2.5 px-6 border border-black hover:bg-black hover:text-white font-sans font-bold text-xs uppercase tracking-widest transition-colors duration-200"
              >
                Close View
              </button>
            </div>
          </div>

          {/* Reveal blocks overlay wrapper */}
          <div className="absolute inset-0 z-20 flex pointer-events-none">
            <div className="flex-1 bg-black origin-bottom overlay-reveal-block"></div>
            <div className="flex-1 bg-black origin-bottom overlay-reveal-block"></div>
            <div className="flex-1 bg-black origin-bottom overlay-reveal-block"></div>
            <div className="flex-1 bg-black origin-bottom overlay-reveal-block"></div>
          </div>
        </div>
      )}
    </div>
  );
}
