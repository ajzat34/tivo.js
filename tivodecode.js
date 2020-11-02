const EventEmitter = require('events');
const { spawn } = require('child_process');

class TiVoDecoder extends EventEmitter {
  constructor(mediaAccessKey, td) {
    super();
    this.mak = mediaAccessKey;
    this.td = td || 'tivodecode';
  }

  #spawn(...args) {
    return spawn(this.td, args);
  }

  start() {
    return this.#spawn('-m', this.mak, '-');
  }
}

module.exports = TiVoDecoder;
