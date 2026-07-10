/* Main Application Logic */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    initHeader();
    initMobileNav();
    initButtonRipples();
    initLazyLoading();
});

/**
 * Handles Header Sticky State on Scroll
 */
function initHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };

    // Run once on load to prevent flash on reload
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
}

/**
 * Handles Mobile Hamburger Navigation Drawer
 */
function initMobileNav() {
    const header = document.querySelector('.site-header');
    const toggleBtn = document.querySelector('.menu-toggle');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!toggleBtn || !header) return;

    const toggleMenu = () => {
        header.classList.toggle('nav-active');
        if (header.classList.contains('nav-active')) {
            document.body.style.overflow = 'hidden'; // Lock scrolling
        } else {
            document.body.style.overflow = ''; // Unlock scrolling
        }
    };

    toggleBtn.addEventListener('click', toggleMenu);

    // Close menu when a navigation link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (header.classList.contains('nav-active')) {
                toggleMenu();
            }
        });
    });
}

/**
 * Adds an elegant expanding ripple effect to clicked buttons
 */
function initButtonRipples() {
    document.addEventListener('click', (e) => {
        const button = e.target.closest('.btn');
        if (!button) return;

        // Create ripple span
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');

        // Calculate size and coordinates
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        
        ripple.style.width = ripple.style.height = `${size}px`;
        
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        // Append to button
        button.appendChild(ripple);

        // Remove after animation finishes
        ripple.addEventListener('animationend', () => {
            ripple.remove();
        });
    });
}

/**
 * Simple Intersection Observer for Lazy Loading Images
 */
function initLazyLoading() {
    const lazyImages = document.querySelectorAll('img.lazy-img');
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const image = entry.target;
                    image.src = image.dataset.src;
                    image.addEventListener('load', () => {
                        image.classList.add('loaded');
                    });
                    imageObserver.unobserve(image);
                }
            });
        });
        
        lazyImages.forEach(image => {
            imageObserver.observe(image);
        });
    } else {
        // Fallback for older browsers
        lazyImages.forEach(image => {
            image.src = image.dataset.src;
            image.classList.add('loaded');
        });
    }
}
