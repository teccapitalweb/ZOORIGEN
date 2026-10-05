# ZOORIGEN Membership

Proyecto independiente para la modernización de la membresía **Club VIP ZOORIGEN**.

## Estado

Fase 1 — descubrimiento completado.

Fase 3 — interior navegable con catálogo real de ZOORIGEN, reproducción Bunny protegida y arquitectura Stripe/Firebase implementados y verificados localmente el 5 de octubre de 2026.

El repositorio permanece local, aislado y sin remoto. No se hicieron migraciones, conexiones con producción ni despliegues.

## Base técnica acordada

El producto se reconstruirá tomando como referencia directa la arquitectura y las tecnologías del checkout definitivo de **Élite Pecuario**, pero sustituyendo por completo su identidad, contenido, datos e integraciones por los de ZOORIGEN.

- [Mapa de adopción técnica desde Élite Pecuario](docs/base-tecnica-elite.md)
- [Investigación y dirección visual propia de ZOORIGEN](docs/direccion-visual.md)

## Documentación

- [Resumen de descubrimiento](docs/descubrimiento.md)

## Prototipo incluido

- Landing pública responsive.
- Acceso local de demostración y contrato para Firebase Auth (`club-zoorigen`).
- Dashboard del miembro y onboarding.
- Catálogo real de 15 cursos y 61 clases Bunny, con ficha y ruta completa.
- Biblioteca, ficha de recurso y visor protegido.
- Comunidad y sesiones en vivo.
- Retos, historia, herramientas, logros y recompensas.
- Certificados, perfil, membresía y configuración.
- Panel administrativo con todas las rutas equivalentes a Élite Pecuario.
- PWA y service worker.
- API Express modular y fail-closed para Firebase, Stripe Checkout/Portal/Webhook y Bunny Stream firmado.
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

La API no habilita pagos ni video cuando faltan variables verificadas. El cliente solo acepta el identificador Firebase `club-zoorigen`. Los identificadores de los 61 videos son catálogo público; la clave de firma Bunny, la llave secreta Stripe y la cuenta de servicio Firebase permanecen exclusivamente en el servidor.

## Flujo conectado

1. Copiar `api/.env.example` a `api/.env` y completar únicamente credenciales del entorno autorizado.
2. Confirmar los dos Price IDs de Stripe antes de agregarlos.
3. Ejecutar la API y definir `VITE_API_URL` en el cliente.
4. Iniciar sesión con Firebase. El cliente adjunta el ID token a video y checkout.
5. Bunny entrega una URL firmada con vigencia máxima de 15 minutos.
6. Stripe activa o revoca el acceso únicamente mediante su webhook firmado.

No se copiaron secretos ni se realizaron conexiones, cobros, escrituras remotas o despliegues durante esta fase.

## Límites vigentes

- No copiar código o recursos de otras marcas.
- No conectar pagos, cuentas, Firebase, Railway, Bunny Stream, dominios ni servicios externos sin validación y autorización expresa.
- Los precios visibles de $199/$1,899 siguen etiquetados como información pública pendiente de confirmación en Stripe.
