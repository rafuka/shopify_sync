const fetch = require('node-fetch');
const { modifyAvailability } = require('./helpers');

const syncFlag = process.argv[2] === '--syncOnSetup';

async function getData(shopUrl) {
    const idToSku = {};
    const api_url = `${shopUrl}/products.json`;
    const response = await fetch(api_url);
    const productsData = await response.json();

    const allVariants = {};
    const inventoryItemIds = [];

    for (let product of productsData.products) {
        for (let variant of product.variants) {
            const {
                sku,
                inventory_item_id,
            } = variant;

            inventoryItemIds.push(inventory_item_id);
            idToSku[inventory_item_id] = sku;
        }
    }

    let inventoryLevels = [];

    // Retrieve all the inventory items' data. (max 50 at a time)
    while(inventoryItemIds.length > 0) {
        const inventoryLevelResponse = await fetch(`${shopUrl}/inventory_levels.json?inventory_item_ids=${inventoryItemIds.splice(0, 50)}`);
        const inventoryLevelData = await inventoryLevelResponse.json();
        inventoryLevels = [...inventoryLevels, ...inventoryLevelData.inventory_levels];
    }
    
    for (let item of inventoryLevels) {
        const {
            inventory_item_id,
            location_id,
            available,
        } = item;

        const sku = idToSku[inventory_item_id];

        allVariants[sku] = {
            available,
            itemData: {
                ['inventory_item_id']: inventory_item_id,
                ['location_id']: location_id,
            }
        };
    }

    return [allVariants, idToSku];
}

async function setup(shops, apiEndpoint, appAddress) {
    console.log('Setting up app...');

    const registerWebhookBody = {
        webhook: {
            topic: 'inventory_levels/update',
            address: `${appAddress}/inventory_levels/update`,
            format: 'json',
        }
    };

    let idToSku = {};
    const shopsData = {};
    const inventoryData = {};

    for (let shop of shops) {
        const shopUrl = `https://${shop.apiCredentials}@${shop.domain}${apiEndpoint}`;

        const [shopData, shopIdToSkuData] = await getData(shopUrl);

        shopsData[shop.name] = shopData;
        idToSku = {
            ...idToSku,
            ...shopIdToSkuData,
        };
        
        const webhooksList = await fetch(`${shopUrl}/webhooks.json`);
        const { webhooks } = await webhooksList.json();

        const existingWebhook = webhooks.filter((webhook) => {
            return webhook.address === `${appAddress}/inventory_levels/update`
        });

        if (existingWebhook.length === 0) {
            await fetch(`${shopUrl}/webhooks.json`, {
                method: 'POST',
                body: JSON.stringify(registerWebhookBody),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        
            console.log(`webhook registered for shop ${shop.name}.`);
        } else {
            console.log(`webhook for shop ${shop.name} already registered.`);
        }
    }

    const referenceShopName = shops[0].name;

    for (let sku of Object.keys(shopsData[referenceShopName])) {
        inventoryData[sku] = {
            available: shopsData[referenceShopName][sku].available,
            [referenceShopName]: shopsData[referenceShopName][sku].itemData,
        };

        for (let shop of shops) {
            const { name } = shop;
            if (name !== referenceShopName) {  
                inventoryData[sku][name] = shopsData[name][sku].itemData;
            }
        }
    }

    if (syncFlag) {
        const { API_ENDPOINT } = process.env;

        for (let shop of shops) {
            const {
                name,
                apiCredentials,
                domain,
            } = shop;

            if (name !== referenceShopName) {
                console.log(`Syncing inventory from shop ${referenceShopName} to shop ${name}`);

                for (let sku of Object.keys(inventoryData)) {
                    const { available } = inventoryData[sku];

                    const {
                        location_id,
                        inventory_item_id,
                    } = inventoryData[sku][name];

                    const dataToSend = {
                        location_id,
                        inventory_item_id,
                        available,
                    };

                    await modifyAvailability(apiCredentials, domain, API_ENDPOINT, dataToSend);

                    console.log(`synced item ${sku}`);
                }    
            }
        }
    }
    
    return [inventoryData, idToSku];
}

module.exports = setup;