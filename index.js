const express = require('express');
const session = require('express-session');
const { Issuer, generators } = require('openid-client');
const bodyParser = require('body-parser');

(async () => {
    const issuer = await Issuer.discover(process.env.ISSUER_BASE_URL);
    const client = new issuer.Client({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        token_endpoint_auth_method: 'client_secret_basic',
        response_types: ['code'],
        redirect_uris: [
            process.env.BASE_URL + '/callback'
        ]
    });

    console.log('Using issuer %o and client %o', issuer, client);

    const app = express();

    app.use(express.static('app'));

    app.use(session({
        secret: process.env.SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: {
            // TODO: Add other props
            httpOnly: true
        }
    }));

    app.get('/get-csrf-token', (req, res) => {
        const state = generators.state();
        const nonce = generators.nonce();
        const code_verifier = generators.codeVerifier();
        const code_challenge = generators.codeChallenge(code_verifier);
        const authorizeRequest = client.authorizationUrl({
            nonce,
            code_challenge,
            code_challenge_method: 'S256'
        })
        req.session.state = state;
        req.session.nonce = nonce;
        req.session.code_verifier = code_verifier;
        req.session.save(err => {
            if (err) {
                res.status(400).json({
                    error: 'server_error',
                    error_message: err.message
                });
            }
            else {
                res.cookie('XSRF-AUTH-REQUEST', authorizeRequest, {
                    // TODO, add other props
                    httpOnly: false
                });
                res.send();
            }
        });
    });

    app.post('/use-csrf-token', bodyParser.json({type: 'application/json'}), async (req, res) => {
        const expectedState = req.session.state;
        const expectedNonce = req.session.nonce;
        const code_verifier = req.session.code_verifier;
        if (!state || !nonce || !code_verifier) {
            res.status(400).json({
                error: 'server_error',
                error_message: 'CSRF token missing from session'
            });
        } else if (!req.body) {
            res.status(400).json({
                error: 'invalid_request',
                error_message: 'Authorize response missing from request'
            })            
        } else {
            const providedState = req.header('X-AUTH-STATE');
            client.callback(
                client.metadata.redirect_uris[0],
                {...req.body, state: providedState},
                {
                    code_verifier,
                    state: expectedState,
                    nonce: expectedNonce
                }).then(tokenSet => {
                    const output = {
                        ...tokenSet
                    };
                    if (output.access_token) {
                        output.access_token = 'REDACTED. Use this data on the server only!';
                    }
                    if (output.id_token) {
                        output.id_token = 'REDACTED. Use this data on the server only!';
                    }
                    if (output.refresh_token) {
                        output.refresh_token = 'REDACTED. Use this data on the server only!';
                    }
                    res.json(output);
                }).catch(err => {
                    res.status(400).json({
                        error: 'invalid_request',
                        error_message: err.message
                    });
                })
        }
    });

    app.listen(3000, () => {
        console.log('Listening on http://localhost:3000')
    })

})();