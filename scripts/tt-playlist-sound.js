/**
 * 
 * @extends {PlaylistSound}
 */
 export class ttPlaylistSound extends PlaylistSound {
  constructor(data, context) {
    super(data, context);
  }

  /** @override */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if ( "path" in changed ) {
      this._removeTTFlags();
      if ( this.sound ) this.sound.stop();
      this.sound = this._createSound();
    }
    this.sync();
  }

  async _removeTTFlags(){
    if ( this.getFlag("track-tracker", "markin") ) {
      this.unsetFlag("track-tracker", "markin");
    }
    if ( this.getFlag("track-tracker", "markout") ) {
      this.unsetFlag("track-tracker", "markout");
    }
    if ( this.getFlag("track-tracker", "duration") ) {
      this.unsetFlag("track-tracker", "duration");
    }
  }

  /**
   * Special handling that occurs when playback of a PlaylistSound is started.
   * @private
   */
   async _onStart() {
    if ( !this.playing ) return this.sound.stop();

    // Apply fade timings
    const fade = this.fadeDuration;
    if ( fade ) {
      this._fadeIn(this.sound);
      if ( !this.data.repeat ) this.sound.schedule(this._fadeOut.bind(this), this.sound.duration - (fade / 1000));
    }

    const markin = this.getFlag("track-tracker", "markin");
    const markout = this.getFlag("track-tracker", "markout");
    if ( markout ) {
      //schedule an anticipated ending
      this.sound.schedule(this._markOut.bind(this), markout);
    } else {
      if ( this.data.repeat && markin ) {
        //in case there's a markin, bypass the auto-reapeat
        this.sound.schedule(this._markOut.bind(this), this.sound.duration - 0.1);
      }
    }

    // Playlist-level orchestration actions
    return this.parent._onSoundStart(this);
  }

  /**
   * Synchronize playback for this particular PlaylistSound instance
   */
   sync() {
    if ( !this.sound ) return;
    const fade = this.fadeDuration;

    // Conclude current playback
    if ( !this.playing ) {
      if ( fade && !this.data.pausedTime && this.sound.playing ) {
        return this.sound.fade(0, {duration: fade}).then(() => this.sound.stop());
      }
      else return this.sound.stop();
    }
    console.log(`TT | sync`, this.sound);
    // Determine playback configuration
    const playback = {
      loop: this.data.repeat,
      volume: this.volume,
      fade: fade
    };
    const markin = this.getFlag("track-tracker", "markin");
    if ( markin && this.playing && !this.sound.playing ) {
      playback.offset = markin;
    }

    if ( this.data.pausedTime && this.playing && !this.sound.playing ) playback.offset = this.data.pausedTime;

    // Load and autoplay, or play directly if already loaded
    if ( this.sound.loaded ) return this.sound.play(playback);
    return this.sound.load({autoplay: true, autoplayOptions: playback});
  }

  /**
   * Called by schedule to end or loop a sound before it's natural ending
   * in case of loop, start replay according to markin if exists.
   * @param {PlaylistSound} sound     the sound that triggered the schedule
   */
  _markOut(sound) {
    if ( !sound ) return;
    if ( !this.playing ) return;
    if ( !this.data.repeat ) {
      //just stop and signal the playlist to deal with the rest
      sound.stop();
      return this._onEnd();
    } else {
      sound.stop(); // note that .stop() also removes any scheduledEvents
      const playback = {
        loop: this.data.repeat,
        volume: this.volume
      };
      const markin = this.getFlag("track-tracker", "markin");
      if ( markin ) {
        playback.offset = markin;
      }
      //from Foundry's 'sync':
      // Load and autoplay, or play directly if already loaded
      if ( this.sound.loaded ) return this.sound.play(playback);
      return this.sound.load({autoplay: true, autoplayOptions: playback});
    }
  }
}