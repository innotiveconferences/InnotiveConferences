/* Shared form validation for the conference-page forms.
   Rules for name / email / phone / organization mirror js/contact.js. */

const letters = /^[\p{L}][\p{L}\s.'-]*$/u;

const between = (v, min, max, label) => {
    if (!v) return `${label} is required.`;
    if (v.length < min) return `${label} must be at least ${min} characters.`;
    if (v.length > max) return `${label} must be ${max} characters or fewer.`;
    return '';
};

/** Each rule: (trimmedValue, inputElement, ctx) => error message, or '' when valid. */
export const RULES = {
    title: (v) => (v ? '' : 'Please select a title.'),
    fullName: (v) => {
        const len = between(v, 2, 80, 'Name');
        if (len) return len;
        return letters.test(v) ? '' : "Name can only contain letters, spaces, . ' and -";
    },
    email: (v) => {
        if (!v) return 'Email is required.';
        if (v.length > 254) return 'Email is too long.';
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Enter a valid email address.';
    },
    phone: (v) => {
        if (!v) return 'Phone number is required.';
        if (!/^\+?[\d\s().-]+$/.test(v)) return 'Phone can only contain digits, spaces, + ( ) - .';
        const digits = v.replace(/\D/g, '').length;
        return digits < 7 || digits > 15 ? 'Enter a valid phone number (7-15 digits).' : '';
    },
    // Label text ("Organization" / "University") comes from the field's own <label>.
    organization: (v, input) => between(v, 2, 120, input.labels?.[0]?.firstChild?.textContent?.trim() || 'Organization'),
    country: (v) => (v ? '' : 'Please select a country.'),
    address: (v) => (v.length > 1000 ? 'Address must be 1000 characters or fewer.' : ''),
    address1: (v) => between(v, 2, 120, 'Address'),
    address2: (v) => between(v, 2, 120, 'Address'),
    city: (v) => between(v, 2, 80, 'City'),
    state: (v) => between(v, 2, 80, 'State/Province'),
    zip: (v) => {
        if (!v) return 'Postal/Zip code is required.';
        return /^[A-Za-z0-9][A-Za-z0-9\s-]{1,10}[A-Za-z0-9]$/.test(v) ? '' : 'Enter a valid postal/zip code.';
    },
    abstractFile: (_v, input, ctx) => {
        const file = input.files && input.files[0];
        if (!file) return 'Please choose your abstract file.';
        if (!/\.docx?$/i.test(file.name)) return 'Only .doc or .docx files are accepted.';
        if (file.size > ctx.maxFileBytes) return `File is too large (max ${Math.round(ctx.maxFileBytes / 1024 / 1024)} MB).`;
        if (file.size === 0) return 'The selected file is empty.';
        return '';
    },
    terms: (_v, input) => (input.checked ? '' : 'Please accept the Terms and Conditions.'),
};

/**
 * Wires validation onto a form and returns { validateAll }.
 * `validateAll()` returns the first invalid control (already focused-ready) or null.
 */
export function createValidator(form, ctx = {}) {
    const controls = () =>
        [...form.querySelectorAll('input[name], select[name], textarea[name]')].filter((el) => RULES[el.name]);

    const validateField = (input) => {
        const error = RULES[input.name](input.value.trim(), input, ctx);
        const group = input.closest('.form-group') || input.parentElement;
        let errorEl = group.querySelector('.field-error');

        if (error) {
            if (!errorEl) {
                errorEl = document.createElement('span');
                errorEl.className = 'field-error';
                errorEl.setAttribute('role', 'alert');
                group.appendChild(errorEl);
            }
            errorEl.textContent = error;
            input.classList.add('is-invalid');
            input.setAttribute('aria-invalid', 'true');
        } else {
            if (errorEl) errorEl.remove();
            input.classList.remove('is-invalid');
            input.removeAttribute('aria-invalid');
        }
        return !error;
    };

    controls().forEach((input) => {
        input.addEventListener('blur', () => validateField(input));
        const revalidate = () => {
            if (input.hasAttribute('aria-invalid')) validateField(input);
        };
        input.addEventListener('input', revalidate);
        input.addEventListener('change', revalidate);
    });

    const validateAll = () => {
        let firstInvalid = null;
        controls().forEach((input) => {
            if (!validateField(input) && !firstInvalid) firstInvalid = input;
        });
        return firstInvalid;
    };

    return { validateAll };
}
