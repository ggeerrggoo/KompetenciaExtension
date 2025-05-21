chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
});