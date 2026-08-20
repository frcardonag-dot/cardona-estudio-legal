// Función serverless que recibe el formulario de contacto y lo reenvía por correo.
//
// El correo de destino NUNCA está en el código: se lee de la variable de entorno
// CONTACT_EMAIL, que se configura en Vercel (Settings → Environment Variables).
// Así el repositorio puede ser público sin exponer la dirección.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  const destino = process.env.CONTACT_EMAIL;
  if (!destino) {
    console.error("Falta la variable de entorno CONTACT_EMAIL");
    return res.status(500).json({ error: "El formulario no está configurado. Escríbenos por WhatsApp." });
  }

  const { nombre, telefono, caso, website } = req.body ?? {};

  // Campo trampa: los bots lo rellenan, las personas no.
  if (website) return res.status(200).json({ ok: true });

  const limpiar = (v) => (typeof v === "string" ? v.trim() : "");
  const datos = { nombre: limpiar(nombre), telefono: limpiar(telefono), caso: limpiar(caso) };

  if (!datos.nombre || !datos.telefono || !datos.caso) {
    return res.status(400).json({ error: "Faltan datos por completar." });
  }
  if (datos.nombre.length > 120 || datos.telefono.length > 40 || datos.caso.length > 5000) {
    return res.status(400).json({ error: "Alguno de los campos supera el largo permitido." });
  }

  // FormSubmit identifica el formulario por el sitio desde el que se envía. Como
  // esta llamada sale del servidor y no del navegador, hay que declarar el origen
  // de forma explícita; sin esto rechaza la petición.
  const origen = `https://${req.headers["x-forwarded-host"] ?? req.headers.host}`;

  try {
    const respuesta = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(destino)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: origen,
        Referer: `${origen}/`,
      },
      body: JSON.stringify({
        _subject: `Nueva solicitud de asesoría — ${datos.nombre}`,
        _template: "table",
        Nombre: datos.nombre,
        Teléfono: datos.telefono,
        Caso: datos.caso,
      }),
    });

    // Ojo: FormSubmit devuelve 200 incluso cuando falla, y señala el error dentro
    // del cuerpo. Hay que leerlo, no basta con mirar el código de estado.
    const cuerpo = await respuesta.text();
    let resultado;
    try {
      resultado = JSON.parse(cuerpo);
    } catch {
      throw new Error(`Respuesta no reconocida (${respuesta.status}): ${cuerpo.slice(0, 200)}`);
    }

    if (String(resultado.success) !== "true") {
      throw new Error(resultado.message ?? "FormSubmit rechazó el envío");
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error al enviar la solicitud:", error);
    return res.status(502).json({
      error: "No pudimos enviar tu solicitud en este momento.",
      // TEMPORAL (diagnóstico): quitar en cuanto el formulario quede verificado.
      _diag: { motivo: String(error?.message ?? error), origen },
    });
  }
}
