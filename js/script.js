document.addEventListener("DOMContentLoaded", () => {

  // Año dinámico en el footer
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Menú móvil
  const header = document.querySelector(".site-header");
  const navToggle = document.getElementById("nav-toggle");
  if (navToggle && header) {
    navToggle.addEventListener("click", () => {
      const isOpen = header.classList.toggle("nav-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    document.querySelectorAll(".main-nav a").forEach((link) => {
      link.addEventListener("click", () => {
        header.classList.remove("nav-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Modal de aviso de privacidad
  const privacyModal = document.getElementById("privacy-modal");
  const privacyBackdrop = document.getElementById("privacy-backdrop");
  const privacyClose = document.getElementById("privacy-close");
  const privacyLinks = [
    document.getElementById("privacy-link"),
    document.getElementById("privacy-link-footer"),
  ].filter(Boolean);

  const openPrivacyModal = (e) => {
    e.preventDefault();
    privacyModal.hidden = false;
  };
  const closePrivacyModal = () => { privacyModal.hidden = true; };

  privacyLinks.forEach((link) => link.addEventListener("click", openPrivacyModal));
  if (privacyBackdrop) privacyBackdrop.addEventListener("click", closePrivacyModal);
  if (privacyClose) privacyClose.addEventListener("click", closePrivacyModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && privacyModal && !privacyModal.hidden) closePrivacyModal();
  });

  // Formulario de contacto
  const form = document.getElementById("contact-form");
  const formNote = document.getElementById("form-note");

  // El correo de destino vive en el servidor (variable de entorno CONTACT_EMAIL),
  // nunca en el navegador. Ver api/contacto.js.
  const FORM_ENDPOINT = "/api/contacto";
  const WHATSAPP_NUMBER = "573243222965";

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nombre = form.nombre.value.trim();
      const telefono = form.telefono.value.trim();
      const caso = form.caso.value.trim();

      if (!nombre || !telefono || !caso || !form.privacidad.checked) {
        formNote.textContent = "Por favor completa todos los campos y acepta la política de datos.";
        formNote.className = "form-note error";
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      formNote.textContent = "Enviando tu solicitud…";
      formNote.className = "form-note";

      const abrirWhatsApp = () => {
        const mensaje = `Hola, soy ${nombre} (tel: ${telefono}). Quiero asesoría legal sobre mi caso: ${caso}`;
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener");
      };

      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ nombre, telefono, caso, website: form.website.value }),
        });
        if (!res.ok) throw new Error("Envío rechazado");

        formNote.textContent = "¡Gracias! Recibimos tu solicitud y te contactaremos pronto.";
        formNote.className = "form-note success";
        form.reset();
      } catch {
        // Si el correo no está disponible, se continúa por WhatsApp.
        formNote.textContent = "Te estamos redirigiendo a WhatsApp para completar tu solicitud.";
        formNote.className = "form-note success";
        abrirWhatsApp();
        form.reset();
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
});
