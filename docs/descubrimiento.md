# Descubrimiento de ZOORIGEN y su membresía

**Fecha:** 3 de octubre de 2026  
**Estado:** investigación de solo lectura; no se hicieron cambios en producción.

## 1. Fuentes revisadas

### Fuentes públicas y repositorios

- Sitio público oficial: <https://www.zoorigen.com/>
- Acceso al Club VIP: <https://www.zoorigen.com/pages/club-login.html>
- Registro público del Club VIP: <https://www.zoorigen.com/pages/club-registro.html>
- Frontend publicado: <https://github.com/teccapitalweb/ZOORIGEN>
- Backend de membresía: <https://github.com/teccapitalweb/zoorigen-webhook>

### Estado local

- No se encontró un checkout local, directorio, archivo de código ni remoto Git con `Zorigen` o `Zoorigen` en `C:\dev` o en `C:\Users\Miguel Angel Galicia\Documents`.
- La cuenta GitHub activa `teccapitalweb` sí contiene los dos repositorios públicos anteriores.
- La otra cuenta GitHub configurada, `michaelking19rtx-lgtm`, no mostró repositorios coincidentes.

## 2. Fuente de verdad identificada

- **Sitio y Club publicados:** `teccapitalweb/ZOORIGEN`, rama `main`. GitHub Pages informa que construye desde `/` en `main`, con HTTPS y el dominio `www.zoorigen.com`.
- **Pagos y estado de acceso:** `teccapitalweb/zoorigen-webhook`, rama `main`. El código actual usa Stripe, Firebase Admin y Railway.
- **Trabajo no publicado:** `codex/curso-inicial-y-bienvenida` está un commit por delante de `main` y agrega un recorrido de bienvenida, cambios de acceso al primer curso y pruebas. Debe tratarse como propuesta histórica, no como producción.
- Las ramas `agent/minimal-club-entry`, `agent/redisenar-club-zoorigen` y `agent/remove-club-interstitial` están muy atrasadas y divergentes respecto de `main`; son referencias históricas, no fuentes de verdad actuales.

## 3. Identidad y oferta confirmadas por fuentes públicas

La marca oficial encontrada es **ZOORIGEN** (con doble “o”). Se presenta como una plataforma mexicana de capacitación científica en fauna, biodiversidad, apicultura, manejo animal, conservación e investigación, dirigida a estudiantes, profesionistas y personas interesadas en estos temas.

### Identidad visual observable

- Logotipo propio de ZOORIGEN y fotografías de fauna, cursos, alumnos y actividades.
- Paleta dominante: verde profundo, verdes naturales, amarillo/dorado cálido, blanco y tonos carbón.
- Tipografías declaradas: Poppins para títulos y Open Sans para texto.
- Tono de voz: científico, accesible, formativo, cercano y orientado a la conservación.

### Oferta pública del sitio

- Cursos online agrupados en seis áreas temáticas.
- Certificados con folio y QR.
- Material de apoyo y acceso multidispositivo.
- Contacto por WhatsApp, correo y Facebook.

### Oferta pública del Club VIP

- Biblioteca de cursos.
- Sesiones mensuales en vivo con especialistas.
- Recursos científicos y PDFs.
- Progreso y certificados.
- Canal privado de WhatsApp.
- Descuento anunciado del 20 % en cursos.
- Cancelación anunciada al final del periodo, sin permanencia.

La página de registro muestra **$199 MXN al mes** y **$1,899 MXN al año**. Estos importes son datos visibles en la interfaz y coinciden con constantes de presentación del frontend; todavía no se consideran confirmados contra los productos reales de Stripe ni contra una aprobación del propietario.

## 4. Arquitectura existente

- Frontend estático HTML, CSS y JavaScript desplegado con GitHub Pages.
- PWA con manifiesto y service worker.
- Firebase Authentication para correo/contraseña y Google.
- Firestore con colecciones como `miembros`, `usuarios`, `cursos`, `videos`, `pdfs`, `sesiones`, `noticias`, `foroPosts` y `certificados`.
- Backend Node.js/Express en Railway.
- Stripe Checkout y webhooks para altas, renovaciones, pagos fallidos, cancelación y reactivación.
- Bunny Stream para video protegido mediante tokens generados en el servidor.
- Pruebas unitarias básicas para estados de membresía activa, vencida, cancelada con acceso restante y pago fallido.

## 5. Datos pendientes de validar con el propietario

- Confirmar que “ZOORIGEN” es la grafía contractual y de marca que se usará en todo el producto.
- Confirmar propietario, acceso y entorno correcto de GitHub, dominio, Firebase, Railway, Stripe, Bunny Stream, WhatsApp, correo y Facebook.
- Confirmar que `club-zoorigen` es un proyecto Firebase exclusivo de ZOORIGEN y separar desarrollo, pruebas y producción.
- Confirmar qué reglas de Firestore están realmente desplegadas; el archivo versionado no demuestra el estado de producción.
- Confirmar productos, Price IDs, moneda, impuestos, precios mensual/anual, prueba gratuita, promociones, renovación, reembolsos y cancelación en Stripe.
- Confirmar catálogo vigente, alcance de “biblioteca completa”, calendario y grabaciones de sesiones en vivo, PDFs, certificados y soporte.
- Confirmar la cifra de “más de 2,000 alumnos”, las reseñas, los testimonios textuales y el permiso para usar fotografías y logotipos de empresas.
- Confirmar si todos los cursos dan certificado con QR y cuál es la entidad responsable de emitirlo.
- Definir qué puede explorar una cuenta gratuita y qué requiere pago. La home invita a crear una cuenta “sin costo”, mientras el registro presenta planes pagados.
- Confirmar el proceso de recuperación de cuenta, atención humana, privacidad, términos, eliminación de datos y respuesta a contracargos.

## 6. Riesgos y contradicciones detectados

- La documentación de instalación todavía describe Shopify, pero el backend y `package.json` actuales usan Stripe. Shopify debe considerarse legado hasta que el propietario confirme si sigue cumpliendo alguna función.
- `assets/js/stripe-config.js` contiene texto y ejemplos activos de **GlobalVet**, además de valores de reemplazo. Esto rompe el aislamiento de marca y no debe reutilizarse en el proyecto nuevo.
- El repositorio conserva `_archive/globalvet` y otros recursos históricos. No deben copiarse ni tratarse como material de ZOORIGEN.
- Los precios del frontend son solo valores de presentación; el servidor usa Price IDs y variables de entorno. La interfaz por sí sola no prueba el importe real cobrado.
- La rama de bienvenida del 14 de septiembre de 2026 no está fusionada ni publicada.
- La existencia de reglas, pruebas o un endpoint de salud no confirma que la configuración desplegada sea segura ni que el flujo completo funcione en producción.
- Los repositorios actuales son públicos y contienen lógica de negocio y configuración cliente. Antes de reutilizar cualquier pieza conviene hacer una revisión de seguridad y licencias de activos.

## 7. Propuesta técnica inicial

Crear una aplicación independiente, mobile-first y accesible, con contenido y marca de ZOORIGEN. La primera versión debe ser un prototipo navegable con datos locales claramente marcados y una capa de dominio que permita conectar servicios reales después.

Propuesta base:

- Frontend moderno con TypeScript, componentes accesibles y diseño por tokens.
- Contenido confirmado separado del código y validado mediante esquema.
- Estados explícitos: carga, sin datos, error, membresía pendiente, pago fallido, cancelada con vigencia, vencida y atención humana.
- Autorización y estado de membresía resueltos en el servidor; el navegador nunca concede acceso por sí solo.
- Adaptadores separados para identidad, catálogo, pagos, video y certificados.
- Entornos independientes de desarrollo, pruebas y producción.
- Pruebas de dominio, integración y recorridos críticos, más revisión visual en escritorio y teléfono.

## 8. Límites actuales

No es seguro implementar todavía:

- pagos reales, migración de miembros o cambios de suscripción;
- conexión al Firebase, Stripe, Railway o Bunny Stream actuales;
- cambios de reglas, dominios, DNS o despliegues;
- publicación de precios, cifras, testimonios, acreditaciones o beneficios como definitivos;
- copia directa de código, fotografías o datos sin revisar propiedad, vigencia y permisos.

## 9. Repositorio nuevo confirmado

Directorio local independiente:

`C:\Users\Miguel Angel Galicia\Documents\Codex\2026-10-03\files-pasted-by-the-user-vas\outputs\zoorigen-membership`

Se mantendrá sin remoto hasta que el propietario indique la cuenta u organización, el nombre definitivo y la visibilidad. No se modificaron los repositorios existentes.

