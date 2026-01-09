import { answerField, updateSelectedAnswers } from './read_from_task.js';
import { getTaskDDfieldID } from './read_from_task.js';
import { taskFieldSelectors } from '../scripts/constants.js';
import { waitForLoadingScreen, zoomOut, zoomIn, blockUserInteraction, unblockUserInteraction, debugLog} from '../scripts/utils.js';
import { taskStatus } from '../scripts/task_statuses.js';

export { writeAnswers };

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
    debugLog(`didnt find option: '${option}'`);
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
                    debugLog('Drag element not found with this ID:', currentToWrite);
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
            debugLog('unknown taskType in writeAnswers: ', taskType);
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