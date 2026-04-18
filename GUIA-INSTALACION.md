# 🦒 Club VIP Zoorigen — Guía de Instalación Completa

Esta guía te lleva paso a paso para poner el Club VIP Zoorigen 100% funcional igual que OdonTeck. Tiempo estimado: **45-60 minutos**.

---

## 📋 Lo que vas a hacer

1. **Firebase** — Crear proyecto para auth y base de datos de miembros
2. **Shopify** — Crear producto de suscripción y configurar webhook
3. **Railway** — Desplegar el servidor webhook
4. **Frontend** — Configurar credenciales y subir a GitHub
5. **Pruebas** — Validar el flujo completo

---

## 🔥 PASO 1 — CREAR PROYECTO FIREBASE (10 min)

### 1.1 Crear el proyecto
1. Ve a https://console.firebase.google.com/
2. Clic en **"Agregar proyecto"**
3. Nombre: `club-zoorigen`
4. Google Analytics: **desactivar** (no lo necesitamos)
5. Crear proyecto

### 1.2 Activar Authentication
1. Menú izquierdo → **Authentication** → **Comenzar**
2. Pestaña **Sign-in method**
3. Habilitar **Correo electrónico/contraseña** → Guardar
4. Habilitar **Google** → Elige correo de soporte → Guardar

### 1.3 Activar Firestore
1. Menú izquierdo → **Firestore Database** → **Crear base de datos**
2. Selecciona **"Comenzar en modo de prueba"** (después cambiamos reglas)
3. Región: **us-central1**
4. Habilitar

### 1.4 Configurar reglas de Firestore
En **Firestore** → pestaña **Reglas**, pega esto y publica:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /miembros/{uid} {
      // El usuario puede leer/crear su propio documento
      allow read: if request.auth != null && (request.auth.uid == uid || get(/databases/$(database)/documents/miembros/$(request.auth.uid)).data.role == 'admin');
      allow create: if request.auth != null && request.auth.uid == uid;
      // Solo puede actualizar su propio perfil, NO sus campos de plan
      allow update: if request.auth != null && request.auth.uid == uid
        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['planActivo', 'planVence', 'planInicio', 'ultimoPago', 'role']);
      // Admin puede leer todos
      allow list: if request.auth != null && get(/databases/$(database)/documents/miembros/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 1.5 Registrar tu Web App
1. En **Project Settings** (engrane arriba izquierda) → ícono Web `</>`
2. Apodo: `Zoorigen Web`
3. NO marques Firebase Hosting
4. Registrar app
5. **COPIA el `firebaseConfig`** que te aparece — lo vas a pegar en `firebase-config.js`

### 1.6 Autorizar tus dominios
En **Authentication → Settings → Dominios autorizados**, agrega:
- `zoorigen.com`
- `www.zoorigen.com`
- `teccapitalweb.github.io`
- `localhost` (para pruebas locales)

### 1.7 Descargar credenciales de servicio (para Railway)
1. **Project Settings → Service accounts → Generate new private key**
2. Descarga el archivo JSON
3. Guárdalo seguro, **NO lo subas a GitHub**. Lo vas a pegar completo en Railway.

---

## 🛒 PASO 2 — CREAR PRODUCTO SHOPIFY (10 min)

Usa tu tienda existente: `pfueck-wm.myshopify.com`

### 2.1 Crear producto de membresía
1. Shopify Admin → **Productos → Agregar producto**
2. Título: `Membresía mensual Club VIP Zoorigen`
3. Handle (URL): `membresia-mensual-club-vip-zoorigen`
4. Descripción corta del beneficio VIP
5. Precio: **$199.00 MXN**
6. Inventario: **No rastrear**
7. Envío: **Desmarcar "Este producto requiere envío"**
8. Guardar

**Opcional** — Si quieres plan anual, crea otro con handle `membresia-anual-club-vip-zoorigen` a precio anual.

### 2.2 Configurar webhook de Shopify
1. Shopify Admin → **Configuración → Notificaciones**
2. Baja hasta **Webhooks** → **Crear webhook**
3. Configura:
   - **Evento:** Pago de pedido (Order payment)
   - **Formato:** JSON
   - **URL:** `https://TU-PROYECTO.up.railway.app/webhook/shopify` *(la completas después del Paso 3)*
4. Guardar

### 2.3 Copiar el Webhook Secret
Al final de la misma página **Notificaciones** verás una sección **"Todos tus webhooks están firmados con..."** → **COPIA ese secret** (es el `SHOPIFY_WEBHOOK_SECRET` que va en Railway).

---

## 🚂 PASO 3 — DESPLEGAR SERVIDOR EN RAILWAY (10 min)

### 3.1 Crear repo en GitHub
1. Crea un repo nuevo: `zoorigen-webhook`
2. Sube el contenido de la carpeta `webhook-server/` (los 3 archivos: `server.js`, `package.json`, `.env.example`)

### 3.2 Desplegar en Railway
1. Ve a https://railway.app → **New Project**
2. **Deploy from GitHub repo** → elige `zoorigen-webhook`
3. Railway detecta Node.js y arranca el despliegue

### 3.3 Configurar variables de entorno
En el proyecto Railway → pestaña **Variables**, agrega:

| Variable | Valor |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Pega el JSON completo del archivo descargado en el Paso 1.7 (en una sola línea) |
| `SHOPIFY_WEBHOOK_SECRET` | El secret del Paso 2.3 |

Después de agregar las variables, Railway redeploy automático. Espera a que diga **"Online"** 🟢.

### 3.4 Generar URL pública
1. Pestaña **Settings → Domains → Generate Domain**
2. Te da una URL tipo `zoorigen-webhook-production.up.railway.app`
3. **COPIA esa URL**

### 3.5 Completar webhook en Shopify
Regresa al Paso 2.2 y pon la URL completa: `https://zoorigen-webhook-production.up.railway.app/webhook/shopify` → Guardar.

### 3.6 Verificar
Abre en el navegador: `https://TU-URL.up.railway.app/` — debe devolver un JSON con `"status": "online"`. Si sí, el servidor está listo. 🎉

---

## 🎨 PASO 4 — CONFIGURAR EL FRONTEND (5 min)

### 4.1 Abrir `assets/js/firebase-config.js`
Reemplaza los 3 bloques:

**A) Tu firebaseConfig** (del Paso 1.5):
```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "club-zoorigen.firebaseapp.com",
  projectId: "club-zoorigen",
  storageBucket: "club-zoorigen.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};
```

**B) URL de Railway** (del Paso 3.4):
```javascript
const WEBHOOK_SERVER_URL = "https://zoorigen-webhook-production.up.railway.app";
```

**C) URL de checkout Shopify** (del Paso 2.1):
```javascript
const SHOPIFY_CHECKOUT_URL = "https://pfueck-wm.myshopify.com/products/membresia-mensual-club-vip-zoorigen";
```

### 4.2 Subir a GitHub
Sube el contenido del ZIP frontend al repo de Zoorigen en GitHub. El sitio se actualiza en `www.zoorigen.com` automáticamente.

---

## 🧪 PASO 5 — PRUEBAS DEL FLUJO COMPLETO (10 min)

### 5.1 Probar registro
1. Ve a `www.zoorigen.com` → clic en **"✨ Club VIP"**
2. Clic **"Unirme ahora"** → llena el formulario con tu correo
3. Debe crear la cuenta en Firebase y redirigirte al checkout de Shopify
4. En Firebase Console → **Authentication → Users** verifica que aparezca tu email
5. En **Firestore → miembros** verifica que aparezca un documento con tus datos y `planActivo: false`

### 5.2 Probar pago (modo prueba Shopify)
1. En Shopify → Configuración → Pagos → activa **modo de prueba** (bogus gateway)
2. Completa el checkout con una tarjeta de prueba: `1` como número para pago exitoso
3. Revisa:
   - Railway logs → debe decir `✅ Plan mensual activado para tu-email@...`
   - Firestore → tu documento ahora tiene `planActivo: true`, `planVence: <fecha +30 días>`
   - Regresa al dashboard del Club → ya debe verse como VIP activo 🎉

### 5.3 Crear tu cuenta admin
Para acceder al Panel Admin:
1. Regístrate normalmente
2. Firebase Console → **Firestore → miembros** → abre tu documento
3. Campo `role` → cambia de `member` a `admin`
4. Recarga el Club → ahora verás la opción **"⚙️ Panel admin"** en el sidebar

### 5.4 Probar cancelación
1. Con un miembro VIP activo, entra a **"Mi suscripción"** → **"Cancelar membresía"**
2. Railway logs debe decir `🚫 Cancelación solicitada por usuario...`
3. Firestore → el miembro tiene `planCancelado: true` y `accesoHasta` con la fecha

---

## 🔐 SEGURIDAD — Checklist antes de producción

- [ ] Reglas de Firestore publicadas (Paso 1.4)
- [ ] Dominios autorizados en Firebase Auth (Paso 1.6)
- [ ] Variables de Railway no están en el código (solo en Railway dashboard)
- [ ] `.gitignore` contiene `firebase-service-account.json` y `.env`
- [ ] Modo de prueba de Shopify **DESACTIVADO** antes de salir en vivo
- [ ] Webhook Secret rotado si alguna vez se compartió

---

## 📊 MONITOREO

- **Firebase Console → Authentication → Users** — ve registros en tiempo real
- **Firebase Console → Firestore → miembros** — estado de membresía de cada quien
- **Railway → Deployments → View Logs** — ver cada pago procesado y errores
- **Panel Admin del Club** — ve MRR (Monthly Recurring Revenue), activos, pendientes, cancelados

---

## 🆘 TROUBLESHOOTING

**"No puedo iniciar sesión con Google"**
→ Verifica que el dominio esté en Firebase Auth → Settings → Dominios autorizados

**"El pago no activa la membresía"**
→ Revisa los logs de Railway. Probablemente:
- `FIREBASE_SERVICE_ACCOUNT` mal pegado (debe ser JSON válido)
- El email del pedido Shopify no coincide con el email registrado en el Club
- El handle del producto no coincide con `membresia-mensual-club-vip-zoorigen`

**"Panel admin no me deja entrar"**
→ En Firestore tu campo `role` debe ser exactamente `admin` (minúsculas)

**"La página no carga, pantalla blanca"**
→ Abre Chrome DevTools → Console. Probablemente `firebase-config.js` tiene un error de sintaxis o las credenciales están mal pegadas.

---

## 📞 Referencias y contactos

- **Firebase Console:** https://console.firebase.google.com/project/club-zoorigen
- **Railway:** https://railway.app/dashboard
- **Shopify Admin:** https://pfueck-wm.myshopify.com/admin
- **Soporte TEC CAPITAL:** +52 1 236 111 3237

---

¡Éxito con el Club VIP Zoorigen, carnal! 🦒✨
