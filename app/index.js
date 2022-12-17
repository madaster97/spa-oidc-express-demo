function checkQuery() {
    const qs = window.location.search;
    const status = document.getElementById('status');
    if (qs && qs.includes('state=')) {
        const params = new URLSearchParams(qs);
        const state = params.get('state');
        status.innerText = 'Found "state" query value ' + state +
            '. Sending authorize response to server...';
        fetch('/catch_response', {
            method: 'POST',
            headers: {
                'X-AUTHORIZE-RESPONSE': qs
            },
        }).then(response => {
            if (response.status == 200) {
                return response.json().then(tokenSet => {
                    const status = document.getElementById('status');
                    status.innerText = 'Successful request! TokenSet received: ' + JSON.stringify(tokenSet, null, 2);
                })
            } else {
                return response.json().then(errJson => {
                    throw new Error(JSON.stringify(errJson, null, 2))
                })
            }
        }).catch(err => {
            const status = document.getElementById('status');
            status.innerText = 'Error sumbitting request: ' + err;
        });
    } else {
        status.innerText = 'No "state" query string found. Creating new authorize link';
        setupCSRF(status);
    }
}

function setupCSRF(status) {
    fetch('/start_login')
        .then(response => {
            if (response.status == 200) {
                const auth_request = document.cookie
                    .split('; ')
                    .find((row) => row.startsWith('AUTHORIZE-REQUEST='))
                    ?.split('=')[1];
                if (!auth_request) {
                    status.innerText = 'Could not find auth request in "AUTHORIZE-REQUEST" cookie';
                } else {
                    document.cookie="AUTHORIZE-REQUEST=; Max-Age=0" // Delete request once loaded
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