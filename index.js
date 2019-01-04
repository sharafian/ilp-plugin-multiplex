const IlpPacket = require('ilp-packet')

class PluginMultiplexChild {
  constructor (opts) {
    this.id = opts.id
    this.parent = opts.parent
  }

  async connect () {
    // no-op
    return
  }
}

class PluginMultiplexParent {
  constructor (opts) {
    this.upstream = opts.upstream
    this.children = {}
  }

  _generateId () {
    // TODO: less jank?
    return Math.random().substring(2)
  }

  getPlugin ({ id: _id }) {
    const id = _id || this._generateId()
    this.children[id] = new PluginMultiplexChild({
      parent: this,
      id
    })

    return this.children[id]
  }

  async connect () {
    await this.upstream.connect()    
    this.upstream.registerDataHandler(data => {
    })
  }

  disconnect () {
    return this.upstream.disconnect()
  }
}
