/**
 * Slight override of the sidebar directory which organizes and displays world-level Playlist documents.
 * @extends {PlaylistDirectory}
 */
export class ttPlaylistDirectory extends PlaylistDirectory {
  constructor(options) {
    super(options);
  }

    /* -------------------------------------------- */

  /** @override
   * changes vanilla template for module's
   * template is barely modified to use an external 'soundPartial' in lieu of the original inline one 
   */
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.template = "modules/track-tracker/templates/playlists-directory.html";
    return options;
  }

  /* -------------------------------------------- */

  /**
   * Create an object of rendering data for each Playlist document being displayed
   * @param {Playlist} playlist   The playlist to display
   * @returns {object}            The data for rendering
   * @private
   * @override added 4 lines to the original in order to avoid doing the same thing twice.
   */
   _preparePlaylistData(playlist) {
    const isGM = game.user.isGM;
    if ( playlist.playing ) this._playingPlaylists.push(playlist);

    // Playlist configuration
    const p = playlist.data.toObject(false);
    p.modeTooltip = this._getModeTooltip(p.mode);
    p.modeIcon = this._getModeIcon(p.mode);
    p.disabled = p.mode === CONST.PLAYLIST_MODES.DISABLED;
    p.expanded = this._expanded.has(p._id);
    p.css = [p.expanded ? "" : "collapsed", playlist.playing ? "playing" : ""].filterJoin(" ")
    p.controlCSS = (isGM && !p.disabled) ? "" : "disabled";

    // Playlist sounds
    const sounds = [];
    for ( let sound of playlist.sounds ) {
      if ( !isGM && !sound.playing ) continue;

      // All sounds
      const s = sound.data.toObject(false);
      s.playlistId = playlist.id;
      s.css = s.playing ? "playing" : "";
      s.controlCSS = isGM ? "" : "disabled";
      s.playIcon = this._getPlayIcon(sound);
      s.playTitle = s.pausedTime ? "PLAYLIST.SoundResume" : "PLAYLIST.SoundPlay";

      // Playing sounds
      if ( sound.playing || s.pausedTime ) {
        s.isPaused = !sound.playing && s.pausedTime;
        s.pauseIcon = this._getPauseIcon(sound);
        s.lvolume = AudioHelper.volumeToInput(s.volume);
        s.currentTime = this._formatTimestamp(sound.playing ? sound.sound.currentTime : s.pausedTime);
        //TT module specific - get duration from flag if exists
        let duration = sound.sound.duration || sound.getFlag("track-tracker", "duration");
        s.durationTime = this._formatTimestamp(duration);
        //TT module specific - calculate percentage
        s.trackPercentage = parseInt(
          (sound.playing ? sound.sound.currentTime : s.pausedTime) / duration * 100);
        //TT module specific - add flag values as percentage
        s.markin = parseInt(sound.getFlag("track-tracker", "markin") / duration * 100);
        s.markout = parseInt(sound.getFlag("track-tracker", "markout") / duration * 100);

        this._playingSounds.push(sound);
        this._playingSoundsData.push(s);
      }
      sounds.push(s);
    }
    p.sounds = sounds.sort((a, b) => a.name.localeCompare(b.name));
    return p;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    
    if(game.user.isGM){
      // Tracker slider
      html.find('.track-tracker').change(this._onTrackerClick.bind(this));
      html.find('.tt.mute-toggle').click(this._onMuteToggleClick.bind(this));

      const entryOptions = this._getTTContextOptions();
      new ContextMenu(html, '#currently-playing .sound', entryOptions);
    }
  }

  /**
   * Handle user interaction with a progression tracker
   * updates sound for everyone
   * @param {Event} event   The initial change event
   * @private
   */
  async _onTrackerClick(event) {

    event.preventDefault();
    const slider = event.currentTarget;
    const li = slider.closest(".sound");
    const playlist = game.playlists.get(li.dataset.playlistId);
    const sound = playlist.sounds.get(li.dataset.soundId);

    const ct = sound.playing ? sound.sound.currentTime : sound.data.pausedTime;
    const duration = sound.getFlag("track-tracker", "duration") || sound.sound.duration;
    if(!duration){
      ui.notifications.error('Sound has no valid duration atm');
      return;
    }
    const currentPercentage = parseInt(ct / sound.sound.duration * 100);
    if ( slider.value === currentPercentage ) return;

    if ( sound.sound ) {
      //calculate new 'current' value
      const newCurrent = sound.sound.duration * (slider.value / 100);
      if(sound.playing){
        //force a pause with fake pausedTime => then restart
        sound.update({playing: false, pausedTime: newCurrent})
        .then(r =>{
          return playlist.playSound(sound);
        });
      } else {
        //sound in pause, just update the fake pauseTime
        console.log(`TT | _onTrackerClick`);
        return await sound.update({playing: false, pausedTime: newCurrent});
      }
    }
  }

  /**
   * Handle user interaction with a mute toggle 'button'
   * @param {Event} event   The initial change event
   * @private
   */
  _onMuteToggleClick(event){
    const li = event.currentTarget.closest(".sound");
    const playlist = game.playlists.get(li.dataset.playlistId);
    const sound = playlist.sounds.get(li.dataset.soundId);
    let volume = 0;

    if(sound.data.volume == 0){
      volume = sound.getFlag("track-tracker", "volume") || 0.5; //TODO : hard value could be made an option
    } else {
      //remember current volume
      sound.setFlag("track-tracker", "volume", sound.data.volume);
    }

    // From Foundry's volume management :
    // Immediately apply a local adjustment
    const localVolume = volume * game.settings.get("core", "globalPlaylistVolume");
    sound.sound.fade(localVolume, {duration: PlaylistSound.VOLUME_DEBOUNCE_MS});
    // Debounce a change to the database
    if ( sound.isOwner ) sound.debounceVolume(volume);
  }

  /**
   * Get the set of ContextMenu options which should be used for currently playing PlaylistSound
   * @return {object[]}   The Array of context options passed to the ContextMenu instance
   * @protected
   */
  _getTTContextOptions(){
    return [
      {
        name: "TRACK-TRACKER.context.markin",
        icon: '<i class="fas fa-bookmark"></i>',
        callback: li => {
          const playlist = game.playlists.get(li[0].dataset.playlistId);
          const sound = playlist.sounds.get(li[0].dataset.soundId);
          this._editMark(sound, "markin")
        }
      },
      {
        name: "TRACK-TRACKER.context.markout",
        icon: '<i class="fas fa-bookmark"></i>',
        callback: li => {
          const playlist = game.playlists.get(li[0].dataset.playlistId);
          const sound = playlist.sounds.get(li[0].dataset.soundId);
          this._editMark(sound, "markout")
        }
      },
      {
        name: "TRACK-TRACKER.context.remove",
        icon: '<i class="fas fa-trash"></i>',
        condition: li => {
          const playlist = game.playlists.get(li[0].dataset.playlistId);
          const sound = playlist.sounds.get(li[0].dataset.soundId);
          return sound.getFlag("track-tracker", "markin") || sound.getFlag("track-tracker", "markout");
        },
        callback: li => {
          const playlist = game.playlists.get(li[0].dataset.playlistId);
          const sound = playlist.sounds.get(li[0].dataset.soundId);
          sound.unsetFlag("track-tracker", "markin");
          sound.unsetFlag("track-tracker", "markout");
        }
      }
    ];
  }

  /**
   * In response to a context menu action
   * Prompts user for a new mark value and sets a TRACK-TRACKER flag appropriately
   * @param {PlaylistSound} sound     The sound the player wants to put a mark on
   * @param {String} mark             Either 'markin' or 'markout' depending on context menu option
   * @private
   */
   async _editMark(sound, mark){
    if(!sound) return;

    //get previous mark values if exists
    const duration = sound.getFlag("track-tracker", "duration") || sound.sound.duration;
    const min = (mark === "markin") ? 0 : (sound.getFlag("track-tracker", "markin") || 0);
    const max = (mark === "markin") ? (sound.getFlag("track-tracker", "markout") || duration) : duration;
    const current = sound.getFlag("track-tracker", mark); // could be unefined

    //prompt for new value
    const prompt = game.i18n.format("TRACK-TRACKER.prompts.newValue",
      {
        name: game.i18n.localize(`TRACK-TRACKER.prompts.${mark}`),
        min: this._formatTimestamp(min),
        max: this._formatTimestamp(max)
      });
    let newValue = await Dialog.prompt({
      title: sound.name,
      content: `<p style="text-align:center;">${prompt}</p>`
       + `<input type="text"
        value="${this._formatTimestamp(current)}"
        title="${game.i18n.localize('TRACK-TRACKER.hints.markInput')}"
        placeholder="0:0">
        <br><br>`,
      callback: (html) => html.find('input').val(),
      rejectClose: false 
    })
    if(newValue === null) return;

    //try and update flag with new value
    const markValue = this._getValidMarkValue(
      {
        new :newValue,
        min: min,
        max: max,
        current : current
      });
    if(markValue === undefined) return;
    sound.setFlag("track-tracker", mark, markValue);
  }

  /**
   * Checks user input for valid mark format / value / range
   * displays warnigns and returns undefined otherwise
   * @param {Object} markData     User imput, min, max and current mark values
   * @returns {Number}            a valid mark value in seconds - undefined otherwise
   * @private
   */
   _getValidMarkValue(markData){
    //user input could be a number or a formated timestamp m:s
    const parsed = isNaN(markData.new) ? this._unFormatTimestamp(markData.new) : parseInt(markData.new);

    if(parsed === undefined){
      ui.notifications.error(game.i18n.format("TRACK-TRACKER.notifications.invalidFormat", {value: markData.new}));
      return;
    } 
    //checks against ranges
    if(parsed === markData.current) return;
    if(parsed <= markData.min || parsed >= markData.max){
      ui.notifications.error(game.i18n.format("TRACK-TRACKER.notifications.outtaBounds", {value: markData.new}));
      return;
    }
    return parsed;
  }

  /**
   * Parses a 'm:s' formated timestamp into seconds
   * returns undefined if format is not parsable
   * @param {String} timestamp   A string that should be formated like 'm:s'
   * @returns {Number}           The corresponding number of seconds - undefined otherwise
   * @private
   */
  _unFormatTimestamp(timestamp){
    const parts = timestamp.split(':');
    if(parts.length != 2) return;

    const minutes = parseInt(parts[0]);
    const seconds = parseInt(parts[1]);
    if(isNaN(minutes) || isNaN(seconds)) return;
    if(seconds >= 60) return; //could be a typo ?

    return minutes * 60 + seconds;
  }

  /**
   * Adds a flag on a PlaylistSound instance in order to have a reference when sound.sound.duration is not valid
   * @param {PlaylistSound} sound     The sound to put the flag onto
   * @private
   */
  async _addDurationFlag(sound){
    if(sound.getFlag("track-tracker", "duration")) return; //might be a mistake not to update ?
    if(sound.sound.duration){
      sound.setFlag("track-tracker", "duration", sound.sound.duration);
    }
  }

  /* -------------------------------------------- */

  /**
   * Update the displayed timestamps for all currently playing audio sources.
   * Runs on an interval every 1000ms.
   * @private
   * @override    Add tracker(s) update, sound duration based on flag, markout tracking
   */
   _updateTimestamps() {
    if ( !this._playingSounds.length ) return;
    const playing = this.element.find("#currently-playing")[0];
    if ( !playing ) return;
    for ( let sound of this._playingSounds ) {
      const li = playing.querySelector(`.sound[data-sound-id="${sound.id}"]`);
      if ( !li ) continue;

      // Update current and max playback time
      const current = li.querySelector("span.current");
      const ct = sound.playing ? sound.sound.currentTime : sound.data.pausedTime;
      // TT module specific duration from flag if exists
      const duration = sound.sound.duration || sound.getFlag("track-tracker", "duration");
      if ( current ) current.textContent = this._formatTimestamp(ct);
      const max = li.querySelector("span.duration");
      if ( max ) max.textContent = this._formatTimestamp(duration);
      // TT module specific
      //update tracker position
      const tracker = li.querySelector("input.track-tracker");
      if (tracker) tracker.value = parseInt(ct / duration * 100);

      // Remove the loading spinner
      const play = li.querySelector("a.pause i.fas");
      if ( play.classList.contains("fa-spinner") ) {
        play.classList.remove("fa-spin");
        play.classList.replace("fa-spinner", "fa-pause");
      }
    }
  }

  /**
   * Sound reached the markout - loop if needed or let the playlist decide
   * @param {PlaylistSound} sound   The sound being played
   */
   async _ttMarkoutStop(sound){
    if(sound.data.repeat){
      const playlist = sound.parent;
      const markin = sound.getFlag("track-tracker", "markin");
      if(markin){
        //sound has a markin, loop to that point
        sound.update({playing: false, pausedTime: markin})
        .then(r =>{
          return playlist.playSound(sound);
        });
      } else {
        //loop to the beginning (should be a better way though)
        sound.update({playing: false, pausedTime: 0.01})
        .then(r =>{
          return playlist.playSound(sound);
        });
      }
    } else {
      //no repeat, signify it's over and let the playlist do it's job.
      sound._onEnd();
    }
  }

  _onSoundPlay(event, action){
    const li = event.currentTarget.closest(".sound");
    const playlist = game.playlists.get(li.dataset.playlistId);
    const sound = playlist.sounds.get(li.dataset.soundId);
    this._addDurationFlag(sound);
    switch ( action ) {
      case "sound-play":
        //TT module specific : autoplay from the mark
        const isPaused = !sound.playing && sound.data.pausedTime;
        const markin = sound.getFlag("track-tracker", "markin");
        if(!isPaused && markin){
          return this._updateAndPlay(playlist, sound, markin);
        }
        return playlist.playSound(sound);
      case "sound-pause":
        return sound.update({playing: false, pausedTime: sound.sound.currentTime});
      case "sound-stop":
        return playlist.stopSound(sound);
    }
  }

  /**
   * redo that with options
   */
  async _updateAndPlay(playlist, sound, markin){
    sound.update({pausedTime: markin})
    .then(r =>{
      playlist.playSound(sound);
    });
  }


}
