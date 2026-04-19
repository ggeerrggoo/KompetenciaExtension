/* global chrome */
import { taskStatus } from './task_statuses.js';
import { getUserID, hasAnswers, isThereTask, getTaskUniqueID, updateSelectedAnswers, getTask } from '../task_logic/read_from_task.js';
import { writeAnswers} from '../task_logic/write_to_task.js';
import { autoNext, _DEBUG } from './constants.js';
import { blockUserInteraction, unblockUserInteraction, debugLog, fetchMinSettings, toggleTaskStatusesVisibility, isUIHidden, getInstallationKey} from './utils.js';
import { defaultOptions } from './constants.js';

function fetchTask(url, options) {
    return fetch(url, options).catch(error => {
        return {
            ok: false,
            status: 0,
            statusText: error.toString(),
            json: async () => null,
            text: async () => null
        };
    });
}

async function fetchTaskSolution(task) {
    let taskData = {
        ID: task.uniqueID,
        fieldCount: task.answerFields.length
    };
    
    // Get the unique installation key instead of URL parameter
    const installationKey = await getInstallationKey();
    
    let user = {
        name: settings.name,
        azonosito: installationKey
    };
    
    try {
        //debugLog('Fetching solution for task:', task, 'and user:', user);
        const reply = await sendRequestToWebSocket({
            type: 'getSolution',
            task: taskData,
            user: user
        });
        if(reply.status != "ok"){
            debugLog('Error getting solution:', reply);
            debugLog('task sent:', reply);
            return;
        }
        //debugLog('Solution fetched successfully', reply);
        return reply.solution;
    }
    catch (error) {
        debugLog('Error fetching task from DB:', error);
        return;
    }
}

async function sendTaskSolution(task) {
    const taskData = {
        ID: task.uniqueID,
        solution: task.answerFields.map(field => field.value)
    };
    
    // Get the unique installation key instead of URL parameter
    const installationKey = await getInstallationKey();
    
    const user = {
        name: settings.name,
        azonosito: installationKey,
    };
    try {
        const reply = await sendRequestToWebSocket({
            type: 'postSolution',
            task: taskData,
            user: user
        });
        //debugLog('Posting solution to DB:', task, 'for user:', user);
        if (reply && reply.status === "ok") {
            debugLog('Solution posted successfully', reply);
            return reply;
        } else {
            debugLog('Error posting solution:', reply);
            return;
        }
    }
    catch (error) {
        debugLog('Error posting solution:', error);
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

let settings = {};
function loadSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(defaultOptions, function(items) {
            settings.name = items.name;
            settings.minvotes = items.minvotes;
            settings.votepercentage = items.votepercentage * 100.0;
            settings.isContributor = items.contributer;
            settings.url = items.url;
            settings.isSetupComplete = items.isSetupComplete;
            settings.apiMinvotes = items.apiMinvotes || 0;
            settings.apiVotepercentage = items.apiVotepercentage || 0.0;
            settings.autoComplete = items.autoComplete;
            resolve(items);
        });
    });
}

/**
 * Check if API minimum values have changed and update settings if needed
 * Warns user if current settings conflict with new API minimums
 */
async function checkAndUpdateApiMinimums() {
    const apiMinValues = await fetchMinSettings(settings.url);
    
    if (!apiMinValues) {
        debugLog('Could not fetch API minimum values');
        return;
    }
    
    debugLog('API min values:', apiMinValues);
    debugLog('Stored min values - minvotes:', settings.apiMinvotes, 'votepercentage:', settings.apiVotepercentage);
    
    // Check if API values have changed
    const minvotesChanged = apiMinValues.minvotes !== settings.apiMinvotes;
    const votepercentageChanged = apiMinValues.votepercentage !== settings.apiVotepercentage;
    
    if (minvotesChanged || votepercentageChanged) {
        debugLog('API minimum values changed!');
        
        let updatedSettings = {
            apiMinvotes: apiMinValues.minvotes,
            apiVotepercentage: apiMinValues.votepercentage
        };
        
        let warningMessage = '';
        let hasConflict = false;
        
        // Check for conflicts with current minvotes setting
        if (minvotesChanged && apiMinValues.minvotes > settings.minvotes) {
            debugLog('minvotes conflict detected');
            updatedSettings.minvotes = apiMinValues.minvotes;
            warningMessage += `Minimum leadott válaszok száma frissítve: ${apiMinValues.minvotes}. `;
            hasConflict = true;
        }
        
        // Check for conflicts with current votepercentage setting
        if (votepercentageChanged && apiMinValues.votepercentage > (settings.votepercentage / 100.0)) {
            debugLog('votepercentage conflict detected');
            updatedSettings.votepercentage = apiMinValues.votepercentage;
            warningMessage += `Azonos válasz aránya frissítve: ${(apiMinValues.votepercentage * 100).toFixed(1)}%. `;
            hasConflict = true;
        }
        
        // Save updated settings if there were changes
        if (Object.keys(updatedSettings).length > 0) {
            chrome.storage.sync.set(updatedSettings, function() {
                debugLog('Updated settings saved:', updatedSettings);
            });
            
            // Reload the settings in memory
            settings.apiMinvotes = apiMinValues.minvotes;
            settings.apiVotepercentage = apiMinValues.votepercentage;
            if (updatedSettings.minvotes) {
                settings.minvotes = updatedSettings.minvotes;
            }
            if (updatedSettings.votepercentage) {
                settings.votepercentage = updatedSettings.votepercentage * 100.0;
            }
        }
        
        // Show warning to user if there was a conflict
        if (hasConflict) {
            warningMessage += 'A beállítások az API minimumok szerint frissültek.';
            debugLog('Showing warning:', warningMessage);
            let settingUpdateWarning = new taskStatus(warningMessage);
            settingUpdateWarning.fail({stayTime: 6000, color: 'rgba(170, 0, 255, 0.9)'});
        }
    }
}

async function fetchAnnouncements() {
    chrome.storage.sync.get({lastAnnouncement: "2025-05-25T04:26:14.000Z"},async (items) => {
        const announcementUrl = settings.url+'announcements/';
        
        const response = await fetchTask(announcementUrl+items.lastAnnouncement, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            const announcements = await response.json();
            debugLog('Announcements fetched:', announcements);
            if (announcements === null) {
                debugLog('No new announcements found.');
                return false; // Return false if no new announcements
            }
            const huDateTimeFormatter = new Intl.DateTimeFormat('hu-HU', {
                dateStyle: 'long',
                timeStyle: 'short'
            });
            for (let i = 0; i < announcements.length; i++) {
                const announcement = announcements[i];
                items.lastAnnouncement = announcement.created_at;
                const createdAtDate = new Date(announcement.created_at.replace(' ', 'T'));
                const formattedCreatedAt = Number.isNaN(createdAtDate.getTime())
                    ? announcement.created_at
                    : huDateTimeFormatter.format(createdAtDate);
                debugLog('New announcement:', announcement);
                alert(`Új közlemény:\n${announcement.title}\n\n${announcement.content}\n\n${formattedCreatedAt}`);
            }
            if (items.lastAnnouncement) {
                const lastDate = new Date(items.lastAnnouncement.replace(' ', 'T'));
                lastDate.setSeconds(lastDate.getSeconds() + 1);
                items.lastAnnouncement = lastDate.toISOString();
            }
            chrome.storage.sync.set({lastAnnouncement: items.lastAnnouncement});
            return true; // Return true if an announcement was found
        } else {
            console.error('Failed to fetch announcement:', response.status, response.error);
            //throw new Error('Failed to fetch announcement:', response.error);
        }
        
    });
}

let wsGlobal = null;
let reqList = new Map();
let reqListIndex = 1;

function getWebSocketUrl() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get({url: "https://tekaku.hu/"}, function(items) {
            let url = items.url.replace(/^http/, 'ws');
            if (!url.endsWith('/')) {
                url += '/';
            }
            resolve(url);
        });
    });
}
let connectionPending = false;
function connectWebSocket() {
    // If a connection is already pending, wait for it to complete
    if (connectionPending) {
        return new Promise((resolve, reject) => {
            const checkConnection = setInterval(() => {
                if (wsGlobal && wsGlobal.readyState === WebSocket.OPEN) {
                    clearInterval(checkConnection);
                    resolve();
                }
            }, 150);
            // Timeout after 30 seconds
            setTimeout(() => {
                clearInterval(checkConnection);
                reject(new Error('WebSocket connection pending timeout'));
            }, 30000);
        });
    }

    connectionPending = true;
    return new Promise((resolve, reject) => {
        if (wsGlobal && wsGlobal.readyState === WebSocket.OPEN) {
            resolve();
            return;
        }
        
        getWebSocketUrl().then(url => {
            wsGlobal = new WebSocket(url);
            
            wsGlobal.onopen = () => {
                debugLog('WebSocket connection established');
                setTimeout(() => resolve(), 100);
            };
            
            wsGlobal.onerror = error => {
                console.error('WebSocket error:', error);
                reject(error);
            }
            
            wsGlobal.onmessage = event => {
                //console.log('WebSocket message received:', event.data);
                try {
                    const response = JSON.parse(event.data);
                     if (response.id && reqList.has(response.id)) {
                        reqList.get(response.id)(response);
                        reqList.delete(response.id);
                    } else {
                         debugLog('Received message without ID or handler:', response);
                    }
                } catch(e) {
                    console.error('Error parsing WS message', e);
                }
            };
            
            wsGlobal.onclose = () => {
                debugLog('WebSocket connection closed');
                new taskStatus('WebSocket kapcsolat bontva (inaktivitás)').fail({stayTime: 2000, color: 'rgba(128, 128, 128, 0.85)'});
                wsGlobal = null;
            };
        });
    }).finally(() => {
        connectionPending = false;
    });
}

async function sendRequestToWebSocket(request) {
    if (!wsGlobal || wsGlobal.readyState !== WebSocket.OPEN) {
        debugLog('WebSocket not connected, connecting...');
        await connectWebSocket();
    }
    
    return new Promise((resolve, reject) => {
        if (typeof request !== 'object' || !request.type) {
            console.error('Invalid request format:', request);
            reject(new Error('Invalid request format'));
            return;
        }
        request.id = reqListIndex++;
        
        reqList.set(request.id, (response) => {
            resolve(response);
        });
        
        wsGlobal.send(JSON.stringify(request));
    });
}

async function initialize() {
    //load stored settings on startup
    let settings_task = new taskStatus('beállítások betöltése');
    try {
        await loadSettings();
        // Check and update API minimum values
        await checkAndUpdateApiMinimums();
        settings_task.succeed();
    } catch (error) {
        settings_task.error({"text": "hiba a beállítások betöltésekor: " + error});
        throw error;
    }

    if(!settings.isSetupComplete) {
        let setupStatus = new taskStatus('setupTaskStatus');
        setupStatus.error({text: `Kérlek fejezd be a beállításokat a <a href="#" id="open-options-btn" target="_blank">beállítások menüben</a> és utána frissítsd az oldalt!`, stayTime: -1});

        document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'open-options-btn') {
        e.preventDefault();
        chrome.runtime.sendMessage({ action: "open_options_page" });
    }
});
    }

    // Connect to background and retry on failure with increasing timeouts
    let retryTimeout = 500; // ms
    const maxRetryTimeout = 8000; // ms
    let retryCnt = 0;
    const maxRetryCnt = 5;
    let connectStatus = new taskStatus('kapcsolódás a szerverhez...', 'processing');
    while (true) {
        try {
            await connectWebSocket();
            connectStatus.succeed();
            break; // connected
        } catch (err) {
            debugLog('connectWebSocket failed:', err);
            retryCnt++;
            if (retryCnt >= maxRetryCnt) {
                connectStatus.error({"text": 'Max újrakapcsolódási kísérlet elérve, frissítse az oldalt az újrapróbálkozáshoz'});
                debugLog('Max retries reached, giving up.');
                return 504;
            }
            connectStatus.set_text('kapcsolódás a szerverhez... (újrapróbálkozás ' + retryCnt + '/' + maxRetryCnt + ')');
            await new Promise(resolve => setTimeout(resolve, retryTimeout));
            retryTimeout = Math.min(maxRetryTimeout, Math.floor(retryTimeout * 1.8));
            
        }
    }


    fetchAnnouncements();
}

async function detectUrlChange() {
    let url = window.location.href;
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
    let nextBtn = Array.from(document.querySelectorAll('button.btn.btn-secondary.d-block')).find(btn => btn.innerText.toLowerCase().includes('következő'));
    if (nextBtn) {
        nextBtn.click();
    }
}

function aggregateQueryResults(queryResultNew) {
    if (!queryResultNew || !Array.isArray(queryResultNew) || queryResultNew.length === 0) {
        if(_DEBUG && queryResultNew === 0) {
            debugLog('IRNS');
            let irnsTask = new taskStatus('nincs megoldás');
            irnsTask.fail({color: 'rgba(128, 128, 128, 0.85)', stayTime: 2000});
        }
        return null;
    }

    const answers = queryResultNew.map(item => item.answer);
    const totalVotes = Math.max(...queryResultNew.map(item => item.totalVotes));
    const votes = Math.min(...queryResultNew.map(item => item.votes));

    return {
        totalVotes: totalVotes,
        votes: votes,
        answer: JSON.stringify(answers)
    };
}

async function tryAutoFillTask(task, taskFillStatus, autoNext) {
    taskFillStatus.set_text('válasz kérése szervertől...');
    const queryResultNew = await fetchTaskSolution(task); 
    const queryResult = aggregateQueryResults(queryResultNew);

    if (queryResult) {
        debugLog('Query result:', queryResult);
        await loadSettings();
        if (queryResult.totalVotes >= settings.minvotes && 100*queryResult.votes / queryResult.totalVotes >= settings.votepercentage) {
            debugLog('Enough votes and enough percentage of votes.');
            taskFillStatus.set_text('válasz beírása...');
            await writeAnswers(task, task.answerFields, JSON.parse(queryResult.answer));
            taskFillStatus.succeed({"text": "válasz beírása kész"});

            if (settings.isContributor) {
                createCheckedButton();
            }

            if (autoNext) {
                await goToNextTask();
            }
        }
        else {
            taskFillStatus.fail({text: `nincs még erre a feladatra elég leadott válasz, vagy az azonos válaszok aránya nem elég magas`, status: 'skipped'});
            debugLog('Not enough votes or not enough percentage of votes.');
            debugLog('Total votes:', queryResult.totalVotes, "required votes:", settings.minvotes);
            debugLog('Vote%:', 100*queryResult.votes / queryResult.totalVotes , "required vote%:", settings.votepercentage);
        }
    }
    else {
        taskFillStatus.fail({text: 'nincs még erre a feladatra elég leadott válasz, vagy az azonos válaszok aránya nem elég magas',status: 'skipped'});
        debugLog('No solution found in the database.');
    }
}

/**
 * Duplicates a button, gives it new text/action, and places it next to the original.
 * @param {string} selector - CSS selector to find the original button.
 * @param {string} newText - The text for the new button.
 * @param {Function} onClickCallback - The function to run when clicked.
 */
let customBtnId = 0;
function addCustomButton(originalBtn, newText, description, uniqueClass, onClickCallback) {
    
    const existingBtns = originalBtn.parentElement.querySelectorAll('.tekaku-btn');
    for (let btn of existingBtns) {
        if(btn.classList.contains(uniqueClass)) {
            return btn;
        }
    }
    
    const newBtn = originalBtn.cloneNode(true);

    newBtn.innerText = newText;
    newBtn.id = "tekaku-btn-" + customBtnId++;
    newBtn.classList.add('tekaku-btn');
    newBtn.classList.add(uniqueClass);

    if(description) {
        newBtn.title = description;
    }
    
    newBtn.removeAttribute('onclick');

    newBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Stop default form submissions/navigation
        e.stopPropagation(); // Stop page scripts from seeing the click
        onClickCallback(e);
    });

    // Mark this button as a tekaku custom button for reliable selection
    newBtn.setAttribute('data-tekaku-btn', 'true');
    
    originalBtn.insertAdjacentElement('beforebegin', newBtn);
    newBtn.style.marginLeft = "10px"; 
    
    // Apply hidden state if UI is hidden
    if (isUIHidden()) {
        newBtn.style.display = 'none';
    }
    if(newBtn.classList.contains('d-block')) {
        newBtn.classList.remove('d-block');
    }
    return newBtn;
}

async function goToNextTaskWithoutSaving() {
    cancelTaskSync = true;
    await goToNextTask();
}

let cancelTaskSync = false;
function copyNextButton() {
    let nextBtn = Array.from(document.querySelectorAll('button.btn.btn-secondary.d-block')).find(btn => btn.innerText.toLowerCase().includes('következő'));
    if (!nextBtn) return;
    addCustomButton(nextBtn, 'továbblépés válasz küldése nélkül', 'következő feladatra lép, de nem menti a TeKaKu a választ (akkor használd, ha nem vagy magabiztos ebben a feladatban!)', 'tekaku-next-task-no-save-btn',
        goToNextTaskWithoutSaving
    );
}

/** 
 * creates a button theat signals that user has reviewed the auto-filled answer and believes it is correct
 */
let userCheckedAnswer = false;
function createCheckedButton(){
    if (document.querySelector('.tekaku-checked-btn')) {
        toggleCheckedButtonAvailability(true);
        return;
     }
    let nextBtn = Array.from(document.querySelectorAll('button.btn.btn-secondary.d-block')).find(btn => btn.innerText.toLowerCase().includes('következő'));
    if (!nextBtn) return;
    const checkedBtn = addCustomButton(nextBtn, 'ellenőrizve', 'ezt nyomd meg, ha átnézted az automatikusan kitöltött választ és helyesnek találtad', 'tekaku-checked-btn',
        () => {
            userCheckedAnswer = true;
            goToNextTask();
        }
    );
    if (!checkedBtn) {
        debugLog('Failed to create checked button');
        return;
    }
    checkedBtn.style.marginLeft = '10px';
    checkedBtn.style.marginRight = '10px';
    checkedBtn.style.backgroundColor = '#00b140';
    checkedBtn.style.borderColor = '#00b140';
    checkedBtn.style.color = '#ffffff';
}
function deleteCheckedButton() {
    const checkedBtn = document.querySelector('.tekaku-checked-btn');
    if (checkedBtn) {
        checkedBtn.remove();
    }

}

/**
 * toggles the visibility of the "checked" button
 * @param {boolean} visible - whether the button should be visible; if -1 (default), this function will toggle visibility based on current state
 */
function toggleCheckedButtonAvailability(canClick = -1) {
    const checkedBtn = document.querySelector('.tekaku-checked-btn');
    if (isUIHidden()) return; //button should not be shown if UI is hidden
    if (!checkedBtn) {
        return;
    }
    if (canClick === -1) {
        checkedBtn.style.pointerEvents = checkedBtn.style.opacity < 1 ? 'auto' : 'none';
        checkedBtn.style.opacity = checkedBtn.style.opacity < 1 ? 1 : '0.5';
    } else {
        checkedBtn.style.opacity = canClick ? '1' : '0.5';
        checkedBtn.style.pointerEvents = canClick ? 'auto' : 'none';
    }
}

function areAnswersSame(answerFields1, answerFields2) {
    return answerFields1.toString() === answerFields2.map(input => input.value).toString();
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

    const events = [
        'change',
        'click',
        'drop',
        'cdkDropListDropped',
        'dragend',
        'pointerup',
        'mouseup',
        'paste',
        'cut',
    ];
    events.forEach(event => {document.addEventListener(event, async () => {
        try {
            await updateSelectedAnswers(currentTask);
            if(areAnswersSame(taskFilledAnswers, currentTask.answerFields)) {
                toggleCheckedButtonAvailability(true);
            } else {
                toggleCheckedButtonAvailability(false);
            }
        }
        catch (error) {
            console.error({'text': 'Error updating user answers:', error});
        }
    })});
    document.addEventListener('click', async function(event) {
        try {
        if (document.getElementById('__input-blocker') || currentTask === null) return;
        
            // a 'lezárás' gomb ilyen, ekkor elküldjük az utolsó feladatot, mivel nem lesz következő amit érzékelünk
            if (event.target.classList.contains('btn-danger')) { 
                if (settings.isContributor && !cancelTaskSync && currentTask != null && hasAnswers(currentTask.answerFields) && taskFilledAnswers.toString() !== currentTask.answerFields.map(input => input.value).toString()) {

                    debugLog('lezárás clicked, syncing last task');
                    let syncPromise = syncTaskWithDB(currentTask);
                    let finalSyncStatus = new taskStatus('utolsó feladat küldése...', 'processing');
                    syncPromise.then(() => {
                        finalSyncStatus.succeed({"text": "utolsó feladat küldése kész"});
                    }).catch((error) => {
                        finalSyncStatus.error({"text": "hiba az utolsó feladat küldése során: " + error});
                    });
            }
        }
        }
        catch (error) {
            console.error({'text': 'Error updating user answers:', error});
        }
    })

    document.addEventListener('keydown', async function(event) {
        
        if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'q') {
            event.preventDefault();
            goToNextTaskWithoutSaving();
        }
        else if (event.ctrlKey && event.key.toLowerCase() === 'q') {
            event.preventDefault();
            goToNextTask();
        }
        else if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'h') {
            event.preventDefault();
            toggleTaskStatusesVisibility();
        }
        else if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') {
            event.preventDefault();
            if (currentTask != null) {
                debugLog('Trying to autofill task with keybind...');
                maybeFillTask(currentTask, true);
            }
        }
    });

    if (_DEBUG) document.addEventListener('keydown', async function(event) {
        if (event.key.toLowerCase() === 'i') {
            if (currentTask != null) {
                debugLog('URL:', url);
                debugLog('Current task:', currentTask);
            }
        }
        else if (event.key.toLowerCase() === 's') {
            if (currentTask != null) {
                debugLog(`prev. task sync debug: \ncancelTaskSync: ${cancelTaskSync} \nhasAnswers: ${hasAnswers(currentTask.answerFields)} \ntaskFilledAnswers  : ${taskFilledAnswers} \ncurrentTask answers: ${currentTask.answerFields.map(input => input.value)}`);
            }
        }
        else if(event.key.toLowerCase() === 'u') {
            if (currentTask != null) {
                debugLog('user ID:',await  getUserID());
            }
        }
        else if (event.ctrlKey && event.key.toLowerCase() === 'b') {
            if (document.getElementById('__input-blocker')) {
                debugLog('Unblocking user interaction...');
                unblockUserInteraction();
            } else {
                debugLog('Blocking user interaction...');
                blockUserInteraction();
            }
        }
        else if (event.key.toLowerCase() === 'h') {
            debugLog('current task ID: ', await getTaskUniqueID());
        }
        else if (event.key.toLowerCase() === 't') {
            toggleCheckedButtonAvailability();
        }
        else if (event.key.toLowerCase() === 'c') {
            debugLog('Creating checked button...');
            createCheckedButton();
        }
    });
    while (true) {
        if (currentTask) await detectUrlChange(); //if no task yet, we should immediately see if there is one
        
        let getTaskStatus = new taskStatus('feladatra várakozás...', 'processing');

        await waitForTask();
        debugLog('task seen');
        getTaskStatus.set_text("feladat észlelve");

        if(!settings.isContributor) {
            debugLog('Not a contributor, skipping task sync.');
        } else if(cancelTaskSync) {
            debugLog('Task sync cancelled, skipping task sync.');
        } else if(currentTask == null) {
            debugLog('No current task, skipping task sync.');
        } else if(!hasAnswers(currentTask.answerFields)) {
            debugLog('Current task has no answers, skipping task sync.');
        } else if(areAnswersSame(taskFilledAnswers, currentTask.answerFields) && !userCheckedAnswer) {
            debugLog('No changes from previous filled answers and user has not checked the answers, skipping task sync.');
        }
        else {
            let syncstatus = new taskStatus('előző feladat küldése...', 'processing');
            syncTaskWithDB(currentTask).then(() => {
                syncstatus.succeed({"text": "előző feladat küldése kész"});
            }).catch((error) => {
                syncstatus.error({"text": "hiba az előző feladat küldése során: " + error});
            });
        }

        currentTask = await getTask();
        userCheckedAnswer = false;
        deleteCheckedButton(); 
        await updateSelectedAnswers(currentTask, true);

        getTaskStatus.succeed({"text": "feladat feldolgozva"});
        url = window.location.href;
        last_url = url;

        if (settings.isContributor){
            cancelTaskSync = false;
            copyNextButton();
        }

        if (settings.autoComplete) {
            await maybeFillTask(currentTask, false);
        }


        await updateSelectedAnswers(currentTask, true);
        taskFilledAnswers = JSON.parse(JSON.stringify(currentTask.answerFields.map(input => input.value))); //the answers that were there when task loaded, or after autocomplete
    }
}

async function maybeFillTask(task, ignoreExistingAnswers = false) {
    let taskFillStatus = new taskStatus('feladat kitöltése...', 'processing');

            if (hasAnswers(task.answerFields) && !ignoreExistingAnswers) {
                debugLog('Already has answers, skipping autofill...');
                taskFillStatus.fail({text: "már van valami beírva; automata kitöltés kihagyva", color:'rgba(156, 39, 176, 0.85)'});
            }
            else{
                try {
                    await tryAutoFillTask(task, taskFillStatus, autoNext);
                }
                catch (error) {
                    taskFillStatus.error({"text": "hiba a feladat lekérése során: " + error});
                    debugLog('Error fetching task from DB:', error);
                }
            }
}

async function main_loop_wrapper() {
    let maxGlobalRetryCnt = 5;
    let mainError = false;
    for (let i = 0; i < maxGlobalRetryCnt; i++) {
        try {
            let returncode = await main_loop();
            if (returncode === 504) {
                debugLog('timeout while connecting to server');
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