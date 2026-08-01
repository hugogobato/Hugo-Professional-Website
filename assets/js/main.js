// ===== Multilingual (i18n) Logic =====
(function() {
    let currentLang = localStorage.getItem('site-lang') || 'en';
    
    if (!['en', 'pt', 'fr', 'nl', 'es'].includes(currentLang)) {
        currentLang = 'en';
    }

    const langBtn = document.getElementById('lang-btn');
    const langDropdown = document.getElementById('lang-dropdown');
    const langOpts = document.querySelectorAll('.lang-opt');
    const langCurrentSpan = document.querySelector('.lang-current');

    if (langBtn && langDropdown) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            langBtn.classList.toggle('active');
            langDropdown.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            langBtn.classList.remove('active');
            langDropdown.classList.remove('active');
        });
    }

    function setLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('site-lang', lang);
        document.documentElement.setAttribute('lang', lang);

        if (langCurrentSpan) {
            langCurrentSpan.textContent = lang.toUpperCase();
        }

        langOpts.forEach(opt => {
            opt.classList.toggle('active', opt.getAttribute('data-lang') === lang);
        });

        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (window.TRANSLATIONS && window.TRANSLATIONS[lang] && window.TRANSLATIONS[lang][key]) {
                el.innerHTML = window.TRANSLATIONS[lang][key];
            }
        });

        const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        placeholders.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (window.TRANSLATIONS && window.TRANSLATIONS[lang] && window.TRANSLATIONS[lang][key]) {
                el.setAttribute('placeholder', window.TRANSLATIONS[lang][key]);
            }
        });

        document.querySelectorAll('.pub-citations').forEach(el => {
            if (!el.hasAttribute('data-original-citations')) {
                el.setAttribute('data-original-citations', el.textContent.trim());
            }
            const origText = el.getAttribute('data-original-citations');
            const match = origText.match(/\d+[\d,]*/);
            if (match && window.TRANSLATIONS && window.TRANSLATIONS[lang] && window.TRANSLATIONS[lang]['pub_citations']) {
                const label = window.TRANSLATIONS[lang]['pub_citations'];
                el.textContent = `${match[0]} ${label}`;
            }
        });

        document.querySelectorAll('.pub-wip-badge').forEach(el => {
            if (window.TRANSLATIONS && window.TRANSLATIONS[lang] && window.TRANSLATIONS[lang]['pub_wip_badge']) {
                el.textContent = window.TRANSLATIONS[lang]['pub_wip_badge'];
            }
        });

        window.dispatchEvent(new CustomEvent('languagechanged', { detail: lang }));
    }

    langOpts.forEach(opt => {
        opt.addEventListener('click', () => {
            const lang = opt.getAttribute('data-lang');
            setLanguage(lang);
        });
    });

    window.addEventListener('DOMContentLoaded', () => {
        // Run immediately in case DOMContentLoaded has already fired or is firing
        setLanguage(currentLang);
    });

    // Run immediately as well to prevent flicker
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        setLanguage(currentLang);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            setLanguage(currentLang);
        });
    }

    window.getCurrentLang = () => currentLang;
})();

// ===== Research-themed Canvas: Causal DAG + Topology + Math =====
(function () {
    const canvas = document.getElementById('topology-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let nodes = [];
    let symbols = [];
    let w, h;
    const NODE_COUNT = 55;
    const MAX_DIST = 150;
    const SIMPLEX_DIST = 110;
    let time = 0;

    // Math & research symbols that float across - ENHANCED for visibility
    const SYMBOL_POOL = [
        'E[Y|do(X)]', 'ATE', 'CATE', 'H₀', 'H₁', 'β₁',
        'P(Y|X)', 'τ(x)', '∂/∂x', '∫ f(x)dx', '∑ xᵢ', 'Σ',
        'do(X=x)', 'P(Yˣ | X=x\')', 'E[Y¹-Y⁰]', '∇θ J(θ)',
        'RV_t = ∑ rᵢ²', 'σ²', 'W₂(p,q)', 'π(a|s)',
        'X → Y', 'X ← U → Y', 'ε ~ N(0,1)', 'θ*', 'λ',
        'H₁(K)', 'βᵢ(X)', 'Persistent Homology', 'd(x,y)',
        'do-calculus', 'SCM: Y := f(X, U)', 'Counterfactual'
    ];

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }

    function initNodes() {
        nodes = [];
        for (let i = 0; i < NODE_COUNT; i++) {
            const type = Math.random();
            nodes.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                r: Math.random() * 2 + 1,
                // Node types: treatment, outcome, confounder, regular
                kind: type < 0.08 ? 'treatment' : type < 0.16 ? 'outcome' : type < 0.22 ? 'confounder' : 'regular',
            });
        }
    }

    function initSymbols() {
        symbols = [];
        const count = Math.max(12, Math.floor(w / 100)); // More symbols
        for (let i = 0; i < count; i++) {
            symbols.push({
                text: SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)],
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -0.2 - Math.random() * 0.4,
                alpha: 0.15 + Math.random() * 0.25, // More visible
                size: 14 + Math.random() * 12, // Larger
            });
        }
    }

    function nodeColor(kind, alpha) {
        switch (kind) {
            case 'treatment': return `rgba(0, 200, 83, ${alpha})`;   // green
            case 'outcome': return `rgba(255, 109, 0, ${alpha})`;    // orange
            case 'confounder': return `rgba(255, 193, 7, ${alpha})`; // gold
            default: return `rgba(79, 140, 255, ${alpha})`;
        }
    }

    function drawArrow(x1, y1, x2, y2, alpha) {
        const headLen = 6;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dy, dx);
        // Shorten line so arrow doesn't overlap node
        const ex = x2 - Math.cos(angle) * 8;
        const ey = y2 - Math.sin(angle) * 8;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = `rgba(255, 109, 0, ${alpha * 0.7})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle - 0.4), ey - headLen * Math.sin(angle - 0.4));
        ctx.lineTo(ex - headLen * Math.cos(angle + 0.4), ey - headLen * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 109, 0, ${alpha * 0.7})`;
        ctx.fill();
    }

    function draw() {
        ctx.clearRect(0, 0, w, h);
        time += 0.005;

        // 1. Draw simplex triangles (persistent homology)
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                for (let k = j + 1; k < nodes.length; k++) {
                    const d1 = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
                    const d2 = Math.hypot(nodes[j].x - nodes[k].x, nodes[j].y - nodes[k].y);
                    const d3 = Math.hypot(nodes[i].x - nodes[k].x, nodes[i].y - nodes[k].y);
                    if (d1 < SIMPLEX_DIST && d2 < SIMPLEX_DIST && d3 < SIMPLEX_DIST) {
                        const avgDist = (d1 + d2 + d3) / 3;
                        const alpha = (1 - avgDist / SIMPLEX_DIST) * 0.04;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.lineTo(nodes[k].x, nodes[k].y);
                        ctx.closePath();
                        ctx.fillStyle = `rgba(79, 140, 255, ${alpha})`;
                        ctx.fill();
                    }
                }
            }
        }

        // 2. Draw edges — some as directed arrows (causal), some as undirected
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MAX_DIST) {
                    const alpha = (1 - dist / MAX_DIST) * 0.2;
                    const isCausal =
                        (nodes[i].kind === 'treatment' && nodes[j].kind === 'outcome') ||
                        (nodes[i].kind === 'confounder' && (nodes[j].kind === 'treatment' || nodes[j].kind === 'outcome'));

                    if (isCausal) {
                        drawArrow(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y, alpha);
                    } else {
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.strokeStyle = `rgba(79, 140, 255, ${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
        }

        // 3. Draw nodes with color by type
        for (const node of nodes) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
            ctx.fillStyle = nodeColor(node.kind, 0.5);
            ctx.fill();
            // Subtle glow for special nodes
            if (node.kind !== 'regular') {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.r + 3, 0, Math.PI * 2);
                ctx.fillStyle = nodeColor(node.kind, 0.08);
                ctx.fill();
            }
        }

        // 4. Floating math symbols
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const sym of symbols) {
            const flicker = 0.5 + 0.5 * Math.sin(time * 2 + sym.x);
            ctx.font = `bold ${sym.size}px 'JetBrains Mono', monospace`; // Bold for visibility
            ctx.shadowBlur = 10;
            ctx.shadowColor = `rgba(59, 130, 246, ${sym.alpha * 0.5})`;
            ctx.fillStyle = `rgba(255, 255, 255, ${sym.alpha * flicker})`; // White text for maximum contrast
            ctx.fillText(sym.text, sym.x, sym.y);
            ctx.shadowBlur = 0; // Reset for other drawing
        }
    }

    function update() {
        // Mouse interaction for topology nodes
        const mouse = window.topologyMouse || { x: -1000, y: -1000 };
        
        for (const node of nodes) {
            // Mouse repulsion
            const dx = node.x - mouse.x;
            const dy = node.y - mouse.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 150) {
                const force = (150 - dist) / 150;
                node.vx += (dx / dist) * force * 0.5;
                node.vy += (dy / dist) * force * 0.5;
            }

            node.x += node.vx;
            node.y += node.vy;
            
            // Friction
            node.vx *= 0.99;
            node.vy *= 0.99;

            if (node.x < 0 || node.x > w) node.vx *= -1;
            if (node.y < 0 || node.y > h) node.vy *= -1;
        }
        for (const sym of symbols) {
            sym.x += sym.vx;
            sym.y += sym.vy;
            if (sym.y < -30) {
                sym.y = h + 20;
                sym.x = Math.random() * w;
                sym.text = SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)];
            }
            if (sym.x < -50 || sym.x > w + 50) sym.vx *= -1;
        }
    }

    function animate() {
        update();
        draw();
        requestAnimationFrame(animate);
    }

    resize();
    initNodes();
    initSymbols();
    animate();

    window.addEventListener('resize', () => {
        resize();
        initNodes();
        initSymbols();
    });
})();

// ===== Navbar scroll effect =====
const navbar = document.getElementById('navbar');
if (navbar) {
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 10);
    });
}

// ===== Mobile navigation toggle =====
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');

if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
}

// ===== Active nav link on scroll =====
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

function updateActiveNav() {
    const scrollY = window.scrollY + 120;
    sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        if (scrollY >= top && scrollY < top + height) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + id) {
                    link.classList.add('active');
                }
            });
        }
    });
}

window.addEventListener('scroll', updateActiveNav);

// ===== Typing Effect =====
(function () {
    const target = document.getElementById('typing-target');
    if (!target) return;

    const phrasesByLang = {
        en: [
            'Principal Causal AI Research Scientist @ Dell',
            'Researcher in Causal Inference & Agentic AI',
            'Former OpenAI Red Teaming Network Researcher',
            '20+ published papers | 5,400+ citations',
        ],
        pt: [
            'Principal Causal AI Research Scientist @ Dell',
            'Pesquisador em Causal Inference & Agentic AI',
            'Ex-Pesquisador da OpenAI Red Teaming Network',
            '20+ artigos publicados | 5.400+ citações',
        ],
        fr: [
            'Principal Causal AI Research Scientist @ Dell',
            'Chercheur en Causal Inference & Agentic AI',
            'Ancien Chercheur de l\'OpenAI Red Teaming Network',
            '20+ articles publiés | 5 400+ citations',
        ],
        nl: [
            'Principal Causal AI Research Scientist @ Dell',
            'Onderzoeker in Causal Inference & Agentic AI',
            'Voormalig OpenAI Red Teaming Network Onderzoeker',
            '20+ gepubliceerde papers | 5.400+ citaties',
        ],
        es: [
            'Principal Causal AI Research Scientist @ Dell',
            'Investigador en Causal Inference & Agentic AI',
            'Ex-Investigador de OpenAI Red Teaming Network',
            '20+ artículos publicados | 5.400+ citas',
        ]
    };

    let currentLang = window.getCurrentLang ? window.getCurrentLang() : 'en';
    let phrases = phrasesByLang[currentLang] || phrasesByLang['en'];

    let phraseIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let delay = 80;
    let timerId = null;

    function type() {
        const current = phrases[phraseIdx];

        if (isDeleting) {
            target.innerHTML = current.substring(0, charIdx - 1) + '<span class="cursor"></span>';
            charIdx--;
            delay = 30;
        } else {
            target.innerHTML = current.substring(0, charIdx + 1) + '<span class="cursor"></span>';
            charIdx++;
            delay = 70;
        }

        if (!isDeleting && charIdx === current.length) {
            delay = 2000;
            isDeleting = true;
        } else if (isDeleting && charIdx === 0) {
            isDeleting = false;
            phraseIdx = (phraseIdx + 1) % phrases.length;
            delay = 400;
        }

        timerId = setTimeout(type, delay);
    }

    type();

    window.addEventListener('languagechanged', (e) => {
        const newLang = e.detail;
        phrases = phrasesByLang[newLang] || phrasesByLang['en'];
        phraseIdx = 0;
        charIdx = 0;
        isDeleting = false;
        if (timerId) clearTimeout(timerId);
        type();
    });
})();

// ===== Animated Counters =====
(function () {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    let counted = false;

    function animateCounters() {
        if (counted) return;
        const hero = document.getElementById('hero');
        if (!hero || !counters.length) return;
        const rect = hero.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
            counted = true;
            counters.forEach(counter => {
                const target = parseInt(counter.getAttribute('data-target'));
                const duration = 2000;
                const start = performance.now();

                function step(now) {
                    const elapsed = now - start;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    const value = Math.floor(eased * target);
                    counter.textContent = target > 999 ? value.toLocaleString() : value;
                    if (progress < 1) requestAnimationFrame(step);
                    else counter.textContent = target > 999 ? target.toLocaleString() : target;
                }

                requestAnimationFrame(step);
            });
        }
    }

    window.addEventListener('scroll', animateCounters);
    animateCounters();
})();

// ===== Scroll-triggered fade-in animations =====
(function () {
    const elements = document.querySelectorAll(
        '.timeline-item, .edu-card, .pub-item, .award-card, .conf-card, .skill-category, .social-card, .detail-card, .story-chapter, .counterfactual-container, .tda-insight, .causal-rl-insight, .quote-card, .explore-card, .theme-card, .entry-card, .media-card, .service-card, .software-card'
    );

    elements.forEach(el => el.classList.add('fade-in'));

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );

    elements.forEach(el => observer.observe(el));
})();

// ===== Skill Bar Animations =====
(function () {
    const bars = document.querySelectorAll('.skill-bar[data-level]');

    bars.forEach(bar => {
        bar.style.setProperty('--bar-width', bar.getAttribute('data-level') + '%');
    });

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.5 }
    );

    bars.forEach(bar => observer.observe(bar));
})();

// ===== Publication Filter =====
(function () {
    const buttons = document.querySelectorAll('.pub-filter-btn');
    const items = document.querySelectorAll('.pub-item');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');

            items.forEach(item => {
                if (filter === 'all') {
                    item.classList.remove('hidden');
                } else {
                    const category = item.getAttribute('data-category') || '';
                    if (category.includes(filter)) {
                        item.classList.remove('hidden');
                    } else {
                        item.classList.add('hidden');
                    }
                }
            });
        });
    });
})();

// ===== Image Lightbox =====
(function () {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxClose = document.getElementById('lightbox-close');

    if (!lightbox) return;

    // Clickable images
    document.querySelectorAll('.story-img img, .award-image img, .conf-image img, .social-image img, .zoomable img').forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
            lightboxImg.src = img.src;
            lightboxCaption.textContent = img.alt || '';
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', e => {
        if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeLightbox();
    });
})();

// ===== Interactive Topology Canvas Enhancement =====
(function() {
    const canvas = document.getElementById('topology-canvas');
    if (!canvas) return;
    
    let mouse = { x: -1000, y: -1000 };
    window.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    // We'll wrap the existing animate loop or add a mouse interaction to it
    // For now, let's add a global mouse object that the main script can use
    window.topologyMouse = mouse;
})();

// ===== Causal RL: Interventional Agent Logic (High Detail) =====
(function() {
    const canvas = document.getElementById('cf-canvas');
    const status = document.getElementById('cf-status');
    const math = document.getElementById('cf-math');
    const log = document.getElementById('cf-log');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let w, h;
    let mode = 'obs';
    let particles = [];
    let agentPos = { x: 200, y: 300 };
    let targetPos = { x: 300, y: 200 };
    let time = 0;

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        w = canvas.width = rect.width;
        h = canvas.height = rect.height;
        initParticles();
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < 30; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                speed: 0.2 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    function drawGrid() {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        const spacing = 40;
        for (let x = 0; x < w; x += spacing) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
        }
        for (let y = 0; y < h; y += spacing) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
        }
        ctx.stroke();
    }

    function drawAgent(x, y, isGhost = false) {
        const alpha = isGhost ? 0.2 : 1;
        const color = mode === 'obs' ? '#3b82f6' : '#f97316';
        
        ctx.save();
        ctx.translate(x, y);
        
        // Agent Body (Stylized Hexagon/Core)
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + time;
            const r = 12;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = isGhost ? 'rgba(255,255,255,0.1)' : color;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = alpha;
        ctx.stroke();

        // Inner core pulse
        const pulse = Math.sin(time * 5) * 3 + 4;
        ctx.beginPath();
        ctx.arc(0, 0, pulse, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Orbiting "Reasoning Nodes"
        for (let i = 0; i < 3; i++) {
            const angle = time * 2 + (i / 3) * Math.PI * 2;
            const r = 22;
            const nx = Math.cos(angle) * r;
            const ny = Math.sin(angle) * r;
            ctx.beginPath();
            ctx.arc(nx, ny, 3, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            
            // Connect nodes to core
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(nx, ny);
            ctx.strokeStyle = `rgba(${mode==='obs'?'59,130,246':'249,115,22'}, 0.2)`;
            ctx.stroke();
        }

        ctx.restore();
    }

    function drawConfounder() {
        const cx = w / 2;
        const cy = 80;
        
        // Detailed Confounder (Fractal-like)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
        grad.addColorStop(0, 'rgba(245, 158, 11, 0.3)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fill();

        // Pulsing rings
        for (let i = 0; i < 3; i++) {
            const r = ((time * 20 + i * 20) % 60);
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(245, 158, 11, ${1 - r/60})`;
            ctx.stroke();
        }
        
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 14px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('U (CONFOUNDER)', 0, -50);
        ctx.restore();

        // Influence Rays (Only in Obs mode)
        if (mode === 'obs') {
            ctx.beginPath();
            ctx.setLineDash([5, 10]);
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.1)';
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(angle) * 1000, cy + Math.sin(angle) * 1000);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    function animate() {
        ctx.clearRect(0, 0, w, h);
        time += 0.015;
        
        drawGrid();
        drawConfounder();

        // Particles reacting to agent
        particles.forEach(p => {
            p.y += p.speed;
            if (p.y > h) p.y = 0;
            
            const dist = Math.hypot(p.x - agentPos.x, p.y - agentPos.y);
            if (dist < 100 && mode === 'cf') {
                // Interventional mode: particles are repelled/attracted causally
                const angle = Math.atan2(p.y - agentPos.y, p.x - agentPos.x);
                p.x += Math.cos(angle) * 2;
                p.y += Math.sin(angle) * 2;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
            ctx.fillStyle = mode === 'obs' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(249, 115, 22, 0.5)';
            ctx.fill();
        });

        // Agent movement
        const dx = targetPos.x - agentPos.x;
        const dy = targetPos.y - agentPos.y;
        agentPos.x += dx * 0.02;
        agentPos.y += dy * 0.02;

        // Draw Causal "Shield" or "Intervention" visual
        if (mode === 'cf') {
            ctx.beginPath();
            ctx.arc(agentPos.x, agentPos.y, 50 + Math.sin(time*10)*5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.3)';
            ctx.setLineDash([2, 2]);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Line showing "CUT" from confounder
            ctx.beginPath();
            ctx.moveTo(w/2, 80);
            const interX = (w/2 + agentPos.x) / 2;
            const interY = (80 + agentPos.y) / 2;
            ctx.lineTo(agentPos.x, agentPos.y);
            ctx.strokeStyle = 'rgba(255, 68, 68, 0.4)';
            ctx.stroke();
            
            ctx.save();
            ctx.translate(interX, interY);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#ff4444';
            ctx.font = '24px Arial';
            ctx.fillText('+', 0, 0); // Stylized cut
            ctx.restore();
        }

        drawAgent(agentPos.x, agentPos.y);

        if (Math.hypot(dx, dy) < 15) {
            targetPos = { x: 100 + Math.random() * (w - 200), y: 150 + Math.random() * (h - 200) };
        }

        requestAnimationFrame(animate);
    }

    resize();
    animate();

    function updateCFText() {
        const lang = window.getCurrentLang ? window.getCurrentLang() : 'en';
        if (mode === 'obs') {
            status.innerText = window.TRANSLATIONS[lang]["cf_status_obs"];
            status.style.color = 'var(--primary)';
            math.innerHTML = "\( E[Y|X] \)";
            log.innerHTML = window.TRANSLATIONS[lang]["cf_log_obs"];
        } else {
            status.innerText = window.TRANSLATIONS[lang]["cf_status_cf"];
            status.style.color = 'var(--accent-orange)';
            math.innerHTML = "\( E[Y | do(X)] \)";
            log.innerHTML = window.TRANSLATIONS[lang]["cf_log_cf"];
        }
        // Trigger KaTeX rendering for the new math content
        if (window.renderMathInElement) {
            renderMathInElement(math, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError : false
            });
        }
    }

    document.querySelectorAll('.cf-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            mode = btn.getAttribute('data-mode');
            document.querySelectorAll('.cf-toggle').forEach(b => b.classList.toggle('btn-primary', false));
            document.querySelectorAll('.cf-toggle').forEach(b => b.classList.toggle('btn-outline', true));
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-outline');
            updateCFText();
        });
    });

    window.addEventListener('languagechanged', () => {
        updateCFText();
    });

    window.addEventListener('resize', resize);
})();

// ===== Research Agent AI Simulation =====
(function() {
    const fab = document.getElementById('agent-fab');
    const windowEl = document.getElementById('agent-window');
    const closeBtn = document.getElementById('agent-close');
    const chat = document.getElementById('agent-chat');
    const input = document.getElementById('agent-input');
    const sendBtn = document.getElementById('agent-send');

    if (!fab) return;

    fab.addEventListener('click', () => windowEl.classList.toggle('active'));
    closeBtn.addEventListener('click', () => windowEl.classList.remove('active'));

    function addMessage(text, side) {
        const msg = document.createElement('div');
        msg.className = `msg msg-${side}`;
        msg.textContent = text;
        chat.appendChild(msg);
        chat.scrollTop = chat.scrollHeight;
    }

    function botResponse(query) {
        const lang = window.getCurrentLang ? window.getCurrentLang() : 'en';
        const thinkingStr = window.TRANSLATIONS[lang]["agent_thinking"] || "Thinking...";
        addMessage(thinkingStr, 'bot');
        const lastMsg = chat.lastElementChild;
        
        setTimeout(() => {
            let response = window.TRANSLATIONS[lang]["agent_fallback"] || "I'm not sure about that, but Hugo is always open to discussing research! You should check his publications section.";
            const q = query.toLowerCase();
            
            const matches = [
                { keys: ['causal'], key: 'kb_causal' },
                { keys: ['topolog', 'homolog', 'tda'], key: 'kb_topology' },
                { keys: ['agentic', 'rl', 'reinforcement', 'inteligência agêntica'], key: 'kb_agentic' },
                { keys: ['netherland', 'holland', 'dutch', 'holanda', 'neerland'], key: 'kb_netherlands' },
                { keys: ['brazil', 'brasil', 'ilhabela'], key: 'kb_brazil' },
                { keys: ['finance', 'stock', 'volatilit', 'finança', 'ações', 'mercado'], key: 'kb_finance' },
                { keys: ['cv', 'curriculum', 'resume', 'currículo'], key: 'kb_cv' },
                { keys: ['contact', 'linkedin', 'email', 'contato', 'falar', 'mensagem'], key: 'kb_contact' }
            ];

            for (const match of matches) {
                if (match.keys.some(k => q.includes(k))) {
                    if (window.TRANSLATIONS[lang] && window.TRANSLATIONS[lang][match.key]) {
                        response = window.TRANSLATIONS[lang][match.key];
                        break;
                    }
                }
            }
            
            lastMsg.textContent = response;
        }, 1000);
    }

    function handleSend() {
        const text = input.value.trim();
        if (!text) return;
        addMessage(text, 'user');
        input.value = '';
        botResponse(text);
    }

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keypress', e => {
        if (e.key === 'Enter') handleSend();
    });

    window.addEventListener('languagechanged', () => {
        const lang = window.getCurrentLang ? window.getCurrentLang() : 'en';
        chat.innerHTML = '';
        addMessage(window.TRANSLATIONS[lang]["agent_welcome"], 'bot');
    });
})();

// ===== Magnetic Buttons Effect =====
(function() {
    const magneticEls = document.querySelectorAll('.btn, .agent-fab, .nav-logo, .hero-image-wrapper');
    
    magneticEls.forEach(el => {
        el.addEventListener('mousemove', e => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            el.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });
        
        el.addEventListener('mouseleave', () => {
            el.style.transform = '';
        });
    });
})();


// ===== TDA Persistent Homology Visualization =====
(function() {
    const canvas = document.getElementById('tda-canvas');
    const radiusInput = document.getElementById('tda-radius');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    
    // Create points in a circle (to show the "hole")
    const points = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const r = 50 + (Math.random() - 0.5) * 15;
        points.push({
            x: w / 2 + Math.cos(angle) * r,
            y: h / 2 + Math.sin(angle) * r,
            ox: w / 2 + Math.cos(angle) * r,
            oy: h / 2 + Math.sin(angle) * r,
            phase: Math.random() * Math.PI * 2
        });
    }

    function animate() {
        ctx.clearRect(0, 0, w, h);
        const radius = parseInt(radiusInput.value);
        const time = Date.now() * 0.002;

        // Subtle movement
        points.forEach(p => {
            p.x = p.ox + Math.sin(time + p.phase) * 3;
            p.y = p.oy + Math.cos(time + p.phase) * 3;
        });

        // Draw complexes
        ctx.lineWidth = 1;
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
                if (d < radius) {
                    ctx.beginPath();
                    ctx.moveTo(points[i].x, points[i].y);
                    ctx.lineTo(points[j].x, points[j].y);
                    ctx.strokeStyle = `rgba(59, 130, 246, ${(1 - d / radius) * 0.5})`;
                    ctx.stroke();

                    // Simplicial 2-complex (triangles)
                    for (let k = j + 1; k < points.length; k++) {
                        const d2 = Math.hypot(points[j].x - points[k].x, points[j].y - points[k].y);
                        const d3 = Math.hypot(points[i].x - points[k].x, points[i].y - points[k].y);
                        if (d2 < radius && d3 < radius) {
                            ctx.beginPath();
                            ctx.moveTo(points[i].x, points[i].y);
                            ctx.lineTo(points[j].x, points[j].y);
                            ctx.lineTo(points[k].x, points[k].y);
                            ctx.closePath();
                            ctx.fillStyle = `rgba(59, 130, 246, ${(1 - (d+d2+d3)/(3*radius)) * 0.1})`;
                            ctx.fill();
                        }
                    }
                }
            }
        }

        // Draw points
        points.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#3b82f6';
            ctx.fill();
        });

        requestAnimationFrame(animate);
    }

    animate();
})();


// Initialize CF Explorer default state
(function() {
    const status = document.getElementById('cf-status');
    const math = document.getElementById('cf-math');
    const log = document.getElementById('cf-log');
    if (status) {
        status.innerText = "Agent State: Observational (Reality)";
        math.innerText = "P(Y | X=1)";
        log.innerHTML = "> Initializing observational flow...<br>> Detecting confounders...<br>> Measuring correlations...";
    }
})();
