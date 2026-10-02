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

    // Paste your deployed Apps Script Web App URL (ends with /exec) here
    const endpoint =
      "https://script.google.com/macros/s/AKfycbxc1M1G9HSZvgLhgQ7QhJ460dg-nIoWUGutqFUQ6UkGvQCJgS21Ly5OsSfZm4kgqbN7/exec";

    // Field validators: return an error message, or '' when valid
    const validators = {
        fullName: (v) => {
            if (!v) return 'Full name is required.';
            if (v.length < 2) return 'Name must be at least 2 characters.';
            if (v.length > 80) return 'Name must be 80 characters or fewer.';
            if (!/^[\p{L}][\p{L}\s.'-]*$/u.test(v)) return 'Name can only contain letters, spaces, . \' and -';
            return '';
        },
        email: (v) => {
            if (!v) return 'Email is required.';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter a valid email address.';
            if (v.length > 254) return 'Email is too long.';
            return '';
        },
        phone: (v) => {
            if (!v) return 'Phone number is required.';
            if (!/^\+?[\d\s().-]+$/.test(v)) return 'Phone can only contain digits, spaces, + ( ) - .';
            const digits = v.replace(/\D/g, '').length;
            if (digits < 7 || digits > 15) return 'Enter a valid phone number (7-15 digits).';
            return '';
        },
        organization: (v) => {
            if (!v) return 'Organization / University is required.';
            if (v.length < 2) return 'Must be at least 2 characters.';
            if (v.length > 120) return 'Must be 120 characters or fewer.';
            return '';
        },
        message: (v) => (v.length > 1000 ? 'Message must be 1000 characters or fewer.' : '')
    };

    const validateField = (input) => {
        const check = validators[input.name];
        if (!check) return true;
        const error = check(input.value.trim());

        let errorEl = input.parentElement.querySelector('.field-error');
        if (error) {
            if (!errorEl) {
                errorEl = document.createElement('span');
                errorEl.className = 'field-error';
                errorEl.setAttribute('role', 'alert');
                errorEl.style.cssText = 'display:block;color:#EF4444;font-size:0.8rem;margin-top:4px;';
                input.parentElement.appendChild(errorEl);
            }
            errorEl.textContent = error;
            input.style.borderColor = '#EF4444';
            input.setAttribute('aria-invalid', 'true');
        } else {
            if (errorEl) errorEl.remove();
            input.style.borderColor = '';
            input.removeAttribute('aria-invalid');
        }
        return !error;
    };

    const fields = form.querySelectorAll('.form-control');
    fields.forEach((input) => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => {
            if (input.hasAttribute('aria-invalid')) validateField(input);
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        let isValid = true;
        let firstInvalid = null;
        fields.forEach((input) => {
            if (!validateField(input)) {
                isValid = false;
                if (!firstInvalid) firstInvalid = input;
            }
        });

        if (!isValid) {
            firstInvalid.focus();
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: new FormData(form)
            });
            const result = await response.json();

            if (result.status === 'success') {
                // Display Glass Success Modal
                if (successModal) {
                    successModal.classList.add('active');
                    document.body.style.overflow = 'hidden'; // Lock scrolling
                }
                form.reset();
            } else {
                alert(result.message || 'Submission failed. Please try again.');
            }
        } catch (err) {
            console.error(err);
            alert('Something went wrong. Please try again later.');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
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

    const endpoint = 'https://script.google.com/macros/s/AKfycbwWNJWC15MWIIQ6bpYsYgOWN-f-Tobb7WjWz9C0fM4rY6K4SIbtvmqzZiub3-pzh1Nzbw/exec';

    newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = newsletterForm.querySelector('input[type="email"]');
        if (!emailInput || !emailInput.value.trim()) return;

        const submitBtn = newsletterForm.querySelector('button[type="submit"], button:not([type])');
        if (submitBtn) submitBtn.disabled = true;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: new FormData(newsletterForm)
            });
            const result = await response.json();

            if (result.status === 'success') {
                alert('Thank you for subscribing!');
                newsletterForm.reset();
            } else {
                alert(result.message || 'Subscription failed. Please try again.');
            }
        } catch (err) {
            console.error(err);
            alert('Something went wrong. Please try again later.');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
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
