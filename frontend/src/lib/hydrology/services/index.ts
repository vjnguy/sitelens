/**
 * Hydrology Services
 */

export {
  CatchmentDelineation,
  CatchmentDelineationService,
  createCatchmentDelineation,
  catchmentDelineation,
} from './CatchmentDelineation';

export {
  LandUseOverlay,
  createLandUseOverlay,
  AUSTRALIAN_LAND_USE_DEFAULTS,
  createLookupTable,
  mergeWithDefaults,
} from './LandUseOverlay';

export {
  FlowPathAnalysis,
  createFlowPathAnalysis,
  calculateEqualAreaSlope,
} from './FlowPathAnalysis';

export {
  LagCalculator,
  createLagCalculator,
  calculateTcComparison,
  getRecommendedMethod,
  kinematicWaveTc,
  MANNINGS_N,
} from './LagCalculator';
