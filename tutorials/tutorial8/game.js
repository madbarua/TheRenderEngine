// Load all required engine components
R.Engine.define({
	"class": "Tutorial8",
	"requires": [
		"R.engine.Game",
		"R.rendercontexts.CanvasContext",
      "R.collision.broadphase.SpatialGrid",
      "R.resources.loaders.SpriteLoader"
	]
});

// Load the game objects
R.engine.Game.load("/player.js");

/**
 * @class Tutorial Eight.  Drawing with Sprites.
 */
var Tutorial8 = function() {
   return R.engine.Game.extend({

      // The rendering context
      renderContext: null,

      collisionModel: null,
      spriteLoader: null,

      /**
       * Called to set up the game, download any resources, and initialize
       * the game to its running state.
       */
      setup: function(){
         // Set the FPS of the game
         R.Engine.setFPS(this.engineFPS);

         // Create the render context
         this.renderContext = R.rendercontexts.CanvasContext.create("Playfield",
               480, 480);
         this.renderContext.setBackgroundColor("black");

         // Add the new rendering context to the default engine context
         R.Engine.getDefaultContext().add(this.renderContext);

         // Create the collision model with 5x5 divisions
         this.collisionModel = R.collision.broadphase.SpatialGrid.create(
               480, 480, 5);

         this.spriteLoader = R.resources.loader.SpriteLoader.create();

         // Load the sprites
         this.spriteLoader.load("sprites", this.getFilePath("resources/tutorial8.sprite"));

         // Wait until the resources are ready before running the game
         R.lang.Timeout.create("resourceWait", 250, function() {
            if (Tutorial8.spriteLoader.isReady()) {
               // Destroy the timer and start the game
               this.destroy();
               Tutorial8.run();
            } else {
               // Resources aren't ready, restart the timer
               this.restart();
            }
         });
      },

      /**
       * Called when a game is being shut down to allow it to clean up
       * any objects, remove event handlers, destroy the rendering context, etc.
       */
      teardown: function(){
         this.spriteLoader.destroy();
      },

      /**
       * Run the game as soon as all resources are ready.
       */
      run: function() {
         // Create the player and add it to the render context.
         this.renderContext.add(Player.create());
      },

      /**
       * Return a reference to the playfield box
       */
      getFieldRect: function() {
         return this.renderContext.getViewport();
      }

   });
}

