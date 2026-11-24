/* ============================================================
   SINGLE SWAP POINT for the public business name and domain.
   Change businessName and canonicalOrigin here, then run:
     python3 scripts/apply-config.py
   That updates <title>, canonical, and Open Graph / Twitter tags
   in index.html and 404.html (needed for crawlers).

   At runtime, the header wordmark, footer, document.title, and
   any copy that interpolates {businessName} all read this file.
   ============================================================ */
window.SITE_CONFIG = {
  businessName: "Precision Regroove",
  canonicalOrigin: "https://precisionregroove.ca",
  taglineFr: "Regroovage de pneus · Camions lourds et machinerie · Montréal",
  taglineEn: "Tire grooving · Heavy trucks and equipment · Montreal",
  personName: "Daniel Boloten",
  phoneDisplay: "1-514-575-2751",
  phoneHref: "tel:+15145752751",
  email: "dwboloten@gmail.com",
  addressText: "4803 Ave Draper, Montréal, Québec H3X 3P6",
  addressLine1: "4803 Ave Draper",
  addressLine2: "Montréal (Québec)  H3X 3P6",
  /* Leave empty to send via mailto:. Set to a URL (e.g. a form backend)
     later — that is the only change needed to stop using mailto. */
  formEndpoint: ""
};
