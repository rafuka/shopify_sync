const fetch = require('node-fetch');

async function modifyAvailability(apiCredentials, domain, apiEndpoint, data) {
    return fetch(`https://${apiCredentials}@${domain}${apiEndpoint}/inventory_levels/set.json`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
    });
}

module.exports = { modifyAvailability };