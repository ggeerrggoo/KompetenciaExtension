//name: h3 element, question: div element   
class task {
    constructor(name, question, description, type, answerInputs, selectedAnswers) {
        this.name = name;
        this.question = question;
        this.description = description;
        this.type = type;
        this.answerInputs = answerInputs;
        this.selectedAnswers = selectedAnswers;
    }
}
//types: select_text, select_image, dropdown, custom_number, category_select, drag_drop_grid, drag_drop_text
function getTaskType() {
    if(document.querySelector("div.valasz-betujel.text-center.m-1.px-2") != null){
        return 'select_text';
    }
    else if(document.querySelector("img.kep-valaszlehetoseg") != null){
        return 'select_image';
    }
    else if(document.querySelector("ng-select") != null) {
        return 'dropdown';
    }
    else if(document.querySelector("input.form-control") != null) {
        return 'custom_number';
    }
    else if(document.querySelector("div.csoportos-valasz-betujel") != null) {
        return 'category_select';
    }
    else if (document.querySelector('div.cdk-drag.cella-dd.ng-star-inserted')) {
        //only grid based drag and drop - and only ones where text is dragged -- can't find a way to track images (src changes)
        return 'drag_drop_grid';
    }
    else if (document.querySelector('div.cdk-drag.szoveg-dd-tartalom')) {
        //text but not grid drag-drop (don't think this one exists with images)
        return 'drag_drop_text';
    }
    else return 'unknown';
}

function getTaskName() {
    const tasknames = document.querySelectorAll('h3.mb-3');
    return tasknames[tasknames.length - 1].textContent;
}

function getTaskUniqueID() {
    const q1 = document.querySelectorAll('p#kerdes');
    const q2 = document.querySelectorAll('tk-kerdes-elem');
    const q3 = document.querySelectorAll('div.ql-editor.szoveg-elem');
    let qs = [];
    if (q1.length > 0) {
        qs = q1;
    }
    else if (q2.length > 0) {
        qs = q2;
    }
    else if (q3.length > 0) {
        qs = q3;
    }

    if(qs.length > 0) {
        let q = qs[0];
        let text = q.textContent.trim();
        let prev_text = q.textContent.trim();
        let i = 0;
        let taskName = getTaskName().replace(/[^a-zA-Z0-9.,!?]/g, '');
        // go to parent element until it contanins the task name or we do it 15 times,
        // hopefully it is enough to make it unique
        while(text.length <= 1000 && !text.includes(taskName) && i < 15) {
            i++;
            q = q.parentElement;
            prev_text = text;
            text = q.textContent.replace(/[^a-zA-Z0-9.,!?]/g, '');
        }
        // if the text is very long (eg. benne van a teljes szövegértés szöveg), revert to previous
        if(text.length > 1500 && prev_text.length > 100) return prev_text;
        else return text;
    }
    return 'No question found.';
}

function getTaskDescription() {
    return "nem kell szerintem";
    const desc1 = document.querySelector('div.my-3.container.ng-star-inserted');
    const desc2 = document.querySelector('tk-szeparalt-layout');
    if(desc1) {
        return desc1.textContent;
    }
    else if(desc2) {
        return desc2.textContent;
    }
    else {
        console.log('No description found.');
        return null;
    }
}

//works with select_text and select_image task types
function getTaskTextAnswerFields() {
    const answers = document.querySelectorAll('div.valaszlehetoseg.valaszlehetoseg-hover.ng-star-inserted');
    return answers;
}

function getTaskDropdownFields() {
    const fields = document.querySelectorAll('div.ng-select-container');
    return fields;
}

function getTaskImageFromDiv(div) {
    const img = div.querySelector('img.kep-valaszlehetoseg');
    return img;
}

function getTaskCategorySelectFields() {
    const fields = document.querySelectorAll('div.valasz-betujelek');
    return fields;
}

function getTaskCategorySelectAnswersFromDiv(div) {
    const answers = div.querySelectorAll('div.csoportos-valasz-betujel.text-center.m-1.px-2.ng-star-inserted');
    return answers;
}

function getTaskCustomNumberFields() {
    const fields = document.querySelectorAll('input.form-control');
    return fields;
}

async function getTaskDDfieldID(div, dragordrop) {
    let ID = '';
    try {
    if (dragordrop === 'drag') {
        const img = div.querySelector('img');

        if (img) {
            // Wait until image is loaded
            await waitForImageLoad(img);

            if (img.naturalWidth && img.naturalHeight) {
                const canvas = document.createElement('canvas');
                const maxSize = 20;

                canvas.width = maxSize;
                canvas.height = maxSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, maxSize, maxSize);

                try {
                    const dataURL = canvas.toDataURL();
                    ID = hashString(dataURL);
                } catch (e) {
                    // If somehow image-reading magic fails: log fail, fall back
                    console.log('Canvas toDataURL failed:', e);
                    ID = div.textContent.trim();
                }
            } else {
                // Image failed to load
                ID = div.textContent.trim();
            }
        } else {
            // No image, use text
            ID = div.textContent.trim();
        }

    } else if (dragordrop === 'drop') {
        ID = div.id;
    }

    return ID;
    }
    catch (error) {
        console.error(`Error getting task DD field ID: field: ${div}, dragordrop: ${dragordrop}, error: ${error}`);
        return '';
    }
}

// Hash function (djb2)
function hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return 'img-' + (hash >>> 0);
}

// Returns a promise that resolves when the image is loaded (or fails)
function waitForImageLoad(img) {
    return new Promise(resolve => {
        if (img.complete) {
            resolve(); // already loaded
        } else {
            img.onload = img.onerror = () => resolve();
        }
    });
}

let taskStatusIndex = 0;

function repositionTaskStatuses(scale = -1) {
    try {
        if (scale === -1) {
            scale = 1 / getCurrentScale();
        }
        const tasks = document.querySelectorAll('[id^="__tk_task_"]');
        tasks.forEach((task, index) => {
            // Scale the spacing between task statuses based on the zoom scale
            const scaledSpacing = 32 * scale;
            task.style.bottom = (50 + index * scaledSpacing) + 'px';
        });
    } catch (e) {
        console.log('repositionTaskStatuses failed', e);
    }
}
function scaleTaskStatuses(scale) {
    try {
        const statuses = document.querySelectorAll('[id^="__tk_task_"]');
        statuses.forEach((status) => {
            status.style.transformOrigin = 'bottom right';
            status.style.transform = `scale(${scale})`;
        });
        // Also reposition with scaled spacing
        repositionTaskStatuses(scale);
    } catch (e) {
        console.log('scaleTaskStatuses error', e);
    }
}

function getCurrentScale() {
    try {
        const z = document.body.style.zoom;
        if (z && z.endsWith('%')) {
            const pct = parseFloat(z.slice(0, -1));
            if (!isNaN(pct) && pct > 0) {
                return (pct / 100); // Return the inverse scale (e.g., 25% -> 4)
            }
        }
        return 1; // Default scale if no zoom is applied
    } catch (e) {
        return 1;
    }
}

class taskStatus {
    constructor(text, state = 'processing') {
        this.text = text + (text.endsWith(".") ? "" : "...");
        this.state = state;
        this.id = `__tk_task_${++taskStatusIndex}`;
        this.element = this.createElement();
        document.body.appendChild(this.element);
        let existingTasks = document.querySelectorAll('[id^="__tk_task_"]');
        if(existingTasks.length)
            this.element.style.bottom = (50 + (existingTasks.length - 1) * 32 * getCurrentScale()) + 'px';
    }

    createElement() {
        const el = document.createElement('div');
        el.id = this.id;
        el.textContent = `${this.text}`;
        Object.assign(el.style, {
            position: 'fixed',
            right: '12px',
            bottom: '50px', // above main status
            padding: '6px 8px',
            background: 'rgba(70,130,180,0.9)', // Steel blue for "in progress"
            color: 'white',
            fontSize: '11px',
            borderRadius: '4px',
            zIndex: '2147483647',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            maxWidth: '280px',
            lineHeight: '1.2',
            pointerEvents: 'none',
            opacity: '1',
            transition: 'opacity 1s ease'
        });
        return el;
    }

    set_text(text) {
        this.text = text;
        this.element.textContent = `${text}`;
    }

    succeed(text = this.text) {
        this.state = 'done';
        this.element.textContent = `${text}`;
        this.element.style.background = 'rgba(34, 170, 34, 0.9)';
        setTimeout(() => {
            this.element.style.opacity = '0';
            setTimeout(() => {
                this.destroy();
            }, 500);
        }, 500);
    }

    error(text = this.text) {
        this.state = 'error';
        this.element.textContent = `${text}`;
        this.element.style.background = 'rgba(170,34,34,0.9)';
        setTimeout(() => {
            this.element.style.transition = 'opacity 2s ease';
            this.element.style.opacity = '0';
            setTimeout(() => {
                this.destroy();
            }, 2000);
        }, 4000);
    }

    fail(text = this.text) {
        this.state = 'failed';
        this.element.textContent = `${text}`;
        this.element.style.background = 'rgba(255,165,0,0.9)'; // Orange for "failed/not found"
        setTimeout(() => {
            this.element.style.transition = 'opacity 2s ease';
            this.element.style.transition = 'opacity 1.5s ease';
            this.element.style.opacity = '0';
            setTimeout(() => {
                this.destroy();
            }, 1500);
        }, 3000);
    }
    
    destroy() {
        try {
            // Remove DOM element
            if (this.element && this.element.parentNode) {
                this.element.remove();
            }
            
            // Clear object references
            this.element = null;
            this.text = null;
            this.state = null;
            this.id = null;
            
            // Reposition remaining statuses
            repositionTaskStatuses();
        } catch (e) {
            console.log('taskStatus destroy failed', e);
        }
    }
}

//[0]:drag fields, [1]: drop fields, [2]: drag field IDs (textcontent or image src), [3]: drop field IDs (.id attribute)
async function getTaskDragDropFields() {
    const dragfields = document.querySelectorAll('div.cdk-drag.cella-dd.ng-star-inserted');
    let dragIDs = [];
    for (let i = 0; i < dragfields.length; i++) {
        dragIDs.push(await getTaskDDfieldID(dragfields[i], 'drag'));
    }

    const dropfields = Array.from(document.querySelectorAll('div')).filter(div =>
        div.id && (div.id.includes('destination_') || div.id.includes('dnd_nyelo_'))
    );
    let dropIDs = [];

    for (let i = 0; i < dropfields.length; i++) {
        dropIDs.push(await getTaskDDfieldID(dropfields[i], 'drop'));
    }
    return [dragfields, dropfields, dragIDs, dropIDs];
}

//[0]:drag fields, [1]: drop fields, [2]: drag field IDs (textcontent (or image src, shouldnt happen here)), [3]: drop field IDs (.id attribute)
async function getTaskDDtextFields() {
    const dragfields = document.querySelectorAll('div.cdk-drag.szoveg-dd-tartalom');
    let dragIDs = [];
    for (let i = 0; i < dragfields.length; i++) {
        dragIDs.push(await getTaskDDfieldID(dragfields[i], 'drag'));
    }
    const dropfields = document.querySelectorAll('div.cdk-drop-list.szoveg-dd-nyelo-container');
    let dropIDs = [];
    for (let i = 0; i < dropfields.length; i++) {
        dropIDs.push(await getTaskDDfieldID(dropfields[i], 'drop'));
    }
    return [dragfields, dropfields, dragIDs, dropIDs];
}

function getUserID() {
    const url = window.location.href;
    const match = url.match(/[?&]azon=([^&%]+)/);
    if (match && match[1]) {
        return decodeURIComponent(match[1]);
    }
    return "unknown";
}

function isTextAnswerSelected(div) {
    if (div.querySelector('div.selected') != null) {
        return true;
    }
    return false;
}

function isImageAnswerSelected(div) {
    if (div.querySelector('div.kep-valasz-check-selected') != null) {
        return true;
    }
    return false;
}

function dropdownAnswerSelected(div) {
    let answer = div.firstChild.textContent; // firstchild because of the stupid x at the end
    if (answer == "") {
        return false;
    }
    answer = answer.trim();
    // some tasks have placeholder text
    if (div.querySelector('div.ng-placeholder')) {
        const placeholder = div.querySelector('div.ng-placeholder').textContent.trim();
        if (answer == placeholder) {
            return false;
        }
        else {
            answer = answer.replace(placeholder, '').trim();
        }
    }
    return answer;
}

function isCategoryAnswerSelected(div) {
    if (div.classList.contains("selected")) {
        return true;
    }
    return false;
}

function CustomNumberAnswerSelected(div) {
    if (div.value != "") {
        return div.value;
    }
    return false;
}

//clicks on a div element
function clickdiv(div) {
    if (div && typeof div.click === 'function') {
        div.click();
    } else {
        console.log('The provided div', div, 'does not have a click event or is not valid.');
    }
}

//does mousedown on a div element
function mousedowndiv(div) {
    const e = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true
    });
    div.dispatchEvent(e);
}

//select option with specific textContent from a dropdown
function selectDropdownOption(div, option) {
    if (option == false) {
        return;
    }
    //open the dropdown
    mousedowndiv(div);
    
    const options = document.querySelectorAll('div.ng-option');
    for (let i = 0; i < options.length; i++) {
        if (options[i].textContent.trim() == option) {
            clickdiv(options[i]);
            return;
        }
    }
    console.log(`didnt find option: '${option}'`);
    try {
        const previousBg = div.style.background;
        div.style.background = 'rgba(170,34,34,0.18)';
        div.style.transition = 'background 0.2s ease';

        // find nearest scrollable ancestor
        const findScrollableAncestor = (el) => {
            let cur = el.parentElement;
            while (cur && cur !== document.body && cur !== document.documentElement) {
                const style = getComputedStyle(cur);
                const overflow = style.overflow + style.overflowY + style.overflowX;
                if (/(auto|scroll)/.test(overflow)) return cur;
                cur = cur.parentElement;
            }
            return document.body;
        };

        const container = findScrollableAncestor(div) || document.body;
        const prevContainerPosition = getComputedStyle(container).position;
        if (container !== document.body && prevContainerPosition === 'static') {
            container.style.position = 'relative';
        }

        const badge = document.createElement('div');
        const badgeId = '__tk_missing_option_' + Date.now();
        badge.id = badgeId;
        badge.textContent = `Missing: ${option}`;
        Object.assign(badge.style, {
            position: (container === document.body ? 'fixed' : 'absolute'),
            background: 'rgba(170,34,34,0.95)',
            color: 'white',
            padding: '6px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: '2147483647',
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
            maxWidth: '240px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
        });

        // position relative to container
        const rect = div.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (container === document.body) {
            badge.style.left = (rect.right + 8) + 'px';
            badge.style.top = (rect.top) + 'px';
            document.body.appendChild(badge);
        } else {
            // absolute inside container
            const left = Math.max(0, rect.right - containerRect.left + (container.scrollLeft || 0) + 8);
            const top = Math.max(0, rect.top - containerRect.top + (container.scrollTop || 0));
            badge.style.left = left + 'px';
            badge.style.top = top + 'px';
            container.appendChild(badge);
        }

        const cleanup = () => {
            try { const b = document.getElementById(badgeId); if (b) b.remove(); } catch (e) {}
            try { div.style.background = previousBg; } catch (e) {}
            try { if (container !== document.body && prevContainerPosition === 'static') container.style.position = prevContainerPosition; } catch (e) {}
        };

        // Fade out over 10s then clean up
        try {
            badge.style.opacity = '1';
            badge.style.transition = 'opacity 10s linear';
            // trigger transition
            requestAnimationFrame(() => { badge.style.opacity = '0'; });
        } catch (e) {}
        const tidyTimer = setTimeout(() => { cleanup(); }, 10000);
    } catch (e) {
        console.log('Error showing missing option badge', e);
    }
}

function placeDebugMarker(x, y, color = 'red') {
    const marker = document.createElement('div');
    marker.style.position = 'fixed';
    marker.style.left = `${x - 5}px`;
    marker.style.top = `${y - 5}px`;
    marker.style.width = '10px';
    marker.style.height = '10px';
    marker.style.backgroundColor = color;
    marker.style.zIndex = '9999';
    marker.style.pointerEvents = 'none';
    marker.style.border = '1px solid black';
    document.body.appendChild(marker);
    marker.classList.add('debug-marker');
}

async function selectDragDropAnswer(toDrag, toDrop)
{
    const dragRect = toDrag.getBoundingClientRect();
    const dropRect = toDrop.getBoundingClientRect();
    
    const startX = dragRect.left + dragRect.width / 2;
    const startY = dragRect.top + dragRect.height / 2;
    
    const endX = dropRect.left + dropRect.width / 2;
    const endY = dropRect.top + dropRect.height / 2;
        
    toDrag.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        clientX: startX,
        clientY: startY
    }));
    document.dispatchEvent(new MouseEvent('mousemove', {    
        bubbles: true,
        clientX: startX + 100,
        clientY: startY + 100
    }));
    document.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: true,
        clientX: endX,
        clientY: endY
    }));
    toDrop.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        clientX: endX,
        clientY: endY
    }));
}   

async function getSelectedAnswers(taskType, answerInputs) {
    let selected = [];

    switch (taskType) {
    case 'select_text':
        for (let i = 0; i < answerInputs.length; i++) {
            if (isTextAnswerSelected(answerInputs[i])) {
                selected.push(true);
            }
            else {
                selected.push(false);
            }
        }
        break;
    case 'select_image':
        for (let i = 0; i < answerInputs.length; i++) {
            if (isImageAnswerSelected(answerInputs[i])) {
                selected.push(true);
            }
            else {
                selected.push(false);
            }
        }
        break;
    case 'dropdown':
        for (let i = 0; i < answerInputs.length; i++) {
            selected.push(dropdownAnswerSelected(answerInputs[i]));
        }
        break;
    case 'category_select':
        for (let i = 0; i < answerInputs.length; i++) {
            let currentSelected = [];
            for (let j = 0; j < answerInputs[i].length; j++) {
                currentSelected.push(isCategoryAnswerSelected(answerInputs[i][j]));
            }
            selected.push(currentSelected);
        }
        break;
    case 'custom_number':
        for (let i = 0; i < answerInputs.length; i++) {
            selected.push(CustomNumberAnswerSelected(answerInputs[i]));
        }
        break;
    case 'drag_drop_grid':
    case 'drag_drop_text':
        for(let i=0; i<answerInputs[1].length; i++) {
            if(answerInputs[1][i].querySelector('div')) {
                selected.push(await getTaskDDfieldID(answerInputs[1][i].querySelector('div'), 'drag'))
            }
            else {  
                selected.push(false);
            }
        }
        break;
    default:
        console.log('Task type not supported for auto answer reading YET.');
        break;
    }
    return selected;
}

async function clearSelectedAnswers(taskType,divs) {
    //this whole thing isnt needed, because we wont autofill answers if there are already answers
    //but it is here because why not, half of it isnt implemented anyway because answers just override old ones in some task types
    // or its impossible (without rewriting everyhting differently)
    let selectedAnswers = await getSelectedAnswers(taskType, divs);

    switch (taskType) {
        case 'select_text':
            for (let i = 0; i < divs.length; i++) {
                if (selectedAnswers[i] == true) {
                    clickdiv(divs[i]);
                }
            }
            break;
        case 'select_image':
            for (let i = 0; i < divs.length; i++) {
                if (selectedAnswers[i] == true) {
                    clickdiv(divs[i]);
                }
            }
            break;
        case 'dropdown':
            //not needed, because the input will let stuff be overriden
            break;
        case 'category_select':
            for (let i = 0; i < divs.length; i++) {
                for (let j = 0; j < divs[i].length; j++) {
                    if (selectedAnswers[i][j] == true) {
                        clickdiv(divs[i][j]);
                    }
                }
            }
            break;
        case 'custom_number':
            //not needed, because the input will let stuff be overriden
            break;
        case 'drag_drop_grid':
            //not really possible, cant know where you need to drag it back to, if I drag it to wrogn spot, it just wont move
            //so this is not implemented
            break;
        case 'drag_drop_text':
            //not really possible, cant know where you need to drag it back to, if I drag it to wrogn spot, it just wont move
            //so this is not implemented
            break;
        default:
            console.log('Task type not supported for auto answer clearing (yet).');
            break;
    }
}

//blocks clicks on page to not interfere with auto stuff
function blockUserInteraction() {
    if (document.getElementById('__input-blocker')) return;

    // scroll to top to help ensure elements stay in place while we interact
    try { window.scrollTo(0, 0); } catch (e) {}
    const blocker = document.createElement('div');
    blocker.id = '__input-blocker';
    Object.assign(blocker.style, {
        position: 'fixed',
        inset: '0',
        background: 'rgba(0, 0, 0, 0.18)', // semi-transparent background
        zIndex: '2147483646',
        cursor: 'wait'
    });
    // make sure clicks are blocked but don't capture pointer events for debugging overlays
    blocker.style.pointerEvents = 'auto';
    document.body.appendChild(blocker);
}

function unblockUserInteraction() {
    // Remove the blocker
    const blocker = document.getElementById('__input-blocker');
    if (blocker) blocker.remove();
}

function zoomOut() {
    let oldZoom = document.body.style.zoom;
    document.body.style.zoom = '25%';
    let tkelo = document.querySelector("tk-elonezet");
    if (tkelo) tkelo.style.height = "3000px"; // for some reason the page doesnt extend automatically, so this is a workaround
    // scale status indicator to compensate for page zoom so it stays readable
    try {
        // compute inverse scale from zoom percent (e.g. '25%' -> 4)
        const z = document.body.style.zoom;
        if (z && z.endsWith('%')) {
            const pct = parseFloat(z.slice(0, -1));
            if (!isNaN(pct) && pct > 0) {
                scaleTaskStatuses(1 / (pct / 100));
            }
        }
    } catch (e) {
        console.log('scaleTaskStatuses failed on zoomOut', e);
    }
    return oldZoom;
}

function zoomIn(oldZoom) {
    document.body.style.zoom = oldZoom;
    let tkelo = document.querySelector("tk-elonezet");
    if (tkelo) tkelo.style.height = "100%"; // reset height to default
    // reset status indicator scale
    try { scaleTaskStatuses(1); } catch (e) { console.log('scaleTaskStatuses failed on zoomIn', e); }
}

// Keep the status indicator visually stable when the page zooms by applying
// an inverse CSS scale to the indicator element. scale = 1 means normal size.

async function writeAnswers(taskType, answers, divs) {
    await clearSelectedAnswers(taskType, divs);
    
    //wait while the loading logo is visible
    while (document.querySelector('svg.ng-tns-c107-0') != null) {
        await new Promise(resolve => setTimeout(resolve, 100));
        //console.log('logo detected, waiting...');
    }
    
    switch (taskType) {
        case 'select_text':
            for (let i = 0; i < divs.length; i++) {
                if (answers[i] == true) {
                    clickdiv(divs[i]);
                }
            }
            break;
        case 'select_image':
            for (let i = 0; i < divs.length; i++) {
                if (answers[i] == true) {
                    clickdiv(divs[i]);
                }
            }
            break;
        case 'dropdown':
            for (let i = 0; i < divs.length; i++) {
                if (answers[i] != false) {
                    selectDropdownOption(divs[i], answers[i]);
                }
            }
            break;
        case 'category_select':
            for (let i = 0; i < divs.length; i++) {
                for (let j = 0; j < divs[i].length; j++) {
                    if (answers[i][j] == true) {
                        clickdiv(divs[i][j]);
                    }
                }
            }
            break;
        case 'custom_number':
            for (let i = 0; i < divs.length; i++) {
                if (answers[i] != false) {
                    divs[i].value = answers[i];
                    divs[i].dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
            break;
        case 'drag_drop_grid':
        case 'drag_drop_text':
            blockUserInteraction();
            let fails = 0;
            let oldZoom = zoomOut(); // zoom out to make sure everything is on-screen
            for (let i = 0; i < divs[1].length; i++) {
                if (answers[i]) {
                    // Find the index of answers[i] in divs[2] (drag IDs)
                    let dragDiv = divs[0][divs[2].indexOf(answers[i])];
                    let dropDiv = divs[1][i];
                    if (!dragDiv) {
                        console.log('Drag element not found:', answers[i]);
                        continue;
                    }
                    unblockUserInteraction();
                    await selectDragDropAnswer(dragDiv, dropDiv);
                    blockUserInteraction();
                    while(dropDiv.classList.contains('cdk-drop-list-receiving') || dropDiv.classList.contains('cdk-drop-list-dragging') || dropDiv.classList.contains('cdk-drag-animating')) {
                        await new Promise(resolve => setTimeout(resolve, 50)); // wait for the drag and drop animation to complete
                    }
                    await new Promise(resolve => setTimeout(resolve, 100)); // extra buffer wait
                    //check if drag was successful
                    if (!dropDiv.querySelector('div.cdk-drag.cella-dd.ng-star-inserted') && !dropDiv.querySelector('div.cdk-drag.szoveg-dd-tartalom.ng-star-inserted')) {
                        console.log('Drag and drop failed for:', answers[i], " retrying...");
                        //decrease i -> try again with same index
                        i--;
                        fails++;
                        if (fails > 5) {
                            console.log('Too many drag and drop failures, going to next one.');
                            i++;
                            fails = 0;
                        }
                        continue;
                    }
                    else {
                        fails = 0; // reset fails if successful
                    }
                }
            }
            zoomIn(oldZoom); // zoom back in
            break;
        default:
            console.log('Task type not supported for auto answer writing yet.');
            break;
    }
    unblockUserInteraction();
}

async function getTask() {
    let type = getTaskType();
    let name = getTaskName();
    let question = getTaskUniqueID();
    let description = getTaskDescription();
    let answers = null;
    if (type == 'select_text' || type == 'select_image') {
        answers = getTaskTextAnswerFields();
    }
    else if(type == 'dropdown') {
        answers = getTaskDropdownFields();
    }
    else if (type == 'category_select') {
        let fields = getTaskCategorySelectFields();
        answers = [];
        for (let i = 0; i < fields.length; i++) {
            let answers_from_div = getTaskCategorySelectAnswersFromDiv(fields[i]);
            answers.push(answers_from_div);
            }
    }
    else if (type == 'custom_number') {
        answers = getTaskCustomNumberFields();
    }
    else if (type == 'drag_drop_grid') {
        answers = await getTaskDragDropFields();
    }
    else if (type == 'drag_drop_text') {
        answers = await getTaskDDtextFields();
    }
    else {
        //TODO
        answers = [];   
    }
    let selectedAnswers = await getSelectedAnswers(type, answers);
    let t = new task(name, question, description, type, answers, selectedAnswers);
    return t;
}

function fetchTaskFromBackground(url, options) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            { type: "fetchTask", url: url, options: options },
            (response) => {
                if (response && response.success) {
                    // Return a Response-like object
                    resolve({
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers,
                        json: async () => response.data,
                        text: async () => JSON.stringify(response.data),
                        ok: response.status >= 200 && response.status < 300
                    });
                } else {
                    reject(response ? response.error : "Unknown error");
                }
            }
        );
    });
}

function checkArrayForTrue(array) {
    for (let i = 0; i < array.length; i++) {
        // Check for array-like objects (Array, NodeList, HTMLCollection, etc.)
        if (
            (Array.isArray(array[i]) || 
            (typeof array[i] === 'object' && array[i] !== null && typeof array[i].length === 'number' && typeof array[i] !== 'string'))
        ) {
            if (checkArrayForTrue(Array.from(array[i]))) {
            return true;
            }
        }
        else if (array[i] !== false && array[i] !== null && array[i] !== undefined && array[i] !== '') {
            return true;
        }
    }
    return false;
}

function hasAnswers(current_task) {
    return checkArrayForTrue(current_task.selectedAnswers);
}

async function syncTaskWithDB(current_task) {   //current_task is a copy here, it also has faulty answerInputs cuz those are HTML elements

    const dburl = settings.url+"solution/"; // http://strong-finals.gl.at.ply.gg:36859/solution

    if(!hasAnswers(current_task)) {
        let task = {
            name: current_task.name,
            question: current_task.question,
            type: current_task.type
        };
        let user = {
            name: settings.name,
            azonosito: getUserID()
        };
        
        try {
            //console.log('Fetching solution for task:', task, 'and user:', user);
            const reply = await sendRequestToBackground({
                type: 'getSolution',
                task: task,
                user: user
            });
            if(reply.status != "ok"){
                console.log('Error getting solution:', reply);
                console.log('task sent:', reply);
                return;
            }
            //console.log('Solution fetched successfully', reply);
            return reply.solution;
        }
        catch (error) {
            console.log('Error fetching task from DB:', error);
            return;
        }
    }
    else {
        const task = {
            name: current_task.name,
            question: current_task.question,
            description: current_task.description,
            type: current_task.type,
            solution: current_task.selectedAnswers
        };
        const user = {
            name: settings.name,
            azonosito: getUserID()
        };
        try {
            const reply = await sendRequestToBackground({
                type: 'postSolution',
                task: task,
                user: user
            });
            //console.log('Posting solution to DB:', task, 'for user:', user);
            if (reply && reply.status === "ok") {
                console.log('Solution posted successfully', reply);
                return reply;
            } else {
                console.log('Error posting solution:', reply);
                return;
            }
        }
        catch (error) {
            console.log('Error posting solution:', error);
            return;
        }
    }
    return;
}

function loadSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get({
            name: '',
            minvotes: 5,
            votepercentage: 0.8,
            contributer: true,
            url: 'http://strong-finals.gl.at.ply.gg:36859/',
            autoComplete: true
        }, function(items) {
            settings.name = items.name;
            if(items.minvotes == 0) {
                settings.minvotes = 5;
            }
            else settings.minvotes = items.minvotes;

            if(items.votepercentage == 0.0) {
                settings.votepercentage = 80.0;
            }
            else settings.votepercentage = items.votepercentage * 100.0;
            settings.isContributor = items.contributer;
            if(items.url == '') {
                settings.url = 'http://strong-finals.gl.at.ply.gg:36859/';
            }
            else settings.url = items.url;
            settings.autoComplete = items.autoComplete;

            resolve(items);
        });
    });
}

async function fetchAnnouncements() {
    chrome.storage.sync.get({lastAnnouncment: "2025-05-25T04:26:14.000Z"},async (items) => {
        const announcementUrl = settings.url+'announcements/';
        
        const response = await fetchTaskFromBackground(announcementUrl+items.lastAnnouncment, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            const announcements = await response.json();
            console.log('Announcements fetched:', announcements);
            if (announcements === null) {
                console.log('No new announcements found.');
                return false; // Return false if no new announcements
            }
            for (let i = 0; i < announcements.length; i++) {
                const announcement = announcements[i];
                items.lastAnnouncment = announcement.created_at;
                console.log('New announcement:', announcement);
                alert(`Új közlemény:\n${announcement.title}\n\n${announcement.content}\n\n${announcement.created_at}`);
            }
            if (items.lastAnnouncment) {
                const lastDate = new Date(items.lastAnnouncment.replace(' ', 'T'));
                lastDate.setSeconds(lastDate.getSeconds() + 1);
                items.lastAnnouncment = lastDate.toISOString();
            }
            chrome.storage.sync.set({lastAnnouncment: items.lastAnnouncment});
            return true; // Return true if an announcement was found
        } else {
            console.error('Failed to fetch announcement:', response.status, response.error);
            //throw new Error('Failed to fetch announcement:', response.error);
        }
        
    });
}

let port = null;
let wsOnMessage = null;
let reqList = new Map();
let reqListIndex = 1;

// Tracks whether the background reported the WebSocket as connected
let wsConnected = 0;

function connectToBackground() {
    return new Promise((resolve, reject) => {
        if (wsConnected) {
            console.log('WebSocket is already connected: ', wsConnected);
            resolve();
        }
        wsOnMessage = (response) => {
            console.log('Response from background:', response);
        }
        port = chrome.runtime.connect();
        let settled = false;
        const TIMEOUT_MS = 5000;

        const onMessage = (response) => {
            if(!response || response.id === undefined) {
                if(response && response.type === 'wsConnected') {
                    console.log('WebSocket connected to background script.');
                    wsConnected++;
                    if (!settled) { settled = true; clearTimeout(timer); resolve(); }
                    return;
                }
                if(response && (response.type === 'wsError' || response.type === 'wsClosed')) {
                    console.log('WebSocket error/closed:', response.error || response.type);
                    wsConnected = Math.max(wsConnected - 1, 0);
                    if (!settled) { settled = true; clearTimeout(timer); reject(new Error(response.type || 'wsError')); }
                    return;
                }
                console.log('Invalid response received:', response, response && response.id);
                return;
            }
            if (typeof reqList.get(response.id) !== 'function') {
                console.log('No request function found for response ID:', response.id);
                return;
            }
            reqList.get(response.id)(response);
            reqList.delete(response.id);
        };

        port.onMessage.addListener(onMessage);

        port.onDisconnect.addListener(() => {
            console.log('Port disconnected, reconnecting...');
            port = null;
            wsConnected = Math.max(wsConnected - 1, 0);
            // try to reconnect in background; swallow any rejection from the retry
            if (wsConnected < 1) connectToBackground().catch(err => console.log('reconnect failed', err));
        });

        // Timeout: reject if wsConnected not received in time
        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                console.log('connectToBackground: timed out waiting for wsConnected');
                reject(new Error(`timeout waiting for wsConnected after ${TIMEOUT_MS} ms`));
            }
        }, TIMEOUT_MS);
    });
}

async function sendRequestToBackground(request) {
    return new Promise((resolve, reject) => {
        if (port == null) {
            console.log('Port is not connected, reconnecting...');
            connectToBackground();
        }
        if (typeof request !== 'object' || !request.type) {
            console.error('Invalid request format:', request);
            reject(new Error('Invalid request format'));
            return;
        }
        request.id = reqListIndex++;
        //console.log('Sending request to background:', request);
        reqList.set(request.id, (response) => {
            resolve(response);
            return;
        });
        
        port.postMessage(request);
    });
}

async function updateUserAnswers(current_task, event) {
    if (typeof current_task != 'undefined' && current_task != null) {
        let selections_pre = await getSelectedAnswers(current_task.type, current_task.answerInputs);
        if (selections_pre.length != 0) {
            console.log('Selected answers:', selections_pre);
            current_task.selectedAnswers = selections_pre;
        }
    }
}

var settings = {};
async function main_loop() {
    let settings_task = new taskStatus('beállítások betöltése');
    try {
        await loadSettings();
        settings_task.succeed();
    } catch (error) {
        settings_task.error("hiba a beállítások betöltésekor: " + error);
    }

    // Connect to background and retry on failure with exponential backoff
    let backoff = 500; // ms
    const maxBackoff = 8000; // ms
    let retryCnt = 0;
    const maxRetries = 5;
    let connect_status = new taskStatus('kapcsolódás a szerverhez...', 'processing');
    while (true) {
        try {
            await connectToBackground();
            connect_status.succeed();
            break; // connected
        } catch (err) {
            console.log('connectToBackground failed:', err);
            retryCnt++;
            if (retryCnt >= maxRetries) {
                connect_status.error('Max újrakapcsolódási kísérlet elérve, frissítse az oldalt az újrapróbálkozáshoz');
                console.log('Max retries reached, giving up.');
                return;
            }
            connect_status.set_text('kapcsolódás a szerverhez... (újrapróbálkozás ' + retryCnt + '/' + maxRetries + ')');
            await new Promise(resolve => setTimeout(resolve, backoff));
            backoff = Math.min(maxBackoff, Math.floor(backoff * 1.8));
            
        }
    }
    //fetchAnnouncements();

    let last_url = '';
    let url = '';
    let current_task = null;
    let selectedAnswers = [];
    let sendResults = true;

    let autoNext = false;

    document.addEventListener('click', async function(event) {
        if (document.getElementById('__input-blocker')) return;
        try {
            updateUserAnswers(current_task, event);
            if (event.target.classList.contains('btn-danger')) { // lezárás gomb elv. ilyen
                if (sendResults && current_task != null && hasAnswers(current_task)) {
                    console.log('lezárás clicked, syncing last task');
                    let asdf = syncTaskWithDB(JSON.parse(JSON.stringify(current_task)));
                    console.log('Sync promise:', asdf);
                    sendResults = false;
            }
        }
        }
        catch (error) {
            console.error('Error updating user answers:', error);
        }
    })

    // Listen for key presses, just used for debug
    document.addEventListener('keydown', async function(event) {
        if (event.key.toLowerCase() === 'i') {
            if (current_task != null) {
                console.log('URL:', url);
                console.log('Current task:', current_task);
            }
        }
        else if (event.key.toLowerCase() === 's') {
            if (current_task != null) {
                console.log('Syncing task with DB (keybind clicked)...');
                syncTaskWithDB(current_task);
            }
        }
        else if(event.key.toLowerCase() === 't') {
            if (current_task != null) {
                console.log(await sendRequestToBackground({
                    type: 'getSolution',
                    task: JSON.parse(JSON.stringify(current_task)),
                    user: {
                        name: settings.name,
                        azonosito: getUserID()
                    }
                }));
            }
        }
        else if (event.ctrlKey && event.key.toLowerCase() === 'b') {
            if (document.getElementById('__input-blocker')) {
                console.log('Unblocking user interaction...');
                unblockUserInteraction();
            } else {
                console.log('Blocking user interaction...');
                blockUserInteraction();
            }
        }
    });

    while (true) {
        url = window.location.href;
        //idle loop, no new url found
        if (last_url == url && last_url != '') {
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
        }
        
        //when a new url is found
        //wait for the page to show a task
        console.log('New URL, waiting for task...');
        let getTaskStatus = new taskStatus('feladatra várakozás...', 'processing');
        while (getTaskType() == 'unknown') {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.log('task got: ', getTaskType());
        getTaskStatus.succeed("feladat észlelve");

        last_url = url;

        if (sendResults && current_task != null && hasAnswers(current_task)) {
            console.log('New task found, syncing old one with DB...');
            const syncPromise = syncTaskWithDB(JSON.parse(JSON.stringify(current_task)));
            let syncStatus = new taskStatus('előző feladat szinkronizálása...', 'processing');
            syncPromise.then(() => {
                syncStatus.succeed("előző feladat szinkronizálása kész");
            }).catch((error) => {
                syncStatus.error("hiba az előző feladat szinkronizálása során: " + error);
            });
        }
        sendResults = true;
        current_task = await getTask();
        url = window.location.href;
        last_url = url;

        let taskFillStatus = new taskStatus('feladat kitöltése...', 'processing');

        if (hasAnswers(current_task)) {
            console.log('Already has answers, skipping autofill...');
            taskFillStatus.succeed("már van valami beírva; kihagyva");
            sendResults = false;
        }
        else if (current_task.type !== 'unknown') {
            try {
                taskFillStatus.set_text('válasz kérése szervertől...');
                const queryPromise = syncTaskWithDB(current_task);
                let queryResult = await queryPromise;
                if (queryResult != null) {
                    console.log('Query result:', queryResult);
                    await loadSettings();
                    if (queryResult.totalVotes >= settings.minvotes && 100*queryResult.votes / queryResult.totalVotes >= settings.votepercentage) {
                        sendResults = false;
                        console.log('Enough votes and enough percentage of votes.');
                        taskFillStatus.set_text('válasz beírása...');
                        await writeAnswers(current_task.type, JSON.parse(queryResult.answer), current_task.answerInputs);
                        //await new Promise(resolve => setTimeout(resolve, 300));
                        taskFillStatus.succeed("válasz beírása kész");
                        //scroll to bottom of the page
                        
                        const buttons = document.querySelectorAll('button.btn.btn-secondary.d-block');
                        if (autoNext && buttons.length == 2) {
                            clickdiv(buttons[buttons.length - 1]);
                            window.scrollTo(0, document.body.scrollHeight);
                            await new Promise(resolve => setTimeout(resolve, 50));
                            console.log('Answers written and task submitted.');
                        }
                    }
                    else {
                        taskFillStatus.fail(`nem elég a leadott válasz (${queryResult.votes}/${queryResult.totalVotes} ugyanolyan : ${100*queryResult.votes / queryResult.totalVotes}%), 
                            kéne: ${settings.minvotes} össz válasz és ${settings.votepercentage}%`, 'skipped');
                        console.log('Not enough votes or not enough percentage of votes.');
                        console.log('Total votes:', queryResult.totalVotes, "required votes:", settings.minvotes);
                        console.log('Vote%:', 100*queryResult.votes / queryResult.totalVotes , "required vote%:", settings.votepercentage);
                    }
                }
                else {
                    taskFillStatus.fail('nincs még erre a feladatra leadott válasz', 'skipped');
                    console.log('No solution found in the database.');
                }
            }
            catch (error) {
                taskFillStatus.error("hiba a feladat lekérése során: " + error);
                console.log('Error fetching task from DB:', error);
            }
        }
    }
}

async function main_loop_wrapper() {
maxGlobalRetryCnt = 5;
for(let i=0; i<maxGlobalRetryCnt;i++)
{
try {
   await main_loop();
} catch (error) {
    let mainErrorTask = new taskStatus('hiba: ' + error, '\nújraindítás...');
    mainErrorTask.error();
    console.error('Error in main loop:', error);
}
}
let finalErrorTask = new taskStatus('hiba: ' + error, '\nvége. maximum újraindítási kísérletek elérve');
finalErrorTask.error();
console.error('Error in main loop:', error);
}
main_loop_wrapper();