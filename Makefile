include config.mk

HOMEDIR = $(shell pwd)
BROWSERIFY = ./node_modules/.bin/browserify
UGLIFY = ./node_modules/uglify-es/bin/uglifyjs

pushall: sync
	git push origin master

run:
	wzrd app.js:index.js -- \
		-d

build:
	$(BROWSERIFY) app.js | $(UGLIFY) -c -m -o index.js

prettier:
	prettier --single-quote --write "**/*.js"

sync:
	scp index.html $(USER)@$(SERVER):$(APPDIR)
	scp index.js $(USER)@$(SERVER):$(APPDIR)
	scp app.css $(USER)@$(SERVER):$(APPDIR)

