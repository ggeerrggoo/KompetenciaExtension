export const taskFieldSelectors = {
    fullTask: 'div.tk-bgcolor-white.tk-shadow-around.p-4, div.szeparalt-container',
    loadingLogo: 'svg.ng-tns-c107-0, #okm-loader, div.okm-loading',
    selectText: {
        detect: 'div.valasz-betujel',
        answers: 'div.valaszlehetoseg.valaszlehetoseg-hover.ng-star-inserted'
    },
    selectImage: {
        detect: 'img.kep-valaszlehetoseg',
        answers: 'div.valaszlehetoseg.valaszlehetoseg-hover.ng-star-inserted',
        images: 'img.kep-valaszlehetoseg'
    },
    dropdown: {
        detect: 'ng-select',
        answers: 'div.ng-select-container'
    },
    customNumber: {
        detect: 'input.form-control, textarea.form-control',
        answers: 'input.form-control, textarea.form-control'
    },
    categorySelect: {
        detect: 'div.csoportos-valasz-betujel',
        answers: 'div.csoportos-valasz-betujel'
    },
    dragDrop: {
        detect: 'div.cdk-drag',
        drag: 'div.cdk-drag.cella-dd, div.cdk-drag.szoveg-dd-tartalom, div.cdk-drag.ddcimke',
        drop: 'div[id*="destination_"], div[id*="dnd_nyelo_"], div[id*="cdk-drop-list"]'
    }
};

export const defaultOptions = {
    name: '',
    minvotes: 5,
    votepercentage: 0.8,
    contributer: false, 
    url: 'https://tekaku.hu/',
    autoComplete: true,
    isSetupComplete: false,
    lastAnnouncement: "2025-05-25T04:26:14.000Z",
    apiMinvotes: 0,
    apiVotepercentage: 0.0
};

/** 
 * The maximum size (in pixels) to which images are resized before hashing.
 * @type {number}
 */
export const maxImageHashSize = 20;
export const maxImageLoadWaitTime = 15000; // Max time to wait for an image to load for hashing (in ms)

export const MinAnswerUpdateInterval = 200; // Minimum interval between answer updates (in ms)
    
/** 
 * Whether to automatically proceed to the next task after answering.
 * This is for testing, so it cannot be enabled in the UI.
 * @type {boolean}
 */
export const autoNext = false;

export const _DEBUG = true;