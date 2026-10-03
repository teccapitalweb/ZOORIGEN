# ZOORIGEN Membership

Proyecto independiente para la modernización de la membresía **Club VIP ZOORIGEN**.

## Estado

Fase 1 — descubrimiento completado.

Fase 2 — primer prototipo navegable implementado y verificado localmente el 3 de octubre de 2026.

El repositorio permanece local, aislado y sin remoto. No se hicieron migraciones, conexiones con producción ni despliegues.

## Base técnica acordada

El producto se reconstruirá tomando como referencia directa la arquitectura y las tecnologías del checkout definitivo de **Élite Pecuario**, pero sustituyendo por completo su identidad, contenido, datos e integraciones por los de ZOORIGEN.

- [Mapa de adopción técnica desde Élite Pecuario](docs/base-tecnica-elite.md)

## Documentación

- [Resumen de descubrimiento](docs/descubrimiento.md)

## Prototipo incluido

- Landing pública responsive.
- Acceso local de demostración.
- Dashboard del miembro.
- Catálogo y ficha de curso.
- Biblioteca de recursos.
- Comunidad y sesiones en vivo.
- Retos y recompensas.
- Certificados, perfil y membresía.
- Panel administrativo estructural.
- PWA y service worker.
- API Express fail-closed preparada para Firebase, Stripe y Bunny Stream.

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
