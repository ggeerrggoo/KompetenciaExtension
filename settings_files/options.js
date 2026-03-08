/*global chrome*/
import { defaultOptions } from '../scripts/constants.js';
function saveOptions() {
    const options = {
        minvotes: document.getElementById('minvotes').value,
        votepercentage: document.getElementById('votepercentage').value/100.0,
        contributer: document.getElementById('contributer').checked,
        url: document.getElementById('url').value,
        autoComplete: document.getElementById('auto-complete').checked,
        isSetupComplete: true
    };
    
    if(options.votepercentage > 1.0 || options.votepercentage < 0.51) {
        alert("az azonos válaszok elfogadásához szükséges szavazati aránynak 51% és 100% között kell lennie");
        return;
    }
    if(options.minvotes <= 0) {
        alert("a minimum szavazatok számának pozitív egésznek kell lennie");
        return;
    }
    if(options.url.endsWith("/") == false) 
        options.url = options.url + "/";
    

    chrome.storage.sync.set(options, function() {
        const status = document.getElementById('status');
        status.textContent = 'mentve!';
        setTimeout(function() {
            status.textContent = '';
        }, 750);
        deleteSetupReminder();
    });
    restoreOptions();
}
function deleteSetupReminder() {
    const warning = document.getElementById('setup-warning');
    if (warning) {
        warning.remove();
    }
    const contributorCheckbox = document.getElementById('contributer');
    const contributorDiv = contributorCheckbox.closest('div[title]'); 
    if (contributorDiv) {
        contributorDiv.style.border = ""; 
        contributorDiv.style.backgroundColor = ""; 
        contributorDiv.style.padding = "";
        contributorDiv.style.borderRadius = "";
        contributorDiv.style.marginBottom = "";
        
        contributorCheckbox.style.outline = "";
        contributorCheckbox.style.outlineOffset = "";
    }
}

function restoreOptions() {
    chrome.storage.sync.get(defaultOptions, function(items) {
        if(items.minvotes == 0) {
            document.getElementById('minvotes').value = defaultOptions.minvotes;
        }
        else document.getElementById('minvotes').value = items.minvotes;

        if(items.votepercentage == 0.0) {
            document.getElementById('votepercentage').value = defaultOptions.votepercentage * 100.0;
        }
        else document.getElementById('votepercentage').value = items.votepercentage * 100.0;

        document.getElementById('contributer').checked = items.contributer;
        if(items.url == '') {
            document.getElementById('url').value = defaultOptions.url;
        }
        else document.getElementById('url').value = items.url;
        document.getElementById('auto-complete').checked = items.autoComplete;
        if (!items.isSetupComplete) {
            const contributorCheckbox = document.getElementById('contributer');
            // Check if we already added the warning to avoid duplicates on re-render if that happens
            if (!document.getElementById('setup-warning')) {
                // The parent of the checkbox's label's parent div is the .option-group div
                // HTML structure: div.option-group > div (title=...) > label > input#contributer
                
                // We want to highlight the div wrapping the contributor option
                const contributorDiv = contributorCheckbox.closest('div[title]'); 
                
                if (contributorDiv) {
                    contributorDiv.style.border = "3px solid #e51400"; // Red border
                    contributorDiv.style.backgroundColor = "#fce8e6"; // Light red background
                    contributorDiv.style.padding = "15px";
                    contributorDiv.style.borderRadius = "5px";
                    contributorDiv.style.marginBottom = "10px";
                    
                    const message = document.createElement('div');
                    message.id = 'setup-warning';
                    message.style.color = "#a50f00"; // Dark red text
                    message.style.fontWeight = "bold";
                    message.style.marginBottom = "10px";
                    message.style.fontSize = "1.1em";
                    message.innerText = "Ez itt fontos: Kérlek döntsd el, hogy elküldöd-e a megoldásaid a szerverünknek, hogy azokat felhasználhassuk később automata kitöltésre. Akkor kapcsold be, ha magabiztos vagy a tudásodban. Ha nem szeretnéd megosztani a megoldásaid, csak nyomj a 'Mentés' gombra.";
                    
                    // Insert message at the beginning of the container
                    contributorDiv.insertBefore(message, contributorDiv.firstChild);
                    
                    // Highlight the checkbox itself 
                    contributorCheckbox.style.outline = "2px solid #e51400";
                    contributorCheckbox.style.outlineOffset = "2px";
                }
            }
        }
    });
}
function showAdvanced() {
    const advanced = document.getElementById('advanced');
    if(advanced.style.display == 'none') {
        advanced.style.display = 'block'; // Make it visible
        document.getElementById('advancedbutton').textContent = 'fejlesztői beállítások elrejtése';
    }
    else {
        advanced.style.display = 'none';
        document.getElementById('advancedbutton').textContent = 'fejlesztői beállítások megjelenítése';
    }
}

function resetDefaultOptions() {
    chrome.storage.sync.set(defaultOptions, function() {
        // Update status or reload page
        const status = document.getElementById('status');
        status.textContent = 'Alapértelmezett beállítások visszaállítva.';
        setTimeout(function() {
            status.textContent = '';
            window.location.reload();
        }, 750);
    });
}

function setNotSavedStatus() {
    const status = document.getElementById('status');
    status.textContent = 'Mentés szükséges!';
}

document.getElementById('minvotes').addEventListener('input', function() {
    setNotSavedStatus();
});
document.getElementById('votepercentage').addEventListener('input', function() {
    setNotSavedStatus();
});
document.getElementById('contributer').addEventListener('change', setNotSavedStatus);
document.getElementById('auto-complete').addEventListener('change', setNotSavedStatus);


document.getElementById('minvotes').addEventListener('change', function() {
    saveOptions();
});
document.getElementById('votepercentage').addEventListener('change', function() {
    saveOptions();
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        saveOptions();
    }
});

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('advancedbutton').addEventListener('click', showAdvanced);
document.getElementById('reset').addEventListener('click', resetDefaultOptions);

window.addEventListener('beforeunload', (event) => {
    const status = document.getElementById('status');
    if (status.textContent === 'Mentés szükséges!') {
        event.preventDefault();
    }
});