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

## 6. Segunda ronda (quejas del dueño sobre la primera versión)

Quejas: huecos enormes entre secciones, letras que no gustaron, cursos sin vida, secciones de abajo sin efectos 3D, pie "gigante" en pantalla mediana y celular, guía virtual debajo del WhatsApp.

| Tema | Qué se hizo |
| --- | --- |
| Huecos | Relleno por lado de 24 / 30 / 38 px (celular / tableta / escritorio) para toda la portada, con una sola regla (`--zs-pad`) que anula los 60 a 110 px de las capas viejas. Separación visual entre contenidos: de unos 200 px a 55-105 px a 1440, de 115-165 a 45-110 px a 768 y de 105-155 a 40-95 px a 390 |
| Letras | Outfit (titulares y cifras) + Inter (texto), autoalojadas con `assets/css/fuentes.css` y precargadas; sin Google Fonts. Los nombres Manrope, Poppins y Open Sans de las capas viejas quedan como alias hacia esos archivos, así toda la portada, la encuesta y la guía usan la misma pareja |
| Cursos | Inclinación 3D con el puntero (máx. 6 grados), imagen con zoom y paralaje, pastilla que se desliza entre filtros, tarjetas que entran escalonadas al filtrar, contador que cuenta, barra de progreso del carrusel |
| Secciones de abajo | Revelado escalonado, profundidad al pasar el puntero, íconos con micro-animación, línea que une los pasos y se dibuja con el scroll, paralaje en imágenes y portadas flotantes, acordeón con altura suave |
| Pie | Una columna con enlaces en dos filas de dos en celular (750 px a 390), cuatro columnas en tableta (540 px a 950); conserva margen inferior para los botones flotantes |
| Guía y WhatsApp | Una sola columna abajo a la derecha, guía arriba y WhatsApp abajo, centrados, 12 px entre sí, zona segura de iOS; "subir" queda a la izquierda |

Archivos: `assets/css/landing-secciones.css` (todo el estilo y movimiento), `assets/js/landing-efectos.js` (un observador, un puntero delegado, un scroll con rAF; no corre con "reducir movimiento"; sin inclinación en pantallas táctiles).

## 7. Tercera ronda (referencias del dueño: esquina que se expande, tarjetas que giran, tarjeta que se levanta, muro de reseñas)

| Sección | Cambio |
| --- | --- |
| Tu siguiente paso | Tres columnas desde 900 px y una debajo (ya no queda una tarjeta huérfana). Esquina verde sólida que crece y llena la tarjeta al pasar el puntero, al enfocar con teclado o al tocar; título y texto pasan a blanco. El conector solo va entre tarjetas contiguas y solo con tres columnas |
| Confianza | Tarjeta que gira 3D (0.8 s, perspectiva 1000 px): frente con el logo en caja fija de 156 x 72 px, en gris que se colorea; reverso con el nombre sobre verde sólido y un ícono. Foco por teclado y toque la giran; con reducir movimiento hay fundido, sin giro. El marquee se pausa con puntero, foco, tarjeta girada y fuera de pantalla |
| Del estudio a la práctica | 4 columnas en escritorio, 2 x 2 en tableta, 1 en celular. Al pasar el puntero la imagen se oscurece con una capa sólida translucida, aparece "Explorar" con flecha, borde verde y sombra amplia |
| Reseñas | Las capturas de Facebook ya no se muestran. Muro de 6 tarjetas blancas en 3 columnas inclinadas -9 grados sobre fondo verde pálido, columnas que suben y bajan lento, con pausa al pasar el puntero y fuera de pantalla; en celular, una fila que se desliza con el dedo |
| Botón "subir" | Pasó a la columna derecha, arriba de la guía, para no tapar enlaces del contenido |

Imágenes que ya no se usan en la portada (se pueden retirar del repo): `assets/img/resenas/resena_captura_de_pantalla_2026-03-07_181351.png`, `..._181415.png`, `..._181503.png`, `..._181513.png`, `..._181529.png`, `..._181539.png` y las copias con el mismo nombre en la raíz. `data.js` aún lista las seis de `assets/img/resenas` en `reviews`.

## 8. Cuarta ronda

- **Apartado "Membresía Zoorigen" quitado** (sección `#club-vip`): marcado eliminado de `index.html` y reglas `club-vip-banner*`, `club-vip-card*` y `btn--club-cta` borradas de `styles.css` y de `landing-catalog/nature/premium/redesign/structure.css`. El menú ("Plataforma"), el paso 3 ("Conocer el club") y el pie ("Plataforma del club") apuntan ahora a `#panel`, la sección "Tu plataforma", que ya explica el club. Sin anclas rotas (comprobado en portada y páginas legales).
- **Íconos de redes del pie:** círculos de 52 px (48 px en celular) que toman el color sólido de la marca al hover, foco o toque (Instagram `#DD2A7B`, Facebook `#1877F2`, WhatsApp `#128C7E`, porque `#25D366` no da contraste con el ícono blanco) y rebotan 0.4 s; con reducir movimiento solo cambia el color.
- **Beneficios:** frente verde sólido con ícono grande y título; con puntero fino y sin reducir movimiento, al pasar el puntero o enfocar la tarjeta se inclina (-3 grados, escala 1.05), el ícono se encoge y un panel blanco con título y descripción gira hasta quedar recto (0.6 s). Sin hover, en táctil o con reducir movimiento: ícono, título y descripción visibles y estáticos. La descripción siempre está en el DOM.
- **Del estudio a la práctica:** foto a toda la tarjeta y panel crema de 70 % de alto (radio 16 px) encima; al hover o foco el panel baja 100 % en 1 s y deja ver la foto. En táctil o sin hover: imagen arriba y texto debajo.
- Lo de las palabras que alternan en las cifras no se hizo.

## 9. Quinta ronda

- **Tarjetas compactas** (alto real de la primera tarjeta, antes → después a 1440 / 390 px): cursos 494 → 394 / 476 → 364, beneficios 200 → 132 / 128 → 99, del estudio a la práctica 359 → 236 / 348 → 273, pasos 321 → 208 / 276 → 205, áreas 398 → 284 / 334 → 263, confianza 124 → 100 / 124 → 92, cifras 98 → 82 / 85 → 79.
- **Tonos pálidos** en pasos (la esquina se llena con salvia `#EAF1EC`, texto oscuro), beneficios (frente salvia, panel blanco opaco) y reverso de confianza (salvia con nombre oscuro). El verde de marca queda para íconos, enlaces y líneas finas.
- **Sin conector** entre los pasos; **logos siempre a color**; **Confianza** con solo etiqueta y título.
- **Beneficios**: el frente se desvanece por completo en 0.25 s y el panel entra opaco después (nunca hay dos textos a la vez).
- **Imágenes de "Del estudio a la práctica"**: ahora se piden a `assets/img/landing/estudio/estudio-*.webp` y, mientras no existan, caen a las fotos de las áreas. Prompts en `PROMPTS-IMAGENES-PORTADA.md` (nota interna).
- **Jaguarito que se asoma** (`assets/js/landing-mascota.js`): usa `assets/img/guia/guia-saludo-1.webp`; sale al detenerse 1.2 s en pasos, beneficios, estudio a la práctica o cursos (atributo `data-mascota` de cada sección). Máximo 4 por visita, 8 s de enfriamiento, una vez por sección, nunca sobre texto, sin reducir movimiento no aparece; el toque abre la guía.

## 10. Sexta ronda: paleta variada

El verde de marca (`#1F5F3A`) queda como acento (logo, botón principal "Crear cuenta gratis"/"Entrar al club", algún ícono). Paleta definida como variables en `:root` de `landing-secciones.css`: cielo, terracota, ámbar, índigo, teal y rosa arcilla, cada uno con su tinte; fondos arena, cielo pálido, azul profundo, índigo profundo y azul noche. Todos los pares pasan AA (la prueba los mide).

| Color | Dónde |
| --- | --- |
| Cielo `#1E5A8A` / tinte `#E6F0F8` | cifra "cursos", paso 1, beneficio 1, área "Fauna y conservación", etiquetas, flechas, barra de progreso, botón "Informes", dudas, reverso 1 de Confianza, aviso y términos |
| Terracota `#AE4310` / `#FBEBDD` | cifra "áreas", paso 2, beneficio 2, área "Fauna ponzoñosa", palabra destacada de Cursos |
| Ámbar `#8A5A00` / `#FBF1D4` | cifra "alumnos", beneficio 3, área "Apicultura y polinizadores", tarjeta de Apicultura, palabra destacada de Beneficios |
| Índigo `#4B4E9E` / `#ECECF8` | paso 3, beneficio 4, área "Investigación y monitoreo", tarjeta de campo, palabra destacada de Siguiente paso |
| Teal `#0F766E` / `#E1F2EF` | beneficio 5, área "Manejo bajo cuidado humano", tarjeta de Conservación y manejo, canal WhatsApp, palabra destacada de Estudio a la práctica |
| Rosa arcilla `#A83F5A` / `#F9E7EC` | beneficio 6, área "Etología", tarjeta de Comportamiento, canal Instagram, palabra destacada de Reseñas |
| Azul profundo `#17324D` | sección "Tu plataforma", escenario del certificado |
| Índigo profundo `#2B2F6B` | panel de Contacto |
| Azul noche `#10243A` | pie de página (resaltan las mariposas) |
| Cielo pálido `#F1F6FB` / `#E6F0F8` | fondo de Áreas, Estudio a la práctica y Certificación; muro de reseñas |
| Arena `#FAF5EA` / crema `#F6F4EF` | cifras, Siguiente paso, Reseñas, Contacto, Galería, Nosotros |
| Tinta `#1F2933` | filtros activos, pastilla de filtros, botones secundarios |
| Azul Facebook `#1565C0` | insignia "Reseña en Facebook" (ajustado de #1877F2 para contraste AA) |
