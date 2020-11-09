const EventEmitter = require('events');
const url = require('url');
var xml2js = require('xml2js');
var {XXHash64} = require('xxhash');

const TiVoRequest = require('./http.js');
const TiVoDecoder = require('./tivodecode.js');

function cleanFileName(str) {
  return str
  .replace(/[ =\\/()\[\]]/g, '_')
  .replace(/[ !@#$%^&*/<>+:;|?]/g, '-')
}

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
  captureDate;
  showingDuration;
  idGuideSource;
  showingStartTime;
  size;
  sizeGB;

  image;
  contentUrl;
  detailsUrl;
  id;

  mpegTS;
  mpegPS;

  server;

  #tivo;
  #details;
  /**
  * @constructor
  */
  constructor(tivo, details, links, server) {
    this.#tivo = tivo;
    this.#details = details;

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
    addDetail('seriesId', 'SeriesId');
    addDetail('programId', 'ProgramId');
    addDetail('seriesServerId', 'SeriesServerId', parseInt);
    addDetail('programServerId', 'ProgramServerId', parseInt);
    addDetail('idGuideSource', 'IdGuideSource', parseInt);
    addDetail('size', 'SourceSize', parseInt);
    addDetail('captureDate', 'CaptureDate', data=>parseInt(data, 16));
    addDetail('showingDuration', 'ShowingDuration', data=>parseInt(data, 16));
    addDetail('showingStartTime', 'ShowingStartTime', data=>parseInt(data, 16));

    this.sizeGB = this.size * 1e-9;

    const hasher = new XXHash64(0x01231234);
    hasher.update(Buffer.from(this.server.toString()));
    hasher.update(Buffer.from(this.seriesServerId.toString()));
    hasher.update(Buffer.from(this.programServerId.toString()));
    hasher.update(Buffer.from(this.captureDate.toString()));
    hasher.update(Buffer.from(this.showingStartTime.toString()));
    hasher.update(Buffer.from(this.sourceChannel.toString()));
    hasher.update(Buffer.from(this.episodeTitle? this.episodeTitle.toString():'na'));
    hasher.update(Buffer.from(this.title.toString()));

    this.id = hasher.digest('hex');

    this.contentUrl = links.Content[0].Url[0];
    if ('CustomIcon' in links) this.image = links.CustomIcon[0].Url[0]
    this.detailsUrl = links.TiVoVideoDetails[0].Url[0];

    this.mpegTS = this.contentUrl + '&Format=video/x-tivo-mpeg-ts';
    this.mpegPS = this.contentUrl + '&Format=video/x-tivo-mpeg';

    const fileTitle = cleanFileName(this.title);
    const episodeTitle = this.episodeTitle? cleanFileName(this.episodeTitle):'';

    if (this.episodeTitle) {
      this.fileName = `${fileTitle}-${episodeTitle}`
    } else {
      this.fileName = `${fileTitle}`;
    }
  }

  toString() {
    let r = '';
    if (this.episodeTitle) {
      r += `${this.episodeTitle} (${this.title})`
    } else {
      r += `${this.title}`
    }
    r+= ` ${this.sizeGB.toFixed(2)}GB - ${this.id}`
    if (this.copyProtected) {
      r += ' (Protected)'
    }
    return r;
  }

  getDetails() {
    return this.#details
  }

  unixDecode() {
    return this.#tivo.unixDecode(this);
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
    this.client = new TiVoRequest(mediaAccessKey, options.curlLocation);
    this.decoder = new TiVoDecoder(mediaAccessKey, options.tivodecodeLocation);
    this.parser = new xml2js.Parser();
  }

  /**
  * @param {Program} program
  * @return {string}
  */
  unixCurl(program) {
    let script = this.client.unixScript();
    script += ` "${program.mpegTS}"`;
    return script
  }

  /**
  * @param {Program} program
  * @return {string}
  */
  unixDecode(program) {
    return this.unixCurl(program) + ' | ' + this.decoder.unixScript();
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

      this.emit('batch', first, totalItems);

      // loop over every show loaded
      let i = 0;
      for (const program of next.TiVoContainer.Item) {
        const details = program.Details[0];
        const links = program.Links[0];
        const data = new Program(this, details, links, this.name);
        this.emit('data', data, first+i, totalItems);
        i++;
      };

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
