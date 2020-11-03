const FFmpeg = require('./ffmpeg.js')

module.exports = {
  TiVo: require('./tivo.js'),
  Bonjour: require('./mdns.js'),
  FFmpeg,
  FFmpegOptions: FFmpeg.FFmpegOptions,
}
