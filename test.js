const {TiVo, Bonjour, FFmpegOptions} = require('./index.js');
const {pipeline} = require('stream');
const fs = require('fs');

const mak = require('./mak.json');

const opt = new FFmpegOptions('out.mkv');
opt.use(FFmpegOptions.crf(22));

const discovery = new Bonjour(mak);
discovery.on('update', device=>{
  console.log(device.toString());
  const tivo = device.connect();

  tivo.on('data', data=>{
    console.log(data.toString());
    console.log(tivo.unixDownloadScript(data, opt));
  });
  tivo.scan();
})
