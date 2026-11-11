# Café & Roscas | Control

Plataforma web mobile-first de punto de venta (POS), control de insumos por recetas y cuadre financiero en PEN (S/) para cafetería.

## 🚀 Despliegue en Vercel (Paso a Paso)

El proyecto está 100% preparado y optimizado para desplegarse en **Vercel** de manera automática y gratuita.

### Opción 1: Despliegue desde GitHub / GitLab (Recomendado)
1. Sube este repositorio a tu cuenta de **GitHub**.
2. Ingresa a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
3. Haz clic en **"Add New..."** → **"Project"**.
4. Selecciona tu repositorio `cafe-y-roscas-control`.
5. Vercel detectará automáticamente la configuración:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
6. Haz clic en **"Deploy"**. En menos de 1 minuto tendrás tu enlace público (`https://tu-proyecto.vercel.app`).

### Opción 2: Despliegue directo mediante Vercel CLI
Si tienes Node.js instalado en tu computadora:
```bash
npm install -g vercel
vercel
```
Sigue las instrucciones en consola (presiona Enter para aceptar los valores por defecto).

---

## 🛠️ Configuración de Vercel Incluida (`vercel.json`)
El archivo `vercel.json` en la raíz ya incluye:
- Enrutamiento SPA (`rewrites` a `/index.html`) para evitar errores 404 al recargar páginas.
- Cabeceras de seguridad HTTP (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`).
- Declaración explícita del directorio de salida (`dist`).

---

## 💻 Desarrollo Local
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Comprobar tipos TypeScript
npm run lint
```

---

## 📋 Funcionalidades Principales
- **Venta Rápida (POS):** Café 8 oz (S/ 2.50) y Roscas (S/ 2.00). Cobro en Efectivo con cálculo de vuelto, Yape y Mixto.
- **Idempotencia:** Protección contra doble pulsación y ventas duplicadas.
- **Recetas Automáticas:** Descuento automático de café, vaso, tapa, azúcar, palito y servilletas.
- **Kardex y Valuación:** Costo promedio ponderado móvil en microunidades.
- **Caja & Arqueo:** Saldo de apertura, retiros de utilidad del dueño y cierre con cálculo de diferencias.
- **Calculadora:** Desglose de costos por vaso, margen objetivo y simulador de rendimiento de termos (5L = 25 vasos).
- **Suite de Pruebas QA:** Verificación automática en vivo de los casos TC-01 a TC-20.
