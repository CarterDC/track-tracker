import { ttPlaylistDirectory } from './tt-playlist-directory.js';

Hooks.once('init', () => {
  RegisterHandlebarsHelpers();
  loadTemplates(["modules/track-tracker/templates/soundPartial.hbs"]);
  CONFIG.ui.playlists = ttPlaylistDirectory;
  game.trackTracker = {
    ttDoSomething
  }
  
  console.log('%cTrack Tracker %c| Initiatized.', 'color: #22eeee', 'color: #fff');
});

Hooks.once('ready', () => {
  console.log('%cTrack Tracker %c| Maybe Do Things Here...', 'color: #22eeee', 'color: #fff');
});

function RegisterHandlebarsHelpers(){

  //returns an integer percentage 
  Handlebars.registerHelper("trackPercentage", function(sound)
  {
    let percentage = 0;
      console.log('TT | sound :', sound);
    return percentage;
  })
}

async function ttDoSomething() {
  console.log('%cTrack Tracker %c| Doing Some Shit...', 'color: #22eeee', 'color: #fff');
  
  /*
  let path = "modules/track-tracker/templates/soundPartial.hbs";

  await new Promise((resolve, reject) => {
    game.socket.emit('template', path, resp => {
      if ( resp.error ) return reject(new Error(resp.error));
      const compiled = Handlebars.compile(resp.html);
      Handlebars.registerPartial("soundPartial", compiled);
      _templateCache[path] = compiled;
      console.log(`Foundry VTT | Retrieved and compiled template ${path}`);
      resolve(compiled);
    });
  });*/
};