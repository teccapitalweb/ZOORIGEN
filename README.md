# ZOORIGEN — Sitio oficial

Sitio estático de **ZOORIGEN** — capacitación científica en fauna, biodiversidad y manejo animal.

**URL producción:** [www.zoorigen.com](https://www.zoorigen.com)

---

## 📂 Estructura

```
├── index.html              # Página principal
├── styles.css              # Estilos del sitio principal
├── script.js               # Lógica del sitio principal
├── data.js                 # Datos de cursos, áreas, testimonios
├── CNAME                   # Dominio personalizado: www.zoorigen.com
├── .nojekyll               # Desactiva Jekyll en GitHub Pages
├── assets/
│   ├── css/                # Estilos del Club VIP (club.css, club-theme.css, club-mobile.css)
│   ├── js/                 # Firebase config, Club VIP, admin, especies-data
│   └── img/
│       ├── alumnos/        # Fotos de estudiantes
│       ├── areas/          # Imágenes de áreas temáticas
│       ├── banner/         # Banner hero
│       ├── cursos/         # Portadas de cursos
│       ├── empresas/       # Logos de empresas aliadas
│       ├── logo/           # Logo ZOORIGEN
│       ├── logos/          # Logos secundarios
│       └── resenas/        # Capturas de reseñas
└── pages/                  # Club VIP (22 páginas: dashboard, foro, cursos, etc.)
```

---

## 🚀 Desplegar en GitHub Pages

### 1. Crear el repositorio

1. Ve a [github.com/teccapitalweb](https://github.com/teccapitalweb)
2. Crea un repositorio nuevo: **`zoorigen`** (público)
3. Déjalo vacío (sin README, sin .gitignore)

### 2. Subir los archivos

**Opción A — Desde la web (más fácil):**
1. Entra al repo recién creado
2. Click en **"uploading an existing file"**
3. Arrastra **todo el contenido** de esta carpeta (NO la carpeta misma, sino su contenido)
4. Commit: `Initial deploy ZOORIGEN site`

**Opción B — Con Git:**
```bash
cd ZOORIGEN-main
git init
git add .
git commit -m "Initial deploy ZOORIGEN site"
git branch -M main
git remote add origin https://github.com/teccapitalweb/zoorigen.git
git push -u origin main
```

### 3. Activar GitHub Pages

1. En el repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / **/ (root)**
4. Save

### 4. Conectar el dominio

El archivo `CNAME` ya tiene `www.zoorigen.com`. Falta configurar el DNS:

**En tu proveedor de dominio (Spaceship/GoDaddy/etc.):**

| Tipo  | Nombre | Valor                       |
|-------|--------|-----------------------------|
| CNAME | www    | teccapitalweb.github.io     |
| A     | @      | 185.199.108.153             |
| A     | @      | 185.199.109.153             |
| A     | @      | 185.199.110.153             |
| A     | @      | 185.199.111.153             |

Espera 10–30 minutos a que propague. En Settings → Pages activa **"Enforce HTTPS"**.

---

## ⚙️ Configuraciones externas del sitio

El sitio depende de servicios externos ya configurados en los archivos JS:

| Servicio                    | Archivo                        | Notas                       |
|-----------------------------|--------------------------------|-----------------------------|
| Firebase Auth + Firestore   | `assets/js/firebase-config.js` | Proyecto del Club VIP       |
| WhatsApp oficial            | `index.html`                   | +52 1 236 111 3237          |
| Email contacto              | `index.html`                   | zooorigen@gmail.com         |
| Facebook                    | `index.html`                   | Página oficial              |

---

## ✅ Checklist post-despliegue

- [ ] El sitio abre en `https://www.zoorigen.com`
- [ ] El logo y banner se ven en la home
- [ ] Las imágenes de cursos cargan (sección Cursos)
- [ ] Se puede navegar al Club VIP desde el botón del menú
- [ ] Login de Firebase funciona en `pages/club-login.html`
- [ ] HTTPS activo (candado verde)

---

**Mantenido por:** TEC CAPITAL GROUP — Tehuacán, Puebla
