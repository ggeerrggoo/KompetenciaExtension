console.log('Auto answer script loaded.');
//name: h3 element, question: div element, type: div element    
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

function getTaskQuestion() {
    const q1 = document.querySelectorAll('p#kerdes');
    const q2 = document.querySelectorAll('tk-kerdes-elem');
    let qs = [];
    if (q1.length > 0) {
        qs = q1;
    }
    else if (q2.length > 0) {
        qs = q2;
    }

    if(qs.length > 0) {
        q = qs[0];
        let i = 0;
        //go to parent element until it has at least 50 characters or we do it too many times
        while(q.textContent.length < 50 && i < 5) {
            i++;
            q = q.parentElement;
        }
        return q.textContent.replace(/[^a-zA-Z0-9.,!?]/g, '');
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
function getTaskAnswerFields() {
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

    if (dragordrop === 'drag') {
        const img = div.querySelector('img');

        if (img) {
            // Wait until image is loaded
            await waitForImageLoad(img);

            if (img.naturalWidth && img.naturalHeight) {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

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

//[0]:drag fields, [1]: drop fields, [2]: drag field IDs (textcontent or image src), [3]: drop field IDs (.id attribute)
async function getTaskDragDropFields() {
    const dragfields = document.querySelectorAll('div.cdk-drag.cella-dd.ng-star-inserted');
    let dragIDs = [];
    for (let i = 0; i < dragfields.length; i++) {
        dragIDs.push(await getTaskDDfieldID(dragfields[i], 'drag'));
    }

    const dropfields = document.querySelectorAll('div.dd-nyelo-can-recieve');
    let dropIDs = [];

    for (let i = 0; i < dropfields.length; i++) {
        dropIDs.push(await getTaskDDfieldID(dropfields[i], 'drop'));
    }
    return [dragfields, dropfields, dragIDs, dropIDs];
}

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
    //console.log('Options:', options);
    for (let i = 0; i < options.length; i++) {
        if (options[i].textContent == option) {
            clickdiv(options[i]);
            return;
        }
    }
    console.log("didnt find option:", option);
}

function selectDragDropAnswer(toDrag, toDrop)
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
        for(let i=0; i<answerInputs[1].length; i++) {
            if(answerInputs[1][i].querySelector('div')) {
                selected.push(await getTaskDDfieldID(answerInputs[1][i].firstChild, 'drag'))
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

    const blocker = document.createElement('div');
    blocker.id = '__input-blocker';
    Object.assign(blocker.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '2147483647',  // Maximum z-index value
        backgroundColor: 'rgba(0, 0, 0, 0.3)',  // semi-transparent dark
        cursor: 'wait',
        pointerEvents: 'all',
    });
    
    // Prevent all common interaction events
    blocker.addEventListener('click', (e) => e.preventDefault());
    blocker.addEventListener('mousedown', (e) => e.preventDefault());
    blocker.addEventListener('keydown', (e) => e.preventDefault());
    blocker.addEventListener('keyup', (e) => e.preventDefault());
    blocker.addEventListener('touchstart', (e) => e.preventDefault());
    blocker.addEventListener('touchend', (e) => e.preventDefault());
    
    document.body.appendChild(blocker);
}

function unblockUserInteraction() {
    const blocker = document.getElementById('__input-blocker');
    if (blocker) blocker.remove();
}


async function writeAnswers(taskType, answers, divs) {
    await clearSelectedAnswers(taskType, divs);
    
    //wait while the loading logo is visible
    while (document.querySelector('svg.ng-tns-c107-0') != null) {
        await new Promise(resolve => setTimeout(resolve, 100));
        //console.log('logo detected, waiting...');
    }
    
    blockUserInteraction();
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
            for (let i = 0; i < divs[1].length; i++) {
                if (answers[i] != false) {
                    // Find the index of answers[i] in divs[2] (drag IDs)
                    let dragDiv = divs[0][divs[2].indexOf(answers[i])];
                    let dropDiv = divs[1][i];
                    unblockUserInteraction();
                    selectDragDropAnswer(dragDiv, dropDiv);
                    blockUserInteraction();
                    while(dropDiv.classList.contains('cdk-drop-list-receiving') || dropDiv.classList.contains('cdk-drop-list-dragging') || dropDiv.classList.contains('cdk-drag-animating')) {
                        await new Promise(resolve => setTimeout(resolve, 50)); // wait for the drag and drop animation to complete
                    }
                    await new Promise(resolve => setTimeout(resolve, 100)); // extra buffer wait
                }
            }
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
    let question = getTaskQuestion();
    let description = getTaskDescription();
    let answers = null;
    if (type == 'select_text' || type == 'select_image') {
        answers = getTaskAnswerFields();
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

function connectToBackground() {
    wsOnMessage = (response) => {
        console.log('Response from background:', response);
    }
    port = chrome.runtime.connect();

    port.onMessage.addListener(response => {
        if(!response || response.id === undefined) {
            if(response.type === 'wsConnected') {
                console.log('WebSocket connected to background script.');
                return;
            }
            if (response.type === 'wsError' || response.type === 'wsClosed') {
                console.log('WebSocket error/closed:', response.error || response.type);
                return;
            }
            console.log('Invalid response received:', response, response.id);
            return;
        }
        if (typeof reqList.get(response.id) !== 'function') {
            console.log('No request function found for response ID:', response.id);
            return;
        }
        reqList.get(response.id)(response);
        reqList.delete(response.id);
    });

    port.onDisconnect.addListener(() => {
        console.log('Port disconnected, reconnecting...');
        port = null;
        connectToBackground();
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
        if (event.target.classList.contains('btn-danger')) { // lezárás gomb elv. ilyen
                if (sendResults && current_task != null && hasAnswers(current_task)) {
                    console.log('lezárás clicked, syncing last task');
                    let asdf = syncTaskWithDB(JSON.parse(JSON.stringify(current_task)));
                    console.log('Sync promise:', asdf);
                    sendResults = false;
            }
        }
    }
}

var settings = {};
async function main_loop() {
    loadSettings();
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for settings to load
    
    connectToBackground();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for bg connection
    //fetchAnnouncements();

    let last_url = '';
    let url = '';
    let current_task = null;
    let selectedAnswers = [];
    let sendResults = true;

    document.addEventListener('click', async function(event) {
        if (document.getElementById('__input-blocker')) return;
        try {
            updateUserAnswers(current_task, event);
        }
        catch (error) {
            console.error('Error updating user answers:', error);
        }
    })

    // Listen for key press, just used for debug
    document.addEventListener('keydown', async function(event) {
        if (event.key === 'i' || event.key === 'I') {
            if (current_task != null) {
                console.log('URL:', url);
                console.log('Current task:', current_task);
            }
        }
        else if (event.key === 's' || event.key === 'S') {
            if (current_task != null) {
                console.log('Syncing task with DB (keybind clicked)...');
                syncTaskWithDB(current_task);
            }
        }
        else if(event.key === 't' || event.key === 'T') {
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
        while (getTaskType() == 'unknown') {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.log('task got');
        
        last_url = url;

        if (sendResults && current_task != null && hasAnswers(current_task)) {
                console.log('New task found, syncing old one with DB...');
                syncTaskWithDB(JSON.parse(JSON.stringify(current_task)));
        }
        sendResults = true;
        current_task = await getTask();

        if (hasAnswers(current_task)) {
            console.log('Already has answers, skipping autofill...');
            sendResults = false;
        }
        else if (current_task.type !== 'unknown') {
            try {
                let queryResult = await syncTaskWithDB(current_task);
                if (queryResult != null) {
                    console.log('Query result:', queryResult);
                    loadSettings();
                    if (queryResult.totalVotes >= settings.minvotes && 100*queryResult.votes / queryResult.totalVotes >= settings.votepercentage) {
                        sendResults = false;
                        console.log('Enough votes and enough percentage of votes.');
                        await writeAnswers(current_task.type, JSON.parse(queryResult.answer), current_task.answerInputs);
                    }
                    else {
                        console.log('Not enough votes or not enough percentage of votes.');
                        console.log('Total votes:', queryResult.totalVotes, "required votes:", settings.minvotes);
                        console.log('Vote%:', 100*queryResult.votes / queryResult.totalVotes , "required vote%:", settings.votepercentage);
                    }
                }
                else {
                    console.log('No solution found in the database.');
                }
            }
            catch (error) {
                console.log('Error fetching task from DB:', error);
            }
        }
    }
}



main_loop();