# Pizarra-Digital

Pizarra digital hecha para clases de maestros que trabajen en línea.

Pizarra digital con cuentas de usuario, gestor de pizarras y un lienzo basado en objetos (estilo Excalidraw/Miro).
Stack: **Vite + React 18 + Tailwind CSS v4 + Framer Motion + lucide-react**. Persistencia local con **localStorage** (usuarios y sesión) e **IndexedDB** (pizarras e imágenes).

## Instalación

Requisitos: Node.js 18 o superior.

```bash
cd pizarra-digital
npm install
npm run dev
```

Compilar para producción y previsualizar:

```bash
npm run build
npm run preview
```

> Si quieres crear el proyecto desde cero con la plantilla oficial, los comandos equivalentes son:
> `npm create vite@latest pizarra-digital -- --template react`, después
> `npm install framer-motion lucide-react` y `npm install -D tailwindcss @tailwindcss/vite`,
> y copiar la carpeta `src/`, `index.html` y `vite.config.js` de este proyecto.

## Estructura

```
src/
├── main.jsx / App.jsx          Arranque, proveedores y enrutado por hash (#/ y #/board/:id)
├── index.css                   Tailwind v4 + componentes (glass, field, botones) y animaciones
├── services/                   Capa de datos desacoplada (lista para Firebase/Supabase)
│   ├── index.js                authService · boardService · assetService (interfaz documentada)
│   ├── local/                  Adaptadores locales: authLocal, boardLocal, assetLocal
│   └── storage/                Envoltorios de IndexedDB y localStorage
├── canvas/                     Motor de dibujo (sin React)
│   ├── elements.js             Modelo de elementos, hit-testing, transformaciones, medición de texto
│   ├── renderer.js             Dibujo de fondo/elementos, exportar PNG, miniaturas
│   ├── selection.js            Manejadores de redimensionado y superposición de selección
│   ├── geometry.js · viewport.js · imageCache.js · constants.js
├── hooks/                      useHistory (deshacer/rehacer), useHashRoute, useClickOutside
├── context/                    AuthContext, ToastContext
├── data/                       Avatares y pizarra de bienvenida
├── utils/                      Colores, formato de fechas, imágenes, ids
└── components/
    ├── auth/                   AuthScreen, AvatarPicker
    ├── dashboard/              Dashboard, BoardCard, NewBoardModal
    ├── profile/                ProfileMenu, ProfileModal
    ├── board/                  BoardEditor, WhiteboardCanvas, Toolbar, PropertiesPanel,
    │                           ColorPicker, EditorTopBar, ZoomControls, SaveIndicator, TextEditorOverlay
    └── ui/                     Modal, Dialogs, Avatar, IconButton
```

## Atajos de teclado

| Atajo | Acción |
| --- | --- |
| V / H / P / E | Selección / Mano / Lápiz / Borrador |
| R / O / G | Rectángulo / Elipse / Triángulo |
| L / A / D | Línea / Flecha / Flecha doble |
| T / I | Texto / Subir imagen |
| Ctrl+Z · Ctrl+Y (o Ctrl+Shift+Z) | Deshacer · Rehacer |
| Ctrl+S | Guardar |
| Ctrl+C · Ctrl+V · Ctrl+D | Copiar · Pegar · Duplicar |
| Ctrl+A | Seleccionar todo |
| Supr / Retroceso | Eliminar selección |
| Flechas (Shift = ×10) | Mover selección |
| N / Shift+N | Seleccionar el elemento siguiente / anterior |
| Intro (con el lienzo enfocado) | Insertar la figura o texto de la herramienta activa, o editar el texto seleccionado |
| Ctrl + / Ctrl - / Ctrl 0 / Ctrl 1 | Zoom + / − / 100 % / ajustar |
| Espacio + arrastrar, rueda, botón central | Desplazarse por el lienzo |
| Ctrl + rueda, pellizco | Zoom al cursor |
| Shift al dibujar | Cuadrado/círculo perfecto, líneas a 15° |
| Shift al redimensionar | Mantener proporción |

## Migrar a Firebase o Supabase

La UI solo importa `authService`, `boardService` y `assetService` desde `src/services/index.js`.
Crea adaptadores con los mismos métodos (descritos en ese archivo) y reasígnalos allí; no hace falta tocar componentes.

## Privacidad, legal y accesibilidad

- **Datos mínimos:** para crear una cuenta solo se pide usuario y contraseña; el nombre visible y el avatar son opcionales.
  No se pide correo porque la app no envía correos.
- **Términos:** casilla sin marcar al registrarse. Se guarda qué versión se aceptó y cuándo (`termsAcceptance` y `consentLog`).
  Si cambias los textos legales, sube `TERMS_VERSION` / `PRIVACY_VERSION` en `src/legal/config.js` y se pedirá aceptar de nuevo.
- **Tus datos:** «Perfil → Descargar mis datos» (JSON) y «Eliminar mi cuenta» (borra cuenta, pizarras e imágenes).
- **Cookies:** banner con «Aceptar» y «Rechazar» del mismo peso; solo hay almacenamiento esencial y una preferencia opcional (tema).
- **Sin rastreo:** no hay analítica ni SDKs de terceros; la fuente Inter se sirve desde el propio sitio y una
  Content-Security-Policy (en `vite.config.js`) bloquea cualquier script o conexión externa.
- **Páginas legales** (públicas, sin iniciar sesión): `#/legal/privacidad`, `terminos`, `cookies`, `licencias`, `contacto`.
- **Licencias de terceros:** `scripts/generate-licenses.mjs` genera `third-party-licenses.txt/json` en cada `dev` y `build`.
- **Accesibilidad:** contraste AA verificado en tema claro y oscuro, foco visible, enlace «Saltar al contenido», modales con foco atrapado,
  texto alternativo en imágenes (editable en el panel), descripción del lienzo para lectores de pantalla y uso por teclado
  (Tab enfoca el lienzo, **N** recorre elementos, **Intro** inserta la figura/texto de la herramienta activa).

## Modo nube: ver tus pizarras en el PC y en el celular (Supabase)

Sin configuración la app funciona en **modo local** (todo en el navegador). Con Supabase pasa a **modo nube**:
cuentas con correo, pizarras e imágenes sincronizadas entre dispositivos y cambio de contraseña por correo
(código de 6 dígitos o enlace).

1. Crea una cuenta gratuita en [supabase.com](https://supabase.com) → **New project** (elige la región más cercana).
2. **SQL Editor** → pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) → **Run**. Crea las tablas,
   las reglas de seguridad (cada usuario solo ve lo suyo), el almacenamiento de imágenes y la función para borrar la cuenta.
3. **Authentication → URL Configuration**:
   - *Site URL*: `https://germancruz07.github.io/Pizarra-Digital/`
   - *Redirect URLs*: añade esa misma dirección y `http://localhost:5173/`
4. *(Opcional, requiere SMTP propio, ver paso 5)* **Authentication → Emails → Reset password** → pestaña **Source**:
   pega [`supabase/email-reset-password.html`](supabase/email-reset-password.html) y guarda. Añade al correo un código de
   6 dígitos además del enlace. Sin este paso el correo solo trae el enlace, y la app funciona igual.
5. **Correo**: el servicio de correo integrado de Supabase es solo para pruebas (envía a pocas direcciones y con un límite muy bajo).
   Para usuarios reales configura un SMTP en **Authentication → Emails → SMTP Settings** (por ejemplo Resend o Brevo, que tienen plan gratuito).
6. **Project Settings → API Keys**: copia la *Project URL* y la **clave publicable** (`sb_publishable_…` o la antigua `anon`).
   Nunca uses la clave secreta en la app.
7. En GitHub: **Settings → Secrets and variables → Actions → Variables** crea `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_PUBLISHABLE_KEY` (opcional: `VITE_SUPABASE_REGION` y `VITE_EMAIL_SENDER` para los textos legales).
   El siguiente despliegue ya usará la nube. Para desarrollar en tu PC, pon los mismos valores en `.env` (ver `.env.example`).

Para pasar a la nube las pizarras que ya tenías en el navegador: en la versión local usa **Perfil → Descargar**,
y después, ya con tu cuenta en la nube, **Perfil → Importar**.

### Clases en vivo: estudiantes con código y permisos (solo modo nube)

1. **SQL Editor** → pega [`supabase/collab.sql`](supabase/collab.sql) → **Run** (después de `schema.sql`). Añade los
   códigos de acceso, los participantes con sus permisos, las reglas de seguridad y el tiempo real. No cambia nada de lo anterior.
2. **Realtime → Settings**: comprueba que los canales privados están permitidos (la app usa canales privados
   protegidos por las reglas de `collab.sql`).

Uso:
- **Profesor**: en su pizarra, botón **Compartir** (icono de personas) → *Generar código*. Ahí aprueba o rechaza
  solicitudes y, para cada estudiante, activa o desactiva **Escribir / dibujar** y **Subir imágenes**. Los cambios se
  aplican al instante. *Aceptar solicitudes nuevas* desactiva el código sin echar a nadie; el botón de recargar crea uno nuevo.
- **Estudiante**: en *Mis pizarras*, **Unirse con código** → escribe el código → espera en la sala de espera hasta que
  el profesor lo apruebe. Para volver más tarde basta con introducir el mismo código.

Cómo funciona: las pizarras compartidas se sincronizan en vivo por un canal privado de Supabase Realtime (`board:<id>`),
y cada cambio se guarda por elemento con la función `apply_board_ops`, que valida el permiso en el servidor. Las imágenes
de la clase se guardan en la carpeta del profesor, y solo pueden subirlas los estudiantes con permiso. Las pizarras
que no se comparten siguen funcionando exactamente igual que antes.

### Clases pasadas (historial de pizarras)

En *Mis pizarras* hay un apartado **Clases pasadas** con todas las pizarras que el usuario creó o a las que se unió
con código (una vez aprobado), con su nombre, el profesor/creador, la fecha de creación y el último acceso. Se puede
ordenar por fecha (más recientes / más antiguas) o por nombre (A–Z / Z–A), y al hacer clic se abre la pizarra.

- **Modo local:** funciona sin configuración (se guarda en el navegador, por usuario).
- **Modo nube:** **SQL Editor** → pega [`supabase/history.sql`](supabase/history.sql) → **Run** (después de `schema.sql`
  y `collab.sql`). Solo añade la tabla `board_history` y dos funciones; no cambia nada de lo anterior. Mientras no se
  ejecute, el apartado muestra solo las pizarras propias.

### Dibujo en vivo

En pizarras compartidas, los trazos se ven mientras se dibujan (no al soltar): los trazos a mano alzada envían solo los
puntos nuevos (con un envío completo periódico para quien entra a mitad de un trazo), y mover/redimensionar también se
previsualiza en vivo. La frecuencia se adapta al número de conectados (de ~25 envíos/s a ~8 envíos/s en clases grandes)
para no agotar la cuota de mensajes de Supabase Realtime. Solo emiten quienes tienen permiso de escritura.

## Claves de API

En modo local la app **no usa ninguna clave de API**. En modo nube solo usa la clave **publicable** de Supabase. Si conectas otro servicio:

1. Copia `.env.example` como `.env` y rellena los valores (`.env` está en `.gitignore`, no se sube a git).
2. Léelas en el adaptador con `import.meta.env.VITE_SUPABASE_URL`, etc.
3. Ten en cuenta que **todo lo que empieza por `VITE_` acaba visible en el navegador**. Solo es seguro para claves
   públicas de cliente (anon key de Supabase con RLS, config web de Firebase con reglas). Una clave secreta
   nunca debe ir en el frontend: ponla en un backend o función serverless.

## Nota de seguridad

Las contraseñas se guardan con hash SHA-256 y sal en el navegador. Es una autenticación **local** pensada para uso personal
en un dispositivo; para usuarios reales conecta un proveedor de autenticación de backend.
