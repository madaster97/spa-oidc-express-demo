function paramsToObject(entries) {
    const result = {}
    for (const [key, value] of entries) { // each 'entry' is a [key, value] tupple
        result[key] = value;
    }
    return result;
}

function checkQuery() {
    const qs = window.location.search;
    const result = document.getElementById('result');
    if (qs && qs.includes('state=')) {
        const params = new URLSearchParams(qs);
        const state = params.get('state');
        params.delete('state');
        result.innerText = 'Found "state" query value ' + state +
            '. Sending authorize response to server...';
        fetch('/use-csrf-token', {
            method: 'POST',
            headers: {
                'X-AUTH-STATE': state,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paramsToObject(params))
        }).then(response => {
            if (response.status == 200) {
                return response.json().then(tokenSet => {
                    const result = document.getElementById('result');
                    result.innerText = 'Successful request! TokenSet received: ' + JSON.stringify(tokenSet, null, 2);
                })
            } else {
                return response.json().then(errJson => {
                    throw new Error(JSON.stringify(errJson, null, 2))
                })
            }
        }).catch(err => {
            const result = document.getElementById('result');
            result.innerText = 'Error sumbitting request: ' + err.message;
        });
    } else {
        result.innerText = 'No "state" query string found. Assumed new session';
        const button = document.getElementById('test-request');
        button.removeAttribute('disabled');
    }
}

function setupCSRF() {
    document.cookie="XSRF-AUTH-REQUEST=; Max-Age=0"
    fetch('/get-csrf-token')
        .then(response => {
            if (response.status == 200) {
                const result = document.getElementById('result');
                const auth_request = document.cookie
                    .split('; ')
                    .find((row) => row.startsWith('XSRF-AUTH-REQUEST='))
                    ?.split('=')[1];
                if (!auth_request) {
                    result.innerText = 'Could not find auth request in "XSRF-AUTH-REQUEST" cookie';
                } else {
                    result.innerText = 'Constructed auth request. Redirecting...'
                    window.location = decodeURI(auth_request);
                }
            } else {
                return response.json().then(errJson => {
                    throw new Error(JSON.stringify(errJson, null, 2))
                })
            }
        }).catch(err => {
            const result = document.getElementById('result');
            result.innerText = 'Error fetching constructing request: ' + err.message;
        });
}