import './style.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import WebGLTileLayer from 'ol/layer/WebGLTile.js';
import WMTS from 'ol/source/WMTS';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4.js';
import Projection from 'ol/proj/Projection';
import GeoTIFF from 'ol/source/GeoTIFF.js';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import { optionsFromCapabilities } from 'ol/source/WMTS';

const urlParams = new URLSearchParams(document.location.search);
const imageUrl = urlParams.get('url');
const east = parseFloat(urlParams.get('east'));
const north = parseFloat(urlParams.get('north'));
const imageType = urlParams.get('type');

const imageTypeNames = {
  ortho: 'Orthophoto',
  aerial: 'Image aérienne',
};
const imageTypeText = imageTypeNames[imageType] || 'Inconnu';
document.getElementById('image_type').innerText = `Type d'image: ${imageTypeText}`;

if (imageUrl) {
  const imageFileName = imageUrl.split('/').pop();
  const imageIdElement = document.getElementById('image_id');
  const imageLink = document.createElement('a');
  imageLink.href = imageUrl;
  imageLink.innerText = imageFileName;
  imageLink.setAttribute('target', '_blank');
  imageIdElement.appendChild(imageLink);
}

const crs = 'EPSG:2056';
const matrixSet = import.meta.env.VITE_WMTS_MATRIXSET;
const capabilitiesUrl = import.meta.env.VITE_WMTS_CAPABILITIES_URL;
const backgroundLayerName = import.meta.env.VITE_WMTS_BACKGROUND_LAYER_NAME;

let imageLayer;

proj4.defs(crs,
  '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333'
  + ' +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel '
  + '+towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs');

register(proj4);
const projection = new Projection({ code: crs });

fetch(capabilitiesUrl)
  .then(response => response.text())
  .then(text => {
    const parser = new WMTSCapabilities();
    const result = parser.read(text);

    const options = optionsFromCapabilities(result, {
      layer: backgroundLayerName,
      matrixSet: matrixSet,
    });

    const wmtsSource = new WMTS(options);
    const extent = wmtsSource.getTileGrid().getExtent();
    projection.setExtent(extent);
    const resolutions = wmtsSource.getResolutions();
    const matrixIds = resolutions.map((_, index) => index);
    const tileGrid = new WMTSTileGrid({
      origin: [extent[0], extent[3]],
      resolutions,
      matrixIds,
    });

    wmtsSource.tileGrid = tileGrid;
    wmtsSource.projection = projection;

    const backgroundLayer = new TileLayer({
      source: wmtsSource,
    });

    imageLayer = new WebGLTileLayer({
      style: {
        color: [
          'case',
          ['<', ['*', ['band', 1], 255], 10],
          ['color', 255, 0, 0, 0],
          ['color', ['*', ['band', 1], 255], 1],
        ],
      },
      source: new GeoTIFF({
        sources: [{ url: imageUrl, nodata: NaN }],
      }),
    });

    const view = new View({
      projection,
      resolutions,
      resolution: 10,
      constrainResolution: true,
      center: [east, north],
    });

    new Map({
      layers: [backgroundLayer, imageLayer],
      target: 'sitn-map',
      view,
    });
  });

const opacitySlider = document.getElementById('opacity-input');
const opacityLabel = document.getElementById('opacity-output');

function updateOpacity() {
  if (imageLayer) {
    const opacity = parseFloat(opacitySlider.value);
    imageLayer.setOpacity(opacity);
    opacityLabel.innerText = opacity.toFixed(2);
  }
}
opacitySlider.addEventListener('input', updateOpacity);
