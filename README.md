# APPLICATION_NAME functions


## Getting Started

This project is a starting point for a Firebase Functions application.

A few resources to get you started:

- [Getting Started](https://firebase.google.com/docs/functions/get-started)

### requirements

* `firebase cli`

```js
    make init
```
* [gcloud sdk](https://cloud.google.com/sdk/docs/install)


### rename template

> replaces `APPLICATION_NAME` token with name specified in cli

```js
make rename
```

## commands

### update firebase

```js
npm install firebase-functions@latest firebase-admin@latest --save
npm install -g firebase-tools
```

### run locally

```node
make start
```

### deploy to production

```node
make deploy
```
