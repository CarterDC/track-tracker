import { ttPlaylistSound } from './tt-playlist-sound.js';
import { ttPlaylistDirectory } from './tt-playlist-directory.js';

//todo : do a font with necessary icons ?

Hooks.once('init', () => {

  loadTemplates(["modules/track-tracker/templates/soundPartial.hbs"]);
  CONFIG.ui.playlists = ttPlaylistDirectory;
  CONFIG.PlaylistSound.documentClass = ttPlaylistSound;
  
  console.log('%cTrack Tracker %c| Initiatized.', 'color: #22eeee', 'color: #ccc');

});
