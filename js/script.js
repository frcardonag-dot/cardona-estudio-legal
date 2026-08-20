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

  // FormSubmit debe llamarse desde el navegador: sus servidores rechazan las
  // peticiones que salen de un centro de datos, así que hacerlo desde una función
  // en el servidor no funciona.
  //
  // El identificador de abajo es el alias que FormSubmit asigna a la cuenta. Reenvía
  // al correo del estudio sin que la dirección aparezca en el código de la página.
  const FORM_ENDPOINT = "https://formsubmit.co/ajax/c11065e4be6584493e32a2bff91ef1f7";
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

      // Campo trampa: si viene relleno es un bot. Se simula el envío sin hacer nada.
      if (form.website.value) {
        formNote.textContent = "¡Gracias! Recibimos tu solicitud y te contactaremos pronto.";
        formNote.className = "form-note success";
        form.reset();
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
          body: JSON.stringify({
            _subject: `Nueva solicitud de asesoría — ${nombre}`,
            _template: "table",
            Nombre: nombre,
            Teléfono: telefono,
            Caso: caso,
          }),
          // Si el servicio no responde, se abandona el intento y se pasa a
          // WhatsApp. Sin este límite el visitante se queda viendo "Enviando…"
          // indefinidamente y el contacto se pierde.
          signal: AbortSignal.timeout(15000),
        });

        // FormSubmit responde 200 incluso cuando rechaza el envío, e indica el
        // error dentro del cuerpo. Hay que leerlo: mirar solo el estado daría por
        // bueno un envío que nunca llegó.
        const datos = await res.json().catch(() => null);
        if (!res.ok || String(datos?.success) !== "true") {
          throw new Error(datos?.message ?? `Envío rechazado (${res.status})`);
        }

        formNote.textContent = "¡Gracias! Recibimos tu solicitud y te contactaremos pronto.";
        formNote.className = "form-note success";
        form.reset();
      } catch (error) {
        // Si el correo falla, se continúa por WhatsApp para no perder el contacto.
        console.error("Fallo el envío del formulario:", error);
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
