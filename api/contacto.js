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

  try {
    const respuesta = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(destino)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: `Nueva solicitud de asesoría — ${datos.nombre}`,
        _template: "table",
        Nombre: datos.nombre,
        Teléfono: datos.telefono,
        Caso: datos.caso,
      }),
    });

    if (!respuesta.ok) throw new Error(`FormSubmit respondió ${respuesta.status}`);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error al enviar la solicitud:", error);
    return res.status(502).json({ error: "No pudimos enviar tu solicitud en este momento." });
  }
}
