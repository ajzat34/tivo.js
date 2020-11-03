const assert = require('assert');

class FFmpegEnum {
  data;
  constructor(c){this.data = c};
  use() {
    return '';
  }
}

class FFmpegNumeric extends FFmpegEnum {
  constructor(value) {
    assert(typeof value === 'number');
    if (value === 0) super(null);
    else super(value);
  }
}

class FFmpegInputFile extends FFmpegEnum {
  use() {
    return this.data? ` -i ${this.data}`:'';
  }
};
class FFmpegOutputFile extends FFmpegEnum {
  use() {
    return this.data? ` ${this.data}`:'';
  }
};
class FFmpegVideoCodec extends FFmpegEnum {
  use() {
    return this.data? ` -c:v ${this.data}`:'';
  }
};
class FFmpegAudioCodec extends FFmpegEnum {
  use() {
    return this.data? ` -c:a ${this.data}`:'';
  }
};
class FFmpegFormat extends FFmpegEnum {
  use() {
    return this.data? ` -f ${this.data}`:'';
  }
};
class FFmpegCRF extends FFmpegNumeric {
  use() {
    return this.data? ` -crf ${this.data}`:'';
  }
};
class FFmpegPreset extends FFmpegEnum {
  use() {
    return this.data? ` -preset ${this.data}`:'';
  }
};
class FFmpegTune extends FFmpegEnum {
  use() {
    return this.data? ` -tune ${this.data}`:'';
  }
};
class FFmpegAudioBitrate extends FFmpegNumeric {
  use() {
    return this.data? ` -b:a ${this.data}k`:'';
  }
};
class FFmpegVideoBitrate extends FFmpegNumeric {
  use() {
    return this.data? ` -maxrate ${this.data}k -bufsize ${this.data}k`:'';
  }
};

class FFmpegVideoFilter extends FFmpegEnum {
};

class FFmpegFilterPullup extends FFmpegVideoFilter {
  use() {
    return 'pullup';
  }
}

class FFmpegFilterScale extends FFmpegVideoFilter {
  constructor(x,y){
    super(null);
    this.x = x;
    this.y = y;
  }
  use() {
    return `scale=${this.x}:${this.y}`;
  }
}

class FFmpegFilterCrop extends FFmpegVideoFilter {
  constructor(x,y){
    super(null);
    this.x = x;
    this.y = y;
  }
  use() {
    return `crop=${this.x}:${this.y}`;
  }
}

class FFmpegOptions {
  // file
  input = new FFmpegInputFile('pipe:0')
  output = new FFmpegOutputFile('pipe:1');

  // -c:v
  codec = FFmpegOptions.H264;
  crfv = FFmpegOptions.crf(0);
  preset = FFmpegOptions.presets.medium;
  tune = FFmpegOptions.tunes.none;
  maxrate = FFmpegOptions.bitrate_video(0);

  // -c:a
  audio = FFmpegOptions.AAC;
  audioBitrate = FFmpegOptions.bitrate_audio(256);

  // -f
  format = new FFmpegEnum(null);

  // -vf
  filters = [];

  constructor(out){
    this.output = new FFmpegOutputFile(out);
  };

  use(opt) {
         if (opt instanceof FFmpegVideoCodec) this.codec = opt;
    else if (opt instanceof FFmpegAudioCodec) this.audio = opt;
    else if (opt instanceof FFmpegCRF) this.crfv = opt;
    else if (opt instanceof FFmpegPreset) this.preset = opt;
    else if (opt instanceof FFmpegVideoBitrate) this.maxrate = opt;
    else if (opt instanceof FFmpegAudioBitrate) this.audioBitrate = opt;
    else if (opt instanceof FFmpegFormat) this.format = opt;
    else if (opt instanceof FFmpegVideoFilter) this.filters.push(opt);
    else throw new Error(`argument for use is not FFmpegVideoCodec, FFmpegAudioCodec, ect...`);
    return this;
  };

  static H264 = new FFmpegVideoCodec('libx264');
  static VIDEO_COPY = new FFmpegVideoCodec('copy');
  static AAC = new FFmpegAudioCodec('aac');
  static AUDIO_COPY = new FFmpegAudioCodec('copy');
  static AC3 = new FFmpegAudioCodec('ac3');
  static VORBIS = new FFmpegAudioCodec('vorbis');
  static OPUS = new FFmpegAudioCodec('libopus');
  static MKV = new FFmpegFormat('mkv');

  static PULLUP = new FFmpegFilterPullup(null);

  static SCALE = {
    480: new FFmpegFilterScale(-1,480),
    720: new FFmpegFilterScale(-1,720),
    1080: new FFmpegFilterScale(-1,1080),
    create(x,y) {
      assert(typeof x === 'number');
      assert(typeof y === 'number');
      return new FFmpegFilterScale(x,y);
    },
  }

  static CROP = {
    480: new FFmpegFilterCrop(-1,480),
    720: new FFmpegFilterCrop(-1,720),
    1080: new FFmpegFilterCrop(-1,1080),
    create(x,y) {
      assert(typeof x === 'number');
      assert(typeof y === 'number');
      return new FFmpegFilterCrop(x,y);
    },
  }

  static properties = [
    'input',
    'format',
    'codec',
    'crfv',
    'preset',
    'tune',
    'maxrate',
    'audio',
    'audioBitrate',
  ];

  static presets = {
    ultrafast: new FFmpegPreset('ultrafast'),
    superfast: new FFmpegPreset('superfast'),
    veryfast: new FFmpegPreset('veryfast'),
    faster: new FFmpegPreset('faster'),
    fast: new FFmpegPreset('fast'),
    medium: new FFmpegPreset('medium'),
    slow: new FFmpegPreset('slow'),
    slower: new FFmpegPreset('slower'),
    veryslow: new FFmpegPreset('veryslow'),
    placebo: new FFmpegPreset('placebo'),
  };

  static tunes = {
    none: new FFmpegTune(null),
    film: new FFmpegTune('film'),
    animation: new FFmpegTune('animation'),
    grain: new FFmpegTune('grain'),
    film: new FFmpegTune('film'),
    film: new FFmpegTune('film'),
  };

  static crf(value) {
    return new FFmpegCRF(value);
  }

  static bitrate_audio(value) {
    return new FFmpegAudioBitrate(value);
  }

  static bitrate_video(value) {
    return new FFmpegVideoBitrate(value);
  }

  compile() {
    let c = '';
    for (const p of FFmpegOptions.properties) {
      // console.log(p, o[p])
      c += this[p].use();
    }
    if (this.filters.length) {
      let vf = this.filters.map(f=>f.use()).join(',');
      c += ` -vf "${vf}"`;
    }
    c += this.output.use();
    return c;
  }
}

class FFmpeg {
  /**
  * @constructor
  * @param {string} ffmpeg
  */
  constructor(ffmpeg = 'ffmpeg') {
    this.ffmpeg = ffmpeg
  }

  static FFmpegOptions = FFmpegOptions;

  compile(o) {
    return this.ffmpeg + o.compile();
  }
}
//
// const f = new FFmpeg();
// const o = new FFmpeg.FFmpegOptions('out.txt');
// o.use(FFmpegOptions.crf(24));
// o.use(FFmpegOptions.presets.medium);
// o.use(FFmpegOptions.bitrate_video(1024));
// o.use(FFmpegOptions.bitrate_audio(320));
// o.use(FFmpegOptions.PULLUP);
// o.use(FFmpegOptions.SCALE[720]);
// o.use(FFmpegOptions.CROP[720]);
// console.log(f.compile(o));

module.exports = FFmpeg;
