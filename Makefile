.PHONY: test check

test:
	node --test

check: test
	node --check background.js
	node --check tests/background.test.js
	node -e 'JSON.parse(require("node:fs").readFileSync("manifest.json", "utf8"))'
