const EventEmitter = require('events');

class TiVoDecoder extends EventEmitter {
  constructor(mediaAccessKey, td) {
    super();
    this.mak = mediaAccessKey;
    this.td = td || 'tivodecode';
  }

  unixScript() {
    return `${this.td} -m ${this.mak} -`;
  }
}

module.exports = TiVoDecoder;
