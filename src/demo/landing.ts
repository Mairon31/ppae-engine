/**
 * Product landing showcase. Every principal raster asset is generated through
 * the public PPAE engine APIs. No pre-rendered character/tree/water mockups.
 */
import {
  CharacterAvatarGenerator, CreatureGenerator, DEFAULT_CHARACTER_CLIPS,
  DEFAULT_STYLE_PROFILES, fnv1aHash32, LiquidTileGenerator, NatureGenerator,
  PixelBuffer, PixelParticleEngine, TerrainAutotiler
} from '../index';
import { generateAvatarPreset } from './avatar-lab';

const profile = DEFAULT_STYLE_PROFILES['micro-4x4'];
const W = 384, H = 216, TILE = profile.canonicalTileTexels;
const nature = new NatureGenerator();
const avatar = new CharacterAvatarGenerator();
const creature = new CreatureGenerator();
const terrain = new TerrainAutotiler();
const liquid = new LiquidTileGenerator();
const particles = new PixelParticleEngine(220);
const environment = document.createElement('canvas');
environment.width = W; environment.height = H;
const base = environment.getContext('2d')!;
base.imageSmoothingEnabled = false;
const scratch = document.createElement('canvas');
const scratchContext = scratch.getContext('2d')!;
scratchContext.imageSmoothingEnabled = false;
const scene = document.getElementById('landing-world') as HTMLCanvasElement | null;
const painter = scene?.getContext('2d') ?? null;
if (painter) painter.imageSmoothingEnabled = false;

let sequence = 0;
let lastFrame = 0;
let nextBurst = 0;
let frameCounter = 0;
let currentSeed = 'PPAE-2026';
let standingTrees: Array<{ buffer: PixelBuffer; x: number; y: number }> = [];
let selectedAvatar = generateAvatarPreset(currentSeed, 'avatar_09');
let idle = false;
let running = false;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function drawBuffer(
  ctx: CanvasRenderingContext2D, sprite: PixelBuffer, x: number, y: number, scale = 1
): void {
  if (!sprite.width || !sprite.height) return;
  scratch.width = sprite.width; scratch.height = sprite.height;
  scratchContext.putImageData(
    new ImageData(new Uint8ClampedArray(sprite.data), sprite.width, sprite.height), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(scratch, Math.round(x), Math.round(y),
    Math.round(sprite.width * scale), Math.round(sprite.height * scale));
}

function environmentSeed(extra: string): number {
  return fnv1aHash32(currentSeed + ':' + extra);
}
function makeEnvironment(): void {
  base.clearRect(0, 0, W, H);
  base.fillStyle = '#263e53'; base.fillRect(0, 0, W, H);
  base.fillStyle = '#345a5b'; base.fillRect(0, 69, W, 69);
  base.fillStyle = '#507363'; base.fillRect(0, 111, W, 46);
  // Backlit stepped mountains and clouds stay behind native sprites.
  for (let i = 0; i < 6; i++) {
    base.fillStyle = i % 2 ? '#314d54' : '#395965';
    base.fillRect(i * 78 - 16, 103 - (i % 3) * 8, 83, 45);
    base.fillRect(i * 78 + 3, 87 - (i % 3) * 8, 46, 20);
  }
  base.fillStyle = '#d7dfb4';
  base.fillRect(276, 33, 19, 19); base.fillRect(279, 30, 13, 25);
  for (let y = 5; y < 9; y++) for (let x = 0; x < 16; x++) {
    const water = (x < 3 && y > 6) || (x === 3 && y === 8);
    if (water) continue; // True animated liquid is composited each frame.
    const material = (x + y * 3 + sequence) % 9 === 0 ? 'forest_moss' : 'meadow_grass';
    const buffer = terrain.generateSeamlessBaseTile(material, profile,
      (x * 7 + y * 5 + sequence) % 16);
    drawBuffer(base, buffer, x * TILE, y * TILE);
  }
  for (let x = 3; x < 16; x++) {
    if (x === 8 || x === 9) continue;
    const scatter = environmentSeed('blades:' + x);
    base.fillStyle = scatter % 2 ? '#8bae65' : '#bbcc79';
    base.fillRect(x * TILE + scatter % 11, 174 + scatter % 21, 3, 7);
    base.fillRect(x * TILE + (scatter >>> 7) % 14, 198 + scatter % 7, 3, 4);
  }
  standingTrees = [
    { buffer: nature.generateTreeStage('oak','mature',profile,environmentSeed('oak')).buffer,
      x: 35, y: 72 },
    { buffer: nature.generateTreeStage('pine','mature',profile,environmentSeed('pine')).buffer,
      x: 173, y: 72 },
    { buffer: nature.generateTreeStage('birch','mature',profile,environmentSeed('birch')).buffer,
      x: 289, y: 74 }
  ];
  selectedAvatar = generateAvatarPreset(currentSeed, 'avatar_09', sequence);
  particles.emitBurst('falling_leaves', 150, 78, environmentSeed('leaves'), 38);
  nextBurst = 1000;
  const label = document.getElementById('landing-seed-label');
  if (label) label.textContent = 'SEED ' + currentSeed;
}

function artCard(id: string, buffer: PixelBuffer, scale: number, yOffset = 0): void {
  const canvas = document.getElementById('landing-card-' + id) as HTMLCanvasElement | null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = id === 'player' ? '#29294a' : id === 'tree' ? '#1c3938' :
    id === 'creature' ? '#34313e' : '#214262';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const x = (canvas.width - buffer.width * scale) / 2;
  const y = (canvas.height - buffer.height * scale) / 2 + yOffset;
  drawBuffer(ctx, buffer, x, y, scale);
}
function renderCards(tick: number): void {
  const action = DEFAULT_CHARACTER_CLIPS.walk;
  const person = avatar.renderCharacterFrame(selectedAvatar.appearance,selectedAvatar.equipment,
    'walk','SE',tick % action.frameCount,action.frameCount,profile);
  const tree = standingTrees[0]?.buffer;
  const wolf = creature.renderCreatureFrame('timber_wolf','move','E',
    tick % 6,6,profile,environmentSeed('wolf'),{ageStage:'adult',healthState:'healthy'});
  artCard('player',person.buffer,3.8,8);
  if (tree) artCard('tree',tree,1.65,9);
  artCard('creature',wolf.buffer,3.1,22);
  const canvas = document.getElementById('landing-card-water') as HTMLCanvasElement | null;
  const ctx = canvas?.getContext('2d');
  if (ctx && canvas) {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 10; x++) {
      const tile = liquid.generateAnimatedFrame('shallow_water',tick % 8,8,255,profile);
      drawBuffer(ctx,tile,x*TILE,y*TILE);
    }
  }
}
function renderScene(tick: number, elapsedMs: number): void {
  if (!scene || !painter) return;
  painter.clearRect(0,0,W,H);
  painter.drawImage(environment,0,0);
  for (let y = 7; y < 9; y++) for (let x = 0; x < 4; x++) {
    if (x === 3 && y === 7) continue;
    const water = liquid.generateAnimatedFrame('shallow_water',tick % 8,8,x === 3 ? 85 : 255,profile);
    drawBuffer(painter,water,x*TILE,y*TILE);
  }
  for (const tree of standingTrees) drawBuffer(painter,tree.buffer,tree.x,tree.y);
  const wolf = creature.renderCreatureFrame('timber_wolf','move','E',tick % 6,6,profile,
    environmentSeed('wolf'),{ageStage:'adult',healthState:'healthy'});
  drawBuffer(painter,wolf.buffer,260 + Math.sin(tick / 4) * 7,151);
  const hero = avatar.renderCharacterFrame(selectedAvatar.appearance,selectedAvatar.equipment,
    'walk','SE',tick % DEFAULT_CHARACTER_CLIPS.walk.frameCount,
    DEFAULT_CHARACTER_CLIPS.walk.frameCount,profile);
  drawBuffer(painter,hero.buffer,200,151,1.65);
  if (!reduceMotion.matches) {
    particles.update(elapsedMs, {vx:.06,vy:.04,canopyPixelShiftX:0,canopyPixelShiftY:0,strength:.12});
    nextBurst -= elapsedMs;
    if (nextBurst < 0) {
      nextBurst = 1100;
      particles.emitBurst('falling_leaves',160,80,environmentSeed('burst'+tick),14);
    }
    const effect = new PixelBuffer(W,H);
    particles.renderParticles(effect,profile);
    drawBuffer(painter,effect,0,0);
  }
}
function animate(now: number): void {
  if (!running) return;
  requestAnimationFrame(animate);
  if (!scene || document.hidden || scene.closest('[hidden]') || idle) return;
  if (now - lastFrame < (reduceMotion.matches ? 1000 : 145)) return;
  const dt = lastFrame ? Math.min(140,now - lastFrame) : 110;
  lastFrame = now;
  renderScene(frameCounter,dt);
  if (frameCounter % 2 === 0 || reduceMotion.matches) renderCards(frameCounter);
  frameCounter++;
}
export function initLanding(): void {
  if (!scene || !painter) return;
  const reroll = document.getElementById('landing-reroll');
  reroll?.addEventListener('click', () => {
    sequence++;
    currentSeed = 'PPAE-' + fnv1aHash32('landing-' + sequence + '-' + Date.now())
      .toString(16).slice(0,8).toUpperCase();
    makeEnvironment();
    renderScene(frameCounter,16);
    renderCards(frameCounter);
  });
  const observer = new IntersectionObserver(entries => {
    idle = !entries[0]?.isIntersecting;
  }, { threshold: 0.03 });
  observer.observe(scene);
  makeEnvironment();
  renderScene(0,16);
  renderCards(0);
  running = true;
  requestAnimationFrame(animate);
}
