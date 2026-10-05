# Interior de la membresía ZOORIGEN

Implementado el 5 de octubre de 2026 tomando de Élite Pecuario su estructura y patrones de seguridad, sin mezclar repositorios, cuentas, datos ni marca.

## Contenido integrado

- 15 cursos propios de ZOORIGEN.
- 61 clases con identificadores Bunny únicos.
- Nueve áreas de navegación derivadas del catálogo de la membresía.
- Fichas de curso, índices completos y pantalla de reproducción protegida.
- Biblioteca, comunidad, sesiones, retos, herramientas, logros, recompensas, certificados, perfil, membresía y administración.

La fuente versionada está en `data/zoorigen-bunny-catalog.json`. Contiene solo títulos e identificadores públicos del catálogo; no contiene la clave de firma Bunny.

## Seguridad aplicada

### Bunny Stream

`POST /video/token` valida curso y número de clase contra una lista permitida. Después valida un ID token de Firebase y, salvo la clase de vista previa, una membresía vigente. La API firma una URL temporal con SHA-256 y nunca devuelve `BUNNY_TOKEN_AUTH_KEY`.

### Stripe

`POST /stripe/checkout` exige una sesión Firebase verificada y acepta únicamente `monthly` o `annual`. El UID se agrega a los metadatos de Checkout y de la suscripción. `POST /stripe/webhook` conserva el cuerpo crudo, verifica la firma y actualiza `miembros` y `usuarios` desde el servidor.

El portal requiere un `stripeCustomerId` asociado a la cuenta. Ningún botón del navegador concede una membresía.

### Firebase

El cliente rechaza cualquier proyecto distinto de `club-zoorigen`. Firebase Admin se inicializa solo cuando existe una cuenta de servicio válida en el servidor. El estado vigente requiere fecha futura y un estado de suscripción permitido.

## Estado local

El modo local muestra el catálogo completo para revisar diseño y navegación, pero no reproduce videos privados ni genera pagos. Esto es deliberado: sin las credenciales autorizadas, la API responde de forma cerrada.
