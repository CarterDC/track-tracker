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
    // Tracker slider
    html.find('.track-tracker').change(this._onTrackTracker.bind(this));
    super.activateListeners(html);
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

    // 
    const ct = sound.playing ? sound.sound.currentTime : sound.data.pausedTime;
    const currentPercentage = parseInt(ct / sound.sound.duration * 100);
    if ( slider.value === currentPercentage ) return;

    if ( sound.sound ) {
      //calculate new 'current'  value
      const newCurrent = sound.sound.duration * (slider.value / 100);
      //force a pause with fake pausedTime
      sound.update({playing: false, pausedTime: newCurrent})
      .then(r =>{
        playlist.playSound(sound);
      })
    }
  }
}
