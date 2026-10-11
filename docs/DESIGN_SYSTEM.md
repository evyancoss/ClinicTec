# ClinicTec — Sistema de Diseño

## 1. Principios de diseño

- **Limpio y profesional** — Interfaces despejadas, sin ruido visual.
- **Intuitivo** — Flujos evidentes; el usuario no necesita instrucciones para navegar.
- **Accesible** — Contraste mínimo WCAG AA en todos los textos.
- **Adaptable** — Mobile-first; funciona en escritorio, tableta y celular.
- **Consistente** — Los mismos patrones de interacción en toda la aplicación.

---

## 2. Paleta de colores

| Nombre | Hex | Uso principal |
|---|---|---|
| Blanco menta | `#F7FFFD` | Fondo principal de la aplicación |
| Verde pálido | `#D9F5EF` | Fondos secundarios, tarjetas, elementos seleccionados |
| Verde claro | `#A7E3D4` | Bordes, separadores, detalles decorativos |
| Verde medio | `#5BB9A6` | Acentos, botones primarios, íconos activos |
| Verde oscuro | `#2F5D57` | Navegación, encabezados, textos destacados |

### 2.1 Uso detallado

```
Fondo de página         → #F7FFFD
Sidebar / Header        → #2F5D57 (texto blanco sobre este fondo)
Tarjetas / Paneles      → #FFFFFF o #D9F5EF
Botón primario          → #5BB9A6  (hover: #2F5D57)
Botón secundario        → borde #A7E3D4, texto #2F5D57
Elemento seleccionado   → fondo #D9F5EF, borde izq. #5BB9A6
Separadores / bordes    → #A7E3D4
Texto principal         → #1A1A1A (sobre fondos claros)
Texto secundario        → #4A4A4A
Texto sobre verde osc.  → #FFFFFF
```

### 2.2 Estados de color

| Estado | Color |
|---|---|
| Éxito | `#5BB9A6` (verde medio) |
| Advertencia | `#F59E0B` (ámbar) |
| Error | `#EF4444` (rojo) |
| Información | `#3B82F6` (azul) |
| Desactivado | `#9CA3AF` (gris) |

---

## 3. Tipografía

- **Familia principal:** `Inter` (sans-serif, cargada desde Google Fonts o local).
- **Familia alternativa:** `system-ui, -apple-system, sans-serif`.

| Rol | Tamaño | Peso | Uso |
|---|---|---|---|
| Título de página | 24px / 1.5rem | 700 | H1 de cada pantalla |
| Subtítulo / sección | 18px / 1.125rem | 600 | H2, encabezados de tarjeta |
| Cuerpo principal | 16px / 1rem | 400 | Texto de párrafos y listas |
| Etiquetas / labels | 14px / 0.875rem | 500 | Etiquetas de formulario |
| Texto secundario | 13px / 0.8125rem | 400 | Metadatos, fechas, hint text |
| Texto pequeño | 12px / 0.75rem | 400 | Badges, pie de tabla |

---

## 4. Espaciado

Usamos la escala de Tailwind CSS (base 4px):

| Token | Valor | Uso típico |
|---|---|---|
| `space-2` | 8px | Separación interna mínima |
| `space-4` | 16px | Padding de componentes |
| `space-6` | 24px | Separación entre secciones |
| `space-8` | 32px | Margen de páginas |
| `space-12` | 48px | Separación mayor |

---

## 5. Radios de borde

| Elemento | Radio |
|---|---|
| Botones | `rounded-md` (6px) |
| Tarjetas / paneles | `rounded-xl` (12px) |
| Campos de formulario | `rounded-md` (6px) |
| Badges / pills | `rounded-full` |
| Modal | `rounded-2xl` (16px) |

---

## 6. Componentes clave

### 6.1 Barra de navegación lateral (Sidebar)

- Fondo: `#2F5D57`
- Texto e íconos: `#FFFFFF`
- Ítem activo: fondo `#D9F5EF`, texto `#2F5D57`, borde izquierdo `4px solid #5BB9A6`
- Ítem hover: fondo semitransparente `rgba(255,255,255,0.10)`
- Ancho colapsado: 64px (solo íconos), expandido: 240px

### 6.2 Encabezado superior (Header)

- Fondo: `#FFFFFF`
- Borde inferior: `1px solid #A7E3D4`
- Contiene: logo, nombre de la clínica activa, avatar del usuario.

### 6.3 Tarjetas (Cards)

- Fondo: `#FFFFFF`
- Borde: `1px solid #A7E3D4`
- Sombra: `shadow-sm`
- Radio: `rounded-xl`

### 6.4 Botones

| Variante | Fondo | Texto | Hover |
|---|---|---|---|
| Primary | `#5BB9A6` | `#FFFFFF` | `#2F5D57` |
| Secondary | `transparent` | `#2F5D57` | fondo `#D9F5EF` |
| Danger | `#EF4444` | `#FFFFFF` | `#B91C1C` |
| Ghost | `transparent` | `#2F5D57` | fondo `#D9F5EF` |

### 6.5 Badges de estado de cita

| Estado | Fondo | Texto |
|---|---|---|
| Programada | `#D9F5EF` | `#2F5D57` |
| Atendida | `#5BB9A6` | `#FFFFFF` |
| Cancelada | `#FEE2E2` | `#B91C1C` |
| Reagendada | `#FEF3C7` | `#92400E` |

### 6.6 Formularios

- Label: 14px, peso 500, color `#2F5D57`
- Input: borde `#A7E3D4`, fondo `#FFFFFF`, focus ring `#5BB9A6`
- Mensaje de error: texto rojo `#EF4444`, tamaño 13px
- Placeholder: color `#9CA3AF`

### 6.7 Tabla de datos

- Encabezado: fondo `#D9F5EF`, texto `#2F5D57`, peso 600
- Fila par: fondo `#FFFFFF`
- Fila impar: fondo `#F7FFFD`
- Fila hover: fondo `#D9F5EF`
- Borde: `1px solid #A7E3D4`

---

## 7. Íconos

- Librería: **Lucide React** (incluida con shadcn/ui).
- Tamaño estándar: `20px` en navegación, `16px` en texto.
- Color: hereda del texto o usa explícitamente los tonos de la paleta.

---

## 8. Layout responsivo

| Breakpoint | Tailwind | Comportamiento |
|---|---|---|
| Móvil | `< 640px` | Sidebar colapsado (drawer), columna única |
| Tableta | `640px – 1024px` | Sidebar con íconos (64px) |
| Escritorio | `> 1024px` | Sidebar expandido (240px), layout de dos columnas |

---

## 9. Accesibilidad

- Ratio de contraste mínimo: **4.5:1** para texto normal, **3:1** para texto grande.
- Todos los elementos interactivos tienen `focus-visible` con `ring-2 ring-#5BB9A6`.
- Formularios con `aria-label` y `aria-describedby` en mensajes de error.
- Imágenes decorativas con `alt=""`.
- La navegación por teclado debe ser completa.

---

## 10. Configuración de Tailwind

El archivo `tailwind.config.ts` debe extender la paleta con los tokens de ClinicTec:

```ts
// tailwind.config.ts
extend: {
  colors: {
    brand: {
      50:  '#F7FFFD',  // fondo principal
      100: '#D9F5EF',  // fondos secundarios
      200: '#A7E3D4',  // bordes
      500: '#5BB9A6',  // acentos y botones
      800: '#2F5D57',  // navegación y textos
    },
  },
}
```
