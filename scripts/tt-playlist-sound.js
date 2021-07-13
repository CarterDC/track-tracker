/**
 * 
 * @extends {PlaylistSound}
 */
 export class ttPlaylistSound extends PlaylistSound {
  constructor(data, context) {
    super(data, context);
  }

  /**
   * @override
   * added removal of flags on path change
   * + mark out schedule if update during playback
   */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if ( "path" in changed ) {
      this._removeTTFlags();
      if ( this.sound ) this.sound.stop();
      this.sound = this._createSound();
    }
    if ( "repeat" in changed || "flag" in changed ) {
      if ( this.sound.playing ) {
        //just in case bahavior changes while playing
        const markin = this.getFlag("track-tracker", "markin");
        const markout = this.getFlag("track-tracker", "markout");
        if ( markout ) {
          //schedule an anticipated ending
          this.sound.schedule(this._markOut.bind(this), markout);
        } else if ( this.data.repeat && markin ) {
          //in case there's a markin, bypass the auto-reapeat
          this.sound.schedule(this._markOut.bind(this), this.sound.duration - 0.1);
        }
      }
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
   * @override added mark out schedule to end/loop a sound prematurely
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
   * 
   * @override adds mark in as offset
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
    // Determine playback configuration
    const playback = {
      loop: this.data.repeat,
      volume: this.volume,
      fade: fade
    };

    const markin = this.getFlag("track-tracker", "markin");
    const markout = this.getFlag("track-tracker", "markout");
    if ( markin && this.playing && !this.sound.playing ) {
      //set mark in as playback offset (overwriten by pausedtime in next statement if needed)
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
   * @param {Sound} sound     the sound (not PlaylistSound) that triggered the schedule
   */
  _markOut(sound) {
    if ( !sound ) return;
    if ( !this.playing ) return;
    if ( this.sound.id !== sound.id ) return;
    //console.log(`TT | _markout`, sound);
    if ( ! sound.loop ) {
      //just stop and signal the playlist to deal with the rest
      sound.stop();
      return this._onEnd();
    } else {
      sound.stop();
      const playback = {
        loop: true,
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