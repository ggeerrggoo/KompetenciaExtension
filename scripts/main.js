/* global chrome */
import { taskStatus } from './task_statuses.js';
import { getUserID, hasAnswers, isThereTask, getTaskUniqueID, updateSelectedAnswers, getTask } from '../task_logic/read_from_task.js';
import { writeAnswers} from '../task_logic/write_to_task.js';
import { autoNext } from './constants.js';
import { blockUserInteraction, unblockUserInteraction} from './utils.js';

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

    document.addEventListener('click', async function(event) {
        if (document.getElementById('__input-blocker') || currentTask === null) return;
        try {
            updateSelectedAnswers(currentTask, event);
            // a 'lezárás' gomb ilyen, ekkor elküldjük az utolsó feladatot, mivel nem lesz következő amit érzékelünk
            if (event.target.classList.contains('btn-danger')) { 
                if (settings.isContributor && currentTask != null && hasAnswers(currentTask.answerFields) && taskFilledAnswers.toString() !== currentTask.answerFields.map(input => input.value).toString()) {

                    console.log('lezárás clicked, syncing last task');
                    let syncPromise = syncTaskWithDB(currentTask);
                    let finalSyncStatus = new taskStatus('utolsó feladat küldése...', 'processing');
                    console.log('Sync promise:', syncPromise);
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
        updateSelectedAnswers(currentTask);

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
    let maxGlobalRetryCnt = 5;
    let mainError = false;
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