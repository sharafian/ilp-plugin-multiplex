const IlpPacket = require('ilp-packet')
const Ildcp = require('ilp-protocol-ildcp')
const TokenBucket = require('./src/token-bucket')

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

  async disconnect () {
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
  constructor (opts = {}) {
    this._children = {}
    this._maxPacketAmount = Number(opts.maxPacketAmount)
    this._throughput = Number(opts.throughput)

    if (this._throughput) {
      this._bucket = new TokenBucket({
        refillPeriod: 1000,
        refillCount: this._throughput
      })
    }
  }

  _generateId () {
    // TODO: less jank?
    return String(Math.random()).substring(2)
  }

  _sendData (id, data) {
    const parsed = IlpPacket.deserializeIlpPrepare(data)
    console.log('got prepare from child', parsed)
    if (parsed.destination === 'peer.config') {
      console.log('got ildcp from child')
      return Ildcp.serializeIldcpResponse({
        clientAddress: `${this._ildcp.clientAddress}.${id}`,
        assetScale: this._ildcp.assetScale,
        assetCode: this._ildcp.assetCode
      })
    }

    try {
      if (this._maxPacketAmount &&
        (Number(parsed.amount) > this._maxPacketAmount)) {
        throw new IlpPacket.Errors.AmountTooLargeError('amount too large', {
          receivedAmount: parsed.amount,
          maximumAmount: String(this._maxPacketAmount)
        })
      }

      if (this._bucket && !this._bucket.take(parsed.amount)) {
        throw new IlpPacket.Errors
          .InsufficientLiquidityError('insufficient liquidity')
      }

      return this._handleData(data)
    } catch (e) {
      return IlpPacket.errorToReject(this._ildcp.clientAddress, e)
    }
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

  async sendData (data) {
    const parsed = IlpPacket.deserializeIlpPrepare(data)
    const id = parsed.destination
      .substring(this._ildcp.clientAddress.length)
      .split('.')[1]

    const child = this._children[id]
    if (!child) {
      return IlpPacket.serializeIlpReject({
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
