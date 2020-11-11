# Instructions

1.- Set a tunnel to expose the local address (e.g. by using [ngrok](https://ngrok.com/) and running `ngrok http 3000`)
2.- Modify the .env file and add the exposed address and port (`APP_ADDRESS` and `PORT` respectively) from the previous step.
3.- Run `npm install`.
4.- Run `npm run start`.

Optinally, you can run `npm run startWithSync` to sync the whole inventory - based on the values of the first shop - when the app is setting up.