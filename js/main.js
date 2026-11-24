(function () {
  "use strict";
  var cfg = window.SITE_CONFIG;
  var I18N = window.I18N;
  var LANG_KEY = "pr-lang";
  var lang = "fr";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lbIndex = 0;
  var lastFocus = null;

  function interpolate(str) {
    if (!str) return str;
    return str
      .replaceAll("{businessName}", cfg.businessName)
      .replaceAll("{personName}", cfg.personName)
      .replaceAll("{phone}", cfg.phoneDisplay)
      .replaceAll("{email}", cfg.email)
      .replaceAll("{tagline}", lang === "fr" ? cfg.taglineFr : cfg.taglineEn);
  }

  function interpolateDeep(val) {
    if (typeof val === "string") return interpolate(val);
    if (Array.isArray(val)) return val.map(interpolateDeep);
    if (val && typeof val === "object") {
      var out = {};
      Object.keys(val).forEach(function (k) { out[k] = interpolateDeep(val[k]); });
      return out;
    }
    return val;
  }

  function t(path) {
    var node = I18N[lang];
    path.split(".").forEach(function (k) {
      node = node ? node[k] : undefined;
    });
    return interpolateDeep(node);
  }

  function setText(sel, value) {
    document.querySelectorAll(sel).forEach(function (el) {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return;
      if (el.hasAttribute("data-i18n-html")) el.innerHTML = value;
      else el.textContent = value;
    });
  }

  function applyLang(next, persist) {
    lang = next;
    if (persist) localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang === "fr" ? "fr-CA" : "en-CA";
    if (document.body.getAttribute("data-page") === "legal") {
      document.title = t("legal.metaTitle");
    } else {
      document.title = t("meta.title");
    }
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t("meta.description"));
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", cfg.businessName);
    var ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", t("meta.description"));
    var ogLoc = document.querySelector('meta[property="og:locale"]');
    if (ogLoc) ogLoc.setAttribute("content", lang === "fr" ? "fr_CA" : "en_CA");

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var val = t(el.getAttribute("data-i18n"));
      if (val == null) return;
      if (el.dataset.i18nHtml != null) el.innerHTML = String(val).replaceAll("\n", "<br>");
      else el.textContent = val;
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });

    // wordmark / brand (always the untranslated business name)
    document.querySelectorAll("[data-brand]").forEach(function (el) {
      el.textContent = cfg.businessName;
    });

    // why items
    var why = t("why.items");
    document.querySelectorAll("[data-why]").forEach(function (el, i) {
      if (!why[i]) return;
      el.querySelector("h3").textContent = why[i].t;
      el.querySelector("p").textContent = why[i].p;
    });

    // who items
    var who = t("who.items");
    document.querySelectorAll("[data-who]").forEach(function (el, i) {
      if (!who[i]) return;
      el.querySelector("h3").textContent = who[i].t;
      el.querySelector("p:not(.credit)").textContent = who[i].p;
      var credit = el.querySelector(".credit");
      if (credit) credit.textContent = who[i].credit;
      var img = el.querySelector("img");
      if (img) img.alt = who[i].alt;
    });

    // how steps
    var steps = t("how.steps");
    document.querySelectorAll("[data-step]").forEach(function (el, i) {
      if (!steps[i]) return;
      el.querySelector("h3").textContent = steps[i].t;
      el.querySelector("p").textContent = steps[i].p;
    });

    // about paragraphs
    var about = t("about.p");
    document.querySelectorAll("[data-about]").forEach(function (el, i) {
      if (about[i]) el.textContent = about[i];
    });

    // gallery
    var items = t("gallery.items");
    document.querySelectorAll("[data-gallery-item]").forEach(function (el, i) {
      if (!items[i]) return;
      var cap = el.querySelector(".label, [data-label]");
      if (cap) cap.textContent = items[i].label;
      var img = el.querySelector("img");
      if (img) img.alt = items[i].alt;
      el.setAttribute("data-caption", items[i].caption);
      el.setAttribute("data-label-text", items[i].label);
      el.setAttribute("data-alt", items[i].alt);
    });

    // GIF / poster
    var gif = document.getElementById("regroove-gif");
    var poster = document.getElementById("regroove-poster");
    var srcGif = "img/anim/regroove-" + lang + ".gif";
    var srcPoster = "img/anim/regroove-" + lang + "-poster.jpg";
    if (gif && poster) {
      gif.alt = t("how.gifAlt");
      poster.alt = t("how.gifAlt");
      if (reduced) {
        gif.hidden = true;
        poster.hidden = false;
        poster.src = srcPoster;
      } else {
        poster.hidden = true;
        gif.hidden = false;
        gif.src = srcGif;
      }
    }

    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-lang") === lang ? "true" : "false");
    });

    refreshFormLanguage();

    if (window.location.hash && document.querySelector(window.location.hash)) {
      // keep position; do not jump
    }
  }

  function detectLang() {
    var saved = localStorage.getItem(LANG_KEY);
    if (saved === "fr" || saved === "en") return Promise.resolve(saved);
    var browserFr = String(navigator.language || "").toLowerCase().indexOf("fr") === 0;
    return new Promise(function (resolve) {
      var done = false;
      function finish(value) {
        if (done) return;
        done = true;
        resolve(value);
      }
      var timer = setTimeout(function () {
        finish(browserFr ? "fr" : "fr");
      }, 1500);
      fetch("https://get.geojs.io/v1/ip/geo.json")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          clearTimeout(timer);
          var region = ((data && (data.region || "")) + " " + (data && (data.region_code || ""))).toLowerCase();
          if (/\bqc\b|quebec|québec/.test(region)) return finish("fr");
          if (browserFr) return finish("fr");
          finish("en");
        })
        .catch(function () {
          clearTimeout(timer);
          finish("fr");
        });
    });
  }

  /* Lightbox */
  function items() {
    return Array.prototype.slice.call(document.querySelectorAll("[data-gallery-item]"));
  }
  function openLb(i) {
    var list = items();
    if (!list[i]) return;
    lbIndex = i;
    lastFocus = document.activeElement;
    var box = document.getElementById("lightbox");
    var img = document.getElementById("lightbox-img");
    var cap = document.getElementById("lightbox-caption");
    var it = list[i];
    var id = it.getAttribute("data-id");
    img.src = "img/work/" + id + ".jpg";
    img.alt = it.getAttribute("data-alt") || "";
    cap.innerHTML = "<strong>" + (it.getAttribute("data-label-text") || "") + "</strong> — " + (it.getAttribute("data-caption") || "");
    box.classList.add("is-open");
    box.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    document.getElementById("lb-close").focus();
  }
  function closeLb() {
    var box = document.getElementById("lightbox");
    box.classList.remove("is-open");
    box.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    var img = document.getElementById("lightbox-img");
    img.removeAttribute("src");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function navLb(delta) {
    var list = items();
    openLb((lbIndex + delta + list.length) % list.length);
  }

  function initLightbox() {
    items().forEach(function (el, i) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        openLb(i);
      });
    });
    document.getElementById("lb-close").addEventListener("click", closeLb);
    document.getElementById("lb-prev").addEventListener("click", function () { navLb(-1); });
    document.getElementById("lb-next").addEventListener("click", function () { navLb(1); });
    document.getElementById("lightbox").addEventListener("click", function (e) {
      if (e.target.id === "lightbox") closeLb();
    });
    document.addEventListener("keydown", function (e) {
      if (!document.getElementById("lightbox").classList.contains("is-open")) return;
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowLeft") navLb(-1);
      if (e.key === "ArrowRight") navLb(1);
    });
  }

  function initReveal() {
    if (reduced) {
      document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  }

  function initNav() {
    var btn = document.getElementById("menu-btn");
    var panel = document.getElementById("nav-panel");
    if (!btn || !panel) return;
    btn.addEventListener("click", function () {
      var open = panel.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    panel.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        panel.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* Contact form — mailto by default; set SITE_CONFIG.formEndpoint to post instead. */
  var lastVisitorName = "";
  var formThanksKey = "";

  function fieldValue(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function typeLabel(value) {
    var types = t("contact.types") || {};
    return types[value] || value;
  }

  function setFieldError(id, message) {
    var input = document.getElementById("field-" + id);
    var err = document.getElementById("error-" + id);
    var field = input && input.closest(".field");
    if (!input || !err || !field) return;
    if (message) {
      field.classList.add("is-invalid");
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", "error-" + id);
      err.hidden = false;
      err.textContent = message;
    } else {
      field.classList.remove("is-invalid");
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
      err.hidden = true;
      err.textContent = "";
    }
  }

  function clearFormErrors() {
    ["name", "phone", "email", "type"].forEach(function (id) { setFieldError(id, ""); });
  }

  function validateForm() {
    var errors = {};
    var name = fieldValue("field-name");
    var phone = fieldValue("field-phone");
    var email = fieldValue("field-email");
    var type = fieldValue("field-type");
    if (!name) errors.name = t("contact.errors.name");
    if (!phone) errors.phone = t("contact.errors.phone");
    else if (!/\d{7,}/.test(phone.replace(/\D/g, ""))) errors.phone = t("contact.errors.phoneInvalid");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = t("contact.errors.email");
    if (!type) errors.type = t("contact.errors.type");
    return errors;
  }

  function showFormErrors(errors) {
    clearFormErrors();
    var first = null;
    ["name", "phone", "email", "type"].forEach(function (id) {
      if (errors[id]) {
        setFieldError(id, errors[id]);
        if (!first) first = document.getElementById("field-" + id);
      }
    });
    if (first) first.focus();
  }

  function collectForm() {
    return {
      name: fieldValue("field-name"),
      phone: fieldValue("field-phone"),
      email: fieldValue("field-email"),
      type: fieldValue("field-type"),
      message: fieldValue("field-message")
    };
  }

  function mailBody(data) {
    var empty = t("contact.mailEmpty");
    var lines = [
      t("contact.mailName") + ": " + data.name,
      t("contact.mailPhone") + ": " + data.phone,
      t("contact.mailEmail") + ": " + (data.email || empty),
      t("contact.mailType") + ": " + typeLabel(data.type),
      t("contact.mailMessage") + ": " + (data.message || empty)
    ];
    return lines.join("\n");
  }

  function openMailto(data) {
    var subject = t("contact.subject").replaceAll("{workType}", typeLabel(data.type));
    var href = "mailto:" + cfg.email +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(mailBody(data));
    window.location.href = href;
  }

  function thanksText(key, visitorName) {
    return t(key).replaceAll("{visitorName}", visitorName);
  }

  function showFormThanks(key, visitorName) {
    var status = document.getElementById("form-status");
    if (!status) return;
    lastVisitorName = visitorName;
    formThanksKey = key;
    status.hidden = false;
    status.textContent = thanksText(key, visitorName);
  }

  function refreshFormLanguage() {
    var form = document.getElementById("quote-form");
    if (!form) return;
    var hasError = form.querySelector(".field.is-invalid");
    if (hasError) showFormErrors(validateForm());
    if (formThanksKey) showFormThanks(formThanksKey, lastVisitorName);
  }

  function onFormSubmit(e) {
    e.preventDefault();
    var status = document.getElementById("form-status");
    if (status) { status.hidden = true; status.textContent = ""; formThanksKey = ""; }
    var errors = validateForm();
    if (Object.keys(errors).length) {
      showFormErrors(errors);
      return;
    }
    clearFormErrors();
    var data = collectForm();
    var endpoint = String(cfg.formEndpoint || "").trim();
    if (endpoint) {
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (!res.ok) throw new Error("form-endpoint");
        showFormThanks("contact.thanksSent", data.name);
      }).catch(function () {
        openMailto(data);
        showFormThanks("contact.thanksFallback", data.name);
      });
      return;
    }
    openMailto(data);
    showFormThanks("contact.thanks", data.name);
  }

  function initForm() {
    var form = document.getElementById("quote-form");
    if (!form) return;
    form.addEventListener("submit", onFormSubmit);
    form.querySelectorAll("input, select, textarea").forEach(function (el) {
      el.addEventListener("input", function () {
        var id = (el.id || "").replace(/^field-/, "");
        if (id) setFieldError(id, "");
      });
      el.addEventListener("change", function () {
        var id = (el.id || "").replace(/^field-/, "");
        if (id) setFieldError(id, "");
      });
    });
  }

  function initLangButtons() {
    document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyLang(btn.getAttribute("data-lang"), true);
      });
    });
  }

  document.documentElement.classList.add("js");
  applyLang("fr", false);
  initLightbox();
  initReveal();
  initNav();
  initLangButtons();
  initForm();
  detectLang().then(function (detected) {
    if (detected !== lang) applyLang(detected, false);
  });
})();
