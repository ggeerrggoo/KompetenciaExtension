let wsGlobal = null;

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === "fetchTask") {
        try {
        fetch(message.url, message.options)
            .then(async response => {
                let data;
                let contentType = response.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    data = await response.json();
                    console.log('JSON response:', data);
                } else {
                    data = await response.text();
                    console.log('Text response:', data);
                }
                // Convert headers to a plain object
                let headersObj = {};
                for (let [key, value] of response.headers.entries()) {
                    headersObj[key] = value;
                }
                sendResponse({
                    success: true,
                    data,
                    status: response.status,
                    statusText: response.statusText,
                    headers: headersObj
                });
            })
            .catch(error => sendResponse({ success: false, error: error.toString() }));
        } catch (error) {
            sendResponse({ success: false, error: error.toString() });
        }
        // Required for async response
        return true;
    }
    else sendResponse({ success: false, error: 'Unknown message type' });
});

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
chrome.runtime.onConnect.addListener(async port => {
    wsGlobal = new WebSocket(await getWebSocketUrl());
    wsGlobal.onopen = () => {
        console.log('WebSocket connection established');
        port.postMessage({ type: 'wsConnected' });
    };
    wsGlobal.onerror = error => {
        console.error('WebSocket error:', error);
        port.postMessage({ type: 'wsError', error: error.toString() });
    }
    wsGlobal.onmessage = event => {
        console.log('WebSocket message received:', event.data);
        port.postMessage(JSON.parse(event.data));
    };
    wsGlobal.onclose = () => {
        console.error('WebSocket connection closed');
        port.postMessage({ type: 'wsClosed' });
    };
    port.onMessage.addListener(message => {
        if(!message.id) {
            console.error('Message ID is required');
            port.postMessage({ type: 'wsError', error: 'Message ID is required' });
            return;
        }
        if(!wsGlobal || wsGlobal.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not open');
            port.postMessage({ type: 'wsError', error: 'WebSocket is not open' });
            return;
        }
        else {
            console.log('Sending message to WebSocket:', message);
            wsGlobal.send(JSON.stringify(message));
        }
    });
});