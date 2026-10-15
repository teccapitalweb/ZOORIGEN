# Revisión interna: portada de Zoorigen frente a la de Alintec

Nota interna, sin publicar. Referencia de solo lectura: `C:\TECCAPITAL\alintec-food` (`index.html`, `aviso-de-privacidad.html`, `terminos-y-condiciones.html`).

## 1. Cómo está estructurada la portada de Alintec

Orden de secciones: barra de navegación, inicio (hero), registro gratis, concepto de marca, empresas aliadas (marquee de logos), áreas, cursos, panel, experiencia, certificación, testimonios, contacto (tarjetas + formulario) y pie.

- Jerarquía tipográfica: una sola familia (Sora) en titulares y texto. Etiqueta pequeña con punto (`section-tag`), título grande con una palabra resaltada (`em`), subtítulo gris, línea divisora.
- Tarjetas: fondo claro, borde fino, sombra suave, ícono en cuadro redondeado.
- Pie de página: fondo verde oscuro, tres columnas arriba (marca con descripción breve; navegación; contacto con teléfono y ciudad) y una barra inferior con derechos de autor, enlaces legales (Términos y Condiciones, Aviso de Privacidad) y redes sociales como íconos.
- Documentos legales: páginas propias en la raíz, enlazadas desde la barra inferior del pie.

## 2. Cómo estaba la de Zoorigen (antes de este cambio)

Barra, hero, registro, cifras, nosotros, confianza, áreas, cursos, siguiente paso, beneficios, plataforma, club VIP, experiencia, certificación, galería, reseñas, dudas, contacto y pie.

Problemas que dijo el dueño y se confirmaron:

| Sección | Problema |
| --- | --- |
| Cifras | números verdes grandes y rótulos de ~11 px sin ícono ni contenedor |
| Confianza | rótulos de 9 a 11 px, marquee con degradado de máscara |
| Cursos | etiquetas de 9 px, botones de 10 a 11 px, filtros de 11 px, cabecera con 4 capas de estilos |
| Siguiente paso, beneficios, experiencia | texto de 12 a 14 px, números decorativos, línea degradada en el borde |
| Plataforma | fondo con degradado, texto de 12 px, abanico de portadas rotadas |
| Dudas | tarjetas muy altas con triángulo nativo, texto pequeño |
| Contacto | panel con degradado y tarjetas translúcidas |
| Pie | textos centrados sin jerarquía, enlaces legales a `#privacidad` y `#terminos` que no existían, año 2025 fijo, lo tapaban el WhatsApp y la guía |

Además se mezclaban Poppins, Open Sans y Manrope entre capas.

## 3. Qué se cambió

Todos los estilos nuevos están en un solo archivo, `assets/css/landing-secciones.css`, cargado después de los demás. Clases nuevas con prefijo `zs-` para no heredar capas anteriores.

- Una sola pareja tipográfica: Manrope (ya cargada por la portada).
- Colores sólidos: verde de marca `#1F5F3A`, dorado `#E8A317`, crema `#FAF8F2` y blanco; sin degradados.
- Letra de lectura de 14 a 17 px con `clamp()`; etiquetas de 12 px como mínimo.
- Tarjetas blancas con borde fino y sombra suave, como las de Áreas (que no se tocaron).

| Sección | Antes | Ahora |
| --- | --- | --- |
| Cifras | tres números verdes sueltos | tres tarjetas con ícono Lucide, número 800 de 28 a 34 px y rótulo de 15 px; contadores `data-counter` intactos |
| Confianza | tarjetas con rótulo de 9 px | logos en tarjeta blanca, nombre a 13 px, movimiento que se pausa al pasar el cursor y se detiene con "reducir movimiento" |
| Cursos | cabecera, chips y botones de 10 a 11 px | buscador de 48 px, filtros de 14 px, tarjeta con imagen 16:9, etiquetas de 12 px, "Ver detalles" e "Informes" de 14 px, flechas del carrusel arriba a la derecha |
| Siguiente paso | tarjetas con borde degradado | tres tarjetas con ícono, "Paso 1/2/3" y enlace con flecha |
| Beneficios | seis tarjetas centradas con texto pequeño | seis tarjetas con ícono a la izquierda y texto de 15 px |
| Plataforma | fondo degradado, abanico rotado | verde sólido, ventana blanca con tres filas con ícono y tres portadas rectas |
| Estudio a la práctica | imagen en `::before` de CSS | imagen real en el marcado, con texto alternativo |
| Dudas | acordeón con tarjetas altas | titular a la izquierda y acordeón con chevrón a la derecha; se añadió una pregunta que lleva a los documentos legales |
| Contacto | panel degradado | panel verde sólido con cuatro canales (WhatsApp, correo, Instagram, Facebook) |
| Pie | 3 columnas centradas | marca y redes, navegación, club y cuenta, legal y contacto; barra inferior con año automático y enlaces legales; margen inferior de 112 px para no quedar bajo el WhatsApp ni la guía |
| Áreas | (tarjetas) | tarjetas intactas; solo el encabezado usa la misma tipografía |

Cambios de marcado y código (compartidos con la otra herramienta, quedan sin commit): `index.html` (secciones y pie, hoja nueva, sprite de íconos), `script.js` (clases `zs-` en tarjeta de curso, filtros, logos, estado vacío; selector `.zs-chips`; enlace de Facebook), `assets/js/encuesta-landing.js` (enlace al aviso).

## 4. Páginas legales

- `aviso-de-privacidad.html` y `terminos-y-condiciones.html` en la raíz, con cabecera y pie de la portada, índice con anclas y columna de lectura de 70 caracteres.
- Datos de la empresa usados: nombre comercial Zoorigen, Tehuacán, Puebla, México; correo `zooorigen@gmail.com`; WhatsApp +52 1 236 111 3237. No se declaró razón social ni RFC.
- Cada documento lleva un comentario HTML: debe revisarlo un abogado (domicilio completo, plazos ARCO, proveedores, política de reembolsos).
- Enlaces: pie de la portada, registro, inicio de sesión, suscripción (renovación automática), directorio y la casilla de WhatsApp de la encuesta.

## 5. Pendiente de confirmar por el dueño

- Cifras y afirmaciones: "22+ cursos", "6+ áreas", "2000+ alumnos graduados" (también "+2,000 alumnos capacitados" en el banner del club), "20% de descuento", "24/7" y los logos de empresas y organizaciones en Confianza (no se verificó que cada una sea cliente o aliada).
- Ortografía del correo (`zooorigen` con tres oes).
- Domicilio completo y si basta "Tehuacán, Puebla, México".
- Política de reembolsos (no existe en el sitio).
- Texto del certificado: "no es un título, cédula profesional ni reconocimiento oficial".
