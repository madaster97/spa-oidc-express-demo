const express = require('express');
const session = require('express-session');
const { Issuer, generators } = require('openid-client');

(async () => {
    const issuer = await Issuer.discover(process.env.ISSUER_BASE_URL);
    const client = new issuer.Client({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        token_endpoint_auth_method: 'client_secret_basic',
        response_types: ['code'],
        redirect_uris: [
            process.env.BASE_URL
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

    app.get('/start_login', (req, res) => {
        const state = generators.state();
        const nonce = generators.nonce();
        const code_verifier = generators.codeVerifier();
        const code_challenge = generators.codeChallenge(code_verifier);
        const authorizeRequest = client.authorizationUrl({
            nonce,
            code_challenge,
            code_challenge_method: 'S256',
            state
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
                res.cookie('AUTHORIZE-REQUEST', authorizeRequest, {
                    // TODO, add other props
                    httpOnly: false
                });
                res.send();
            }
        });
    });

    async function destroySession(req) {
        return new Promise((resolve, reject) => {
            req.session.destroy(err => {
                if (err) reject(err)
                else resolve()
            });
        })
    }

    app.post('/catch_response', async (req, res) => {
        const state = req.session.state;
        const nonce = req.session.nonce;
        const code_verifier = req.session.code_verifier;
        await destroySession(req); // Clear login session when redeeming
        const authorizeResponse = req.header('X-AUTHORIZE-RESPONSE');
        if (req.header('cookie').includes("AUTHORIZE-REQUEST")) {
            res.status(400).json({
                error: 'invalid_request',
                error_message: 'Client should clear the "AUTHORIZE-REQUEST" cookie after reading it'
            })
        } else if (!state || !nonce || !code_verifier) {
            res.status(400).json({
                error: 'server_error',
                error_message: 'CSRF token(s) missing from session'
            });
        } else if (!authorizeResponse) {
            res.status(400).json({
                error: 'invalid_request',
                error_message: 'Authorize response missing from request'
            })
        } else {
            const params = client.callbackParams(authorizeResponse);
            client.callback(
                client.metadata.redirect_uris[0],
                params,
                {
                    code_verifier,
                    state: state,
                    nonce: nonce
                }).then(tokenSet => {
                    const output = {
                        ...tokenSet
                    };
                    if (output.access_token) {
                        output.access_token =
                            'REDACTED. Try creating an API endpoint to proxy requests to the resource server!';
                    }
                    if (output.id_token) {
                        output.id_token =
                            'REDACTED. Use this to create an authenticated user session on the server!';
                    }
                    if (output.refresh_token) {
                        output.refresh_token =
                            'REDACTED. Do not expose refresh tokens to the client!';
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