declare module '@mapbox/mapbox-gl-draw' {
  import type { Map } from 'mapbox-gl';
  import type { FeatureCollection, Feature, Geometry } from 'geojson';

  interface DrawOptions {
    displayControlsDefault?: boolean;
    controls?: {
      point?: boolean;
      line_string?: boolean;
      polygon?: boolean;
      trash?: boolean;
      combine_features?: boolean;
      uncombine_features?: boolean;
    };
    defaultMode?: string;
    modes?: Record<string, unknown>;
    styles?: object[];
    boxSelect?: boolean;
    clickBuffer?: number;
    touchBuffer?: number;
  }

  interface DrawEvent {
    features: Feature[];
    type: string;
  }

  export default class MapboxDraw {
    constructor(options?: DrawOptions);

    add(geojson: Feature | FeatureCollection): string[];
    get(featureId: string): Feature | undefined;
    getFeatureIdsAt(point: { x: number; y: number }): string[];
    getSelectedIds(): string[];
    getSelected(): FeatureCollection;
    getSelectedPoints(): FeatureCollection;
    getAll(): FeatureCollection;
    delete(ids: string | string[]): this;
    deleteAll(): this;
    set(featureCollection: FeatureCollection): string[];
    trash(): this;
    combineFeatures(): this;
    uncombineFeatures(): this;
    getMode(): string;
    changeMode(mode: string, options?: object): this;
    setFeatureProperty(featureId: string, property: string, value: unknown): this;

    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
  }

  export const modes: {
    SIMPLE_SELECT: string;
    DIRECT_SELECT: string;
    DRAW_LINE_STRING: string;
    DRAW_POLYGON: string;
    DRAW_POINT: string;
  };

  export const constants: {
    modes: {
      SIMPLE_SELECT: string;
      DIRECT_SELECT: string;
      DRAW_LINE_STRING: string;
      DRAW_POLYGON: string;
      DRAW_POINT: string;
    };
  };
}
