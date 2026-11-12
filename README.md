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
| Ctrl + / Ctrl - / Ctrl 0 / Ctrl 1 | Zoom + / − / 100 % / ajustar |
| Espacio + arrastrar, rueda, botón central | Desplazarse por el lienzo |
| Ctrl + rueda, pellizco | Zoom al cursor |
| Shift al dibujar | Cuadrado/círculo perfecto, líneas a 15° |
| Shift al redimensionar | Mantener proporción |

## Migrar a Firebase o Supabase

La UI solo importa `authService`, `boardService` y `assetService` desde `src/services/index.js`.
Crea adaptadores con los mismos métodos (descritos en ese archivo) y reasígnalos allí; no hace falta tocar componentes.

## Claves de API

La app **no usa ninguna clave de API**: todo se guarda en el navegador. Si conectas Firebase o Supabase:

1. Copia `.env.example` como `.env` y rellena los valores (`.env` está en `.gitignore`, no se sube a git).
2. Léelas en el adaptador con `import.meta.env.VITE_SUPABASE_URL`, etc.
3. Ten en cuenta que **todo lo que empieza por `VITE_` acaba visible en el navegador**. Solo es seguro para claves
   públicas de cliente (anon key de Supabase con RLS, config web de Firebase con reglas). Una clave secreta
   nunca debe ir en el frontend: ponla en un backend o función serverless.

## Nota de seguridad

Las contraseñas se guardan con hash SHA-256 y sal en el navegador. Es una autenticación **local** pensada para uso personal
en un dispositivo; para usuarios reales conecta un proveedor de autenticación de backend.
