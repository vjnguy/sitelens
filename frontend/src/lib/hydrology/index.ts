/**
 * Hydrology Pre-Processing Tool
 *
 * Browser-based catchment analysis using modular, stateless components.
 * Designed for WebAssembly integration with WhiteboxTools.
 *
 * @module hydrology
 */

// Interfaces
export * from './interfaces';

// Services
export { CatchmentDelineation, createCatchmentDelineation } from './services/CatchmentDelineation';
export {
  LandUseOverlay,
  createLandUseOverlay,
  AUSTRALIAN_LAND_USE_DEFAULTS,
  createLookupTable,
  mergeWithDefaults,
} from './services/LandUseOverlay';
export {
  FlowPathAnalysis,
  createFlowPathAnalysis,
  calculateEqualAreaSlope,
} from './services/FlowPathAnalysis';
export {
  LagCalculator,
  createLagCalculator,
  calculateTcComparison,
  getRecommendedMethod,
  kinematicWaveTc,
  MANNINGS_N,
} from './services/LagCalculator';

// Utilities
export * from './utils/grid';
export * from './utils/geometry';

// Service Factory
import type { IHydrologyServices } from './interfaces';
import { CatchmentDelineation } from './services/CatchmentDelineation';
import { LandUseOverlay } from './services/LandUseOverlay';
import { FlowPathAnalysis } from './services/FlowPathAnalysis';
import { LagCalculator } from './services/LagCalculator';

/**
 * Create all hydrology services
 *
 * Note: DEMIngestion and TerrainAnalysis are not yet implemented
 * as they require WhiteboxTools WASM integration.
 */
export function createHydrologyServices(): Partial<IHydrologyServices> {
  return {
    // demIngestion: Not yet implemented - requires WhiteboxTools WASM
    // terrainAnalysis: Not yet implemented - requires WhiteboxTools WASM
    catchmentDelineation: new CatchmentDelineation(),
    landUseOverlay: new LandUseOverlay(),
    flowPathAnalysis: new FlowPathAnalysis(),
    lagCalculator: new LagCalculator(),
  };
}
