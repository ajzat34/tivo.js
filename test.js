const {TiVo} = require('./index.js');

const mak = require('./mak.json');

const tivo = new TiVo('https://192.168.1.110/', mak);
const shows = {};
tivo.on('data', data=>{
  console.log(data)
  if (data.title === 'The Good, the Bad and the Ugly') {
    data.downloadStream().on('data', console.log);
  }
});
tivo.list();

// tivo.on('ready', async ()=>{
// })
// console.log(tivo.connect());
