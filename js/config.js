export const CONSTANTS = {
    COLOUR_LIGHT_GREEN: '#BCCB54',
    COLOUR_DARK_BLUE: '#406381',
    PANEL_WIDTH: 360,
    POINTS_ZOOM_THRESHOLD: 15
};

export const taxonOptions = [
    ['47158', 'Insects'], ['3', 'Birds'], ['47126', 'Plants'], ['47170', 'Fungi'], ['40151', 'Mammals'],
    ['20978', 'Amphibians'], ['26036', 'Reptiles'], ['47178', 'Fish'], ['47119', 'Arachnids'],
    ['47184', 'Crustaceans'], ['47115', 'Molluscs']
];

export const accessOptions = [
    ['greenspace', 'OS Open GreenSpace']
];

export const ATTR = {
    greenspace: '© <a href="https://www.ordnancesurvey.co.uk" target="_blank" rel="noopener">Ordnance Survey</a> open greenspace | Contains OS data © Crown copyright and database right 2026 | <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener">OGL v3.0</a>',
    inat: 'Observation data © <a href="https://www.inaturalist.org" target="_blank" rel="noopener">iNaturalist</a> contributors'
};

export const layerConfig = {
    greenspace: {
        spinner: 'greenspace-loading-spinner',
        url: 'https://services.arcgis.com/qHLhLQrcvEnxjtPr/arcgis/rest/services/OS_Open_Greenspace/FeatureServer/1',
        pane: 'pane-greenspace',
        categoryColors: {
            'Allotments Or Community Growing Spaces': '#30e37f', 'Bowling Green': '#e330c0', 'Cemetery': '#bcadad',
            'Golf Course': '#4fe343', 'Other Sports Facility': '#ff4e00', 'Park Or Garden': '#f2f542',
            'Play Space': '#e3e330', 'Playing Field': '#6bdeeb', 'Tennis Court': '#aa32db',
            'Religious Grounds': '#a69775', 'Sports Ground': '#f59630', 'Outdoor Activity Centre': '#37d6a0',
            'School Grounds': '#9077fa', 'Public Park Or Garden': '#4c9948'
        }
    }
};
