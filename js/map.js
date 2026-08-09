import { CONSTANTS, layerConfig, ATTR } from './config.js';
import { hideClusterPopup, showClusterPopup, state } from './ui.js';

export function createMap() {
    const map = L.map('map', { preferCanvas: true, zoomSnap: 0.1, zoomDelta: 0.5 });
    map.attributionControl.setPrefix('');
    map.attributionControl.addAttribution(ATTR.inat);

    [['pane-greenspace', 441], ['maskPane', 450], ['boundaryPane', 460]].forEach(([name, z]) => {
        map.createPane(name);
        map.getPane(name).style.zIndex = z;
    });
    map.getPane('maskPane').style.pointerEvents = 'none';
    map.getPane('boundaryPane').style.pointerEvents = 'none';

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
        className: 'osm-grayscale'
    }).addTo(map);

    return map;
}

export function loadAccessLayer(map, type, mapState) {
    if (!mapState.activePolygonFeature || mapState.layerLoaded[type]) return;
    const cfg = layerConfig[type], spinner = document.getElementById(cfg.spinner);
    spinner.classList.remove('hidden');
    const query = L.esri.query({ url: cfg.url });
    query.intersects(mapState.polygonBounds);
    query.params.outSR = 4326;
    query.run((error, featureCollection) => {
        spinner.classList.add('hidden');
        if (error) return console.error(`${type.toUpperCase()} Query error:`, error);
        const validFeatures = (featureCollection.features || []).filter(f => {
            try { return f.geometry && turf.booleanIntersects(f, mapState.activePolygonFeature); } catch (e) { return false; }
        });
        if (validFeatures.length > 0) {
            L.geoJSON(validFeatures, {
                pane: cfg.pane,
                style: function(feature) {
                    const funcType = feature.properties.function_;
                    const color = cfg.categoryColors[funcType] || '#808080';
                    return { color: color, weight: 1.5, fillColor: color, fillOpacity: 0.6 };
                },
                onEachFeature: (f, l) => {
                    const props = f.properties || {};
                    const name = props.distName1 || 'Unknown';
                    const funcType = props.function_ || 'Unknown';
                    l.bindPopup(`<div class='font-sans text-sm'><div class='font-bold text-emerald-800'>OS Open GreenSpace</div><b>Name:</b> ${name}<br><b>Function:</b> ${funcType}</div>`);
                }
            }).addTo(mapState.layerGroups[type]);
        }
        mapState.layerLoaded[type] = true;
    });
}

export function refreshGridLayer(map, mapState, taxonId) {
    if (!mapState.polygonBounds) return;
    if (mapState.currentGridLayer) mapState.gridTilesLayer.removeLayer(mapState.currentGridLayer);
    const sw = mapState.polygonBounds.getSouthWest(), ne = mapState.polygonBounds.getNorthEast();
    mapState.currentGridLayer = L.tileLayer(
        `https://api.inaturalist.org/v1/grid/{z}/{x}/{y}.png?taxon_id=${taxonId}&color=%23406381&swlat=${sw.lat}&swlng=${sw.lng}&nelat=${ne.lat}&nelng=${ne.lng}`,
        { minZoom: 0, maxZoom: 19, opacity: 1 }
    );
    mapState.gridTilesLayer.addLayer(mapState.currentGridLayer);
}

export async function fetchPointsForCurrentView(map, mapState, taxonId) {
    if (!mapState.activePolygonFeature) return;
    const b = map.getBounds();
    const fields = '(id:!t,location:!t,license_code:!t,taxon:(name:!t,preferred_common_name:!t,rank:!t),user:(login:!t,name:!t))';
    const apiUrl = `https://api.inaturalist.org/v2/observations?taxon_id=${taxonId}&swlat=${b.getSouthWest().lat}&swlng=${b.getSouthWest().lng}&nelat=${b.getNorthEast().lat}&nelng=${b.getNorthEast().lng}&per_page=200&fields=${fields}`;
    try {
        const response = await fetch(apiUrl), data = await response.json();
        if (data.results) data.results.forEach(obs => {
            if (mapState.mappedObsIds.has(obs.id) || !obs.location) return;
            if (!obs.license_code) { mapState.mappedObsIds.add(obs.id); return; }
            const lat = parseFloat(obs.location.split(',')[0]), lng = parseFloat(obs.location.split(',')[1]);
            if (!isNaN(lat) && !isNaN(lng) && turf.booleanPointInPolygon(turf.point([lng, lat]), mapState.activePolygonFeature)) {
                let commonName = obs.taxon?.preferred_common_name;
                if (!commonName) {
                    if (obs.taxon?.rank) {
                        const rankCap = obs.taxon.rank.charAt(0).toUpperCase() + obs.taxon.rank.slice(1);
                        commonName = `${rankCap}: ${obs.taxon?.name || 'Unknown'}`;
                    } else {
                        commonName = 'Unknown Species';
                    }
                }
                const latinName = obs.taxon?.name || 'Unknown';

                const userName = obs.user?.name || obs.user?.login || 'Unknown User';
                const licenseCode = obs.license_code;
                const inatLink = `https://www.inaturalist.org/observations/${obs.id}`;

                const popupHtml = `
                    <div class="font-sans text-center min-w-[180px] max-w-[240px] px-1 py-1">
                        <div class="font-bold text-sm text-emerald-800">${commonName}</div>
                        <div class="text-xs mt-1.5 mb-2">
                            <a href="#" onclick="openSpeciesModal('${latinName.replace(/'/g, "\\'")}', '${commonName.replace(/'/g, "\\'")}'); return false;" class="text-blue-600 hover:text-blue-800 underline italic transition-colors">${latinName}</a>
                        </div>
                        <div class="text-[10px] text-gray-500 leading-tight border-t border-gray-100 pt-2 mt-1.5 whitespace-normal text-left">
                            Observation by ${userName}, licensed under ${licenseCode}, sourced from <a href="${inatLink}" target="_blank" rel="noopener noreferrer" class="text-[#406381] hover:text-blue-800 underline">iNaturalist</a>.
                        </div>
                    </div>`;

                const marker = L.marker([lat, lng], { icon: mapState.singlePointClusterIcon })
                    .bindPopup(popupHtml, { autoPan: false })
                    .addTo(mapState.exactPointsLayer);

                marker.observationData = { commonName, latinName, userName, licenseCode, inatLink };

                if (!L.Browser.touch) {
                    marker.on('mouseover', function() { clearTimeout(mapState.popupHoverTimeout); this.openPopup(); });
                    marker.on('mouseout', function() { mapState.popupHoverTimeout = setTimeout(() => this.closePopup(), 200); });
                }

                marker.on('click', () => hideClusterPopup(mapState));
                mapState.mappedObsIds.add(obs.id);
            }
        });
    } catch (err) { console.error(err); }
}

export function updateMapLayer(map, mapState, taxonId) {
    clearTimeout(mapState.debounceTimer);
    if (map.getZoom() >= CONSTANTS.POINTS_ZOOM_THRESHOLD) {
        if (map.hasLayer(mapState.gridTilesLayer)) map.removeLayer(mapState.gridTilesLayer);
        if (!map.hasLayer(mapState.exactPointsLayer)) mapState.exactPointsLayer.addTo(map);
        mapState.debounceTimer = setTimeout(() => fetchPointsForCurrentView(map, mapState, taxonId), 300);
    } else {
        if (map.hasLayer(mapState.exactPointsLayer)) map.removeLayer(mapState.exactPointsLayer);
        if (!map.hasLayer(mapState.gridTilesLayer)) mapState.gridTilesLayer.addTo(map);
        refreshGridLayer(map, mapState, taxonId);
        hideClusterPopup(mapState);
    }
}