import { ttPlaylistDirectory } from './tt-playlist-directory.js';

//todo : do a font with necessary icons

Hooks.once('init', () => {
  
  loadTemplates(["modules/track-tracker/templates/soundPartial.hbs"]);
  CONFIG.ui.playlists = ttPlaylistDirectory;
  
  console.log('%cTrack Tracker %c| Initiatized.', 'color: #22eeee', 'color: #fff');
});
