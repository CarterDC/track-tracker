/**
 * Slight override of the sidebar directory which organizes and displays world-level Playlist documents.
 * @extends {PlaylistDirectory}
 */
export class ttPlaylistDirectory extends PlaylistDirectory {
  constructor(options) {
    super(options);
  }

    /* -------------------------------------------- */

  /** @override */
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
   * @override
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
        s.durationTime = this._formatTimestamp(sound.sound.duration);
        //TT module specific - calculate percentage
        s.trackPercentage = parseInt(
          (sound.playing ? sound.sound.currentTime : s.pausedTime) / sound.sound.duration * 100);
        this._playingSounds.push(sound);
        this._playingSoundsData.push(s);
      }
      sounds.push(s);
    }
    p.sounds = sounds.sort((a, b) => a.name.localeCompare(b.name));
    return p;
  }

  /* -------------------------------------------- */

  /**
   * Update the displayed timestamps for all currently playing audio sources.
   * Runs on an interval every 1000ms.
   * @private
   * @override    Add tracker(s) update
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
      if ( current ) current.textContent = this._formatTimestamp(ct);
      const max = li.querySelector("span.duration");
      if ( max ) max.textContent = this._formatTimestamp(sound.sound.duration);
      // TT module specific
      const tracker = li.querySelector("input.track-tracker");
      if ( tracker ) tracker.value = parseInt(ct / sound.sound.duration * 100);

      // Remove the loading spinner
      const play = li.querySelector("a.pause i.fas");
      if ( play.classList.contains("fa-spinner") ) {
        play.classList.remove("fa-spin");
        play.classList.replace("fa-spinner", "fa-pause");
      }
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    // Tracker slider
    if(game.user.isGM){
      html.find('.track-tracker').change(this._onTrackTracker.bind(this));
      const entryOptions = this._getTTContextOptions();
      new ContextMenu(html, '#currently-playing .sound', entryOptions);
    }
  }

  /* -------------------------------------------- */
   _getTTContextOptions(){
      return [
        {
          name: "TRACK-TRACKER.context.markin",
          icon: '<i class="fas fa-bookmark"></i>',
          callback: li => {
            const playlist = game.playlists.get(li[0].dataset.playlistId);
            const sound = playlist.sounds.get(li[0].dataset.soundId);
            this.editMark(sound, "markin")
          }
        },
        {
          name: "TRACK-TRACKER.context.markout",
          icon: '<i class="fas fa-bookmark"></i>',
          callback: li => {
            const playlist = game.playlists.get(li[0].dataset.playlistId);
            const sound = playlist.sounds.get(li[0].dataset.soundId);
            this.editMark(sound, "markout")
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

  /* -------------------------------------------- */

  /**
   * Handle tracking of a PlaylistSound
   * @param {Event} event   The initial change event
   * @private
   */
   async _onTrackTracker(event) {
    event.preventDefault();
    const slider = event.currentTarget;
    const li = slider.closest(".sound");
    const playlist = game.playlists.get(li.dataset.playlistId);
    const sound = playlist.sounds.get(li.dataset.soundId);

    //don't go further if slider is already positionned on the current percentage
    const ct = sound.playing ? sound.sound.currentTime : sound.data.pausedTime;
    const currentPercentage = parseInt(ct / sound.sound.duration * 100);
    if ( slider.value === currentPercentage ) return;

    if ( sound.sound ) {
      //calculate new 'current' value
      const newCurrent = sound.sound.duration * (slider.value / 100);
      //force a pause with fake pausedTime => then restart
      sound.update({playing: false, pausedTime: newCurrent})
      .then(r =>{
        playlist.playSound(sound);
      });
    }
  }

  async editMark(sound, mark){
    if(!sound) return;

    //get previous mark values if exists
    const min = (mark === "markin") ? 0 : (sound.getFlag("track-tracker", "markin") || 0);
    const max = (mark === "markin") ? (sound.getFlag("track-tracker", "markout") || sound.sound.duration) : sound.sound.duration;
    const current = sound.getFlag("track-tracker", mark) || 0;

    //console.log(`TT | duration :`, sound.sound.duration);
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
        title="${game.i18n.localize(`TRACK-TRACKER.hints.markInput`)}">
        <br><br>`,
      callback: (html) => html.find('input').val(),
      rejectClose: false 
    })
    if(!newValue) return;
    //try and update flag with new value
    const markValue = this._getMarkValue({
      new :newValue,
      min: min,
      max: max,
      current : current
    });
    if(markValue === undefined) return;
    sound.setFlag("track-tracker", mark, markValue);
  }

  _getMarkValue(markData){
    const parsed = isNaN(markData.new) ? this._unFormatTimestamp(markData.new) : parseInt(markData.new);

    if(parsed === undefined){
      ui.notifications.error(game.i18n.format("TRACK-TRACKER.notifications.invalidFormat", {value: markData.new}));
      return;
    } 
    //do lots of checks & shit
    if(parsed === markData.current) return;
    if(parsed <= markData.min || parsed >= markData.max){
      ui.notifications.error(game.i18n.format("TRACK-TRACKER.notifications.outtaBounds", {value: markData.new}));
      return;
    } 
    return parsed; 
  }

  _unFormatTimestamp(timestamp){
    const parts = timestamp.split(':');
    if(parts.length != 2) return;

    const minutes = parseInt(parts[0]);
    const seconds = parseInt(parts[1]);
    if(isNaN(minutes) || isNaN(seconds)) return;

    return minutes * 60 + seconds;
  }
}
