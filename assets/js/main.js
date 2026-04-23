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

    // Math & research symbols that float across
    const SYMBOL_POOL = [
        'E[Y|do(X)]', 'ATE', 'CATE', 'H₀', 'H₁', 'β₁',
        'P(Y|X)', 'τ(x)', '∂/∂x', '∫', '∑', 'Σ',
        'do(x)', 'DAG', 'E[Y¹-Y⁰]', '∇',
        'RV_t', 'σ²', 'W₂(p,q)', 'π(a|s)',
        'X→Y', 'X→M→Y', 'ε', 'θ', 'λ',
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
        const count = Math.max(6, Math.floor(w / 200));
        for (let i = 0; i < count; i++) {
            symbols.push({
                text: SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)],
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.2,
                vy: -0.15 - Math.random() * 0.2,
                alpha: 0.06 + Math.random() * 0.08,
                size: 11 + Math.random() * 6,
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
            ctx.font = `${sym.size}px 'JetBrains Mono', monospace`;
            ctx.fillStyle = `rgba(79, 140, 255, ${sym.alpha * flicker})`;
            ctx.fillText(sym.text, sym.x, sym.y);
        }
    }

    function update() {
        for (const node of nodes) {
            node.x += node.vx;
            node.y += node.vy;
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
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
});

// ===== Mobile navigation toggle =====
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');

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

    const phrases = [
        'Principal Causal AI Research Scientist @ Dell',
        'Researcher in Causal Inference & Agentic AI',
        'Former OpenAI Red Teaming Network Researcher',
        '20+ published papers | 5,400+ citations',
    ];

    let phraseIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let delay = 80;

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

        setTimeout(type, delay);
    }

    type();
})();

// ===== Animated Counters =====
(function () {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    let counted = false;

    function animateCounters() {
        if (counted) return;
        const hero = document.getElementById('hero');
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
        '.timeline-item, .edu-card, .pub-item, .award-card, .conf-card, .skill-category, .social-card, .detail-card, .story-chapter'
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
    document.querySelectorAll('.story-img img, .award-image img, .conf-image img, .social-image img').forEach(img => {
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
