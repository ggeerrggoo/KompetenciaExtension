//name: h3 element, question: div element, type: div element
class task {
    constructor(name, question, type, answer_inputs) {
        this.name = name;
        this.question = question;
        this.type = type;
        this.answer_inputs = answer_inputs; 
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
    for (let i = 0; i < tasknames.length; i++) {
        if (!tasknames[i].classList.contains('pl-3')) {
            return tasknames[i];
        }
    }
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
//works with select_text and select_image task types
function getTaskAnswerFields() {
    const answers = document.querySelectorAll('div.valaszlehetoseg.valaszlehetoseg-hover.ng-star-inserted');
    return answers;
}


function clickdiv(div) {
    if (div && typeof div.click === 'function') {
        div.click();
    } else {
        console.log('The provided div', div, 'does not have a click event or is not valid.');
    }
}

function getTask() {
    let type = getTaskType();
    let name = getTaskName();
    let question = getTaskQuestion();
    let answers = null;
    if (type == 'select_text' || type == 'select_image') {
        answers = getTaskAnswerFields();
    }
    else {
        console.log('Task type not supported for auto-answer YET.');
        answers = [];   
    }
    let t = new task(name, question, type, answers);
    return t;
}

async function main_loop() {
    let last_url = '';
    let url = '';
    let current_task = null;
    while (true) {
        url = window.location.href;

        //idle loop, no new task found
        if (last_url == url && last_url != '') {
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
        }
        
        //when a new task is found

        console.log('URL:', url);

        //wait for the page to show a question
        console.log('Waiting for question...\r');
        while (getTaskQuestion() == 'No question found.') {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.log('Question found!');


        current_task = getTask();
        console.log('Task Type:', current_task.type);
        console.log('Task Name:', current_task.name.innerHTML);
        console.log('Task Question:', current_task.question.innerHTML);
        if (current_task.type == 'select_text' || current_task.type == 'select_image') {
            let answers = current_task.answer_inputs;
            console.log('Task Answers number:', answers.length);
            console.log('Task Answers:', answers);
            for (let i = 0; i < answers.length; i++) {
                clickdiv(answers[i]);
                console.log(answers[i].textContent);
            }
        }

        last_url = url;
    }
}

main_loop();