const EventEmitter = require('events');
const mdns = require('mdns');

const SERVICE = 'tivo-videos';
const TiVo = require('./tivo.js');

class TiVoDiscovery {
  name;
  id;
  record;
  host;
  address;
  mak;

  constructor(data, mak) {
    this.name = data.name;
    this.id = data.fullname;
    this.record = data.txtRecord;
    this.host = data.host;
    this.address = data.addresses[0],
    this.addresses = data.addresses,
    this.mak = mak;
  }

  connect(options, mak) {
    const tivo = new TiVo(this.address, mak || this.mak, this.name, options);
    return tivo;
  }

  toString() {
    return `TiVoDiscovery Device ${this.name} [${this.address}]`
  }
}

class TiVoBonjour extends EventEmitter {
  constructor(mediaAccessKey) {
    super();
    this.mak = mediaAccessKey;
    this.browser = mdns.createBrowser(mdns.tcp(SERVICE));
    this.browser.on('serviceUp', s=>this.#discover(s));
    this.devices = {};
    this.browser.start();
  }

  #discover(servicedata) {
    const device = new TiVoDiscovery(servicedata, this.mak);
    this.devices[device.name] = device;
    this.emit('update', device);
  }
}


module.exports = TiVoBonjour;
