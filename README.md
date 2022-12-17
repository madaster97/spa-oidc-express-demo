# spa-oidc-express-demo
An example Openid Connect Relying Party where the frontend is a Single-Page App

# Run the Example
First, copy the config/example.env file and add your config.
Sample runs on redirect_uri http://localhost:3000

```
node -r dotenv/config . dotenv_config_path=config/your-config.env
```

Then open the app on http://localhost:3000

# Simulate an Attack
Still working on this. I don't know how you could attack this, given the sensitive data goes through cookies.