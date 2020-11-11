const fetch = require('node-fetch');
const shops = require('../config');
const { modifyAvailability } = require('../helpers');

function inventoryUpdate(data) {
    const [inventoryData, idToSku] = data;

    return async function(req, res, next) {
        const webhookData = JSON.parse(req.body.toString());
        const modifiedItemId = webhookData.inventory_item_id;
        const sku = idToSku[modifiedItemId];

        try {
            const [availabilityData, totalChange] = await getShopsAvailabilityData(shops, inventoryData, sku);

            if (totalChange !== 0) {
                await postDataToShops(shops, inventoryData, sku, availabilityData, totalChange);
                inventoryData[sku].available += totalChange;
            }

            res.sendStatus(200);
        } catch(err) {
            next(err);
        }
    }
}


// Request the current availability of the item specified by the sku in all shops
async function getShopsAvailabilityData(shops, inventoryData, sku) {
    const currentAvailability = inventoryData[sku].available;
    let availabilityData = {};
    let totalChange = 0;
    const { API_ENDPOINT } = process.env;

    for (let shop of shops) {
        const {
            name,
            apiCredentials,
            domain,
        } = shop;

        const inventoryItemId = inventoryData[sku][name]['inventory_item_id'];
        const shopUrl = `https://${apiCredentials}@${domain}${API_ENDPOINT}/inventory_levels.json?inventory_item_ids=${inventoryItemId}`;
        const itemAvailabilityResponse = await fetch(shopUrl);
        const itemAvailabilityData = await itemAvailabilityResponse.json();
        const { available } = itemAvailabilityData.inventory_levels[0];
        availabilityData[name] = available;
        totalChange += available - currentAvailability;
    }

    return [availabilityData, totalChange];
}

async function postDataToShops(shops, inventoryData, sku, availabilityData, totalChange) {
    const currentAvailability = inventoryData[sku].available;

    const { API_ENDPOINT } = process.env;

    for (let shop of shops) {
        const {
            name,
            apiCredentials,
            domain,
        } = shop;

        if (currentAvailability + totalChange !== availabilityData[name]) {
            const {
                location_id,
                inventory_item_id,
            } = inventoryData[sku][shop.name];

            const dataToSend = {
                location_id,
                inventory_item_id,
                available: currentAvailability + totalChange,
            };

            const modifyAvailabilityResponse = await modifyAvailability(apiCredentials, domain, API_ENDPOINT, dataToSend);
            const modifyAvailabilityData = await modifyAvailabilityResponse.json();
            console.log(`Inventory level for item ${sku} modified in shop ${shop.name}: ${modifyAvailabilityData.inventory_level.available}`);
        }
    }
}

module.exports = inventoryUpdate;