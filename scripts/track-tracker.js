/**************************************************************
 * Track-Tracker module for Foundry Virtual Tabletop          
 * Revamp of the currently-playing panel with track tracking &
 * a mark in / mark out system                                
 * Author: Carter_DC                                          
 * Software License: MIT                                      
 * Repository: https://github.com/CarterDC/track-tracker      
 */


import { ttPlaylistSound } from './tt-playlist-sound.js';
import { ttPlaylistDirectory } from './tt-playlist-directory.js';

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once('init', () => {

  //replacement for the original inline partial used in playlists-directory.html
  loadTemplates(["modules/track-tracker/templates/soundPartial.hbs"]);

  CONFIG.ui.playlists = ttPlaylistDirectory;
  CONFIG.PlaylistSound.documentClass = ttPlaylistSound;

  console.log('%cTrack Tracker %c| Initialized.', 'color: #22eeee', 'color: #ccc');

});
