# Base técnica de Élite Pecuario para ZOORIGEN

**Decisión confirmada:** 3 de octubre de 2026.

ZOORIGEN se construirá con la estructura funcional, calidad de interacción, arquitectura y tecnologías del checkout definitivo `teccapitalweb/elite-pecuario`. No será una integración entre marcas: será una reconstrucción independiente dentro del repositorio nuevo.

## Qué se adopta

### Arquitectura

- Vite y TypeScript.
- Landing pública y aplicación de miembros como entradas separadas del mismo proyecto.
- Router de aplicación y módulos separados por responsabilidad.
- Sistema de diseño por tokens, estilos responsive y componentes reutilizables.
- Dos modos de datos con el mismo contrato:
  - `demo`: datos locales explícitamente identificados;
  - `api`: datos confirmados del servidor y fallo cerrado.
- API Node.js con Express.
- Firebase Authentication para identidad.
- Firestore accedido mediante una API autenticada para datos de valor.
- Firebase Admin en el servidor para validar tokens y permisos.
- Stripe Checkout, portal y webhooks como arquitectura de pagos, sin conectarlos todavía.
- Bunny Stream con tokens firmados desde el servidor para video protegido.
- PWA, manifiesto, iconos, service worker y experiencia instalable.
- Pruebas de dominio, API, seguridad y regresión de interfaz.

### Estructura funcional

- Landing pública con propuesta de valor, catálogo, beneficios, planes confirmados, preguntas y contacto.
- Registro, inicio de sesión, recuperación y cierre de sesión.
- Inicio personalizado con continuidad, avance, accesos rápidos y novedades.
- Catálogo, ficha de curso, clases secuenciales, notas y evaluaciones.
- Biblioteca de recursos con ficha y visor.
- Comunidad, foros y sesiones en vivo.
- Retos, progreso, rachas y experiencias educativas interactivas.
- Recompensas y cupones con evidencia y validación del servidor.
- Certificados verificables.
- Perfil, suscripción, configuración y soporte.
- Panel administrativo para catálogo, materiales, sesiones, miembros, contenido, comunidad y configuración.
- Bienvenida y encuestas con consentimiento, reanudación y resultados agregados.

## Qué se reemplaza por ZOORIGEN

- Nombre, logotipos, colores finales, tipografías finales y lenguaje visual.
- Fotografías, personajes, ilustraciones, portadas e iconografía de marca.
- Textos, cursos, categorías, materiales, quizzes, sesiones y certificados.
- Reglas comerciales, modalidad gratuita, planes, descuentos y recompensas.
- Contactos, dominios, avisos legales y canales de soporte.
- Identificadores, colecciones, claves, cuentas y recursos de servicios externos.
- Herramientas y contenidos específicamente pecuarios que no correspondan a la oferta de ZOORIGEN.

## Regla de reconstrucción

La arquitectura se estudiará módulo por módulo y se reconstruirá de forma explícita en este repositorio. No se hará una copia masiva del árbol de Élite Pecuario ni se importará su historial Git.

Los contratos y patrones de seguridad sí se conservarán:

- el navegador no concede membresías, premios ni permisos;
- el servidor es la autoridad de acceso;
- el contenido demo nunca aparece como real cuando falla la API;
- los administradores requieren un permiso verificable del servidor;
- videos, pagos, progreso, certificados y recompensas se validan en backend;
- desarrollo, pruebas y producción deben permanecer aislados.

## Contenido inicial disponible para ZOORIGEN

La primera maqueta podrá usar, con etiqueta de información pública pendiente de validación:

- seis áreas de capacitación;
- 22 cursos visibles en el sitio actual;
- biblioteca de cursos, sesiones mensuales, recursos científicos, progreso y certificados;
- canal privado de WhatsApp y descuento anunciado del 20 %;
- precios mostrados públicamente de $199 MXN mensuales y $1,899 MXN anuales.

Los precios, testimonios, cifra de alumnos, alianzas, certificados y beneficios no se tratarán como definitivos hasta confirmarlos con el propietario o con el sistema correspondiente.

## Orden de implementación

1. Crear el esqueleto Vite/TypeScript y el sistema de diseño de ZOORIGEN.
2. Reconstruir la landing y el club en modo demo con datos claramente marcados.
3. Implementar navegación, autenticación simulada y recorridos principales.
4. Añadir catálogo, cursos, biblioteca, comunidad, progreso, retos, certificados y administración.
5. Añadir API y contratos con adaptadores desconectados de producción.
6. Ejecutar pruebas, accesibilidad y revisión visual en escritorio y teléfono.
7. Presentar capturas para aprobación.
8. Conectar servicios reales solo después de validar propietarios, entornos y reglas comerciales.

