const {TiVo} = require('./index.js');
const {pipeline} = require('stream');
const fs = require('fs');

const mak = require('./mak.json');

const tivo = new TiVo('https://192.168.1.110/', mak);
const shows = {};
tivo.on('data', data=>{
  // if (data.streamingPermission)
  // console.log(data.title)
  if (data.title === 'Back to the Future Part II') {
    console.log(data)
    const decoder = tivo.decode();
    const writestream = fs.createWriteStream('./out.ts');
    data.downloadMpegTS().pipe(decoder.stdin);
    decoder.stdout.pipe(writestream);
    // decoder.stdout.pipe(fs.createWriteStream('out.mpeg2'));
    decoder.stderr.pipe(process.stderr)
  }
});
tivo.list();

// tivo.on('ready', async ()=>{
// })
// console.log(tivo.connect());
