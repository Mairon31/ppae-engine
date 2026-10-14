import {
  BoundedTextureCache,
  PixelBuffer,
  type GeneratedAssetArtifact
} from '@pixelproject/ppae';

const cache = new BoundedTextureCache(1024);
const buffer = new PixelBuffer(1, 1);
const artifactContract: GeneratedAssetArtifact | undefined = undefined;

void cache;
void buffer;
void artifactContract;
