
function saveOptions() {
    const options = {
        name: document.getElementById('name').value,
        minvotes: document.getElementById('minvotes').value,
        votepercentage: document.getElementById('votepercentage').value/100.0,
        contributer: document.getElementById('contributer').checked,
        url: document.getElementById('url').value,
        autoComplete: document.getElementById('auto-complete').checked
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
        status.textContent = 'Options saved.';
        setTimeout(function() {
            status.textContent = '';
        }, 750);
    });
    restoreOptions();
}

function restoreOptions() {
    chrome.storage.sync.get({
        name: '',
        minvotes: 0,
        votepercentage: 0.0,
        contributer: true,
        url: '',
        autoComplete: true
    }, function(items) {
        document.getElementById('name').value = items.name;
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
    });
}
function showAdvanced() {
    const advanced = document.getElementById('advanced');
    if(advanced.style.display == 'none') {
        advanced.style.display = 'block';
        document.getElementById('advancedbutton').textContent = 'Hide Advanced Options';
    }
    else {
        advanced.style.display = 'none';
        document.getElementById('advancedbutton').textContent = 'Show Advanced Options';
    }
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('advancedbutton').addEventListener('click', showAdvanced);