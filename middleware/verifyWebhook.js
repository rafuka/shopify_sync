const crypto = require('crypto');
const shops = require('../config');

function verifyWebhook(req, res, next) {
    const hmac = req.get('X-Shopify-Hmac-Sha256');
    const domain = req.get('X-Shopify-Shop-Domain');
    const rawBody = req.body;

    const shop = shops.filter(shop => shop.domain === domain)[0];
    const hash = crypto
        .createHmac('sha256', shop.secret)
        .update(rawBody, 'utf8', 'hex')
        .digest('base64');

    if (hash === hmac) {
        return next();
    } else {
        console.log(`Request secret from domain ${domain} did not match!`);
        return res.sendStatus(200);
    }
}

module.exports = verifyWebhook;