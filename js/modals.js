export async function openSpeciesModal(latinName, commonName) {
    const speciesModal = document.getElementById("species-modal");
    const speciesModalTitle = document.getElementById("species-modal-title");
    const speciesModalSubtitle = document.getElementById("species-modal-subtitle");
    const speciesModalContent = document.getElementById("species-modal-content");

    speciesModalTitle.textContent = commonName;
    speciesModalSubtitle.textContent = latinName;
    speciesModalContent.innerHTML = `<div class="flex justify-center my-8"><svg class="animate-spin h-8 w-8 text-[#BCCB54]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>`;

    speciesModal.classList.remove("hidden");
    speciesModal.setAttribute("aria-hidden", "false");

    const isBiological = (text) => {
        if (!text) return false;
        const keywords = ["species", "genus", "family", "plant", "animal", "insect", "bird", "fungus", "taxonomic", "taxonomy", "moth", "butterfly", "fly", "beetle", "tree", "flower"];
        const lowerText = text.toLowerCase();
        return keywords.some(kw => lowerText.includes(kw));
    };

    const fetchWiki = async (title) => {
        const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        if (data.type === "standard" && data.extract_html) {
            return data;
        }
        throw new Error("Invalid format");
    };

    try {
        let data;
        try {
            data = await fetchWiki(latinName);
            if (!isBiological(data.extract)) {
                throw new Error("Disambiguation required");
            }
        } catch (initialErr) {
            let found = false;
            const suffixes = ["_(genus)", "_(plant)", "_(bird)", "_(insect)", "_(moth)"];
            
            for (const suffix of suffixes) {
                try {
                    data = await fetchWiki(latinName + suffix);
                    found = true;
                    break;
                } catch (e) {
                    continue;
                }
            }
            if (!found) throw new Error("All attempts failed");
        }

        let html = "";
        if (data.thumbnail && data.thumbnail.source) {
            html += `<img src="${data.thumbnail.source}" alt="${commonName}" class="w-full h-48 object-contain rounded-lg mb-4 shadow-sm border border-gray-100">`;
        }
        html += `<div class="text-gray-700 leading-relaxed text-sm sm:text-base">${data.extract_html}</div>`;
        html += `<div class="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">Source: <a href="${data.content_urls.desktop.page}" target="_blank" rel="noopener noreferrer" class="text-[#406381] hover:text-[#BCCB54] underline transition-colors">Read full article on Wikipedia</a></div>`;
        speciesModalContent.innerHTML = html;

    } catch (err) {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(latinName + " nature")}`;
        speciesModalContent.innerHTML = `
            <div class="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p class="text-gray-600 mb-5">We couldn't find a direct biological Wikipedia entry for this scientific name.</p>
                <a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 bg-[#406381] text-white px-5 py-2.5 rounded-lg font-bold hover:bg-[#2f4a60] transition-colors shadow-sm">
                    Search Google Instead
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
            </div>
        `;
    }
}

export function initModals() {
    const speciesModal = document.getElementById("species-modal");

    function closeSpeciesModal() {
        speciesModal.classList.add("hidden");
        speciesModal.setAttribute("aria-hidden", "true");
    }

    document.getElementById("close-species-modal-btn").addEventListener("click", closeSpeciesModal);
    document.getElementById("species-modal-backdrop").addEventListener("click", closeSpeciesModal);
}