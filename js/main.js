import { CONSTANTS, ATTR } from './config.js';
import { initUI, hideClusterPopup, showClusterPopup, state } from './ui.js';
import { initModals } from './modals.js';
import { createMap, loadAccessLayer, refreshGridLayer, updateMapLayer } from './map.js';

document.addEventListener('DOMContentLoaded', () => {
    
    const mapState = {
        activePolygonFeature: null,
        polygonBounds: null,
        currentGridLayer: null,
        debounceTimer: null,
        popupHoverTimeout: null,
        mappedObsIds: new Set(),
        gridTilesLayer: L.layerGroup(),
        exactPointsLayer: L.markerClusterGroup({
            spiderfyOnMaxZoom: false,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: false,
            maxClusterRadius: 50,
            spiderfyDistanceMultiplier: 1.8
        }),
        singlePointClusterIcon: L.divIcon({
            html: '<div><span>1</span></div>',
            className: 'marker-cluster marker-cluster-small',
            iconSize: new L.Point(40, 40),
            iconAnchor: new L.Point(20, 20),
            popupAnchor: new L.Point(0, -20)
        }),
        layerGroups: { greenspace: L.layerGroup() },
        layerLoaded: { greenspace: false }
    };

    const map = createMap();
    mapState.gridTilesLayer.addTo(map);

    initUI(map, mapState);
    initModals();

    map.on('click', () => hideClusterPopup(mapState));
    map.on('dragstart', () => hideClusterPopup(mapState));
    map.on('zoomstart', () => hideClusterPopup(mapState));
    map.on('moveend', () => updateMapLayer(map, mapState, state.taxonId));


    mapState.exactPointsLayer.on('clusterclick', e => {
        clearTimeout(mapState.popupHoverTimeout);
        showClusterPopup(e.layer.getAllChildMarkers(), map.latLngToContainerPoint(e.layer.getLatLng()), mapState);
    });

    map.on('popupopen', e => {
        const popupNode = e.popup.getElement();
        if (popupNode && !L.Browser.touch) {
            popupNode.addEventListener('mouseenter', () => clearTimeout(mapState.popupHoverTimeout));
            popupNode.addEventListener('mouseleave', () => { mapState.popupHoverTimeout = setTimeout(() => map.closePopup(), 200); });
        }
    });

    const clusterPopup = document.getElementById('cluster-popup');
    document.getElementById('cluster-popup-close').addEventListener('click', () => hideClusterPopup(mapState));

    ['greenspace'].forEach(type => document.getElementById(`toggle-${type}`).addEventListener('change', e => {
        if (e.target.checked) {
            map.addLayer(mapState.layerGroups[type]);
            map.attributionControl.addAttribution(ATTR[type]);
            loadAccessLayer(map, type, mapState);
        } else {
            map.removeLayer(mapState.layerGroups[type]);
            map.attributionControl.removeAttribution(ATTR[type]);
        }
    }));

    fetch('https://firebasestorage.googleapis.com/v0/b/naturecitynorwich.firebasestorage.app/o/Assets%2FNORWICH_DISTRICT_BOUNDARY_SIMPLE_4326.geojson?alt=media&token=f0e6fc5c-3135-4d1f-b48b-879924c2f164')
        .then(res => res.json())
        .then(geojsonData => {
            mapState.activePolygonFeature = geojsonData.type === 'FeatureCollection' ? geojsonData.features[0] : geojsonData;
            const boundaryGeom = mapState.activePolygonFeature.geometry;
            const worldRectangle = [[-180, -90], [-180, 90], [180, 90], [180, -90], [-180, -90]];
            const maskPolygons = boundaryGeom.type === 'Polygon' ? [boundaryGeom.coordinates] : boundaryGeom.coordinates;
            L.geoJSON({ type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: [[worldRectangle], ...maskPolygons] } }, {
                style: { fillColor: '#ffffff', fillOpacity: 0.85, stroke: false, fillRule: 'evenodd' },
                pane: 'maskPane'
            }).addTo(map);
            const boundaryLayer = L.geoJSON(mapState.activePolygonFeature, {
                style: { color: CONSTANTS.COLOUR_DARK_BLUE, weight: 3, fill: false },
                pane: 'boundaryPane'
            }).addTo(map);
            mapState.polygonBounds = boundaryLayer.getBounds();
            const maxBounds = mapState.polygonBounds.pad(0.1);
            map.setMaxBounds(maxBounds);

            const panel = document.getElementById('control-panel');
            const paddingOpts = window.innerWidth >= 640 && !panel.classList.contains('translate-x-full')
                ? { paddingBottomRight: [CONSTANTS.PANEL_WIDTH, 0], paddingTopLeft: [20, 20] }
                : { paddingBottomRight: [20, 20], paddingTopLeft: [20, 20] };
            map.fitBounds(mapState.polygonBounds, paddingOpts);

            refreshGridLayer(map, mapState, state.taxonId);
        })
        .catch(err => console.error('Failed to load boundary GeoJSON:', err));
});