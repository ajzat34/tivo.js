const { spawn } = require('child_process');
const EventEmitter = require('events');
const path = require('path');

class TiVoRequest extends EventEmitter {
  constructor(mak, curl) {
    super();
    this.username = 'tivo';
    this.password = mak;
    this.curl = curl || 'curl';
  }

  #spawn(...args) {
    return spawn(this.curl, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }

  request(url) {
    // curl -k "https://192.168.1.110/TiVoConnect?Command=QueryContainer&Container=%2FNowPlaying&Recurse=Yes" -u tivo:6801808518
    return this.#spawn('-k', '--silent', '--show-error', '--fail', '--digest', '-u', `${this.username}:${this.password}`, url, '-H', 'Cache-Control: max-age=0', '-c', path.resolve(__dirname + 'cookiejar'));
  }

  unixScript() {
    return `${this.curl} --digest -u ${this.username}:${this.password} -H "Cache-Control: max-age=0" -c ${path.resolve(__dirname, 'cookiejar')}`;
  }

  async get(url) {
    let result = '';
    let err = '';
    const child = this.request(url);
    child.stdout.on('data', data=>result+=data);
    return new Promise(function(resolve, reject) {
      child.on('error', reject);
      child.stderr.on('data', data=>err+=data);
      child.on('close', (code)=>{
        if (code) reject('cURL stderr: ' + err + 'stdout: ' + result);
        else resolve(result);
      });
    });
  }
}

module.exports = TiVoRequest;
