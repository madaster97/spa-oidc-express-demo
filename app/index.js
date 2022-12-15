function paramsToObject(entries) {
    const result = {}
    for (const [key, value] of entries) { // each 'entry' is a [key, value] tupple
        result[key] = value;
    }
    return result;
}

function checkQuery() {
    const qs = window.location.search;
    const status = document.getElementById('status');
    if (qs && qs.includes('state=')) {
        const params = new URLSearchParams(qs);
        const state = params.get('state');
        params.delete('state');
        status.innerText = 'Found "state" query value ' + state +
            '. Sending authorize response to server...';
        // fetch('/use-csrf-token', {
        //     method: 'POST',
        //     headers: {
        //         'X-AUTH-STATE': state,
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify(paramsToObject(params))
        // }).then(response => {
        //     if (response.status == 200) {
        //         return response.json().then(tokenSet => {
        //             const result = document.getElementById('result');
        //             result.innerText = 'Successful request! TokenSet received: ' + JSON.stringify(tokenSet, null, 2);
        //         })
        //     } else {
        //         return response.json().then(errJson => {
        //             throw new Error(JSON.stringify(errJson, null, 2))
        //         })
        //     }
        // }).catch(err => {
        //     const result = document.getElementById('result');
        //     result.innerText = 'Error sumbitting request: ' + err.message;
        // });
    } else {
        status.innerText = 'No "state" query string found. Creating new authorize link';
        setupCSRF(status);
    }
}

function setupCSRF(status) {
    // document.cookie="XSRF-AUTH-REQUEST=; Max-Age=0"
    fetch('/get-csrf-token')
        .then(response => {
            if (response.status == 200) {
                const auth_request = document.cookie
                    .split('; ')
                    .find((row) => row.startsWith('XSRF-AUTH-REQUEST='))
                    ?.split('=')[1];
                if (!auth_request) {
                    status.innerText = 'Could not find auth request in "XSRF-AUTH-REQUEST" cookie';
                } else {
                    const myLink = document.createElement("a");
                    myLink.innerText = 'Login here';
                    myLink.setAttribute('href', decodeURIComponent(auth_request));
                    document.body.appendChild(myLink);
                    status.innerText = 'Authorize request constructed'
                }
            } else {
                return response.json().then(errJson => {
                    throw new Error(JSON.stringify(errJson, null, 2))
                })
            }
        }).catch(err => {
            status.innerText = 'Error fetching constructing request: ' + err.message;
        });
}