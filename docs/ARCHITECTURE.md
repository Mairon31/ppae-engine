# Arquitectura del Motor PPAE

PPAE se organiza en paquetes independientes acoplados mediante interfaces tipadas estrictas:
- `core/`: Contratos, validación de esquemas y hashing determinista.
- `art-generator/`: Gramáticas formales de árboles, minerales, armas y flora.
- `rasterizer/`: Buffer RGBA en CPU con soporte de módulos 4x4, 6x6 y extrusión de bordes.
- `terrain/`: Campo espacial determinista, autotiling 47-blob y líquidos animados tileables.
- `entities/`: Modelos anatómicos de personajes, fauna, monstruos y jefe multisegmento.
- `animation/`: Máquina de estados ASM y compilador de spritesheets.
- `lighting/`: Sistema de luz 2D cuantizada con oclusión por raycasting de paredes.
- `environment/`: Clima, niebla y campo vectorial de viento.
- `vfx/`: Sistema de partículas con Object Pooling.
- `items/` & `farming/`: Generación de equipamiento por calidades y cultivos por etapas.
- `ui/`: Primitivas Nine-Slice adaptadas a pixel art.
- `runtime/`: Caché LRU acotada y empaquetador de atlas Shelf-packing.
