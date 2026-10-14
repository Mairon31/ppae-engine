# Guía de Integración con Phaser 3

Para integrar PPAE en PixelProject utilizando Phaser 3:
1. Instanciar el motor PPAE y el adaptador:
   ```ts
   import { PPAEEngine, PhaserPPAEAdapter, DEFAULT_STYLE_PROFILES } from '@pixelproject/ppae';
   
   const ppae = new PPAEEngine();
   const adapter = new PhaserPPAEAdapter(this.textures);
   ```
2. Generar o compilar artefactos bajo demanda y registrarlos como CanvasTextures en Phaser:
```ts
const artifact = ppae.generateAsset({ ... });
adapter.registerArtifactAsPhaserCanvasTexture('hero_idle_s', artifact);
```
3. Utilizar las texturas directamente en GameObjects estándar de Phaser:
```ts
this.add.sprite(100, 100, 'hero_idle_s');
```
