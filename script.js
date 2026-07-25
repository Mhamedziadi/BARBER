(() => {
  'use strict';

  const $ = (selector, root = document) => root?.querySelector(selector) ?? null;
  const $$ = (selector, root = document) => root ? [...root.querySelectorAll(selector)] : [];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const toast = $('#toast');
  let toastTimer;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2800);
  }

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  // Reveal animation with a safe fallback for older browsers.
  const revealElements = $$('.reveal');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealElements.forEach((element) => revealObserver.observe(element));
  } else {
    revealElements.forEach((element) => element.classList.add('visible'));
  }

  // Reliable bottom navigation. Home always scrolls to the true top, even when
  // the URL already contains #home or the user taps Home more than once.
  const navLinks = $$('.bottom-nav a[href^="#"]');
  const sectionIds = ['home', 'services', 'gallery', 'reviews'];
  const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

  function setActiveNav(id) {
    navLinks.forEach((link) => {
      const isActive = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function updateAddressBar(id) {
    try {
      const nextUrl = id === 'home'
        ? `${window.location.pathname}${window.location.search}`
        : `#${id}`;
      window.history.replaceState(null, '', nextUrl);
    } catch {
      // Some file-preview environments restrict History API updates.
    }
  }

  function scrollToSection(id, updateUrl = true) {
    const target = document.getElementById(id);
    if (!target) return;

    const behavior = prefersReducedMotion ? 'auto' : 'smooth';
    if (id === 'home') {
      window.scrollTo({ top: 0, left: 0, behavior });
    } else {
      const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - 16);
      window.scrollTo({ top, left: 0, behavior });
    }

    setActiveNav(id);
    if (updateUrl) updateAddressBar(id);
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      if (!href?.startsWith('#')) return;
      const id = href.slice(1);
      if (!document.getElementById(id)) return;
      event.preventDefault();
      scrollToSection(id);
    });
  });

  let navTicking = false;
  function syncActiveNavToScroll() {
    const marker = window.scrollY + Math.min(window.innerHeight * 0.38, 320);
    let currentId = 'home';

    sections.forEach((section) => {
      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      if (sectionTop <= marker) currentId = section.id;
    });

    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8) {
      currentId = sections.at(-1)?.id || currentId;
    }

    setActiveNav(currentId);
    navTicking = false;
  }

  window.addEventListener('scroll', () => {
    if (navTicking) return;
    navTicking = true;
    window.requestAnimationFrame(syncActiveNavToScroll);
  }, { passive: true });
  window.addEventListener('resize', syncActiveNavToScroll, { passive: true });
  syncActiveNavToScroll();

  // If a section hash is opened directly, align it correctly after layout settles.
  window.addEventListener('load', () => {
    const id = window.location.hash.slice(1);
    if (sectionIds.includes(id)) {
      window.setTimeout(() => scrollToSection(id, false), 60);
    }
  }, { once: true });

  const saveContact = $('#save-contact');
  saveContact?.addEventListener('click', () => {
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Ziadi;Simo;;;',
      'FN:Simo Ziadi Barber',
      'ORG:Simo Ziadi Barber',
      'TEL;TYPE=CELL:+393514961519',
      'EMAIL:Mhamedziadi1@gmail.com',
      'ADR;TYPE=WORK:;;Via Giuseppe Garibaldi 21;Varese;VA;21100;Italia',
      'URL:https://www.instagram.com/siimo_barber/',
      'NOTE:Precision. Style. Confidence.',
      'END:VCARD'
    ].join('\r\n');

    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'Mohammed-Ziadi-Barber.vcf';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Contatto pronto per essere salvato');
  });

  function openDialog(dialog) {
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeDialog(dialog) {
    if (!dialog || !dialog.open) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  const bookingModal = $('#booking-modal');
  const bookingForm = $('#booking-form');
  const closeBookingButton = $('#close-booking');
  const formMessage = $('#form-message');
  const dateInput = $('#date');
  const notesInput = $('#notes');
  const notesCount = $('#notes-count');
  const formFields = $$('input, select, textarea', bookingForm);
  let lastBookingTrigger = null;

  function toLocalISODate(date) {
    const yearValue = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${yearValue}-${month}-${day}`;
  }

  function updateDateLimits() {
    if (!dateInput) return;
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    dateInput.min = toLocalISODate(today);
    dateInput.max = toLocalISODate(maxDate);
  }
  updateDateLimits();

  function clearFormMessage() {
    if (!formMessage) return;
    formMessage.textContent = '';
    formMessage.style.color = '';
  }

  function openBookingModal(trigger) {
    if (!bookingModal || !bookingForm) return;
    lastBookingTrigger = trigger || document.activeElement;
    updateDateLimits();
    clearFormMessage();
    bookingForm.scrollTop = 0;
    openDialog(bookingModal);

    if (window.matchMedia('(min-width: 700px)').matches) {
      window.setTimeout(() => $('#name')?.focus({ preventScroll: true }), 80);
    }
  }

  function closeBookingModal() {
    closeDialog(bookingModal);
  }

  $$('[data-open-booking]').forEach((button) => {
    button.addEventListener('click', () => openBookingModal(button));
  });

  closeBookingButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeBookingModal();
  });

  bookingModal?.addEventListener('click', (event) => {
    if (event.target === bookingModal) closeBookingModal();
  });

  bookingModal?.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeBookingModal();
  });

  bookingModal?.addEventListener('close', () => {
    if (lastBookingTrigger instanceof HTMLElement) {
      lastBookingTrigger.focus({ preventScroll: true });
    }
  });

  // Let native date controls handle direct taps. Clicking the surrounding field
  // opens the native picker only when the browser supports showPicker().
  $$('[data-picker-for]', bookingForm).forEach((control) => {
    const input = document.getElementById(control.dataset.pickerFor);
    if (!input) return;

    control.addEventListener('click', (event) => {
      if (event.target === input || event.target.closest('input, select, textarea')) return;
      input.focus({ preventScroll: true });
      if (typeof input.showPicker === 'function') {
        try {
          input.showPicker();
        } catch {
          // The native control remains focused and usable when showPicker is restricted.
        }
      }
    });
  });

  function updateNotesCount() {
    if (!notesInput || !notesCount) return;
    notesCount.textContent = `${notesInput.value.length}/250`;
  }
  updateNotesCount();
  notesInput?.addEventListener('input', updateNotesCount);

  function getFieldError(field) {
    const value = field.value.trim();

    if (field.required && !value) {
      const missingMessages = {
        name: 'Inserisci il tuo nome e cognome.',
        phone: 'Inserisci un numero di telefono.',
        service: 'Seleziona un servizio.',
        date: 'Seleziona una data.',
        time: 'Seleziona un orario.'
      };
      return missingMessages[field.name] || 'Questo campo è obbligatorio.';
    }

    if (field.name === 'name' && value.length < 2) {
      return 'Il nome deve contenere almeno 2 caratteri.';
    }

    if (field.name === 'phone' && value) {
      const digits = value.replace(/\D/g, '');
      const phonePattern = /^[+]?[(]?[0-9][0-9\s().-]{5,22}[0-9]$/;
      if (!phonePattern.test(value) || digits.length < 7 || digits.length > 16) {
        return 'Inserisci un numero di telefono valido.';
      }
    }

    if (field.name === 'date' && value) {
      if (field.validity.badInput) return 'Seleziona una data valida.';
      if (field.min && value < field.min) return 'La data non può essere nel passato.';
      if (field.max && value > field.max) return 'Seleziona una data entro i prossimi 12 mesi.';
    }

    if (field.name === 'notes' && value.length > 250) {
      return 'Le note non possono superare 250 caratteri.';
    }

    return '';
  }

  function setFieldState(field, error) {
    const group = field.closest('.field-group');
    const errorElement = $(`#${field.name}-error`, bookingForm);
    group?.classList.toggle('has-error', Boolean(error));
    field.setAttribute('aria-invalid', error ? 'true' : 'false');
    if (errorElement) errorElement.textContent = error;
  }

  function validateField(field) {
    const error = getFieldError(field);
    setFieldState(field, error);
    return !error;
  }

  formFields.forEach((field) => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('change', () => validateField(field));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      clearFormMessage();
    });
  });

  function clearValidation() {
    formFields.forEach((field) => setFieldState(field, ''));
    clearFormMessage();
  }

  function formatItalianDate(value) {
    const [yearValue, month, day] = value.split('-').map(Number);
    const selectedDate = new Date(yearValue, month - 1, day, 12, 0, 0);
    return selectedDate.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  bookingForm?.addEventListener('submit', (event) => {
    event.preventDefault();

    const validationResults = formFields.map((field) => validateField(field));
    if (validationResults.includes(false)) {
      if (formMessage) {
        formMessage.style.color = '#ef8e8e';
        formMessage.textContent = 'Controlla i campi evidenziati prima di continuare.';
      }
      const firstInvalid = formFields.find((field) => field.getAttribute('aria-invalid') === 'true');
      firstInvalid?.focus({ preventScroll: false });
      firstInvalid?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
      return;
    }

    const values = Object.fromEntries(new FormData(bookingForm).entries());
    const dateLabel = formatItalianDate(values.date);
    const message = [
      'Ciao Mohammed, vorrei richiedere un appuntamento.',
      '',
      `Nome: ${values.name.trim()}`,
      `Telefono: ${values.phone.trim()}`,
      `Servizio: ${values.service}`,
      `Data: ${dateLabel}`,
      `Ora: ${values.time}`,
      values.notes.trim() ? `Note: ${values.notes.trim()}` : ''
    ].filter(Boolean).join('\n');

    const whatsappUrl = `https://wa.me/393514961519?text=${encodeURIComponent(message)}`;
    const openedWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!openedWindow) window.location.href = whatsappUrl;

    if (formMessage) {
      formMessage.style.color = '#8fd19e';
      formMessage.textContent = 'Richiesta pronta. Apertura di WhatsApp…';
    }
    showToast('Richiesta preparata su WhatsApp');

    window.setTimeout(() => {
      closeBookingModal();
      bookingForm.reset();
      updateNotesCount();
      clearValidation();
    }, 220);
  });

  const galleryModal = $('#gallery-modal');
  const galleryPreview = galleryModal ? $('img', galleryModal) : null;
  $$('.gallery-item').forEach((item) => {
    item.addEventListener('click', () => {
      const source = $('img', item);
      if (!source || !galleryPreview || !galleryModal) return;
      galleryPreview.src = source.currentSrc || source.src;
      galleryPreview.alt = source.alt;
      galleryPreview.style.objectPosition = getComputedStyle(source).objectPosition;
      openDialog(galleryModal);
    });
  });

  $('.gallery-close')?.addEventListener('click', () => closeDialog(galleryModal));
  galleryModal?.addEventListener('click', (event) => {
    if (event.target === galleryModal) closeDialog(galleryModal);
  });
  galleryModal?.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeDialog(galleryModal);
  });

  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('sw.js?v=4', { updateViaCache: 'none' });
        registration.update().catch(() => {});
      } catch {
        // The website remains fully usable without offline support.
      }
    }, { once: true });
  }
})();
