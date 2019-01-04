# ILP Plugin Multiplex
> Create multiple children of an ILP plugin in the same process

## Example

```js
const PluginMultiplex = require('ilp-plugin-multiplex')

// Create a parent
// (typically this is done as part of a connector config)
const plugin = new PluginMultiplex({})

// Create a child
const childPlugin1 = plugin.getChild()

// Create a child with custom id
// (this id is an address segment)
const childPlugin2 = plugin.getChild({ id: 'abcdef' })
```

## Why?

The same use case as mini-accounts, but sometimes you want to do it within a
single process. Mini accounts binds to a port which can be undesirable in some
situations, esp. in a browser where that's not possible.
