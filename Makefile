rename:
	npm install cli
	node ./cli/index.js

init:
	npm intall -g firebase-tools

start:
	firebase emulators:start

deploy:
	firebase deploy --only functions

token:
	gcloud auth print-identity-token

	git rm --cached