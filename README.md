[![Total Downloads](https://img.shields.io/packagist/dt/dmhendricks/jquery-waituntilexists.svg)](https://packagist.org/packages/dmhendricks/jquery-waituntilexists)

# jquery.waitUntilExists.js

jQuery plugin that runs handler function once specified element is inserted into the DOM.

Borrowed from: [https://gist.github.com/PizzaBrandon/5709010](https://gist.github.com/PizzaBrandon/5709010)

### Bower

```
bower install jq.waituntilexists --save
```

### Composer

```
composer require dmhendricks/jquery-waituntilexists
```

## Usage

```
$( '#selector' ).waitUntilExists( function() {
  // Do some magic
  console.log( this.id );
});
