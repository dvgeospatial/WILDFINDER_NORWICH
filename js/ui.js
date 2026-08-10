import { CONSTANTS, taxonOptions } from './config.js';
import { openSpeciesModal } from './modals.js';
import { updateMapLayer, fetchPointsForCurrentView } from './map.js';


export let state = {
    taxonId: 47158
};

export function initUI(map, mapState) {
    // Generate Taxon Radios
    document.getElementById('taxon-radios').innerHTML = taxonOptions.map(([value, label], i) =>
        `<label class="taxon-label"><input type="radio" name="taxon" value="${value}"${i ? '' : ' checked'}><span>${label}</span></label>`
    ).join('');
    
    // Panel controls
    const panel = document.getElementById('control-panel');
    const openBtn = document.getElementById('open-panel-btn');

    function updateAttributionOffset() {
        const container = document.querySelector('.leaflet-bottom.leaflet-right');
        const offset = (!panel.classList.contains('translate-x-full') && window.innerWidth >= 640) ? CONSTANTS.PANEL_WIDTH : 0;
        if (container) container.style.paddingRight = offset + 'px';
    }

    openBtn.addEventListener('click', () => {
        panel.classList.remove('translate-x-full');
        openBtn.classList.add('hidden');
        updateAttributionOffset();
    });
    
    document.getElementById('close-panel-btn').addEventListener('click', () => {
        panel.classList.add('translate-x-full');
        openBtn.classList.remove('hidden');
        updateAttributionOffset();
    });

    document.getElementById('show-map-btn').addEventListener('click', () => {
        panel.classList.add('translate-x-full');
        openBtn.classList.remove('hidden');
        updateAttributionOffset();
        if (mapState.polygonBounds) map.fitBounds(mapState.polygonBounds, { paddingBottomRight: [20, 20], paddingTopLeft: [20, 20] });
    });
    
    // Handle Taxon Change
    document.querySelectorAll('input[name="taxon"]').forEach(radio => radio.addEventListener('change', e => {
        state.taxonId = e.target.value;
        mapState.mappedObsIds.clear();
        mapState.exactPointsLayer.clearLayers();
        hideClusterPopup(mapState);
        updateMapLayer(map, mapState, state.taxonId);
        map.fire('moveend');
    }));

    // Help Modal controls
    const helpModal = document.getElementById('help-modal');
    document.getElementById('help-info-btn').addEventListener('click', () => {
        helpModal.classList.remove('hidden');
        helpModal.setAttribute('aria-hidden', 'false');
    });
    ['close-help-modal-btn', 'help-modal-backdrop'].forEach(id => document.getElementById(id).addEventListener('click', () => {
        helpModal.classList.add('hidden');
        helpModal.setAttribute('aria-hidden', 'true');
    }));

    // Species Modal escapes
    const speciesModal = document.getElementById('species-modal');
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (!speciesModal.classList.contains('hidden')) {
                speciesModal.classList.add('hidden');
                speciesModal.setAttribute('aria-hidden', 'true');
            }
            else if (!helpModal.classList.contains('hidden')) {
                helpModal.classList.add('hidden');
                helpModal.setAttribute('aria-hidden', 'true');
            }
        }
    });

    // Make functions globally available for inline onclick handlers in popups
    window.openSpeciesModal = openSpeciesModal;
    window.panel = panel; // Needed for offset calculation in map.js
}

export function hideClusterPopup(mapState) { 
    const clusterPopup = document.getElementById('cluster-popup');
    clusterPopup.classList.add('hidden'); 
}

export function repositionClusterPopup(anchorPx) {
    const clusterPopup = document.getElementById('cluster-popup');
    const mapEl = document.getElementById('map');
    const mapW = mapEl.offsetWidth, mapH = mapEl.offsetHeight;
    const popW = clusterPopup.offsetWidth, popH = clusterPopup.offsetHeight;
    const TAIL = 16, MARGIN = 10;
    let left = anchorPx.x - popW / 2, top = anchorPx.y - popH - TAIL;
    if (top < MARGIN) top = anchorPx.y + TAIL + 20;
    const panel = document.getElementById('control-panel');
    const rightBound = (!panel.classList.contains('translate-x-full') && window.innerWidth >= 640) ? mapW - CONSTANTS.PANEL_WIDTH - MARGIN : mapW - MARGIN;
    left = Math.max(MARGIN, Math.min(left, rightBound - popW));
    top = Math.max(MARGIN, Math.min(top, mapH - popH - MARGIN));
    clusterPopup.style.left = left + 'px';
    clusterPopup.style.top = top + 'px';
}

export function showClusterPopup(markers, pixelPoint, mapState) {
    const clusterPopup = document.getElementById('cluster-popup');
    const clusterPopupSummary = document.getElementById('cluster-popup-summary');
    const clusterPopupList = document.getElementById('cluster-popup-list');

    const records = markers.map(m => m.observationData).filter(Boolean)
        .sort((a, b) => (a.commonName || '').toLowerCase().localeCompare((b.commonName || '').toLowerCase()));
    clusterPopupSummary.textContent = `${records.length} record${records.length === 1 ? '' : 's'}`;
    clusterPopupList.innerHTML = records.map(r => `
        <div class="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
            <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold text-emerald-800 truncate">${r.commonName}</div>
                <div class="text-xs italic text-gray-500 truncate mb-1">
                    <a href="#" onclick="openSpeciesModal('${r.latinName.replace(/'/g, "\\'")}', '${r.commonName.replace(/'/g, "\\'")}'); return false;" class="text-blue-600 hover:text-blue-800 underline cursor-pointer">${r.latinName}</a>
                </div>
                <div class="text-[10px] text-gray-500 leading-tight whitespace-normal">
                    Observation by ${r.userName}, licensed under ${r.licenseCode}, sourced from <a href="${r.inatLink}" target="_blank" rel="noopener noreferrer" class="text-[#406381] hover:text-blue-800 underline">iNaturalist</a>.
                </div>
            </div>
        </div>`).join('');
    clusterPopup.style.left = clusterPopup.style.top = '-9999px';
    clusterPopup.classList.remove('hidden');
    repositionClusterPopup(pixelPoint);
}