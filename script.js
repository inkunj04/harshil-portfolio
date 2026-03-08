document.addEventListener('DOMContentLoaded', () => {
    // --------------------------------------------------------
    // Mobile Menu Toggle
    // --------------------------------------------------------
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    const navbar = document.getElementById('navbar');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        
        // Prevent scrolling when menu is open
        if (mobileMenu.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
            
            // Dynamically add ambient shapes if they don't exist yet
            if (mobileMenu.querySelectorAll('.menu-ambient-shape').length === 0) {
                const shape1 = document.createElement('div');
                shape1.classList.add('menu-ambient-shape', 'shape-1');
                const shape2 = document.createElement('div');
                shape2.classList.add('menu-ambient-shape', 'shape-2');
                const shape3 = document.createElement('div');
                shape3.classList.add('menu-ambient-shape', 'shape-3');
                mobileMenu.appendChild(shape1);
                mobileMenu.appendChild(shape2);
                mobileMenu.appendChild(shape3);
            }
        } else {
            document.body.style.overflow = '';
        }
    });

    // Close menu when clicking a link
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // Close menu when clicking outside (on the glass backdrop)
    mobileMenu.addEventListener('click', (e) => {
        if (e.target === mobileMenu) {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // --------------------------------------------------------
    // Mobile Menu - Animated Underline Indicator & Scroll Sync
    // --------------------------------------------------------
    const mobileLinksContainer = document.querySelector('.mobile-links');
    if (mobileLinksContainer && mobileLinks.length > 0) {
        // Create the underline dynamically so we don't touch HTML
        const mobileUnderline = document.createElement('div');
        mobileUnderline.classList.add('mobile-active-underline');
        mobileLinksContainer.appendChild(mobileUnderline);

        // Track current active link
        let currentActiveLink = mobileLinks[0];

        // Function to move underline to a specific link precisely measuring text width
        function moveUnderline(targetLink, isInstant = false) {
            if (!targetLink || !mobileMenu.classList.contains('active')) return;
            
            // To prevent layout caching issues with padding, we force a rapid reflow reading
            // This guarantees subsequent opens don't inherit skewed padding boxes
            const style = window.getComputedStyle(targetLink);
            const paddingLeft = parseFloat(style.paddingLeft);
            const paddingRight = parseFloat(style.paddingRight);
            const textWidth = targetLink.offsetWidth - paddingLeft - paddingRight;

            // Positioning relative to container to allow pure translateX/Y movement
            const linkRect = targetLink.getBoundingClientRect();
            const containerRect = mobileLinksContainer.getBoundingClientRect();
            
            const relativeX = (linkRect.left - containerRect.left) + paddingLeft;
            const relativeY = (linkRect.top - containerRect.top) + targetLink.offsetHeight - 6; // Offset 6px above bottom hit box Edge
            
            if (isInstant) {
                mobileUnderline.style.transition = 'none';
            }

            // Apply transform: translate3d and width based on the newly forced layout
            mobileUnderline.style.transform = `translate3d(${relativeX}px, ${relativeY}px, 0)`;
            mobileUnderline.style.width = `${textWidth}px`; 
            
            if (isInstant) {
                // Restore transition safely after the GPU commits the painted frame
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        mobileUnderline.style.transition = '';
                    });
                });
            }
        }

        // 1. Scroll-Synced Active Section via IntersectionObserver
        const sections = Array.from(mobileLinks).map(link => {
            const href = link.getAttribute('href');
            return href && href.startsWith('#') ? document.querySelector(href) : null;
        }).filter(Boolean);

        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    const matchingLink = Array.from(mobileLinks).find(link => link.getAttribute('href') === `#${id}`);
                    if (matchingLink) {
                        currentActiveLink = matchingLink;
                        if (mobileMenu.classList.contains('active')) {
                            moveUnderline(matchingLink);
                        }
                    }
                }
            });
        }, { rootMargin: '-40% 0px -60% 0px' }); // bias towards the top half of the screen

        sections.forEach(section => sectionObserver.observe(section));

        // 2. Menu Open Behavior: Hard Reset & Snap instantly to correct section
        hamburger.addEventListener('click', () => {
            if (mobileMenu.classList.contains('active')) {
                // Wipe inline cache properties to ensure a clean calculation state
                mobileUnderline.style.transform = '';
                mobileUnderline.style.width = '';
                mobileUnderline.style.transition = 'none';

                // Two frame delay allows the display:flex to mount, CSS to inherit, 
                // and the bounding box to stabilize before taking measurements.
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        moveUnderline(currentActiveLink, true);
                    });
                });
            } else {
                 // Clean up when closing to guarantee fresh state next time
                 mobileUnderline.style.opacity = '0';
                 setTimeout(() => {
                     if (!mobileMenu.classList.contains('active')) {
                         mobileUnderline.style.transform = '';
                         mobileUnderline.style.width = '';
                     }
                 }, 300);
            }
        });

        // 3. Click listeners for the links to move the underline manually
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                currentActiveLink = link;
                moveUnderline(link);
            });
        });
    }

    // --------------------------------------------------------
    // Global Scroller (Throttled + rAF Optimized)
    // --------------------------------------------------------
    let lastKnownScrollY = 0;
    let ticking = false;
    const heroContent = document.querySelector('.js-hero-exit');
    const cameraBridge = document.querySelector('.camera-bridge');
    // Cache queries and sizing so we don't query the DOM within the rapidly firing scroll handler
    const windowHeight = window.innerHeight;
    const isDesktop = window.innerWidth >= 768; // Cheaper than matchMedia on load occasionally
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Cache mobile parallax targets once, not per-frame
    const mobileHeroSection = !isDesktop ? document.getElementById('home') : null;
    const mobileAboutSection = !isDesktop ? document.getElementById('about') : null;

    function onScrollUpdate() {
        const scrolled = lastKnownScrollY;

        // 1. Navbar Scroll Effect
        if (scrolled > 30) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // 2. Cinematic Scroll Transitions
        if (isDesktop && heroContent) {
            // Desktop Behavior (Unchanged)
            if (scrolled > 100) {
                heroContent.classList.add('hero-exit');
            } else {
                heroContent.classList.remove('hero-exit');
            }

            if (cameraBridge) {
                if (scrolled > windowHeight * 0.3 && scrolled < windowHeight * 1.2) {
                    cameraBridge.classList.add('bridge-active');
                    cameraBridge.classList.remove('bridge-fade-out');
                } else if (scrolled >= windowHeight * 1.2) {
                    cameraBridge.classList.add('bridge-fade-out');
                    cameraBridge.classList.remove('bridge-active');
                } else {
                    cameraBridge.classList.remove('bridge-active');
                    cameraBridge.classList.remove('bridge-fade-out');
                }
            }
        } else if (!isDesktop && !prefersReducedMotion && mobileHeroSection && mobileAboutSection) {
            // Mobile Premium Parallax Scroll Transition
            // Calculate scroll progress relative to the exact first viewport height
            const progress = Math.min(Math.max(scrolled / windowHeight, 0), 1);
            
            if (progress < 1) {
                // Hero Section: Lift (-10% max), fade (0.92 min opacity), blur (2px max)
                const heroY = progress * -10; // outputs 0 to -10
                const heroOpacity = 1 - (progress * 0.08); // outputs 1 to 0.92
                const heroBlur = progress * 2; // outputs 0 to 2
                
                heroContent.style.transform = `translate3d(0, ${heroY}%, 0)`;
                heroContent.style.opacity = heroOpacity;
                heroContent.style.filter = `blur(${heroBlur}px)`;
                
                // About Section Start Pre-calculation
                // It starts slightly pushed down and returns to 0 as hero disappears
                const aboutY = 20 - (progress * 20); // outputs 20 to 0
                const aboutOpacity = 0.85 + (progress * 0.15); // outputs 0.85 to 1
                
                // Apply directly to the about container instead of waiting for IntersectionObserver
                mobileAboutSection.style.transform = `translate3d(0, ${aboutY}px, 0)`;
                mobileAboutSection.style.opacity = aboutOpacity;
            } else {
                // Clean up inline styles once fully scrolled past to let standard CSS takeover
                heroContent.style.transform = '';
                heroContent.style.opacity = '';
                heroContent.style.filter = '';
                mobileAboutSection.style.transform = '';
                mobileAboutSection.style.opacity = '';
            }
        }

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        lastKnownScrollY = window.scrollY;
        if (!ticking) {
            window.requestAnimationFrame(onScrollUpdate);
            ticking = true;
        }
    }, { passive: true });

    // --------------------------------------------------------
    // Lightweight Intersection Observer for Cinematic Entry (NO LAG)
    // --------------------------------------------------------
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15 
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Faux Depth cinematic entry for About Section
                if (entry.target.classList.contains('depth-reveal')) {
                    entry.target.classList.add('visible-depth');
                }

                // If it's the about container or reels container, handle staggered card/phone delays
                if (entry.target.classList.contains('about-container') || entry.target.classList.contains('reels-container')) {
                    // Target either skill pills (About) or phone frames (Reels)
                    const staggerItems = entry.target.querySelectorAll('.skill-pill, .reel-phone');
                    staggerItems.forEach((item, index) => {
                        // Stagger items: 300ms base + 80ms per index
                        item.style.transitionDelay = `${300 + (index * 80)}ms`;
                    });
                }
                
                entry.target.classList.add('visible');
                
                // Cleanup will-change after animation to save memory tracking
                setTimeout(() => {
                    const elements = entry.target.querySelectorAll('.anim-image, .anim-name, .anim-quote, .anim-text, .skill-pill, .reel-phone');
                    elements.forEach(el => el.style.willChange = 'auto');
                }, 1500);

                // Only trigger once
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all staggered containers (About, Reels)
    const staggerContainers = document.querySelectorAll('.about-container, .reels-container');
    staggerContainers.forEach(container => {
        observer.observe(container);
    });
    
    // Fallback for basic reveal elements
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    revealElements.forEach(el => {
        if (!el.classList.contains('about-container') && !el.classList.contains('reels-container')) {
            observer.observe(el);
        }
    });

    // --------------------------------------------------------
    // Magnetic Navbar Links (Premium Micro-Interaction)
    // --------------------------------------------------------
    const navAnchors = document.querySelectorAll('.nav-links a');
    
    // Only apply on fine-pointer devices (desktop)
    if (window.matchMedia("(min-width: 768px)").matches && window.matchMedia("(pointer: fine)").matches) {
        navAnchors.forEach(link => {
            link.addEventListener('mousemove', (e) => {
                const rect = link.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                window.requestAnimationFrame(() => {
                    link.style.transform = `translate3d(${x * 0.25}px, ${y * 0.25}px, 0)`;
                });
            }, { passive: true });
            
            link.addEventListener('mouseleave', () => {
                window.requestAnimationFrame(() => {
                    link.style.transform = `translate3d(0, 0, 0)`;
                });
            }, { passive: true });
        });
    }

    // --------------------------------------------------------
    // Hero Interactive Cursor Glow
    // --------------------------------------------------------
    const cursorGlow = document.getElementById('hero-cursor-glow');
    const heroSection = document.getElementById('home');
    
    // Only run cursor glow tracking on desktop/tablet devices with fine pointers
    if (window.matchMedia("(min-width: 768px)").matches && window.matchMedia("(pointer: fine)").matches && cursorGlow && heroSection) {
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let currentX = mouseX;
        let currentY = mouseY;
        let isHovering = false;
        let animationFrameId = null;
        
        // Smooth interpolation factor
        const ease = 0.08; 

        function animateGlow() {
            if (!isHovering) return;
            
            const dx = mouseX - currentX;
            const dy = mouseY - currentY;
            
            if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                currentX += dx * ease;
                currentY += dy * ease;
                
                // Use cached window innerWidth/Height during animation loop to avoid layout thrashing
                const offsetX = currentX - (window.innerWidth / 2);
                const offsetY = currentY - (window.innerHeight / 2);
                
                cursorGlow.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
                animationFrameId = requestAnimationFrame(animateGlow);
            } else {
                animationFrameId = null; 
            }
        }

        heroSection.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            if (!isHovering) {
                isHovering = true;
                cursorGlow.classList.add('active'); 
                if (!animationFrameId) {
                    animateGlow(); 
                }
            } else if (!animationFrameId) {
                animateGlow();
            }
        }, { passive: true });

        heroSection.addEventListener('mouseleave', () => {
            isHovering = false;
            cursorGlow.classList.remove('active'); 
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });
    }

    // --------------------------------------------------------
    // Floating Skill Tags (Collision-Safe, Mobile & Desktop)
    // --------------------------------------------------------
    if (heroSection) {
        const skills = ['Video Editing', 'Cinematography', 'Color Grading', 'Storytelling', 'Reels & Short-form'];
        
        // Define safe zones for both layouts (prevents overlapping)
        // Desktop uses wider positioning to stay away from the center content
        // Mobile uses tighter but defined areas
        const isDesktopView = window.innerWidth >= 768;
        
        const safeZones = isDesktopView ? [
            { top: '15%', left: '8%' },      // Top Left
            { top: '25%', right: '10%' },    // Top Right
            { top: '65%', left: '5%' },      // Mid Left
            { bottom: '15%', right: '12%' }, // Bottom Right
            { bottom: '10%', left: '30%' }   // Bottom Center-Left
        ] : [
            { top: '12%', left: '5%' },      // Top Left
            { top: '20%', right: '5%' },     // Top Right
            { top: '70%', left: '5%' },      // Mid Left
            { bottom: '12%', right: '8%' },  // Bottom Right
            { top: '8%', right: '35%' }      // Top Center
        ];

        skills.forEach((skill, index) => {
            const tag = document.createElement('div');
            // We use a unified class that will handle styling for both, 
            // with CSS handling size differences
            tag.classList.add('floating-skill-tag');
            tag.textContent = skill;
            
            const pos = safeZones[index % safeZones.length];
            if (pos.top) tag.style.top = pos.top;
            if (pos.left) tag.style.left = pos.left;
            if (pos.right) tag.style.right = pos.right;
            if (pos.bottom) tag.style.bottom = pos.bottom;
            
            // Randomize oscillation speed and starting delays purely for natural feel
            // Speed is slowed down slightly for desktop for elegance
            const baseDuration = isDesktopView ? 8 : 6;
            const animDuration = baseDuration + Math.random() * 4;
            const animDelay = Math.random() * -5;
            
            tag.style.animationDuration = `${animDuration}s`;
            tag.style.animationDelay = `${animDelay}s`;
            
            heroSection.appendChild(tag);
        });
    }

    // --------------------------------------------------------
    // Mobile Hero Enhancements (<768px)
    // --------------------------------------------------------
    if (window.innerWidth < 768 && heroSection) {

        // 2. Scroll Indicator
        const scrollIndicator = document.createElement('div');
        scrollIndicator.classList.add('mobile-scroll-indicator');
        heroSection.appendChild(scrollIndicator);

        // 3. Orbit Shapes Behind Title
        const heroContentGroupMobile = heroSection.querySelector('.hero-content-group');
        if (heroContentGroupMobile) {
            const orbit1 = document.createElement('div');
            orbit1.classList.add('mobile-orbit-shape', 'orbit-1');
            const orbit2 = document.createElement('div');
            orbit2.classList.add('mobile-orbit-shape', 'orbit-2');
            
            heroContentGroupMobile.style.position = 'relative'; 
            heroContentGroupMobile.insertBefore(orbit1, heroContentGroupMobile.firstChild);
            heroContentGroupMobile.insertBefore(orbit2, heroContentGroupMobile.firstChild);
        }

        // 5. Floating Micro Particles
        for (let i = 0; i < 6; i++) {
            const particle = document.createElement('div');
            particle.classList.add('mobile-micro-particle');
            
            const size = 2 + Math.random() * 4;
            const top = 10 + Math.random() * 80;
            const left = 5 + Math.random() * 90;
            const opacity = 0.05 + Math.random() * 0.15;
            
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.top = `${top}%`;
            particle.style.left = `${left}%`;
            particle.style.opacity = opacity;
            
            const animDuration = 10 + Math.random() * 10;
            const animDelay = Math.random() * -10;
            particle.style.animationDuration = `${animDuration}s`;
            particle.style.animationDelay = `${animDelay}s`;
            
            heroSection.appendChild(particle);
        }
    }

    // --------------------------------------------------------
    // Heritage Reels: Interactive Hover & Modal Player
    // --------------------------------------------------------
    const reelPhones = document.querySelectorAll('.reel-phone');
    const videoModal = document.getElementById('video-modal');
    const modalVideo = document.getElementById('modal-video');
    const modalCloseBtn = document.querySelector('.modal-close');
    const modalOverlay = document.querySelector('.modal-overlay');

    if (reelPhones.length > 0 && videoModal) {
        
        // 1. Hover, Touch, & CPU Formatting
        let activePhone = null;

        reelPhones.forEach(phone => {
            const video = phone.querySelector('video');
            if (!video) return;

            // Enforce default paused state to save CPU
            video.pause();

            // Progress bar sync
            const progressBar = phone.querySelector('.preview-progress');
            if (progressBar) {
                video.addEventListener('timeupdate', () => {
                    if (video.duration) {
                        const percent = (video.currentTime / video.duration) * 100;
                        progressBar.style.width = `${percent}%`;
                    }
                });
            }

            // Helper to activate preview
            const playPreview = () => {
                // Pause any currently playing preview
                if (activePhone && activePhone !== phone) {
                    const activeVid = activePhone.querySelector('video');
                    activePhone.classList.remove('hover-active');
                    if (activeVid) {
                        activeVid.pause();
                        activeVid.currentTime = 0;
                    }
                    activePhone.style.transform = ''; // Clear parallax of last
                }
                
                activePhone = phone;
                phone.classList.add('hover-active');
                video.muted = true; 
                video.play().catch(e => console.log("Preview prevented:", e));
            };

            // Desk parallax interaction
            let tickingParallax = false;
            phone.addEventListener('mousemove', (e) => {
                if (window.innerWidth >= 1024) {
                    if (!tickingParallax) {
                        window.requestAnimationFrame(() => {
                            const rect = phone.getBoundingClientRect();
                            const xPct = ((e.clientX - rect.left) / rect.width) - 0.5;
                            const yPct = ((e.clientY - rect.top) / rect.height) - 0.5;
                            const rY = xPct * 8; // 4deg max
                            const rX = -yPct * 8; 
                            // Inherits hover lift but adds rotation
                            const baseT = phone.classList.contains('featured') ? 'translate3d(0, -18px, 0)' : 'translateY(-8px)';
                            phone.style.transform = `perspective(1000px) ${baseT} scale(1.02) rotateX(${rX}deg) rotateY(${rY}deg)`;
                            tickingParallax = false;
                        });
                        tickingParallax = true;
                    }
                }
            });

            // Helper to stop preview
            const stopPreview = () => {
                phone.classList.remove('hover-active');
                if (activePhone === phone) activePhone = null;
                video.pause();
                video.currentTime = 0; 
                phone.style.transform = ''; // Wipe inline style
            };

            // Desktop Hover State
            phone.addEventListener('mouseenter', playPreview);
            phone.addEventListener('mouseleave', stopPreview);

            // 2. Click / Tap to Open Fullscreen Modal
            phone.addEventListener('click', (e) => {
                // On touch devices, the first tap acts as a hover (triggering mouseenter).
                // We ensure the overlay is active before allowing the click to open the modal.
                // If it wasn't active, the hover logic just activated it, so we prevent modal opening this time.
                if (window.matchMedia("(hover: none)").matches && !phone.classList.contains('hover-active')) {
                    playPreview();
                    return; // Stop click from proceeding to modal on first tap
                }

                const source = video.querySelector('source');
                if (source) {
                    // Explicitly kill the background preview decoding to prevent modal stutter
                    stopPreview();

                    modalVideo.src = source.src;
                    modalVideo.load();
                    
                    videoModal.classList.add('active');
                    videoModal.setAttribute('aria-hidden', 'false');
                    document.body.style.overflow = 'hidden'; // Lock background scrolling
                    
                    modalVideo.muted = false; // Unmute full feature playback
                    modalVideo.play().catch(e => console.log("Modal play prevented:", e));
                }
            });
        });

        // 3. Modal Closure Cleanup
        const closeModal = () => {
            videoModal.classList.remove('active');
            videoModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = ''; // Unlock scrolling
            
            modalVideo.pause();
            modalVideo.currentTime = 0;
            modalVideo.removeAttribute('src'); // Dump memory hook
            modalVideo.load();
        };

        if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
        if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && videoModal.classList.contains('active')) {
                closeModal();
            }
        });
    }

    // --------------------------------------------------------
    // Video Viewport Observer — pause off-screen videos
    // Prevents hidden videos from burning CPU/GPU decode budget
    // --------------------------------------------------------
    const allReelPhones = document.querySelectorAll('[class*="reel-phone"], .reel-card, .phone-wrapper');
    if (allReelPhones.length > 0) {
        const videoVisibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const vid = entry.target.querySelector('video');
                if (!vid) return;
                if (!entry.isIntersecting) {
                    // Card left viewport — always pause to free decode budget
                    vid.pause();
                    entry.target.classList.remove('hover-active');
                }
                // We intentionally do NOT auto-play on re-enter;
                // the existing hover/touch logic handles playback.
            });
        }, { threshold: 0.1 });

        allReelPhones.forEach(phone => videoVisibilityObserver.observe(phone));
    }

    // --------------------------------------------------------
    // Lazy-image booster — add decoding=async to any image
    // that doesn't already have it (runtime safety net)
    // --------------------------------------------------------
    document.querySelectorAll('img:not([decoding])').forEach(img => {
        img.decoding = 'async';
    });
    document.querySelectorAll('img:not([loading])').forEach(img => {
        if (!img.closest('[id="home"]')) { // Don't lazy-load hero image
            img.loading = 'lazy';
        }
    });

});

