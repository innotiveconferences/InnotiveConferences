/* Scroll-triggered and Interactive Animations */

document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.classList.add('js-enabled');
    initScrollReveals();
    initStatsCounter();
    initHeroParallax();
});

/**
 * Scroll Reveal Intersection Observer
 */
function initScrollReveals() {
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale');
    
    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-active');
                    // Once animated, we don't need to observe it anymore
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15, // Trigger when 15% of the element is visible
            rootMargin: '0px 0px -50px 0px' // Slightly offset trigger point
        });

        revealElements.forEach(el => {
            revealObserver.observe(el);
        });
    } else {
        // Fallback for older browsers
        revealElements.forEach(el => {
            el.classList.add('reveal-active');
        });
    }
}

/**
 * Animated statistics counter
 */
function initStatsCounter() {
    const statsNumbers = document.querySelectorAll('.stat-number');
    if (statsNumbers.length === 0) return;

    const runCounter = (el) => {
        const target = parseInt(el.getAttribute('data-target'), 10);
        const duration = 2000; // Total count-up duration in ms
        const startTime = performance.now();

        const updateCounter = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            
            // Ease out quad formula for smooth decelerating count
            const easeProgress = progress * (2 - progress);
            const currentVal = Math.floor(easeProgress * target);
            
            el.textContent = currentVal.toLocaleString() + '+';

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                el.textContent = target.toLocaleString() + '+';
            }
        };

        requestAnimationFrame(updateCounter);
    };

    if ('IntersectionObserver' in window) {
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    runCounter(entry.target);
                    statsObserver.unobserve(entry.target); // Run count once
                }
            });
        }, { threshold: 0.5 });

        statsNumbers.forEach(stat => statsObserver.observe(stat));
    } else {
        statsNumbers.forEach(stat => runCounter(stat));
    }
}

/**
 * Mouse-move parallax effect on background floating shapes in Hero
 */
function initHeroParallax() {
    const hero = document.getElementById('home');
    if (!hero) return;

    hero.addEventListener('mousemove', (e) => {
        const shapes = hero.querySelectorAll('.parallax-shape');
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        shapes.forEach((shape, index) => {
            // Alternating directions and intensities
            const depth = (index + 1) * 15;
            const moveX = (x - 0.5) * depth;
            const moveY = (y - 0.5) * depth;
            
            shape.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    });
}
