# tivo.js
Get metadata and download links from your TiVo

# Install
### Dependencies:
 * `cURL`
 * `Tivodecode-ng` or `Tivodecode` https://github.com/wmcbrine/tivodecode-ng. Required to decode files.
### NPM/Yarn:
```shell
$ npm install ajzat34/tivo.js
```
```shell
$ yarn add ajzat34/tivo.js
```

# Usage
```node
const {TiVo, Bonjour} = require('./index.js');
const mak = "Your Media Access Key from TiVo";

// use zeroconf/mdns/bonjour to discover tivos
const discovery = new Bonjour(mak);
// a new tivo was found
discovery.on('update', device=>{
  // print info about the tivo
  console.log(device);
  // create a TiVo instance
  const tivo = device.connect();
  
  // a program was loaded
  tivo.on('data', program=>{
    // print a description of the program
    console.log(program.toString());
    // print the command to curl and decode the program
    console.log(tivo.unixDecode(program));
  });
  
  // start scanning the tivo and emitting data events
  tivo.scan();
})
```
