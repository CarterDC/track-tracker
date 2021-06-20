/**
 * Slight override of the sidebar directory which organizes and displays world-level Playlist documents.
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
    if(this.getFlag("track-tracker", "markin")) this.unsetFlag("track-tracker", "markin");
    if(this.getFlag("track-tracker", "markout")) this.unsetFlag("track-tracker", "markout");
    if(this.getFlag("track-tracker", "duration")) this.unsetFlag("track-tracker", "duration");
  }

}