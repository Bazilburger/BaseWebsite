function initializeMenu() {
  const menu = document.getElementById("menu");
  const burgerButton = document.getElementById("burger-btn");
  const burgerIcon = burgerButton ? burgerButton.querySelector("i") : null;

  if (!menu || !burgerButton || !burgerIcon) {
    return;
  }

  const windowSize = window.matchMedia("(max-width: 800px)");

  function setMenuState(isOpen) {
    menu.style.display = isOpen ? "flex" : "none";
    burgerButton.setAttribute("aria-expanded", String(isOpen));
    burgerButton.setAttribute(
      "aria-label",
      isOpen ? "Close navigation menu" : "Open navigation menu"
    );
    burgerIcon.classList.toggle("fa-rotate-270", isOpen);
  }

  function syncMenuLayout(event) {
    if (event.matches) {
      menu.classList.remove("normal-nav");
      menu.classList.add("burger-nav");
      setMenuState(false);
    } else {
      menu.classList.remove("burger-nav");
      menu.classList.add("normal-nav");
      menu.style.display = "flex";
      burgerButton.setAttribute("aria-expanded", "false");
      burgerButton.setAttribute("aria-label", "Open navigation menu");
      burgerIcon.classList.remove("fa-rotate-270");
    }
  }

  function toggleMenu() {
    if (windowSize.matches) {
      setMenuState(menu.style.display !== "flex");
    }
  }

  syncMenuLayout(windowSize);

  if (typeof windowSize.addEventListener === "function") {
    windowSize.addEventListener("change", syncMenuLayout);
  } else if (typeof windowSize.addListener === "function") {
    windowSize.addListener(syncMenuLayout);
  }

  burgerButton.addEventListener("click", toggleMenu);
}

function initializeContactFormStatus() {
  const statusContainer = document.getElementById("form-status");

  if (!statusContainer) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");
  const code = params.get("code");
  const messages = {
    success: {
      submit: "Your message was sent successfully. We will get back to you soon.",
    },
    error: {
      invalid_fields: "Please complete all required fields before submitting the form.",
      invalid_email: "Please enter a valid email address.",
      invalid_name: "Please enter a valid name.",
      invalid_subject: "The form subject was invalid. Please try again.",
      invalid_header: "We could not process the form because some input was invalid.",
      message_too_long: "Your message is too long. Please shorten it and try again.",
      send_failed: "We could not send your message right now. Please try again later or contact us directly by email or phone.",
      rate_limited: "You have sent messages too quickly. Please wait a moment before trying again.",
      unknown: "Something went wrong while sending your message. Please try again.",
    },
  };

  if (!status || !messages[status]) {
    return;
  }

  const fallbackCode = status === "success" ? "submit" : "unknown";
  const message = messages[status][code] || messages[status][fallbackCode];

  if (!message) {
    return;
  }

  statusContainer.textContent = message;
  statusContainer.hidden = false;
  statusContainer.classList.add(
    status === "success" ? "form-status-success" : "form-status-error"
  );
  statusContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function initializeContactFormDraft() {
  const form = document.querySelector('form[action="process_contact.php"]');

  if (!form) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");
  const storageKey = "bazilburger-contact-form-draft";
  const fields = ["name", "email", "heard_about", "service_level", "message"];

  function getDraft() {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey) || "{}");
    } catch (error) {
      return {};
    }
  }

  function saveDraft() {
    const draft = {};

    fields.forEach((fieldName) => {
      const field = form.elements.namedItem(fieldName);
      if (field && "value" in field) {
        draft[fieldName] = field.value;
      }
    });

    sessionStorage.setItem(storageKey, JSON.stringify(draft));
  }

  function restoreDraft() {
    const draft = getDraft();

    fields.forEach((fieldName) => {
      const field = form.elements.namedItem(fieldName);
      if (field && "value" in field && typeof draft[fieldName] === "string") {
        field.value = draft[fieldName];
      }
    });
  }

  function clearDraft() {
    sessionStorage.removeItem(storageKey);
  }

  if (status === "error") {
    restoreDraft();
  } else {
    clearDraft();
  }

  fields.forEach((fieldName) => {
    const field = form.elements.namedItem(fieldName);
    if (field) {
      field.addEventListener("input", saveDraft);
      field.addEventListener("change", saveDraft);
    }
  });

  form.addEventListener("submit", saveDraft);
}

function initializeParallaxAccents() {
  const accents = document.querySelectorAll(".parallax, .parallax2");

  if (!accents.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  let ticking = false;

  function updateAccents() {
    const viewportHeight = window.innerHeight || 1;

    accents.forEach((accent) => {
      const rect = accent.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const viewportCenter = viewportHeight / 2;
      const normalizedOffset = (elementCenter - viewportCenter) / viewportHeight;
      const offset = normalizedOffset * 120;
      const softOffset = normalizedOffset * 72;
      const tilt = normalizedOffset * 7;

      accent.style.setProperty("--parallax-shift", `${offset.toFixed(2)}px`);
      accent.style.setProperty("--parallax-shift-soft", `${softOffset.toFixed(2)}px`);
      accent.style.setProperty("--parallax-tilt", `${tilt.toFixed(2)}deg`);
    });

    ticking = false;
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateAccents);
    }
  }

  requestUpdate();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
}

function initializeLivePreviewFallback() {
  const preview = document.querySelector("[data-live-preview]");

  if (!preview) {
    return;
  }

  const frame = preview.querySelector(".live-preview-frame");
  const fallback = preview.querySelector("[data-live-preview-fallback]");

  if (!frame || !fallback) {
    return;
  }

  let resolved = false;

  function showFallback() {
    if (resolved) {
      return;
    }

    resolved = true;
    fallback.hidden = false;
  }

  function hideFallback() {
    resolved = true;
    fallback.hidden = true;
  }

  const fallbackTimer = window.setTimeout(showFallback, 4000);

  frame.addEventListener("load", () => {
    window.clearTimeout(fallbackTimer);
    hideFallback();
  });

  frame.addEventListener("error", () => {
    window.clearTimeout(fallbackTimer);
    showFallback();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializeMenu();
  initializeParallaxAccents();
  initializeLivePreviewFallback();
  initializeContactFormDraft();
  initializeContactFormStatus();
});
