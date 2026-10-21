/* =============================================================================
   Catalogo de iconos de la aplicacion
   ==========================================================================
   Se usan los iconos de Lucide (https://lucide.dev), la misma libreria de
   codigo abierto quepopulariza React, pero empaquetada para Angular.

   Solo se importan los iconos que la aplicacion usa de verdad: el paquete
   "tree-shaking" descarta el resto en el build, asi que el bundle no crece.

   Para agregar un icono nuevo:
     1. Buscalo en https://lucide.dev (o en node_modules/@ng-icons/lucide).
     2. Importalo en este archivo con el prefijo "lucide".
     3. Agregalo al objeto "iconos".
     4. Usalo en la plantilla: <ng-icon name="lucideNombreDelIcono" />
   ========================================================================== */

import {
  lucideArrowDownToLine,
  lucideArrowRight,
  lucideArrowRightLeft,
  lucideArrowUpFromLine,
  lucideBoxes,
  lucideCheck,
  lucideChevronLeft,
  lucideChevronRight,
  lucideCircleAlert,
  lucideCircleDollarSign,
  lucideEye,
  lucideEyeOff,
  lucideInfo,
  lucideLayoutDashboard,
  lucideLogOut,
  lucideMenu,
  lucidePackage,
  lucidePanelLeftClose,
  lucidePanelLeftOpen,
  lucidePencil,
  lucidePlus,
  lucideRefreshCw,
  lucideSearch,
  lucideSlidersHorizontal,
  lucideTrash2,
  lucideTriangleAlert,
  lucideTrendingDown,
  lucideTrendingUp,
  lucideX
} from '@ng-icons/lucide';

export const iconos = {
  lucideArrowDownToLine,
  lucideArrowRight,
  lucideArrowRightLeft,
  lucideArrowUpFromLine,
  lucideBoxes,
  lucideCheck,
  lucideChevronLeft,
  lucideChevronRight,
  lucideCircleAlert,
  lucideCircleDollarSign,
  lucideEye,
  lucideEyeOff,
  lucideInfo,
  lucideLayoutDashboard,
  lucideLogOut,
  lucideMenu,
  lucidePackage,
  lucidePanelLeftClose,
  lucidePanelLeftOpen,
  lucidePencil,
  lucidePlus,
  lucideRefreshCw,
  lucideSearch,
  lucideSlidersHorizontal,
  lucideTrash2,
  lucideTriangleAlert,
  lucideTrendingDown,
  lucideTrendingUp,
  lucideX
};
