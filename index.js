document.addEventListener('DOMContentLoaded', () => {
    // 1. Sticky Navigation Header shadow on scroll
    const header = document.querySelector('.header');
    const scrollThreshold = 50;

    window.addEventListener('scroll', () => {
        if (window.scrollY > scrollThreshold) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 2. Mobile Nav Toggle
    const mobileToggle = document.querySelector('.mobile-nav-toggle');
    const nav = document.querySelector('.nav');
    const navLinks = document.querySelectorAll('.nav-link');

    if (mobileToggle && nav) {
        mobileToggle.addEventListener('click', () => {
            mobileToggle.classList.toggle('active');
            nav.classList.toggle('open');
        });

        // Close menu when links are clicked
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileToggle.classList.remove('active');
                nav.classList.remove('open');
            });
        });
    }

    // 3. Highlight Navigation Links on Scroll
    const sections = document.querySelectorAll('section[id]');
    
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    // 4. Scroll Reveal Animations (Intersection Observer)
    const animElements = document.querySelectorAll('.card-animate');
    
    if ('IntersectionObserver' in window) {
        const observerOptions = {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    observer.unobserve(entry.target); // Trigger only once
                }
            });
        }, observerOptions);

        animElements.forEach(el => observer.observe(el));
    } else {
        // Fallback for older browsers
        animElements.forEach(el => el.classList.add('animated'));
    }

    // 5. Three.js 3D Model Viewer (BasicBoard.glb)
    const init3DViewer = () => {
        const container = document.getElementById('product-3d-canvas-container');
        const overlay = document.getElementById('hint-overlay');
        if (!container) return;

        // Create Scene, Camera, Renderer
        const scene = new THREE.Scene();
        
        // Perspective Camera
        const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(0, 0, 4.5);

        // WebGL Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        container.appendChild(renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        // Camera headlight (always shines directly on the visible surfaces)
        const cameraLight = new THREE.DirectionalLight(0xffffff, 2.2);
        cameraLight.position.set(0, 0, 1);
        camera.add(cameraLight);
        scene.add(camera);

        // Brand-aligned cyan rim lighting
        const dirLight1 = new THREE.DirectionalLight(0x41C9E2, 3.0);
        dirLight1.position.set(5, 5, 5);
        scene.add(dirLight1);

        // White fill light
        const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight2.position.set(-5, -5, -2);
        scene.add(dirLight2);

        // Bright blue highlight light
        const pointLight = new THREE.PointLight(0x008DDA, 2.0, 10);
        pointLight.position.set(0, 2, 2);
        scene.add(pointLight);

        // OrbitControls for interaction
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.minDistance = 2.0;
        controls.maxDistance = 8.0;

        // Interaction tracking
        let isInteracting = false;
        let interactionTimeout;

        const registerInteraction = () => {
            isInteracting = true;
            if (overlay) {
                overlay.classList.add('fade-out');
            }
            clearTimeout(interactionTimeout);
            interactionTimeout = setTimeout(() => {
                isInteracting = false;
            }, 3000); // Resume auto-rotation after 3 seconds of inactivity
        };

        controls.addEventListener('start', registerInteraction);
        controls.addEventListener('change', () => {
            if (controls.state !== -1) {
                registerInteraction();
            }
        });

        // Load GLTF Model
        let model = null;
        const loader = new THREE.GLTFLoader();

        loader.load(
            'BasicBoard.glb',
            (gltf) => {
                model = gltf.scene;

                // Center and scale model to fit view bounding box
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                // Scale to fit viewport perfectly
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 2.6 / maxDim;
                model.scale.set(scale, scale, scale);

                // Center model offset (scale is applied before translation in Three.js matrix)
                model.position.x = -center.x * scale;
                model.position.y = -center.y * scale;
                model.position.z = -center.z * scale;

                // Make materials look bright, metallic & premium
                model.traverse((child) => {
                    if (child.isMesh) {
                        if (child.material) {
                            // If base color is extremely dark or black, make it a nice high-tech slate/navy color
                            const color = child.material.color;
                            if (color && color.r < 0.12 && color.g < 0.12 && color.b < 0.12) {
                                child.material.color.setHex(0x283B55); // Tech blue board body
                            }
                            child.material.roughness = 0.3;
                            child.material.metalness = 0.75;
                            child.material.needsUpdate = true;
                        }
                    }
                });

                // Create pivot to make centered rotation easy
                const pivot = new THREE.Group();
                pivot.add(model);
                scene.add(pivot);
                
                model = pivot;
            },
            undefined,
            (error) => {
                console.error('An error occurred loading the GLB model:', error);
            }
        );

        // Handle resizing dynamically
        const resizeObserver = new ResizeObserver(() => {
            if (!container.clientWidth || !container.clientHeight) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });
        resizeObserver.observe(container);

        // Animation Loop
        const animate = () => {
            requestAnimationFrame(animate);

            controls.update();

            // Rotate slowly if the user is not actively interacting
            if (model && !isInteracting) {
                model.rotation.y += 0.004;
            }

            renderer.render(scene, camera);
        };
        animate();
    };

    init3DViewer();
});
