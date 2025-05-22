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
//types: select_text, select_image, dropdown, custom_number, category_select
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
    if (qs.length > 1) {
        console.log(qs.length + " questions found.");
        console.log(qs);
        console.log('Multiple questions found. This is problematic. We havent made anything to handle this yet. debug info in the console.');
    }

    if(qs.length > 0) {
        return qs[0].textContent.replace(/[^a-zA-Z0-9.,!?]/g, '');
    }
    return 'No question found.';
}

function getTaskDescription() {
    const desc = document.querySelector('div.my-3.container.ng-star-inserted');
    return desc;
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
    //open the dropdown
    if (option == false) {
        return;
    }
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

function getSelectedAnswers(taskType, answerInputs) {
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
    default:
        console.log('Task type not supported for auto answer reading YET.');
        break;
    }
    return selected;
}

function clearSelectedAnswers(taskType,divs) {
    let selectedAnswers = getSelectedAnswers(taskType, divs);

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
        default:
            console.log('Task type not supported for auto answer clearing YET.');
            break;
    }
}

function writeAnswers(taskType, answers, divs) {

    clearSelectedAnswers(taskType, divs);

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
        default:
            console.log('Task type not supported for auto answer writing YET.');
            break;
    }
}

function getTask() {
    let type = getTaskType();
    let name = getTaskName();
    let question = getTaskQuestion();
    let description = getTaskDescription().textContent;
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
    else {
        //TODO
        answers = [];   
    }
    let selectedAnswers = getSelectedAnswers(type, answers);
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

async function syncTaskWithDB(current_task) {   

    const dburl = 'http://localhost:3000/solution'; // http://strong-finals.gl.at.ply.gg:36859/solution

    if(!hasAnswers(current_task)) {
        let task = {
            name: current_task.name,
            question: current_task.question,
            type: current_task.type
        };
        let user = {
            name: settings.name,
            azonosito: 'unknown'
        };
        
        try {
            const reply = await fetchTaskFromBackground(dburl+"/?task="+JSON.stringify(task)+"&user="+JSON.stringify(user));
            if (reply.status == 200) {
                let data = await reply.json();
                return data;
            }
            if (reply.status != 200) {
                console.log('Error getting solution:', reply);
                console.log('task  sent:', task);
                return;
            }
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
            azonosito: 'unknown'
        };
        try {
            const reply = await fetchTaskFromBackground(dburl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    task: task,
                    user: user
                })
            });
            if (reply.status == 200) {
                console.log('Solution posted successfully');
                let data = await reply.json();
                return data;
            }
            if (reply.status != 200) {
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
        url: 'http://strong-finals.gl.at.ply.gg:36859/'
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
    });
}

var settings = {};
async function main_loop() {
    loadSettings();

    let last_url = '';
    let url = '';
    let current_task = null;
    let selectedAnswers = [];
    let sendResults = true;

    document.addEventListener('click', function(event) {
        if (typeof current_task != 'undefined' && current_task != null) {
            let selections_pre = getSelectedAnswers(current_task.type, current_task.answerInputs);
            if (selections_pre.length != 0) {
                console.log('Selected answers:', selections_pre);
                current_task.selectedAnswers = selections_pre;
            }
        }
        
    });

    // Listen for key press
    document.addEventListener('keydown', function(event) {
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
    });

    while (true) {
        url = window.location.href;

        //idle loop, no new task found
        if (last_url == url && last_url != '') {
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
        }
        
        //when a new task is found
        //wait for the page to show a question
        console.log('New URL, waiting for task...');
        while (getTaskQuestion() == 'No question found.') {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.log('task got');
        
        last_url = url;

        if (sendResults && current_task != null && hasAnswers(current_task)) {
                console.log('New task found, syncing old one with DB...');
                let asdf = await syncTaskWithDB(current_task);
                console.log('Sync result:', asdf);
        }
        sendResults = true;
        current_task = getTask();

        if (hasAnswers(current_task)) {
            console.log('Already has answers, skipping autofill...');
            sendResults = false;
        }
        else if (current_task.type == 'select_text' || current_task.type == 'select_image' || current_task.type == 'dropdown' || current_task.type == 'category_select' || current_task.type == 'custom_number') {
            try {
                let queryResult = await syncTaskWithDB(current_task);
                if (queryResult != null) {
                    console.log('Query result:', queryResult);
                    loadSettings();
                    if (queryResult.totalVotes >= settings.minvotes && queryResult.votes / queryResult.totalVotes >= settings.votepercentage) {
                        sendResults = false;
                        console.log('Enough votes and enough percentage of votes.');
                        writeAnswers(current_task.type, JSON.parse(queryResult.answer), current_task.answerInputs);
                    }
                    else {
                        console.log('Not enough votes or not enough percentage of votes.');
                        console.log('Total votes:', queryResult.totalVotes, "required votes:", settings.minvotes);
                        console.log('Vote%:', queryResult.votes / queryResult.totalVotes, "required votes:", settings.votepercentage);
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