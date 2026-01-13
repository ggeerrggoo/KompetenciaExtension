export const taskFieldSelectors = {
    fullTask: 'div.tk-bgcolor-white.tk-shadow-around.p-4, div.szeparalt-container',
    loadingLogo: 'svg.ng-tns-c107-0',
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
        detect: 'div.cdk-drag.cella-dd.ng-star-inserted, div.cdk-drag.szoveg-dd-tartalom',
        drag: 'div.cdk-drag.cella-dd, div.cdk-drag.szoveg-dd-tartalom',
        drop: 'div[id*="destination_"], div[id*="dnd_nyelo_"]'
    }
};

/** 
 * The maximum size (in pixels) to which images are resized before hashing.
 * @type {number}
 */
export const maxImageHashSize = 20;
    
/** 
 * Whether to automatically proceed to the next task after answering.
 * @type {boolean}
 */
export const autoNext = false;

export const _DEBUG = true;