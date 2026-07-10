/* Carousel & Slider Controls */

document.addEventListener('DOMContentLoaded', () => {
    initHeroSlider();
    initTestimonialsSlider();
});

/**
 * Hero Background Image Slider
 */
function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length === 0) return;

    let currentSlide = 0;
    const slideInterval = 5000; // 5 seconds

    const nextSlide = () => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    };

    // Auto rotate background
    setInterval(nextSlide, slideInterval);
}

/**
 * Testimonials Slide Swiper
 */
function initTestimonialsSlider() {
    const container = document.querySelector('.testimonials-container');
    const slides = document.querySelectorAll('.testimonial-slide');
    const prevBtn = document.querySelector('.slider-btn-prev');
    const nextBtn = document.querySelector('.slider-btn-next');
    const dotsContainer = document.querySelector('.slider-dots');

    if (!container || slides.length === 0) return;

    let currentSlide = 0;
    const totalSlides = slides.length;
    let autoPlayTimer = null;
    const autoPlayDelay = 6000; // 6 seconds

    // 1. Create Navigation Dots
    dotsContainer.innerHTML = ''; // Clear mock markup
    slides.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.classList.add('slider-dot');
        if (index === 0) dot.classList.add('active');
        dot.setAttribute('data-slide', index);
        dotsContainer.appendChild(dot);

        dot.addEventListener('click', () => {
            goToSlide(index);
            resetAutoPlay();
        });
    });

    const dots = document.querySelectorAll('.slider-dot');

    // 2. Navigation Function
    const goToSlide = (slideIndex) => {
        currentSlide = slideIndex;
        // Make sure index wraps correctly
        if (currentSlide < 0) currentSlide = totalSlides - 1;
        if (currentSlide >= totalSlides) currentSlide = 0;

        // Slide the container by changing transform
        container.style.transform = `translateX(-${currentSlide * 100}%)`;

        // Update Dots Active Status
        dots.forEach(dot => dot.classList.remove('active'));
        if (dots[currentSlide]) {
            dots[currentSlide].classList.add('active');
        }
    };

    // 3. Arrow Click Handlers
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            goToSlide(currentSlide - 1);
            resetAutoPlay();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            goToSlide(currentSlide + 1);
            resetAutoPlay();
        });
    }

    // 4. Auto Play Logic
    const startAutoPlay = () => {
        autoPlayTimer = setInterval(() => {
            goToSlide(currentSlide + 1);
        }, autoPlayDelay);
    };

    const stopAutoPlay = () => {
        if (autoPlayTimer) {
            clearInterval(autoPlayTimer);
        }
    };

    const resetAutoPlay = () => {
        stopAutoPlay();
        startAutoPlay();
    };

    // Pause on Hover
    const testimonialsArea = document.querySelector('.testimonials-wrapper');
    if (testimonialsArea) {
        testimonialsArea.addEventListener('mouseenter', stopAutoPlay);
        testimonialsArea.addEventListener('mouseleave', startAutoPlay);
    }

    // Initialize Auto Play
    startAutoPlay();
}
