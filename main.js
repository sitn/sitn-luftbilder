import './style.css';
import {Map, View} from 'ol';
import TileLayer  from 'ol/layer/Tile';
import WebGLTileLayer from 'ol/layer/WebGLTile.js';
import WMTS from 'ol/source/WMTS';
import WMTSTileGrid from "ol/tilegrid/WMTS"
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4.js';
import Projection from 'ol/proj/Projection';
import GeoTIFF from 'ol/source/GeoTIFF.js';


const params = new URLSearchParams(document.location.search);
const url = params.get('url');
const east = parseFloat(params.get('east'));
const north = parseFloat(params.get('north'));
const img_type = params.get('type');

const img_type_tag = document.getElementById('image_type');
(img_type === 'ortho') ? img_type_tag.innerText = "Type d'image: Orthophoto" : img_type_tag.innerText = "Type d'image: Image aérienne";

const img = url.split('/').slice(-1);
const h5 = document.getElementById('image_id');
const aTag = document.createElement("a");
aTag.href = url;
aTag.innerHTML = img;
aTag.setAttribute('target', '_blank');
h5.appendChild(aTag);

const extent = [2420000, 1030000, 2900000, 1360000];
const crs = "EPSG:2056";
const resolutions = [
  250, 100, 50, 20, 10, 5, 2.5, 2, 1.5, 1, 0.5, 0.25, 0.125, 0.0625, 0.03125,
  0.015625, 0.0078125,
];

const matrixIds = [];
for (let i = 0; i < resolutions.length; i += 1) {
  matrixIds.push(i);
}

const tileGrid = new WMTSTileGrid({
  origin: [extent[0], extent[3]],
  resolutions,
  matrixIds,
});

proj4.defs(crs,
  '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333'
  + ' +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel '
  + '+towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs');
    
register(proj4);
const projection = new Projection({
  code: crs,
  extent: extent,
});

const img_layer = new WebGLTileLayer({
  style: {
    color: [
      "case",
      ["<", ["*", ["band", 1], 255], 10],
      ["color", 255, 0, 0, 0],
      ['color', ["*", ["band", 1], 255], 1]
  ],},
  source: new GeoTIFF({
    sources: [{ url: url, nodata: NaN}]
  }),
});

function getWmtsSource(layerName, format) {
  return new WMTS({
    layer: layerName,
    crossOrigin: "anonymous",
    projection,
    url: `https://sitn.ne.ch/mapproxy95/wmts/1.0.0/{layer}/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.${format}`,
    tileGrid,
    matrixSet: "EPSG2056",
    style: "default",
    requestEncoding: "REST",
  });
}

const plan_ville = new TileLayer({ source: getWmtsSource("plan_ville", "png") });

new Map({
  layers: [
    plan_ville,
    img_layer,
  ],
  target: 'sitn-map',
  view: new View({
    projection: projection,
    resolution: 10,
    resolutions: resolutions,
    constrainResolution: true,
    center: [east, north]
  }),
});


const opacityInput = document.getElementById('opacity-input');
const opacityOutput = document.getElementById('opacity-output');

function update() {
  const opacity = parseFloat(opacityInput.value);
  img_layer.setOpacity(opacity);
  opacityOutput.innerText = opacity.toFixed(2);
}
opacityInput.addEventListener('input', update);
update();
