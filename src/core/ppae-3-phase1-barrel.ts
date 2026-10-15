/**
 * PPAE 3.0: Phase 1 standalone APIs, published through the existing root.
 * Avoid introducing duplicate symbol declarations. Legacy ArtStyleProfile
 * is unchanged; new generator support is a later opt-in migration.
 */
export * from './native-resolution';
export * from './resolution-contract-bridge';
export * from './coordinate-resolution-adapter';
export * from '../rasterizer/surface-cluster-rasterizer';
export * from '../rasterizer/pixel-perfect-primitives';
export * from '../terrain/hydrology-sdf-topology';
export * from '../terrain/shoreline-autotiler-47';
export * from '../terrain/bathymetric-water-animator';
export * from '../entities/species-anatomical-skeleton';
