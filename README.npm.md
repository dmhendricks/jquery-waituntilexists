[License: MIT](https://github.com/dmhendricks/jquery-waituntilexists/blob/main/LICENSE) · [jsDelivr package](https://www.jsdelivr.com/package/npm/@dmhendricks/jquery-waituntilexists)

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

Full documentation: [GitHub repository](https://github.com/dmhendricks/jquery-waituntilexists)
