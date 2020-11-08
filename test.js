const {TiVo, Bonjour} = require('./index.js');

const mak = require('./mak.json');

const discovery = new Bonjour(mak);
discovery.on('update', device=>{
  console.log(device.toString());
  const tivo = device.connect();

  tivo.on('batch', (i,total)=>{
    console.log(`${Math.round(100*(i/total))}%`);
  });

  tivo.on('data', data=>{
    // console.log(data.getDetails());
    console.log(data.toString());
    console.log(tivo.unixDecode(data));
  });
  tivo.scan();
})
