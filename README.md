# Instructions

1. Clone repo.
2. Set a tunnel to expose the local address (e.g. by using [ngrok](https://ngrok.com/) and running `ngrok http 3000`).
3. Copy the .env.example file into a .env file and modify the exposed address and port (`APP_ADDRESS` and `PORT` respectively) using the exposed address from the previous step.
4. Run `npm install`.
5. Run `npm run start`.

Optinally, you can run `npm run startWithSync` to sync the whole inventory -- based on the values of the first store defined in the `config.js` file -- at the app's setup.


# Summary

This app allows to synchronize the inventory between two or more stores. In order to register a store, a [private app](https://shopify.dev/tutorials/authenticate-a-private-app-with-shopify-admin) must be created on Shopify's store dashboard, and an entry must be added to the `config.js` file with the necessary data. Namely the shop's name, domain, [api credentials](https://shopify.dev/tutorials/generate-api-credentials#generate-credentials-in-the-shopify-admin), and [webhooks' secret](https://shopify.dev/tutorials/manage-webhooks#verifying-webhooks).

The app uses Shopify's RESTful API in order to register Webhooks on the specified stores and "listen" for changes in the inventory levels of item variants. Whenever an item's inventory level changes (whether changed manually, by the API, or by fullfilling orders), a webhook is triggered and a request is received at an endpoint of the app.

When the app is run for the first time, a setup function is called in which webhooks are registered and the data from the inventories of the different stores is fetched and structured. There are two main data structures that are used when performing the necessary operations for synchronization. One of them is the `inventoryData`, which maps product variant's SKU codes to an object containing some data for that specific item. Namely, the current availability amount, and each store's `inventory_item_id` and `location_id` of the item. The other data structure is the `idToSku` map, which maps inventory item ids to SKU codes. Since items can have different ids in different stores, having an id-to-sku map in memory allows to quickly retrieve the SKU code for an item with the id received on a webhook request, and then use the SKU code to access the item's data on the `inventoryData`. 

The synchronization of item's quantities across all stores is done by "taking a snapshot" of the current quantity of a given item from each store every time a webhook request is received. By taking a snapshot (i.e. making a GET request for the item's inventory level data), we make sure we are working with the values for the item's availability at the moment the request is received, instead of relying in the webhook's possibly outdated data. This also allows us to get the data for the item from all stores, and not just the availability data that is received in the webhook's request from a specific store.

Once a webhook request is received, we compare the avalability value stored in memory with the current availability of the item in the different stores, and calculate the total change in the inventory level. With the total change, we calculate by how much the inventory should be adjusted in each store. The new availability value is saved in memory as well.

The app does not use a database system, since the memory footprint of the data is quite low (~50Kb for 147 product variants), having the data in memory allows for faster read/write operations.

## Use cases

The app synchronizes the inventory whenever
 - An order is fulfilled (either by a user/buyer or by manually fulfilling an order in the store's dashboard).
 - An item's quantity is manually modified in the store's dashboard.
 - Another application modifies an item's inventory level via the Shopify API.

 ## Observations, limitations, and points for further research

 - It is assumed that the inventory in both shops is equal. That is to say, the same product variants, with their respective SKU codes are present in the stores to be synchronized. It'd be interesting to extend the app to use a database that would act as the source of truth for product variants to be synchronized. Then some functionality to create these products in the registered stores could be added. 
 - It might be useful to add separate endpoints for each store associated with Webhooks. Currently the webhooks are processed by the same endpoint. I'd need to do more research to be sure what, if any, would be the advantages of this.


