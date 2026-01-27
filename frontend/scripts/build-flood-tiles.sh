#!/bin/bash
# Build Brisbane Flood Vector Tiles
#
# Prerequisites:
#   brew install tippecanoe
#
# This script downloads flood data from Brisbane Open Data Portal
# and converts it to vector tiles (.mbtiles then .pbf files)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."
DATA_DIR="$SCRIPT_DIR/../data/flood"
TILES_DIR="$SCRIPT_DIR/../public/tiles/flood"
BACKEND_TILES_DIR="$PROJECT_ROOT/backend/data/tiles"

# Create directories
mkdir -p "$DATA_DIR"
mkdir -p "$TILES_DIR"

echo "=== Brisbane Flood Data Vector Tile Builder ==="
echo ""

# Check for tippecanoe
if ! command -v tippecanoe &> /dev/null; then
    echo "Error: tippecanoe is not installed."
    echo "Install with: brew install tippecanoe"
    exit 1
fi

# Brisbane Open Data Portal - Direct GeoJSON download URLs
declare -A FLOOD_LAYERS=(
    ["flood_overall"]="https://www.data.brisbane.qld.gov.au/data/dataset/f8bd7796-f494-4b73-9d83-aabfea1c9a2f/resource/bbc2cd1b-7cef-47f5-9cdf-0da64ca54854/download/flood-awareness-flood-risk-overall.geojson"
    ["flood_river"]="https://www.data.brisbane.qld.gov.au/data/dataset/flood-awareness-brisbane-river/resource/40f0c4b7-8c3b-4c4f-8f98-3c60f1c9e8a9/download/flood-awareness-brisbane-river.geojson"
    ["flood_creek"]="https://www.data.brisbane.qld.gov.au/data/dataset/flood-awareness-creek-flooding/resource/b9c85e8f-9b1c-4b5e-8c3e-9e8f1c2d3e4f/download/flood-awareness-creek.geojson"
    ["flood_overland"]="https://www.data.brisbane.qld.gov.au/data/dataset/flood-awareness-overland-flow-path/resource/c7d96e0f-0c2d-4c6f-9d4f-0f1e2c3d4e5f/download/flood-awareness-overland-flow.geojson"
)

# Alternative: Use ArcGIS FeatureServer to download all features
# This is more reliable as the direct download URLs may change
ARCGIS_BASE="https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services"

download_from_arcgis() {
    local layer_name=$1
    local service_name=$2
    local output_file="$DATA_DIR/${layer_name}.geojson"

    if [ -f "$output_file" ]; then
        echo "  → $layer_name already downloaded, skipping..."
        return 0
    fi

    echo "  → Downloading $layer_name from ArcGIS..."

    # Query all features with geometry simplification for reasonable file size
    local url="${ARCGIS_BASE}/${service_name}/FeatureServer/0/query"
    local params="where=1%3D1&outFields=*&f=geojson&returnGeometry=true"

    curl -s "${url}?${params}" -o "$output_file"

    # Check if download was successful
    if [ ! -s "$output_file" ] || grep -q '"error"' "$output_file" 2>/dev/null; then
        echo "    ✗ Failed to download $layer_name"
        rm -f "$output_file"
        return 1
    fi

    local size=$(du -h "$output_file" | cut -f1)
    echo "    ✓ Downloaded $layer_name ($size)"
}

echo "Step 1: Downloading flood data from Brisbane Council..."
echo ""

# Download each flood layer from ArcGIS
download_from_arcgis "flood_overall" "Flood_Awareness_Flood_Risk_Overall"
download_from_arcgis "flood_river" "Flood_Awareness_River"
download_from_arcgis "flood_creek" "Flood_Awareness_Creek"
download_from_arcgis "flood_overland" "Flood_Awareness_Overland_Flow"
download_from_arcgis "flood_historic_2022" "Flood_Awareness_Historic_Brisbane_River_and_Creek_Floods_Feb2022"
download_from_arcgis "flood_historic_2011" "Flood_Awareness_Historic_Brisbane_River_Floods_Jan2011"
download_from_arcgis "flood_historic_1974" "Flood_Awareness_Historic_Brisbane_River_Floods_Jan1974"

echo ""
echo "Step 2: Converting to vector tiles with tippecanoe..."
echo ""

# Combine all flood layers into a single mbtiles file
# Each layer will be accessible by its name in Mapbox
GEOJSON_FILES=""
LAYER_NAMES=""

for layer in flood_overall flood_river flood_creek flood_overland flood_historic_2022 flood_historic_2011 flood_historic_1974; do
    if [ -f "$DATA_DIR/${layer}.geojson" ]; then
        GEOJSON_FILES="$GEOJSON_FILES -L ${layer}:$DATA_DIR/${layer}.geojson"
    fi
done

if [ -z "$GEOJSON_FILES" ]; then
    echo "Error: No GeoJSON files found to process"
    exit 1
fi

# Run tippecanoe to create vector tiles
# Options:
#   -z14 = max zoom 14 (good balance of detail vs file size)
#   -Z10 = min zoom 10 (don't render at city-wide zoom)
#   --simplification=10 = simplify geometries
#   --detect-shared-borders = better polygon rendering
#   --coalesce-densest-as-needed = reduce tile size
#   --extend-zooms-if-still-dropping = ensure features aren't lost
#   -f = force overwrite

MBTILES_FILE="$DATA_DIR/brisbane-flood.mbtiles"

echo "  → Running tippecanoe..."
tippecanoe \
    -o "$MBTILES_FILE" \
    -z 16 \
    -Z 10 \
    --simplification=10 \
    --detect-shared-borders \
    --coalesce-densest-as-needed \
    --extend-zooms-if-still-dropping \
    --force \
    $GEOJSON_FILES

echo "  ✓ Created $MBTILES_FILE"

echo ""
echo "Step 3: Extracting tiles to static files..."
echo ""

# Check if we have mb-util (needed to extract mbtiles to directory)
if ! command -v mb-util &> /dev/null; then
    echo "  → Installing mb-util..."
    pip3 install mbutil --quiet || pip install mbutil --quiet
fi

# Extract to static file directory structure
# mb-util extracts in TMS format (Y is flipped compared to XYZ/slippy map)
echo "  → Extracting tiles with mb-util..."
TEMP_TMS_DIR="$DATA_DIR/tms_tiles"
rm -rf "$TEMP_TMS_DIR"
rm -rf "$TILES_DIR"
mkdir -p "$TILES_DIR"

mb-util "$MBTILES_FILE" "$TEMP_TMS_DIR" --image_format=pbf

# Convert from TMS to XYZ (flip Y coordinate)
echo "  → Converting TMS to XYZ coordinates..."
for z_dir in "$TEMP_TMS_DIR"/*/; do
    z=$(basename "$z_dir")
    if [[ "$z" =~ ^[0-9]+$ ]]; then
        max_y=$((2**z - 1))
        mkdir -p "$TILES_DIR/$z"

        for x_dir in "$z_dir"*/; do
            x=$(basename "$x_dir")
            mkdir -p "$TILES_DIR/$z/$x"

            for tile in "$x_dir"*.pbf; do
                if [ -f "$tile" ]; then
                    tms_y=$(basename "$tile" .pbf)
                    xyz_y=$((max_y - tms_y))
                    cp "$tile" "$TILES_DIR/$z/$x/${xyz_y}.pbf"
                fi
            done
        done
    fi
done

# Clean up TMS temp directory
rm -rf "$TEMP_TMS_DIR"

# Count extracted tiles
TILE_COUNT=$(find "$TILES_DIR" -name "*.pbf" 2>/dev/null | wc -l | tr -d ' ')
echo "  ✓ Extracted $TILE_COUNT tiles to $TILES_DIR/"

# Create a metadata file for the tiles
cat > "$TILES_DIR/metadata.json" << 'METADATA'
{
  "name": "Brisbane Flood Awareness",
  "description": "Vector tiles for Brisbane flood data from Brisbane City Council",
  "version": "1.0.0",
  "minzoom": 10,
  "maxzoom": 16,
  "bounds": [152.66, -27.77, 153.32, -27.05],
  "center": [153.02, -27.47, 12],
  "format": "pbf",
  "layers": [
    "flood_overall",
    "flood_river",
    "flood_creek",
    "flood_overland",
    "flood_historic_2022",
    "flood_historic_2011",
    "flood_historic_1974"
  ],
  "attribution": "Brisbane City Council"
}
METADATA

echo ""
echo "Step 4: Copying mbtiles to backend..."
echo ""

# Copy mbtiles to backend for API serving
mkdir -p "$BACKEND_TILES_DIR"
cp "$MBTILES_FILE" "$BACKEND_TILES_DIR/"
echo "  ✓ Copied to $BACKEND_TILES_DIR/brisbane-flood.mbtiles"

echo ""
echo "=== Build Complete ==="
echo ""
echo "Static tiles (frontend): $TILES_DIR/ ($TILE_COUNT tiles)"
echo "MBTiles (backend API):   $BACKEND_TILES_DIR/brisbane-flood.mbtiles"
echo ""
echo "Frontend tiles: /tiles/flood/{z}/{x}/{y}.pbf (static)"
echo "Backend API:    /api/v1/tiles/flood/{z}/{x}/{y}.pbf (dynamic)"
echo ""
echo "The backend API is recommended for production as it:"
echo "  - Serves tiles on-demand from a single ~10MB file"
echo "  - No need to deploy thousands of individual tile files"
echo "  - Easier to update (just replace the .mbtiles file)"
