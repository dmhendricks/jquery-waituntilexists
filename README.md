[![GitHub License](https://img.shields.io/badge/license-MIT-green.svg)](https://raw.githubusercontent.com/dmhendricks/wordpress-base-plugin/master/LICENSE)
[![Latest Version](https://img.shields.io/github/release/dmhendricks/jquery-waituntilexists.svg)](https://github.com/dmhendricks/jquery-waituntilexists/releases)
[![Twitter](https://img.shields.io/twitter/url/https/github.com/dmhendricks/wordpress-base-plugin.svg?style=social)](https://twitter.com/danielhendricks)

# jquery.waitUntilExists.js

jQuery plugin that runs handler function once specified element is inserted into the DOM.

Borrowed from: [https://gist.github.com/PizzaBrandon/5709010](https://gist.github.com/PizzaBrandon/5709010)

### Bower Installation

```
bower install jq.waituntilexists --save
```

## Usage

```
$( '#selector' ).waitUntilExists( function() {
  // Do some magic
  console.log( this.id );
});
