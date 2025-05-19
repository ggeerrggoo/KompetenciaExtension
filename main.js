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
    return tasknames[tasknames.length - 1];
}

function getTaskQuestion() {
    const questions = document.querySelectorAll('p#kerdes');
    if (questions.length == 0) {
        return 'No question found.';
    }
    if (questions.length > 1) {
        console.log(questions.length + " questions found.");
        console.log(questions);
        alert('Multiple questions found. This is problematic. We havent made anything to handle this yet. debug info in the console.');
    }
    return questions[0];
}

function getTaskDescription() {
    const desc = document.querySelectorAll('div.my-3.container.containter-fix-width.ng-star-inserted');
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
            console.log('Found option:', options[i]);
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
            for (let i = 0; i < divs.length; i++) {
                if (selectedAnswers[i] != false) {
                    selectDropdownOption(divs[i], false);
                }
            }
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

async function syncTaskWithDB(current_task) {   

    const dburl = 'http://strong-finals.gl.at.ply.gg:36859/solution'; // strong-finals.gl.at.ply.gg:36859

    let hasAnswers = false;
    for (let i = 0; i < current_task.selectedAnswers.length; i++) {
        if (current_task.selectedAnswers[i] != false) {
            hasAnswers = true;
            break;
        }
    }
    if(!hasAnswers) {
        let task = {
            name: current_task.name.textContent,
            question: current_task.question,
            type: current_task.type
        };
        let user = {
            name: settings.name,
            azonosito: 'unknown'
        };
        
        let reply = await fetchTaskFromBackground(dburl+"/?task="+JSON.stringify(task)+"&user="+JSON.stringify(user));
        if (reply.status != 200) {
            console.log('Error getting solution:', reply.status);
            return;
        }
        return JSON.parse(reply);
    }
    else {
        const task = {
            name: current_task.name.textContent,
            question: current_task.question,
            description: current_task.description,
            type: current_task.type,
            answers: current_task.selectedAnswers
        };
        const user = {
            name: settings.name,
            azonosito: 'unknown'
        };
        /*const reply = await fetch(dburl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                task: task,
                user: user
            })
        });*/
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
}

function loadSettings() {
    chrome.storage.sync.get({
        name: '',
        minvotes: 0,
        votepercentage: 0.0
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
    });
}

var settings = {};
async function main_loop() {
    loadSettings();

    let last_url = '';
    let url = '';
    let current_task = null;
    let selectedAnswers = [];

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
                //console.log('Selected answers:', current_task.selectedAnswers);
                //console.log('Task type:', current_task.type);
                //console.log('Task name:', current_task.name.textContent);
                //console.log('Task question:', current_task.question.textContent);
                //console.log('Task description:', current_task.description);
            }
        }
        else if (event.key === 's' || event.key === 'S') {
            if (current_task != null) {
                console.log('Syncing task with DB...');
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
        
        while (getTaskQuestion() == 'No question found.') {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        last_url = url;


        current_task = getTask();

        // commented out debug stuff

        if (current_task.type == 'custom_number') {
            console.log('Custom number task found.');
            let correct = [42];
            writeAnswers(current_task.type, correct, current_task.answerInputs);
        }

    }
}



main_loop();