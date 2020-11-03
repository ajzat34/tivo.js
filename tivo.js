const EventEmitter = require('events');
const url = require('url');
var xml2js = require('xml2js');

const TiVoRequest = require('./http.js');
const TiVoDecoder = require('./tivodecode.js');
const FFmpeg = require('./ffmpeg.js');
const FFmpegOptions = FFmpeg.FFmpegOptions;

/**
* A show/movie recored on the tivo
*/
class Program {
  title;
  episodeTitle;
  description;
  duration;
  highDefinition;
  copyProtected;
  sourceStation;
  sourceChannel;
  sourceType;
  seriesId;
  programId;
  seriesServerId;
  programServerId;

  image;
  contentUrl;
  detailsUrl;
  id;

  mpegTS;
  mpegPS;

  server;

  #tivo;
  /**
  * @constructor
  */
  constructor(tivo, details, links, server) {
    this.#tivo = tivo;

    const self = this;
    const addDetail = (m,d, cb=d=>d) => {
      if (d in details)
      self[m] = cb(details[d][0]);
      else
      self[m] = null;
    }

    this.server = server;

    addDetail('title', 'Title');
    addDetail('episodeTitle', 'EpisodeTitle');
    addDetail('description', 'Description');
    addDetail('duration', 'Duration', parseInt);
    addDetail('highDefinition', 'HighDefinition', d=>d==='Yes');
    addDetail('copyProtected', 'CopyProtected', d=>d==='Yes');
    addDetail('sourceStation', 'SourceStation');
    addDetail('sourceChannel', 'SourceChannel', parseInt);
    addDetail('sourceType', 'SourceType');
    addDetail('seriesIdString', 'SeriesId');
    addDetail('programIdString', 'ProgramId');
    addDetail('seriesId', 'SeriesServerId', parseInt);
    addDetail('programId', 'ProgramServerId', parseInt);
    addDetail('id', 'IdGuideSource', parseInt);

    this.contentUrl = links.Content[0].Url[0];
    if ('CustomIcon' in links) this.image = links.CustomIcon[0].Url[0]
    this.detailsUrl = links.TiVoVideoDetails[0].Url[0];

    this.mpegTS = this.contentUrl + '&Format=video/x-tivo-mpeg-ts';
    this.mpegPS = this.contentUrl + '&Format=video/x-tivo-mpeg';

    const fileTitle = this.title.replace(/ /g, '_').replace(/:/g, '');
    const episodeTitle = this.episodeTitle? this.episodeTitle.replace(/ /g, '_').replace(/:/g, ''):'';

    if (this.episodeTitle) {
      this.fileName = `${fileTitle}-${episodeTitle}`
    } else {
      this.fileName = `${fileTitle}`;
    }
  }

  toString() {
    let r = `${this.server}: `;
    if (this.episodeTitle) {
      r += `${this.episodeTitle} (${this.title})`
    } else {
      r += `${this.title}`
    }
    r+= ` - ${this.seriesId}:${this.programId}:${this.id}`
    if (this.copyProtected) {
      r += ' (Protected)'
    }
    return r;
  }
}

class TiVo extends EventEmitter {
  /**
  * @constructor
  * @param {string} address
  * @param {string} mediaAccessKey
  * @param {object | undefined} options
  *
  * @event error
  * @event data
  * @event done
  */
  constructor(address, mediaAccessKey, name, options={}) {
    super();
    this.name = name;
    this.address = `https://${address}/`;
    this.mak = mediaAccessKey;
    this.ffmpeg = new FFmpeg(options.ffmpegLocation);
    this.client = new TiVoRequest(mediaAccessKey, options.curlLocation);
    this.decoder = new TiVoDecoder(mediaAccessKey, options.tivodecodeLocation);
    this.parser = new xml2js.Parser();
  }

  /**
  * @param {Program} program
  * valid args: ['decode', 'play']
  */
  unixScript(program, ...args) {
    let script = this.client.unixScript();
    script += ` "${program.mpegTS}"`;
    if (args.includes('decode')) {
      script += ' | ' + this.decoder.unixScript();
    }
    if (args.includes('play')) {
      script += ' | ffplay -';
    }
    return script
  }

  unixDownloadScript(program, ffmpegOptions) {
    let script = this.client.unixScript();
    script += ` "${program.mpegTS}"`;
    script += ' | ' + this.decoder.unixScript();
    script += ' | ' + this.ffmpeg.compile(ffmpegOptions);
    return script
  }

  /** load a nowplayingXML page */
  async nowplayingXML(offset=0) {
    return await this.parser.parseStringPromise(
      await this.client.get(
        url.resolve(this.address, `/TiVoConnect?Command=QueryContainer&Container=%2FNowPlaying&Recurse=Yes&AnchorOffset=${offset}`),
      )
    );
  }

  /**
  * emit data for every possible show
  */
  async all_list() {
    let offset = 0;
    let next;
    let totalItems = Infinity;

    // loop over each chunk or shows
    do {

      // load the total number of shows
      next = await this.nowplayingXML(offset);
      totalItems = next.TiVoContainer.Details[0].TotalItems[0];

      // get the first shows index
      const first = parseInt(next.TiVoContainer.ItemStart[0]);
      // get the number of shows loaded
      const size = parseInt(next.TiVoContainer.ItemCount[0]);

      // loop over every show loaded
      for (const program of next.TiVoContainer.Item) {
        const details = program.Details[0];
        const links = program.Links[0];
        const data = new Program(this, details, links, this.name);
        this.emit('data', data);
      }

      // get ready for the next set
      offset += size;

    } while (offset < totalItems);

    this.emit('done');
  }

  /**
  * @return {promise}
  */
  async scan() {
    await this.all_list();
    return;
  }
}

module.exports = TiVo
