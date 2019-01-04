const IlpPacket = require('ilp-packet')

class PluginMultiplexChild {
  constructor (opts) {
    this._id = opts.id
    this._parent = opts.parent
  }

  isConnected () {
    return this._parent.isConnected()
  }

  connect () {
    return this._parent.connect()
  }

  disconnect () {
    return this._parent._removeChild(this._id)
  }

  sendData (data) {
    return this._parent._sendData(this._id, data)
  }

  registerDataHandler (handler) {
    this._dataHandler = handler
  }

  deregisterDataHandler () {
    this._dataHandler = null
  }
}

class PluginMultiplexParent {
  constructor (opts) {
    this._children = {}
  }

  _generateId () {
    // TODO: less jank?
    return Math.random().substring(2)
  }

  _sendData (id, data) {
    return this._handleData(data)
  }

  _removeChild (id) {
    delete this._children[id]
  }

  registerDataHandler (handler) {
    this._handleData = handler
  }

  deregisterDataHandler () {
    this._handleData = null
  }

  getChild ({ id: _id } = {}) {
    const id = _id || this._generateId()
    this._children[id] = new PluginMultiplexChild({
      parent: this,
      id
    })

    return this._children[id]
  }

  sendData () {
    const parsed = IlpPacket.deserializeIlpPrepare(data)
    const id = parsed.destinationAccount
      .substring(this._ildcp.clientAddress.length)
      .split('.')[0]

    const child = this._children[id]
    if (!child) {
      return IlpPacket.serializeReject({
        code: 'F02',
        triggeredBy: this._ildcp.clientAddress,
        message: 'no child with id. id=' + id
      })
    }

    return child._dataHandler(data)
  }

  async connect () {
    if (this._ildcp) {
      return
    }

    this._ildcp = await Ildcp.fetch(this._handleData)
  }

  async disconnect () {
    this._ildcp = null
  }

  isConnected () {
    return !!this._ildcp
  }
}

PluginMultiplexParent.PluginMultiplexChild = PluginMultiplexChild
PluginMultiplexParent.PluginMultiplexParent = PluginMultiplexParent
module.exports = PluginMultiplexParent
