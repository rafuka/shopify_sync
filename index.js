const express = require('express');
const bodyParser = require('body-parser');
const shops = require('./config');
const verifyWebhook = require('./middleware/verifyWebhook');
const errorHandler = require('./middleware/errorHandler');
const setup = require('./setup');
const inventoryUpdate = require('./controllers/inventoryUpdate');

require('dotenv').config();

const {
    API_ENDPOINT,
    APP_ADDRESS,
    PORT,
} = process.env;

setup(shops, API_ENDPOINT, APP_ADDRESS).then((data) => {
    console.log('Setup ready!');

    const app = express();

    app.use(bodyParser.raw({ type: 'application/json' }));

    app.post('/inventory_levels/update', verifyWebhook, inventoryUpdate(data));

    app.use(errorHandler);
    app.listen(PORT, () => console.log(`Listening on port ${PORT}!`));
}).catch(e => {
    console.log('There was an error setting up the app:');
    console.error(e.message);
});


