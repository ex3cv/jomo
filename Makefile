.PHONY: test check package

test:
	node --test

check: test
	node --check background.js
	node --check tests/background.test.js
	node --check tests/package.test.js
	node --check scripts/package.js
	node --check scripts/release.mjs
	node -e 'JSON.parse(require("node:fs").readFileSync("manifest.json", "utf8"))'

package:
	node scripts/package.js
