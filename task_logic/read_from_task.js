import { dedupeByKey, hashImageToID, hashSHA256, debugLog, getInstallationKey} from '../scripts/utils.js';
import { taskFieldSelectors, MinAnswerUpdateInterval } from '../scripts/constants.js';

export { answerField, task, isThereTask, getTaskUniqueID, getTaskDDfieldID,getUserID, updateSelectedAnswers, getTask, hasAnswers }

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

async function hashTaskImages(fullTaskField) {
    const images = fullTaskField.querySelectorAll('img');
    let allIds = "";
    if (images.length > 0) {
        for (let img of images) {
            let imageId = await hashImageToID(img);
            allIds += imageId;
        }
        return allIds;
    }
    return "";
}

async function getTaskUniqueID() {
    const fullTaskField = document.querySelector(taskFieldSelectors.fullTask);
    if (!fullTaskField) {
        return null;
    }

    const allText = fullTaskField.textContent.trim();
    const imageIds = await hashTaskImages(fullTaskField);

    return hashSHA256(allText + imageIds);

}

function getAnswerFields(selector, type, idGenerator = null) {
    const fields = Array.from(document.querySelectorAll(selector));
    return Promise.all(fields.map(async field => new answerField(type, field, false, idGenerator ? await idGenerator(field) : '')));
}

function getUserID() {
    return getInstallationKey()
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
    const idFromImage = await hashImageToID(img);
    if (idFromImage) return idFromImage;
  }
  return div.textContent.trim();
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

let lastUpdateTime = 0;
async function updateSelectedAnswers(task, dontSkip = false) {
    if (!dontSkip && new Date().getTime() - lastUpdateTime < MinAnswerUpdateInterval) {
        return; // prevent too frequent updates
    }
    lastUpdateTime = new Date().getTime();
    await new Promise(resolve => setTimeout(resolve, 25)); // slight delay to allow DOM updates after interactions
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
            debugLog('unknown taskType in updateSelectedAnswers: ', field.type);
        }
    }
}

async function getTask() {
    let uniqueID = await getTaskUniqueID();
    debugLog('Generated unique ID for task:', uniqueID);
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
    debugLog('Detected task:', t);
    return t;
}

function hasAnswers(answerFields) {
    for (let i=0;i<answerFields.length;i++) {
        if(answerFields[i].value) return true;
    }
    return false;
}