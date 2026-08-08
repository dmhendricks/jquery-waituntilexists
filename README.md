[![License](https://img.shields.io/badge/license-MIT-yellow.svg?style=flat-square)](https://github.com/dmhendricks/jquery-waituntilexists/blob/main/LICENSE)
[![NPM Downloads](https://img.shields.io/npm/dy/@dmhendricks/jquery-waituntilexists?label=npm&style=flat-square)](https://www.npmjs.com/package/@dmhendricks/jquery-waituntilexists)
[![jsDelivr Hits](https://data.jsdelivr.com/v1/package/npm/@dmhendricks/jquery-waituntilexists/badge)](https://www.jsdelivr.com/package/npm/@dmhendricks/jquery-waituntilexists?utm_source=github.com&utm_medium=referral&utm_content=button&utm_campaign=dmhendricks%2Fjquery-waituntilexists)

# jquery.waitUntilExists.js

jQuery plugin that runs handler function once specified element is inserted into the DOM.

Original author: [Brandon Belvin](https://gist.github.com/PizzaBrandon/5709010)

```bash
npm install @dmhendricks/jquery-waituntilexists
```

## Usage

```html
<script src="https://cdn.jsdelivr.net/npm/@dmhendricks/jquery-waituntilexists/jquery.waitUntilExists.min.js"></script>
```

```js
$( '#selector' ).waitUntilExists( function() {

	// Perform some logic
	console.log( $( this ).attr( 'id' ) );

	// Optionally remove the listener when finished
	$( this ).waitUntilExists( 'remove' );

});
```
