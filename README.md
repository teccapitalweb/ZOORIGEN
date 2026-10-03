# ZOORIGEN Membership

Proyecto independiente para la modernización de la membresía **Club VIP ZOORIGEN**.

## Estado

Fase 1 — descubrimiento completado.

Fase 2 — prototipo navegable y dirección visual “Expedición científica digital” implementados y verificados localmente el 3 de octubre de 2026.

El repositorio permanece local, aislado y sin remoto. No se hicieron migraciones, conexiones con producción ni despliegues.

## Base técnica acordada

El producto se reconstruirá tomando como referencia directa la arquitectura y las tecnologías del checkout definitivo de **Élite Pecuario**, pero sustituyendo por completo su identidad, contenido, datos e integraciones por los de ZOORIGEN.

- [Mapa de adopción técnica desde Élite Pecuario](docs/base-tecnica-elite.md)
- [Investigación y dirección visual propia de ZOORIGEN](docs/direccion-visual.md)

## Documentación

- [Resumen de descubrimiento](docs/descubrimiento.md)

## Prototipo incluido

- Landing pública responsive.
- Acceso local de demostración.
- Dashboard del miembro y onboarding.
- Catálogo, ficha de curso y ruta de clases.
- Biblioteca, ficha de recurso y visor protegido.
- Comunidad y sesiones en vivo.
- Retos, historia, herramientas, logros y recompensas.
- Certificados, perfil, membresía y configuración.
- Panel administrativo con todas las rutas equivalentes a Élite Pecuario.
- PWA y service worker.
- API Express modular y fail-closed preparada para Firebase, Stripe y Bunny Stream.
- Fontsource (Inter, Outfit y JetBrains Mono), Lucide y QR como en la base técnica.
- Herramientas de Cloudflare presentes, sin despliegue ni conexión a producción.

## Ejecutar localmente

```powershell
npm install
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Abrir:

- Landing: <http://127.0.0.1:4173/>
- Club: <http://127.0.0.1:4173/club/#/login>

API aislada:

```powershell
cd api
npm install
npm run check
npm test
```

La API no habilita pagos ni video cuando faltan variables verificadas. El cliente solo acepta el identificador Firebase `club-zoorigen`.

## Límites vigentes

- No copiar código o recursos de otras marcas.
- No conectar pagos, cuentas, Firebase, Railway, Bunny Stream, dominios ni servicios externos sin validación y autorización expresa.
- No usar precios, testimonios, cifras, acreditaciones o beneficios como datos definitivos hasta que el propietario los confirme.
