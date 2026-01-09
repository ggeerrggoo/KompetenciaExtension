/* global chrome */
import { taskStatus } from './task_statuses.js';
import { getUserID, hasAnswers, isThereTask, getTaskUniqueID, updateSelectedAnswers, getTask } from '../task_logic/read_from_task.js';
import { writeAnswers} from '../task_logic/write_to_task.js';
import { autoNext, _DEBUG } from './constants.js';
import { blockUserInteraction, unblockUserInteraction, debugLog} from './utils.js';

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
    };
    let user = {
        name: settings.name,
        azonosito: getUserID()
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
    const user = {
        name: settings.name,
        azonosito: getUserID()
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
        
        const response = await fetchTask(announcementUrl+items.lastAnnouncment, {
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
            for (let i = 0; i < announcements.length; i++) {
                const announcement = announcements[i];
                items.lastAnnouncment = announcement.created_at;
                debugLog('New announcement:', announcement);
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

function connectWebSocket() {
    return new Promise((resolve, reject) => {
        if (wsGlobal && wsGlobal.readyState === WebSocket.OPEN) {
            resolve();
            return;
        }
        
        getWebSocketUrl().then(url => {
            wsGlobal = new WebSocket(url);
            
            wsGlobal.onopen = () => {
                debugLog('WebSocket connection established');
                resolve();
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


    //fetchAnnouncements();
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
    const buttons = document.querySelectorAll('button.btn.btn-secondary.d-block');
    if (buttons.length == 2) { // a prev. and next button should show up
        buttons[buttons.length - 1].click();
        window.scrollTo(0, document.body.scrollHeight); // ???
        await new Promise(resolve => setTimeout(resolve, 50));
        debugLog('went to next task');
    }
}

async function tryAutoFillTask(task, taskFillStatus, autoNext) {
    taskFillStatus.set_text('válasz kérése szervertől...');
    const queryResult = await fetchTaskSolution(task);
    if (queryResult) {
        debugLog('Query result:', queryResult);
        await loadSettings();
        if (queryResult.totalVotes >= settings.minvotes && 100*queryResult.votes / queryResult.totalVotes >= settings.votepercentage) {
            debugLog('Enough votes and enough percentage of votes.');
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
            debugLog('Not enough votes or not enough percentage of votes.');
            debugLog('Total votes:', queryResult.totalVotes, "required votes:", settings.minvotes);
            debugLog('Vote%:', 100*queryResult.votes / queryResult.totalVotes , "required vote%:", settings.votepercentage);
        }
    }
    else {
        taskFillStatus.fail({text: 'nincs még erre a feladatra leadott válasz',status: 'skipped'});
        debugLog('No solution found in the database.');
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

    document.addEventListener('click', async function(event) {
        if (document.getElementById('__input-blocker') || currentTask === null) return;
        try {
            updateSelectedAnswers(currentTask, event);
            // a 'lezárás' gomb ilyen, ekkor elküldjük az utolsó feladatot, mivel nem lesz következő amit érzékelünk
            if (event.target.classList.contains('btn-danger')) { 
                if (settings.isContributor && currentTask != null && hasAnswers(currentTask.answerFields) && taskFilledAnswers.toString() !== currentTask.answerFields.map(input => input.value).toString()) {

                    debugLog('lezárás clicked, syncing last task');
                    let syncPromise = syncTaskWithDB(currentTask);
                    let finalSyncStatus = new taskStatus('utolsó feladat küldése...', 'processing');
                    debugLog('Sync promise:', syncPromise);
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

    // Listen for key presses, just used for debug
    document.addEventListener('keydown', async function(event) {
        if (event.key.toLowerCase() === 'i') {
            if (currentTask != null) {
                debugLog('URL:', url);
                debugLog('Current task:', currentTask);
            }
        }
        else if (event.key.toLowerCase() === 's') {
            if (currentTask != null) {
                debugLog('Syncing task with DB (keybind clicked)... , ', hasAnswers(currentTask.answerFields) ? 'has answers' : 'no answers');
                syncTaskWithDB(currentTask);
            }
        }
        else if(event.key.toLowerCase() === 'u') {
            if (currentTask != null) {
                debugLog('user ID:', getUserID());
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
    });
    while (true) {
        if (currentTask) await detectUrlChange(); //if no task yet, we should immediately see if there is one
        
        debugLog('New URL, waiting for task...');
        let getTaskStatus = new taskStatus('feladatra várakozás...', 'processing');
        await waitForTask();
        debugLog('task seen');
        getTaskStatus.set_text("feladat észlelve");

        if (settings.isContributor && currentTask != null && hasAnswers(currentTask.answerFields) && taskFilledAnswers.toString() !== currentTask.answerFields.map(input => input.value).toString()) {
            debugLog('New task found, syncing old one with DB...');
            let syncstatus = new taskStatus('előző feladat szinkronizálása...', 'processing');
            syncTaskWithDB(currentTask).then(() => {
                syncstatus.succeed({"text": "előző feladat szinkronizálása kész"});
            }).catch((error) => {
                syncstatus.error({"text": "hiba az előző feladat szinkronizálása során: " + error});
            });
        }
        else {
            debugLog('not syncing prev. task because: ',)
            !settings.isContributor ? debugLog('user not a contributor') : 
            currentTask == null ? debugLog('no current task') : 
            !hasAnswers(currentTask ? currentTask.answerFields : []) ? debugLog('no answers') : 
            taskFilledAnswers.toString() === currentTask.answerFields.map(input => input.value).toString() ? debugLog('no changes from prev. filled answers') : debugLog('WTF?');

        }

        currentTask = await getTask();
        updateSelectedAnswers(currentTask);

        getTaskStatus.succeed({"text": "feladat feldolgozva"});
        url = window.location.href;
        last_url = url;

        let taskFillStatus = new taskStatus('feladat kitöltése...', 'processing');

        if (hasAnswers(currentTask.answerFields)) {
            debugLog('Already has answers, skipping autofill...');
            taskFillStatus.fail({text: "már van valami beírva; kihagyva", color:'rgba(156, 39, 176, 0.85)'});
        }
        else if (settings.autoComplete) {
            try {
                await tryAutoFillTask(currentTask, taskFillStatus, autoNext);
            }
            catch (error) {
                taskFillStatus.error({"text": "hiba a feladat lekérése során: " + error});
                debugLog('Error fetching task from DB:', error);
            }
        }
        await updateSelectedAnswers(currentTask);
        taskFilledAnswers = JSON.parse(JSON.stringify(currentTask.answerFields.map(input => input.value))); //the answers that were there when task loaded, or after autocomplete
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