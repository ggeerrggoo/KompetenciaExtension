const taskFieldSelectors = {
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
const maxImageHashSize = 20;

/**
 * object that holds information about an answer field
 * @property {string} type - The type of the answer field (e.g., 'select', 'dropdown', 'customNumber', 'dragDrop')
 * @property {HTMLElement} element - The HTML element representing the answer field
 * @property {string | boolean} value - The current value of the answer field, false if not answered, string for the answer, true for multi-choice selected
 * @property {string} id - An optional identifier for the element in the field, used in dragDrop tasks
 */
class answerField {
    constructor(type, element, value, id='') {
        this.type = type;
        this.element = element;
        this.value = value;
        this.id = id; // only used in dragDrop
    }
}

/**
 * object that holds information about a task
 * @property {string} uniqueID - The unique identifier for the task
 * @property {Array<answerField>} answerFields - The answer fields associated with the task
 */
class task {
    constructor(uniqueID, answerFields) {
        this.uniqueID = uniqueID;
        this.answerFields = answerFields;
    }
}

function isThereTask() {
    if (
        document.querySelector(taskFieldSelectors.selectText.detect) ||
        document.querySelector(taskFieldSelectors.selectImage.detect) ||
        document.querySelector(taskFieldSelectors.dropdown.detect) ||
        document.querySelector(taskFieldSelectors.customNumber.detect) ||
        document.querySelector(taskFieldSelectors.categorySelect.detect) ||
        document.querySelector(taskFieldSelectors.dragDrop.detect)
    ) {
        return true;
    } else {
        return false;
    }
}

async function hashSHA256(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getTaskUniqueID() {
    const fullTaskField = document.querySelector(taskFieldSelectors.fullTask);
    if (!fullTaskField) {
        return null;
    }

    const allText = fullTaskField.textContent.trim();

    return hashSHA256(allText);

}

function getAnswerFields(selector, type, idGenerator = null) {
    const fields = Array.from(document.querySelectorAll(selector));
    return Promise.all(fields.map(async field => new answerField(type, field, false, idGenerator ? await idGenerator(field) : '')));
}

async function getTaskDDfieldID(div, dragordrop) {
  try {
    if (dragordrop === 'drag') {
      return await getDragFieldID(div);
    } else if (dragordrop === 'drop') {
      return div.id || '';
    } else {
      console.error(`Invalid dragordrop parameter: ${dragordrop}, expected 'drag' or 'drop'.`);
      return '';
    }
  } catch (error) {
    console.error(`Error getting task DD field ID:`, error);
    return '';
  }
}

async function getDragFieldID(div) {
  const img = div.querySelector('img');
  if (img) {
    await waitForImageLoad(img);
    const idFromImage = await hashImageToID(img);
    if (idFromImage) return idFromImage;
  }
  return div.textContent.trim();
}

function waitForImageLoad(img) {
    return new Promise(resolve => {
        if (img.complete) {
            resolve(); // already loaded
        } else {
            img.onload = img.onerror = () => resolve();
        }
    });
}

async function hashImageToID(img) {
  if (!img.naturalWidth || !img.naturalHeight) return null;

  const canvas = document.createElement('canvas');
  canvas.width = maxImageHashSize;
  canvas.height = maxImageHashSize;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, maxImageHashSize, maxImageHashSize);

  try {
    const dataURL = canvas.toDataURL();
    return await hashSHA256(dataURL);
  } catch (e) {
    console.error('Canvas hashing failed:', e);
    return null;
  }
}


class taskStatus {
    static taskStatusIndex = 0;

    constructor(text, state = 'processing') {
        this.text = text + (text.endsWith(".") ? "" : "...");
        this.state = state;
        this.id = `__tk_task_${++taskStatus.taskStatusIndex}`;
        this.element = this.createElement();
        document.body.appendChild(this.element);
        repositionTaskStatuses();
        if (this.state === 'error') {
            this.error();
        }
        else if (this.state === 'failed') {
            this.fail();
        }
        else if (this.state === 'done') {
            this.succeed();
        }
    }

    createElement() {
        const el = document.createElement('div');
        el.id = this.id;
        el.textContent = `${this.text}`;
        Object.assign(el.style, {
            position: 'fixed',
            right: '12px',
            bottom: '50px',
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


    /**
     * Show success status
     * @param {string} [text] - Optional text to display
     * @param {string} [color] - Optional background color (default: 'rgba(34, 170, 34, 0.9)')
     * @param {number} [stayTime] - Time in ms before fading (default: 500)
     * @param {number} [fadeTime] - Time in ms for fade out (default: 500)
     */
    succeed({text = this.text, color = 'rgba(34, 170, 34, 0.9)', stayTime = 500, fadeTime = 500} = {}) {
        this.state = 'done';
        this.element.textContent = `${text}`;
        this.element.style.background = color;
        if (stayTime !== -1 && fadeTime !== -1) {
            setTimeout(() => {
                this.element.style.transition = `opacity ${fadeTime/1000}s ease`;
                this.element.style.opacity = '0';
                setTimeout(() => {
                    this.destroy();
                }, fadeTime);
            }, stayTime);
        }
    }

    /**
     * Show error status
     * @param {string} [text] - Optional text to display
     * @param {string} [color] - Optional background color (default: 'rgba(170,34,34,0.9)')
     * @param {number} [stayTime] - Time in ms before fading (default: 4000)
     * @param {number} [fadeTime] - Time in ms for fade out (default: 2000)
     */
    error({text = this.text, color = 'rgba(170,34,34,0.9)', stayTime = 4000, fadeTime = 2000} = {}) {
        this.state = 'error';
        this.element.textContent = `${text}`;
        this.element.style.background = color;
        if (stayTime !== -1 && fadeTime !== -1) {
            setTimeout(() => {
                this.element.style.transition = `opacity ${fadeTime/1000}s ease`;
                this.element.style.opacity = '0';
                setTimeout(() => {
                    this.destroy();
                }, fadeTime);
            }, stayTime);
        }
    }

    /**
     * Show fail status
     * @param {string} [text] - Optional text to display
     * @param {string} [color] - Optional background color (default: 'rgba(255,165,0,0.9)')
     * @param {number} [stayTime] - Time in ms before fading (default: 3000)
     * @param {number} [fadeTime] - Time in ms for fade out (default: 1500)
     */
    fail({text = this.text, color = 'rgba(255,165,0,0.9)', stayTime = 3000, fadeTime = 1500} = {}) {
        this.state = 'failed';
        this.element.textContent = `${text}`;
        this.element.style.background = color;
        if (stayTime !== -1 && fadeTime !== -1) {
            setTimeout(() => {
                this.element.style.transition = `opacity ${fadeTime/1000}s ease`;
                this.element.style.opacity = '0';
                setTimeout(() => {
                    this.destroy();
                }, fadeTime);
            }, stayTime);
        }
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

function repositionTaskStatuses(scale = -1) {
    try {
        if (scale === -1) {
            scale = 1 / getCurrentScale();
        }
        const tasks = document.querySelectorAll('[id^="__tk_task_"]');
        tasks.forEach((task, index) => {
            if (index == 0) {
                task.style.bottom = 50 * scale + 'px';
            }
            else {
                const prevTop = tasks[index - 1].getBoundingClientRect().top;
                // Position current element 10px above the previous element's top
                task.style.bottom = (window.innerHeight - prevTop + 8) * scale + 'px';
            }
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
        const currentZoom = document.body.style.zoom;
        if (currentZoom && currentZoom.endsWith('%')) {
            const percent = parseFloat(currentZoom.slice(0, -1));
            if (!isNaN(percent) && percent > 0) {
                return (percent / 100);
            }
        }
        return 1; // Default scale if no zoom is applied
    } catch (e) {
        return 1;
    }
}

function getUserID() {
    const url = window.location.href;
    const match = url.match(/[?&]azon=([^&%]+)/); // regex matches 'azon' parameter until a % character, expecting azon=A111-B222%2F...
    if (match && match[1]) {
        return hashSHA256(decodeURIComponent(match[1]));
    }
    return "unknown";
}

function isMultiChoiceAnswerSelected(MultiChoiceDiv) {
    if (MultiChoiceDiv.classList.contains('selected') || //for selectText
        MultiChoiceDiv.querySelector('div.selected') ||  //for categorySelect
        MultiChoiceDiv.querySelector('div.kep-valasz-check-selected') //for selectImage
    ) {
        return true;
    }
    return false;
}

function dropdownAnswerSelected(dropdownDiv) {
    let dropdownText = dropdownDiv.firstChild.textContent; // .firstChild because of the stupid 'x' at the end sometimes
    if (dropdownText == "") {
        return false;
    }
    dropdownText = dropdownText.trim();
    // some tasks have placeholder text
    if (dropdownDiv.querySelector('div.ng-placeholder')) {
        const placeholder = dropdownDiv.querySelector('div.ng-placeholder').textContent.trim();
        if (dropdownText == placeholder) {
            return false;
        }
        else {
            dropdownText = dropdownText.replace(placeholder, '').trim();
        }
    }
    return dropdownText;
}

function CustomNumberAnswerSelected(customNumberDiv) {
    if (customNumberDiv.value != "") {
        return customNumberDiv.value;
    }
    return false;
}

//select option with specific textContent from a dropdown
function selectDropdownOption(div, option) {

    //deselecting is useless, nothing selected is never correct
    if (option == false) {
        return;
    }

    //open the dropdown
    div.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    
    const options = document.querySelectorAll('div.ng-option');
    for (let i = 0; i < options.length; i++) {
        if (options[i].textContent.trim() == option) {
            options[i].click();
            return;
        }
    }
    console.log(`didnt find option: '${option}'`);
    new taskStatus(`didnt find dropdown option: '${option}'`, 'error');
}

async function selectDragDropAnswer(dragDiv, dropDiv) {
    const dragRect = dragDiv.getBoundingClientRect();
    const dropRect = dropDiv.getBoundingClientRect();

    const startX = dragRect.left + dragRect.width / 2;
    const startY = dragRect.top + dragRect.height / 2;
    
    const endX = dropRect.left + dropRect.width / 2;
    const endY = dropRect.top + dropRect.height / 2;
        
    dragDiv.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        clientX: startX,
        clientY: startY
    }));
    // needed to initiate dragging motion
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
    dropDiv.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        clientX: endX,
        clientY: endY
    }));
}   

async function updateSelectedAnswers(task) {
    let fields = task.answerFields;
    for (let field of fields) {
        switch (field.type) {
        case 'select':
            field.value = isMultiChoiceAnswerSelected(field.element);
            break;
        case 'dropdown':
            field.value = dropdownAnswerSelected(field.element);
            break;
        case 'customNumber':
            field.value = CustomNumberAnswerSelected(field.element);
            break;
        case 'dragDrop':
            let draggedElement = field.element.querySelector('div.cdk-drag');
            if (draggedElement) {
                field.value = await getTaskDDfieldID(draggedElement, 'drag');
            } else {
                field.value = false;
            }
            break;
        default:
            console.log('unknown taskType in updateSelectedAnswers: ', field.type);
        }
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

function zoomOut(zoomPercent = 25) {
    let oldZoom = document.body.style.zoom;
    document.body.style.zoom = `${zoomPercent}%`;
    let tkelo = document.querySelector("tk-elonezet");
    if (tkelo) tkelo.style.height = "3000px"; // for some reason the page doesnt extend automatically, so this is a workaround
    // scale status indicator to compensate for page zoom so it stays readable
    try {
        scaleTaskStatuses(1 / (zoomPercent / 100));
    } catch (e) {
        console.log(`error zooming out to ${zoomPercent}%`, e);
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

async function waitForLoadingScreen() {
    while (document.querySelector(taskFieldSelectors.loadingLogo)) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
}

function selectMultiChoiceAnswer(multiChoiceDiv) {
    multiChoiceDiv.click();
    return;
}

function selectCustomNumberAnswer(customNumberDiv, answer) {
    customNumberDiv.value = answer;
    customNumberDiv.dispatchEvent(new Event('input', { bubbles: true }));
}

async function findDragDivFromID(dragID) {
    const dragDivs = document.querySelectorAll(taskFieldSelectors.dragDrop.drag);
    for (let i = 0; i < dragDivs.length; i++) {
        if (await getTaskDDfieldID(dragDivs[i], 'drag') === dragID) {
            return dragDivs[i];
        }
    }
    return null;
}

async function waitForDropAnimation(dropDiv) {
    while (
        dropDiv.classList.contains('cdk-drop-list-receiving') ||
        dropDiv.classList.contains('cdk-drop-list-dragging') ||
        dropDiv.classList.contains('cdk-drag-animating')
    ) {
        await new Promise(resolve => setTimeout(resolve, 50)); // wait for the drag and drop animation to complete
    }
    await new Promise(resolve => setTimeout(resolve, 100)); // extra buffer wait
}

async function checkDragSuccess(dropDiv) {
    if (
        dropDiv.querySelector('div.cdk-drag.cella-dd') ||
        dropDiv.querySelector('div.cdk-drag.szoveg-dd-tartalom')) {
        return true;
    }
    return false;
}

/** Automatically writes answers to all input fields
 * @param {Array<answerField>} answerFields - The answer fields to write to
 * @param {Array<string>} answersToWrite - The answers to write to the fields
 * 
*/
async function writeAnswers(task, answerFields, answersToWrite) {
    
    //cant click anything while loading screen is up
    await waitForLoadingScreen();

    let oldZoom = -1;
    for (let i=0;i<answerFields.length;i++)
    {
        let currentInput = answerFields[i];
        let currentToWrite = answersToWrite[i];

        //no need to write if we have same answer or the toWrite is empty
        if (!currentToWrite || currentInput.value === currentToWrite) continue;
        
        let taskType = currentInput.type;
        switch (taskType) {
        case 'select':
            selectMultiChoiceAnswer(currentInput.element);
            break;
        case 'dropdown':
            selectDropdownOption(currentInput.element, currentToWrite);
            break;
        case 'customNumber':
            selectCustomNumberAnswer(currentInput.element, currentToWrite);
            break;
        case 'dragDrop':
            blockUserInteraction();
            let fails = 0;
            let succeeded = false;
            //retry up to 5 times, as this one often fails
            while(!succeeded && fails < 5) {
                let dragDiv = await findDragDivFromID(currentToWrite);
                if (dragDiv === null) {
                    console.log('Drag element not found with this ID:', currentToWrite);
                    break;
                }
                // because scrolling to elements messes up coords for some reason
                if (oldZoom === -1) oldZoom = zoomOut(); //only zoom out once, not separately for each answer
                
                let dropDiv = currentInput.element;
                unblockUserInteraction(); // so the auto inputs go through
                await selectDragDropAnswer(dragDiv, dropDiv);
                blockUserInteraction(); // because the user could still fuck up the animation with a click

                await waitForDropAnimation(dropDiv);
                
                await checkDragSuccess(dropDiv) ? succeeded = true : fails++;
            }
            break;
        default:
            console.log('unknown taskType in writeAnswers: ', taskType);
            new taskStatus('unknown taskType in writeAnswers: ' + taskType, 'error');
            break;
    }
    }
    if (oldZoom !== -1) {
        zoomIn(oldZoom); // zoom back in if we zoomed out for dragDrop
    }

    await updateSelectedAnswers(task);

    unblockUserInteraction();
}

function dedupeByKey(items, key) {
    const seen = new Set();
    return items.filter(item => {
        const value = item[key];
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
    });
}

async function getTask() {
    let uniqueID = await getTaskUniqueID();
    let answers = [];
    answers.push(
        ...await getAnswerFields(taskFieldSelectors.selectText.answers, 'select'),
        ...await getAnswerFields(taskFieldSelectors.selectImage.answers, 'select'),
        ...await getAnswerFields(taskFieldSelectors.categorySelect.answers, 'select'),
        ...await getAnswerFields(taskFieldSelectors.dropdown.answers, 'dropdown'),
        ...await getAnswerFields(taskFieldSelectors.customNumber.answers, 'customNumber'),
        ...await getAnswerFields(taskFieldSelectors.dragDrop.drop, 'dragDrop', async (div) => await getTaskDDfieldID(div, 'drop'))
    );

    answers = dedupeByKey(answers, 'element'); // de-dupe fields to avoid double entries of text and image selects

    let t = new task(uniqueID,answers);
    updateSelectedAnswers(t); //initial update of selected answers
    console.log('Detected task:', t);
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

function hasAnswers(answerFields) {
    for (let i=0;i<answerFields.length;i++) {
        if(answerFields[i].value) return true;
    }
    return false;
}
async function fetchTaskSolution(task) {
    let taskData = {
        ID: task.uniqueID,
    };
    let user = {
        name: settings.name,
        azonosito: getUserID()
    };
    
    try {
        //console.log('Fetching solution for task:', task, 'and user:', user);
        const reply = await sendRequestToBackground({
            type: 'getSolution',
            task: taskData,
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

async function sendTaskSolution(task) {
    const taskData = {
        ID: task.uniqueID,
        solution: task.answerFields.map(field => field.value)
    };
    const user = {
        name: settings.name,
        azonosito: getUserID()
    };
    try {
        const reply = await sendRequestToBackground({
            type: 'postSolution',
            task: taskData,
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

async function syncTaskWithDB(task) {
    if(!hasAnswers(task.answerFields)) {
        await fetchTaskSolution(task);
    }
    else {
        await sendTaskSolution(task);
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
            url: 'https://tekaku.hu/',
            autoComplete: true
        }, function(items) {
            settings.name = items.name;
            settings.minvotes = items.minvotes;
            settings.votepercentage = items.votepercentage * 100.0;
            settings.isContributor = items.contributer;
            settings.url = items.url;
            if (settings.url.includes("strong-finals.gl.at.ply.gg:36859")) { // update old playit URL
                console.warn('old playit URL detected');
                let oldUrlIndicator = new taskStatus('Régi URL van beállítva, ha ez nem direkt van, frissítsd "https://tekaku.hu/"-ra a beállítások -> advanced menüben', 'error');
            }
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

var settings = {};

async function initialize() {
    //load stored settings on startup
    let settings_task = new taskStatus('beállítások betöltése');
    try {
        await loadSettings();
        settings_task.succeed();
    } catch (error) {
        settings_task.error({"text": "hiba a beállítások betöltésekor: " + error});
    }

    // Connect to background and retry on failure with increasing timeouts
    let retryTimeout = 500; // ms
    const maxRetryTimeout = 8000; // ms
    let retryCnt = 0;
    const maxRetryCnt = 5;
    let connectStatus = new taskStatus('kapcsolódás a szerverhez...', 'processing');
    while (true) {
        try {
            await connectToBackground();
            connectStatus.succeed();
            break; // connected
        } catch (err) {
            console.log('connectToBackground failed:', err);
            retryCnt++;
            if (retryCnt >= maxRetryCnt) {
                connectStatus.error({"text": 'Max újrakapcsolódási kísérlet elérve, frissítse az oldalt az újrapróbálkozáshoz'});
                console.log('Max retries reached, giving up.');
                return 504;
            }
            connectStatus.set_text('kapcsolódás a szerverhez... (újrapróbálkozás ' + retryCnt + '/' + maxRetryCnt + ')');
            await new Promise(resolve => setTimeout(resolve, retryTimeout));
            retryTimeout = Math.min(maxRetryTimeout, Math.floor(retryTimeout * 1.8));
            
        }
    }


    //fetchAnnouncements();
}

async function detectUrlChange() {
    url = window.location.href;
    while (url === window.location.href) {
        await new Promise(resolve => setTimeout(resolve, 250));
    }
}

async function waitForTask() {
    while (!isThereTask() || await getTaskUniqueID() === null) {
        await new Promise(resolve => setTimeout(resolve, 250));
    }
}

async function goToNextTask() {
    const buttons = document.querySelectorAll('button.btn.btn-secondary.d-block');
    if (buttons.length == 2) { // a prev. and next button should show up
        buttons[buttons.length - 1].click();
        window.scrollTo(0, document.body.scrollHeight); // ???
        await new Promise(resolve => setTimeout(resolve, 50));
        console.log('went to next task');
    }
}

async function tryAutoFillTask(task, taskFillStatus, autoNext) {
    taskFillStatus.set_text('válasz kérése szervertől...');
    const queryResult = await fetchTaskSolution(task);
    if (queryResult) {
        console.log('Query result:', queryResult);
        await loadSettings();
        if (queryResult.totalVotes >= settings.minvotes && 100*queryResult.votes / queryResult.totalVotes >= settings.votepercentage) {
            console.log('Enough votes and enough percentage of votes.');
            taskFillStatus.set_text('válasz beírása...');
            await writeAnswers(task, task.answerFields, JSON.parse(queryResult.answer));
            //await new Promise(resolve => setTimeout(resolve, 300));
            taskFillStatus.succeed({"text": "válasz beírása kész"});
            //scroll to bottom of the page
            
            if (autoNext) {
                await goToNextTask();
            }
        }
        else {
            taskFillStatus.fail({text: `nem elég a leadott válasz (${queryResult.votes}/${queryResult.totalVotes} ugyanolyan : ${100*queryResult.votes / queryResult.totalVotes}%), 
                kéne: ${settings.minvotes} össz válasz és ${settings.votepercentage}%`, status: 'skipped'});
            console.log('Not enough votes or not enough percentage of votes.');
            console.log('Total votes:', queryResult.totalVotes, "required votes:", settings.minvotes);
            console.log('Vote%:', 100*queryResult.votes / queryResult.totalVotes , "required vote%:", settings.votepercentage);
        }
    }
    else {
        taskFillStatus.fail({text: 'nincs még erre a feladatra leadott válasz',status: 'skipped'});
        console.log('No solution found in the database.');
    }
}

async function main_loop() {
    
    await initialize();
    
    let last_url = '';
    let url = '';
    let currentTask = null;
    /**
     * Stores the answers filled in the current task when task is first loaded to detect changes
     * @type {Array<answerField>}
     */
    let taskFilledAnswers = [];
    let selectedAnswers = [];

    let autoNext = false;

    document.addEventListener('click', async function(event) {
        if (document.getElementById('__input-blocker') || currentTask === null) return;
        try {
            updateSelectedAnswers(currentTask, event);
            // a 'lezárás' gomb ilyen, ekkor elküldjük az utolsó feladatot, mivel nem lesz következő amit érzékelünk
            if (event.target.classList.contains('btn-danger')) { 
                if (settings.isContributor && currentTask != null && hasAnswers(currentTask.answerFields) && taskFilledAnswers !== currentTask.answerFields) {
                    console.log('lezárás clicked, syncing last task');
                    let syncPromise = syncTaskWithDB(currentTask);
                    let finalSyncStatus = new taskStatus('utolsó feladat küldése...', 'processing');
                    console.log('Sync promise:', syncPromise);
                    syncPromise.then(() => {
                        finalSyncStatus.succeed({"text": "utolsó feladat küldése kész"});
                    }).catch((error) => {
                        finalSyncStatus.error({"text": "hiba az utolsó feladat küldése során: " + error});
                    });
                    sendResults = false;
            }
        }
        }
        catch (error) {
            console.error({'text': 'Error updating user answers:', error});
        }
    })

    // Listen for key presses, just used for debug
    document.addEventListener('keydown', async function(event) {
        if (event.key.toLowerCase() === 'i') {
            if (currentTask != null) {
                console.log('URL:', url);
                console.log('Current task:', currentTask);
            }
        }
        else if (event.key.toLowerCase() === 's') {
            if (currentTask != null) {
                console.log('Syncing task with DB (keybind clicked)... , ', hasAnswers(currentTask.answerFields) ? 'has answers' : 'no answers');
                syncTaskWithDB(currentTask);
            }
        }
        else if(event.key.toLowerCase() === 'u') {
            if (currentTask != null) {
                console.log('user ID:', getUserID());
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
        else if (event.key.toLowerCase() === 'h') {
            console.log('current task ID: ', await getTaskUniqueID());
        }
    });
    while (true) {
        if (currentTask) await detectUrlChange(); //if no task yet, we should immediately see if there is one
        
        console.log('New URL, waiting for task...');
        let getTaskStatus = new taskStatus('feladatra várakozás...', 'processing');
        await waitForTask();
        console.log('task seen');
        getTaskStatus.set_text("feladat észlelve");

        if (settings.isContributor && currentTask != null && hasAnswers(currentTask.answerFields) && taskFilledAnswers.toString() !== currentTask.answerFields.map(input => input.value).toString()) {
            console.log('New task found, syncing old one with DB...');
            let syncstatus = new taskStatus('előző feladat szinkronizálása...', 'processing');
            syncTaskWithDB(currentTask).then(() => {
                syncstatus.succeed({"text": "előző feladat szinkronizálása kész"});
            }).catch((error) => {
                syncstatus.error({"text": "hiba az előző feladat szinkronizálása során: " + error});
            });
        }
        else {
            console.log('not syncing prev. task because: ',)
            !settings.isContributor ? console.log('user not a contributor') : 
            currentTask == null ? console.log('no current task') : 
            !hasAnswers(currentTask ? currentTask.answerFields : []) ? console.log('no answers') : 
            taskFilledAnswers.toString() === currentTask.answerFields.map(input => input.value).toString() ? console.log('no changes from prev. filled answers') : console.log('WTF?');

        }

        currentTask = await getTask();

        getTaskStatus.succeed({"text": "feladat feldolgozva"});
        url = window.location.href;
        last_url = url;

        let taskFillStatus = new taskStatus('feladat kitöltése...', 'processing');

        if (hasAnswers(currentTask.answerFields)) {
            console.log('Already has answers, skipping autofill...');
            taskFillStatus.fail({text: "már van valami beírva; kihagyva", color:'rgba(156, 39, 176, 0.85)'});
        }
        else if (settings.autoComplete) {
            try {
                await tryAutoFillTask(currentTask, taskFillStatus, autoNext);
            }
            catch (error) {
                taskFillStatus.error({"text": "hiba a feladat lekérése során: " + error});
                console.log('Error fetching task from DB:', error);
            }
        }
        await updateSelectedAnswers(currentTask);
        taskFilledAnswers = JSON.parse(JSON.stringify(currentTask.answerFields.map(input => input.value))); //the answers that were there when task loaded, or after autocomplete
    }
}

async function main_loop_wrapper() {
    maxGlobalRetryCnt = 5;
    mainError = false;
    for (let i = 0; i < maxGlobalRetryCnt; i++) {
        try {
            let returncode = await main_loop();
            if (returncode === 504) {
                console.log('timeout while connecting to server');
                break;
            }
        } catch (error) {
            let mainErrorTask = new taskStatus('hiba: ' + error, '\nújraindítás...');
            mainErrorTask.error({ stayTime: -1 });
            console.error('Error in main loop:', error);
            mainError = error;
        }
    }
    if (mainError) {
        let finalErrorTask = new taskStatus('hiba: ' + mainError, '\nvége. maximum újraindítási kísérletek elérve');
        finalErrorTask.error({ stayTime: -1 });
        console.error('Error in main loop:', mainError);
    }
}
main_loop_wrapper();