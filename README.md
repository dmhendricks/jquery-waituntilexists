[![Total Downloads](https://img.shields.io/packagist/dt/dmhendricks/jquery-waituntilexists.svg)](https://packagist.org/packages/dmhendricks/jquery-waituntilexists)

# jquery.waituntilexists.js

jQuery plugin that runs handler function once specified element is inserted into the DOM.

Forked from: [https://gist.github.com/PizzaBrandon/5709010](https://gist.github.com/PizzaBrandon/5709010)

```
bower install jq.waituntilexists --save
```

## Usage

```
$( '#selector' ).waitUntilExists(function() {
	// Do some magic
});
