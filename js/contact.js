/* Contact Registration Form Validation & UI Modals */

document.addEventListener('DOMContentLoaded', () => {
    initContactForm();
    initNewsletterForm();
    initGalleryLightbox();
});

/**
 * Contact Form validation and simulated success submit
 */
function initContactForm() {
    const form = document.getElementById('registrationForm');
    const successModal = document.getElementById('successModal');
    const closeModalBtn = document.getElementById('closeModalBtn');

    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Basic HTML5 validation runs first, but let's do custom visual validation check
        let isValid = true;
        const inputs = form.querySelectorAll('.form-control[required]');

        inputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.style.borderColor = '#EF4444'; // Red error border
            } else {
                input.style.borderColor = ''; // Reset
            }
        });

        if (isValid) {
            // Display Glass Success Modal
            if (successModal) {
                successModal.classList.add('active');
                document.body.style.overflow = 'hidden'; // Lock scrolling
            }
            
            form.reset();
        }
    });

    // Close Modal Event
    if (closeModalBtn && successModal) {
        closeModalBtn.addEventListener('click', () => {
            successModal.classList.remove('active');
            document.body.style.overflow = ''; // Unlock scrolling
        });

        // Close when clicking outside card
        successModal.addEventListener('click', (e) => {
            if (e.target === successModal) {
                successModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
}

/**
 * Newsletter Form Submission
 */
function initNewsletterForm() {
    const newsletterForm = document.getElementById('newsletterForm');
    if (!newsletterForm) return;

    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = newsletterForm.querySelector('input[type="email"]');
        
        if (emailInput && emailInput.value.trim()) {
            alert(`Thank you for subscribing! We will send updates to ${emailInput.value}.`);
            newsletterForm.reset();
        }
    });
}

/**
 * Gallery Lightbox Viewer
 */
function initGalleryLightbox() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightbox = document.getElementById('galleryLightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxClose = document.getElementById('lightboxClose');

    if (galleryItems.length === 0 || !lightbox || !lightboxImg) return;

    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            const img = item.querySelector('.gallery-img');
            if (img) {
                lightboxImg.src = img.src || img.dataset.src;
                lightbox.classList.add('active');
                document.body.style.overflow = 'hidden'; // Lock scroll
            }
        });
    });

    if (lightboxClose) {
        lightboxClose.addEventListener('click', () => {
            lightbox.classList.remove('active');
            document.body.style.overflow = ''; // Unlock
        });
    }

    // Close on click background
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}
