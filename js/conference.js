/* Conference page behaviour: modals, brochure / abstract / registration forms,
   pricing calculator and Razorpay payment return. Content comes from the
   <script id="conf-data"> JSON written by scripts/templates/conference.mjs. */

import { createValidator } from './form-validation.js';

/** An error whose message is safe to show to the visitor. */
class UserError extends Error {}

/** The form was sent, but the server's reply never became readable, so we can't say whether it was saved. */
class UnconfirmedError extends UserError {
    constructor() {
        super('Unexpected response from the server. Please try again.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const dataEl = document.getElementById('conf-data');
    if (!dataEl) return;

    const conf = JSON.parse(dataEl.textContent);
    const modals = initModals();
    const ctx = { conf, modals };

    initCharCounters();
    initBrochureForm(ctx);
    initAbstractForm(ctx);
    initRegisterForm(ctx);
    handlePaymentReturn(ctx);

    // Deep links, e.g. conferences/icph2026.html#register
    const fromHash = location.hash.slice(1);
    if (['register', 'abstract', 'brochure'].includes(fromHash)) modals.open(fromHash);
});

/* ------------------------------------------------------------------ modals */

function initModals() {
    let active = null;
    let returnFocus = null;

    const focusables = (modal) =>
        [...modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')]
            .filter((el) => el.offsetParent !== null && el.tabIndex !== -1);

    const close = () => {
        if (!active) return;
        active.classList.remove('active');
        active.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        active = null;
        if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
        returnFocus = null;
    };

    const open = (id) => {
        const modal = document.getElementById(`modal-${id}`);
        if (!modal || modal === active) return;
        if (active) {
            active.classList.remove('active');
            active.setAttribute('aria-hidden', 'true');
        } else {
            returnFocus = document.activeElement;
        }
        active = modal;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        modal.scrollTop = 0; // .modal is the scroll container
        document.dispatchEvent(new CustomEvent('modal:open', { detail: { id } }));
        (focusables(modal).find((el) => !el.classList.contains('modal-close')) || modal).focus?.();
    };

    document.addEventListener('click', (e) => {
        const opener = e.target.closest('[data-modal-open]');
        if (opener) {
            e.preventDefault();
            open(opener.dataset.modalOpen);
            return;
        }
        if (e.target.closest('[data-modal-close]') || e.target === active) close();
    });

    document.addEventListener('keydown', (e) => {
        if (!active) return;
        if (e.key === 'Escape') {
            close();
        } else if (e.key === 'Tab') {
            const items = focusables(active);
            if (!items.length) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    return { open, close };
}

/** Generic result dialog: type is 'success' | 'error' | 'loading'. */
function openStatus(modals, { type, title, message }) {
    const modal = document.getElementById('modal-status');
    modal.dataset.type = type;
    modal.querySelector('[data-status-title]').textContent = title;
    modal.querySelector('[data-status-message]').textContent = message;

    const icons = { success: 'check-circle-2', error: 'alert-circle' };
    const iconBox = modal.querySelector('[data-status-icon]');
    iconBox.innerHTML = type === 'loading' ? '<span class="spinner"></span>' : `<i data-lucide="${icons[type]}"></i>`;
    window.lucide?.createIcons();

    modals.open('status');
}

/* ------------------------------------------------------------- shared bits */

function initCharCounters() {
    document.querySelectorAll('[data-count-for]').forEach((counter) => {
        const area = document.getElementById(counter.dataset.countFor);
        if (!area) return;
        const update = () => (counter.textContent = `${area.value.length}/${area.maxLength}`);
        area.addEventListener('input', update);
        area.form?.addEventListener('reset', () => setTimeout(update));
        update();
    });
}

const showAlert = (form, message) => {
    const box = form.querySelector('.form-alert');
    box.textContent = message;
    box.hidden = false;
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
};

const clearAlert = (form) => {
    form.querySelector('.form-alert').hidden = true;
};

/** Only follow https links returned by the server. */
const safeUrl = (value) => {
    try {
        const url = new URL(value);
        if (url.protocol === 'https:') return url.href;
    } catch {
        /* fall through */
    }
    throw new UserError('The server returned an invalid link. Please contact support.');
};

/** Text fields of a form as a plain object (checkboxes named `categories` and file inputs are left out). */
function textFields(form) {
    const out = {};
    for (const [name, value] of new FormData(form)) {
        if (typeof value === 'string' && name !== 'categories') out[name] = value;
    }
    return out;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Parsed JSON body, or null when the body is not JSON (e.g. Google's "unable to open the file" page). */
const readJson = (response) => response.json().catch(() => null);

/**
 * POSTs to the Apps Script web app and returns its JSON reply.
 *
 * Apps Script saves the data quickly, but its reply is slow and sometimes flaky: it answers with a redirect
 * to a result URL that can take several seconds, or 404 for a moment (the data is still saved).
 *
 * - Default: wait for the reply. If the result URL returns a 404, re-fetch it a few times over ~6 s (GET only,
 *   so nothing is saved twice), then throw UnconfirmedError. Use this when the page needs the reply.
 * - `sentAfterMs`: don't wait for the reply. Resolve `{ status: 'success', unverified: true }` once that
 *   many ms have passed, or as soon as the reply turns out to be unreadable. A network failure or a
 *   readable error reply that arrives in time still rejects.
 */
async function postToApi(conf, fields, { sentAfterMs = 0 } = {}) {
    // Each form (brochure / abstract / register) can have its own Apps Script web app: see apiEndpoints in data/site.json.
    const endpoint = conf.apiEndpoints && conf.apiEndpoints[fields.action];
    if (!endpoint) {
        throw new UserError(`This form is not connected to the server yet. Please email ${conf.supportEmail}.`);
    }

    const body = new FormData();
    Object.entries(fields).forEach(([key, value]) => body.set(key, value));

    const reply = fetch(endpoint, { method: 'POST', body })
        .catch(() => {
            throw new UserError('Network error. Please check your connection and try again.');
        })
        .then(async (response) => {
            let data = await readJson(response);
            if (!data && !sentAfterMs && response.redirected) {
                for (const delay of [1000, 2000, 3000]) {
                    await sleep(delay);
                    data = await fetch(response.url).then(readJson, () => null);
                    if (data) break;
                }
            }
            return data;
        });
    reply.catch(() => {}); // a failure after we stopped waiting must not surface as an unhandled rejection

    const data = sentAfterMs ? await Promise.race([reply, sleep(sentAfterMs).then(() => null)]) : await reply;

    if (!data) {
        if (sentAfterMs) return { status: 'success', unverified: true };
        throw new UnconfirmedError();
    }
    if (data.status !== 'success') throw new UserError(data.message || 'Submission failed. Please try again.');
    return data;
}

/** Disables the submit button while `task` runs and shows any error inside the form. */
async function runSubmit(form, task) {
    const button = form.querySelector('[data-submit]');
    const label = button.innerHTML;
    button.disabled = true;
    button.textContent = 'Please wait…';
    clearAlert(form);

    try {
        await task();
    } catch (err) {
        if (!(err instanceof UserError)) console.error(err);
        showAlert(form, err instanceof UserError ? err.message : 'Something went wrong. Please try again later.');
    } finally {
        button.innerHTML = label;
        button.disabled = form.dataset.done === '1';
    }
}

/** Validates every field and focuses the first problem. Returns true when the form can be sent. */
function isValid(validator) {
    const invalid = validator.validateAll();
    if (invalid) invalid.focus();
    return !invalid;
}

/* --------------------------------------------------------------- brochure */

function initBrochureForm({ conf, modals }) {
    const form = document.getElementById('form-brochure');
    if (!form) return;

    const validator = createValidator(form);
    const download = form.querySelector('[data-download]');
    const success = form.querySelector('[data-success]');

    // Every visit starts locked: the download only enables after the form is submitted again.
    const lockDownload = () => {
        download.removeAttribute('href');
        download.classList.add('is-disabled');
        download.setAttribute('aria-disabled', 'true');
        download.setAttribute('tabindex', '-1');
        success.hidden = true;
        clearAlert(form);
    };
    document.addEventListener('modal:open', (e) => {
        if (e.detail.id === 'brochure') lockDownload();
    });

    // Once the visitor clicks Download, close the popup (the link itself still opens/downloads as normal).
    download.addEventListener('click', () => {
        if (download.hasAttribute('href')) modals.close();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isValid(validator)) return;

        // Enable the download right after the form has been sent instead of waiting for Google's slow reply
        // (see postToApi). If no readable reply arrives, the link from the page config is used.
        await runSubmit(form, async () => {
            const data = await postToApi(
                conf,
                { ...textFields(form), action: 'brochure', conferenceId: conf.id },
                { sentAfterMs: 1500 },
            );

            const link = data.downloadUrl || conf.brochureUrl;
            if (!link) throw new UserError(`Your details were sent, but the brochure link is not available yet. Please email ${conf.supportEmail}.`);
            download.href = safeUrl(link);
            download.classList.remove('is-disabled');
            download.removeAttribute('aria-disabled');
            download.removeAttribute('tabindex');
            success.hidden = false;
            form.reset(); // clear the entered details; the download button stays enabled
            download.focus();
        });
    });
}

/* --------------------------------------------------------------- abstract */

const readBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new UserError('Could not read the selected file. Please try again.'));
        reader.readAsDataURL(file);
    });

function initAbstractForm({ conf, modals }) {
    const form = document.getElementById('form-abstract');
    if (!form) return;

    const validator = createValidator(form, { maxFileBytes: conf.maxAbstractBytes });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isValid(validator)) return;

        await runSubmit(form, async () => {
            const file = form.elements.abstractFile.files[0];
            const fields = {
                ...textFields(form),
                action: 'abstract',
                conferenceId: conf.id,
                fileName: file.name,
                fileBase64: await readBase64(file),
            };

            let data;
            try {
                data = await postToApi(conf, fields);
            } catch (err) {
                if (!(err instanceof UnconfirmedError)) throw err;
                // The upload was sent but Google's reply never became readable. Don't invite a re-submit
                // (that could save the abstract twice); ask them to confirm by email instead.
                form.reset();
                openStatus(modals, {
                    type: 'error',
                    title: 'Please confirm your submission',
                    message: `Your abstract was sent, but we could not get a confirmation from the server. To avoid duplicates please do not submit it again; email ${conf.supportEmail} and we will confirm it.`,
                });
                return;
            }

            form.reset();
            openStatus(modals, {
                type: 'success',
                title: 'Abstract submitted',
                message: `Thank you! We have received your abstract${data.reference ? ` (reference ${data.reference})` : ''}. We will let you know the acceptance in 2-3 business days.`,
            });
        });
    });
}

/* ---------------------------------------------------------- registration */

/** Today as YYYY-MM-DD in UTC (deadlines are end-of-day UTC). Local dev only: ?asof=YYYY-MM-DD. */
function getToday() {
    if (import.meta.env && import.meta.env.DEV) {
        const asof = new URLSearchParams(location.search).get('asof');
        if (/^\d{4}-\d{2}-\d{2}$/.test(asof || '')) return asof;
    }
    return new Date().toISOString().slice(0, 10);
}

const formatDate = (iso) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });

function initRegisterForm({ conf, modals }) {
    const form = document.getElementById('form-register');
    if (!form) return;

    const { pricing } = conf;
    const table = form.querySelector('[data-price-table]');
    const totalEl = form.querySelector('[data-total]');
    const statusEl = form.querySelector('[data-price-status]');
    const categoriesError = form.querySelector('[data-categories-error]');
    const checkboxes = [...form.querySelectorAll('input[name="categories"]')];
    const submitBtn = form.querySelector('[data-submit]');
    const validator = createValidator(form);

    // Which rate applies today?
    const today = getToday();
    const tier = pricing.tiers.find((t) => today <= t.endsOn) || null;
    const open = today >= conf.registrationOpens && tier !== null;

    pricing.tiers.forEach((t) => {
        table.querySelectorAll(`[data-tier="${t.id}"]`).forEach((cell) => {
            cell.classList.toggle('is-active', open && tier.id === t.id);
            cell.classList.toggle('is-past', today > t.endsOn);
        });
    });

    if (!open) {
        statusEl.textContent = today < conf.registrationOpens
            ? `Registration opens on ${formatDate(conf.registrationOpens)}.`
            : 'Registration is closed.';
        statusEl.classList.add('is-closed');
        checkboxes.forEach((box) => (box.disabled = true));
        submitBtn.disabled = true;
    } else {
        statusEl.textContent = `Current rate: ${tier.label}`;
    }

    const selectedIds = () => checkboxes.filter((box) => box.checked).map((box) => box.value);

    const totalFor = (ids) =>
        ids.reduce((sum, id) => sum + (pricing.categories.find((c) => c.id === id)?.prices[tier.id] ?? 0), 0);

    const recalc = () => {
        const ids = selectedIds();
        totalEl.textContent = (open ? totalFor(ids) : 0).toFixed(2);
        table.querySelectorAll('tr[data-category]').forEach((row) => {
            row.classList.toggle('is-selected', ids.includes(row.dataset.category));
        });
        if (ids.length) categoriesError.hidden = true;
    };

    checkboxes.forEach((box) => box.addEventListener('change', recalc));
    form.addEventListener('reset', () => setTimeout(recalc));
    recalc();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!open) return;

        const ids = selectedIds();
        const fieldsOk = isValid(validator);
        if (ids.length === 0) {
            categoriesError.hidden = false;
            if (fieldsOk) categoriesError.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        if (!fieldsOk || ids.length === 0) return;

        await runSubmit(form, async () => {
            const total = totalFor(ids);
            const data = await postToApi(conf, {
                ...textFields(form),
                action: 'register',
                conferenceId: conf.id,
                categories: ids.join(','),
                tier: tier.id,
                currency: pricing.currency,
                clientTotal: total.toFixed(2),
            });

            const paymentUrl = safeUrl(data.paymentUrl);
            form.dataset.done = '1';
            openStatus(modals, {
                type: 'loading',
                title: 'Redirecting to secure payment…',
                message: `Your registration reference is ${data.reference}. Please do not close this window.`,
            });
            window.location.assign(paymentUrl);
        });
    });
}

/* ---------------------------------------------------------- payment return */

/** Razorpay sends the visitor back here with ?razorpay_* params; ask the server to confirm the payment. */
function handlePaymentReturn({ conf, modals }) {
    const query = new URLSearchParams(location.search);
    const linkId = query.get('razorpay_payment_link_id');
    if (!linkId) return;

    openStatus(modals, { type: 'loading', title: 'Confirming your payment…', message: 'This only takes a moment.' });

    const help = `If any amount was deducted, please email ${conf.supportEmail} with your reference.`;

    postToApi(conf, {
        action: 'verify',
        conferenceId: conf.id,
        razorpay_payment_link_id: linkId,
        razorpay_payment_link_reference_id: query.get('razorpay_payment_link_reference_id') || '',
        razorpay_payment_link_status: query.get('razorpay_payment_link_status') || '',
        razorpay_payment_id: query.get('razorpay_payment_id') || '',
        razorpay_signature: query.get('razorpay_signature') || '',
    })
        .then((data) => {
            if (data.paymentStatus === 'paid') {
                openStatus(modals, {
                    type: 'success',
                    title: 'Registration confirmed',
                    message: `Thank you for registering for ${conf.shortName}. Your reference is ${data.reference}. You will receive your meeting invite by email (please check your junk folder if it is not in your inbox).`,
                });
            } else {
                openStatus(modals, {
                    type: 'error',
                    title: 'Payment not completed',
                    message: `Your payment was not completed (status: ${data.paymentStatus}). You can register again at any time. ${help}`,
                });
            }
        })
        .catch((err) => {
            if (!(err instanceof UserError)) console.error(err);
            openStatus(modals, {
                type: 'error',
                title: 'We could not confirm your payment',
                message: `${err instanceof UserError ? err.message : 'Something went wrong.'} ${help}`,
            });
        })
        .finally(() => history.replaceState(null, '', location.pathname + location.hash));
}
