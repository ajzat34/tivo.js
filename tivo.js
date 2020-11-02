const EventEmitter = require('events');
const url = require('url');
var xml2js = require('xml2js');

const TiVoRequest = require('./http.js');
const TiVoDecoder = require('./tivodecode.js');

/**
* A show/movie recored on the tivo
*/
class Program {
  title;
  episodeTitle;
  description;
  duration;
  highDefinition;
  streamingPermission;
  sourceStation;
  sourceChannel;
  sourceType;
  seriesId;
  id;

  image;
  contentUrl;
  detailsUrl;

  mpegTS;
  mpegPS;

  #tivo;
  /**
  * @constructor
  */
  constructor(tivo, details, links) {
    this.#tivo = tivo;

    const self = this;
    const addDetail = (m,d, cb=d=>d) => {
      if (d in details)
      self[m] = cb(details[d][0]);
      else
      self[m] = null;
    }

    addDetail('title', 'Title');
    addDetail('episodeTitle', 'EpisodeTitle');
    addDetail('description', 'Description');
    addDetail('duration', 'Duration', parseInt);
    addDetail('highDefinition', 'HighDefinition', d=>d=='Yes');
    addDetail('streamingPermission', 'StreamingPermission', d=>d=='Yes');
    addDetail('sourceStation', 'SourceStation');
    addDetail('sourceChannel', 'SourceChannel', parseInt);
    addDetail('sourceType', 'SourceType');
    addDetail('seriesId', 'SeriesId');
    addDetail('id', 'ProgramId');


    this.contentUrl = links.Content[0].Url[0];
    this.image = links.CustomIcon[0].Url[0]
    this.detailsUrl = links.TiVoVideoDetails[0].Url[0];

    this.mpegTS = this.contentUrl + '&Format=video/x-tivo-mpeg-ts';
    this.mpegPS = this.contentUrl + '&Format=video/x-tivo-mpeg';
  }

  /**
  * @return stream
  */
  downloadMpegTS() {
    return this.#tivo.stream(this.mpegTS);
  }

  /**
  * @return stream
  */
  downloadMpegPS() {
    return this.#tivo.stream(this.mpegPS);
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
  constructor(address, mediaAccessKey, options={}) {
    super();
    this.address = address;
    this.mak = mediaAccessKey;
    this.client = new TiVoRequest(mediaAccessKey, options.curlLocation);
    this.decoder = new TiVoDecoder(mediaAccessKey, options.tivodecodeLocation);
    this.parser = new xml2js.Parser();
  }

  /**
  * @param {string} url
  * @return a stream with the file data;
  */
  stream(urlstr) {
    return this.client.getStream(
      url.resolve(this.address, urlstr),
    );
  }

  decode() {
    return this.decoder.start();
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
    // load the total number of shows
    let next = await this.nowplayingXML(offset);
    let totalItems = next.TiVoContainer.Details[0].TotalItems[0];
    //
    do {
      // get the first shows index
      const first = parseInt(next.TiVoContainer.ItemStart[0]);
      // get the number of shows loaded
      const size = parseInt(next.TiVoContainer.ItemCount[0]);
      // loop over every show loaded
      for (const program of next.TiVoContainer.Item) {
        const details = program.Details[0];
        const links = program.Links[0];
        const data = new Program(this, details, links);
        this.emit('data', data);
      }
      // get ready for the next set
      offset += size;
      if (offset < totalItems) next = await this.nowplayingXML(offset);
    } while (offset < totalItems);
    this.emit('done');
  }

  /**
  * @return {promise}
  */
  async list() {
    await this.all_list();
    return;
  }
}

module.exports = TiVo
