/*global chrome*/
function saveOptions() {
    const options = {
        minvotes: document.getElementById('minvotes').value,
        votepercentage: document.getElementById('votepercentage').value/100.0,
        contributer: document.getElementById('contributer').checked,
        url: document.getElementById('url').value,
        autoComplete: document.getElementById('auto-complete').checked,
        isSetupComplete: true
    };
    
    if(options.votepercentage > 1.0 || options.votepercentage < 0.0) {
        alert("Vote percent must be between 0 and 100");
        return;
    }
    if(options.minvotes <= 0) {
        alert("Minimum votes must be greater than 0");
        return;
    }
    if (options.url.includes("http://")) { 
        console.warn('http:// in URL detected, removing it');
        //options.url = options.url.replace("http://", "https://");
    }
    if (options.url.includes("https://") == false) { 
        console.warn('No http:// or https:// in URL detected, adding https://');
        options.url = "https://" + options.url;
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
    chrome.storage.sync.get({
        minvotes: 0,
        votepercentage: 0.0,
        contributer: true,
        url: '',
        autoComplete: true,
        isSetupComplete: false
    }, function(items) {
        if(items.minvotes == 0) {
            document.getElementById('minvotes').value = 5;
        }
        else document.getElementById('minvotes').value = items.minvotes;

        if(items.votepercentage == 0.0) {
            document.getElementById('votepercentage').value = 80.0;
        }
        else document.getElementById('votepercentage').value = items.votepercentage * 100.0;

        document.getElementById('contributer').checked = items.contributer;
        if(items.url == '') {
            document.getElementById('url').value = 'https://tekaku.hu/';
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
    chrome.storage.sync.set({
        minvotes: 5,
        votepercentage: 0.8,
        contributer: false,
        url: 'https://tekaku.hu/',
        autoComplete: true,
        isSetupComplete: false
    });
    window.location.reload();
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