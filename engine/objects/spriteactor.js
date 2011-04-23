
/**
 * The Render Engine
 *
 * SpriteActor object
 *
 * @author: Brett Fattori (brettf@renderengine.com)
 *
 * @author: $Author: bfattori@gmail.com $
 * @version: $Revision: 1562 $
 *
 * Copyright (c) 2011 Brett Fattori (brettf@renderengine.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

// The class this file defines and its required classes
R.Engine.define({
	"class": "R.objects.SpriteActor",
	"requires": [
		"R.engine.Object2D",
		"R.components.render.Sprite",
		"R.components.input.Keyboard",
		"R.components.collision.Convex",
		"R.collision.OBBHull"
	]
});

/**
 * @class A <tt>SpriteActor</tt> is an actor object within a game, whose renderer
 * 		 is a 2D sprite.  It can have actions assigned to it, which are triggered
 * 		 by either a controlling player or generated by the program.
 * @param name {String} The name of the object
 * @extends R.engine.Object2D
 * @constructor
 * @description Create a sprite actor
 */
R.objects.SpriteActor = function(){
	return R.engine.Object2D.extend(/** @scope R.objects.SpriteActor.prototype */{
	
		editing: false,
		sprite: null,
		actorId: null,
		collisionMask: null,
		collidable: null,
		scriptedActions: null,
		scriptedVars: null,
		
		/** @private */
		constructor: function(name){
			this.base(name || "Actor");
			
			this.editing = false;
			
			this.actorId = "";
			this.collisionMask = "0";
			this.scriptedActions = {};
			this.scriptedVars = {};
			
			this.collidable = false;
			
			// Add sprite component to draw the player
			this.add(R.components.render.Sprite.create("draw"));
		},
		
		/**
		 * After the actor is added to the context, allow it a chance to initialize.
		 * @private
		 */
		afterAdd: function(parent) {
			this.base(parent);
			this.callScriptedEvent("onInit", []);	
		},
		
		/**
		 * Destroy the object
		 */
		destroy: function() {
			this.callScriptedEvent("onDestroy", []);
			this.base();
		},
		
		/**
		 * Release the object back into the pool.
		 */
		release: function() {
			this.base();
			this.scriptedActions = null;
			this.scriptedVars = null;
		},
		
		/**
		 * Get a properties object for this sprite actor
		 * @return {Object}
		 */
		getProperties: function(){
			var self = this;
			var prop = this.base(self);
			return $.extend(prop, {
				"Sprite": [typeof LevelEditor !== "undefined" ? function(){ return LevelEditor.getSpriteCanonicalName(self.sprite); } : function(){ return self.sprite.getName(); },
							  typeof LevelEditor !== "undefined" ? { "multi": true,
							  											 "opts": LevelEditor.getSpriteOptions,
																		 "fn": function(s) { self.setSprite(LevelEditor.getSpriteForName(s)); }} : null, 
							  typeof LevelEditor !== "undefined" ? true : false ],
				"Collidable": [ function() { return self.isCollidable(); },
									 typeof LevelEditor !== "undefined" ? { "toggle": true,
									 											"fn": function(s) { self.setCollidable(s); }} : null,
									 typeof LevelEditor !== "undefined" ? true : false ]
			});
		},

		/**
		 * Set the actor's Id which can be looked up with {@link R.objects.SpriteActor#findActor}
		 * @param actorId {String} A unique Id to reference this object
		 */
		setActorId: function(actorId) {
			this.actorId = actorId;
		},
		
		/**
		 * Get the actor's unique Id which references this object
		 * @return {String}
		 */
		getActorId: function() {
			return this.actorId;
		},
		
		/**
		 * Set the collision bitmask for this object
		 * @param collisionMask {String} A binary string of ones and zeros
		 */
		setCollisionMask: function(collisionMask) {
			this.collisionMask = collisionMask;
		},
		
		/**
		 * Get the collision bitmask for this object
		 * @return {String}
		 */
		getCollisionMask: function() {
			return this.collisionMask;
		},

		/**
		 * Get the event associated with the action name.
		 * @param {Object} actionName
		 * @private
		 */
		getActorEvent: function(actionName) {
			return this.scriptedActions[actionName];
		},
		
		/**
		 * Set the event handler for the action name.
		 * @param {Object} actionName
		 * @param {Object} script
		 * @private
		 */
		setActorEvent: function(actionName, script) {
			this.scriptedActions[actionName] = { "script": script };
		},
		
		/**
		 * Calls a scripted event.  If the event handler hasn't been compiled yet, it
		 * will be compiled and then called in the scope of this actor.
		 * @param eventName {String} The name of the event to call
		 * @param argNames {Array} An array of argument names to map the arguments array to (1:1)
		 * @param args {Array} The array of arguments to pass to the event handler
		 * @private
		 */
		callScriptedEvent: function(eventName, argNames, args) {
			var eScript = evtScript = this.getActorEvent(eventName);
			if (R.isEmpty(evtScript)) {
				return;
			}
			
			// Is it compiled already?
			if (eScript.compiled) {
				evtScript = eScript.compiled;
			} else {
				// Compile the script, inject the variables
				var varScript = "";
				for (var a in argNames) {
					varScript += "var " + argNames[a] + "=arguments[" + a + "]; ";
				}
				evtScript = this.scriptedActions[eventName].compiled = new Function(varScript + eScript.script);
			}
			
			return evtScript.apply(this, args);
		},
		
		/**
		 * Get the value of the specified variable.
		 * @param varName {String}
		 * @return {Object} The value of the variable
		 */
		getVariable: function(varName) {
			return this.scriptedVar[varName];
		},
		
		/**
		 * Set the value of the specified variable.
		 * @param varName {String} The name of the variable
		 * @param value {Object} The value to assign to the variable
		 */
		setVariable: function(varName, value) {
			this.scriptedVar[varName] = value;	
		},

		/**
		 * Get the events object for this actor.  The configuration is a
		 * collection of variables and scripts which are used to run the actor.  When
		 * scripts are called, the scope of the callback is the actor.  The following are
		 * included:
		 * <ul>
		 * <li>onInit() - Called when the actor is added to the level</li>
		 * <li>onDestroy() - Called when the actor is removed from the level</li>
		 * <li>onCollide(collisionData, targetMask, worldTime) - Called when the actor collides with another object.  The data
		 * 	contains information about the collision. See: {@link R.struct.CollisionData}  The mask is the target's
		 * 	collision bitmask, and the time is the world time when the collision occurred.</li>
		 * <li>onVisibility(state) - Called when the actor enters or leaves the frame.  The state
		 * 	will be <tt>true</tt> when visible (rendered).</li>
		 * <li>onBeforeUpdate(worldTime) - Called before the actor is updated, providing the world time.</li>
		 * <li>onAfterUpdate(worldTime) - Called after the actor is updated, providing the world time.</li>
		 * </ul>
		 * 
		 * @return {Object}
		 */
		getConfig: function(){
			// name : type (script|var)
			var self = this;
			var cfg = {};
			return $.extend(cfg, {
				"onInit": "script",
				"onDestroy": "script",
				"onCollide": "script",
				"onVisibility": "script",
				"onBeforeUpdate": "script",
				"onAfterUpdate": "script"
			});
		},

		
		/**
		 * Update the player within the rendering context.  This draws
		 * the shape to the context, after updating the transform of the
		 * object.  If the player is thrusting, draw the thrust flame
		 * under the ship.
		 *
		 * @param renderContext {R.rendercontexts.AbstractRenderContext} The rendering context
		 * @param time {Number} The engine time in milliseconds
		 */
		update: function(renderContext, time){
			renderContext.pushTransform();

			this.callScriptedEvent("onBeforeUpdate", ["worldTime"], [time]);
			this.base(renderContext, time);
			this.callScriptedEvent("onAfterUpdate", ["worldTime"], [time]);
			
			if (this.editing) {
				renderContext.setLineStyle("white");
				renderContext.setLineWidth(2);
				var bbox = R.math.Rectangle2D.create(this.getSprite().getBoundingBox());
				var o = R.math.Point2D.create(this.getOrigin());
				o.neg();
				bbox.offset(o);
				renderContext.drawRectangle(bbox);
				bbox.destroy();
				o.destroy();
			}
			
			renderContext.popTransform();
		},
		
		/**
		 * Set a flag which will determine if the actor will collide with anything
		 * @param state {Boolean} <tt>true</tt> to collide with other objects
		 */
		setCollidable: function(state) {
			this.collidable = state;
			if (state) {
				// Add the collision component
				this.add(R.components.ConvexCollider.create("collide"), null);
			} else if (this.getComponent("collide") != null) {
				// Remove the collision component
				this.remove("collide").destroy();
			}
		},
		
		/**
		 * Returns <tt>true</tt> if the actor can be collided with
		 * @return {Boolean}
		 */
		isCollidable: function() {
			return this.collidable;
		},
		
		/**
		 * Set the sprite which represents this actor
		 * @param sprite {R.resources.types.Sprite} The sprite
		 */
		setSprite: function(sprite){
			this.sprite = sprite;
			this.setBoundingBox(sprite.getBoundingBox());
			this.getComponent("draw").setSprite(sprite);
			
			// Set the collision hull
			this.setCollisionHull(R.collision.OBBHull.create(sprite.getBoundingBox()));
		},
		
		/**
		 * Get the sprite which represents this actor
		 * @return {R.resources.types.Sprite}
		 */
		getSprite: function(){
			return this.sprite;
		},
		
		/**
		 * Set the editing mode of the object, used by the LevelEditor
		 * @private
		 */
		setEditing: function(state){
			this.editing = state;
		},
		
		/**
		 * Queried by the LevelEditor to determine if an object is editable
		 * @private
		 */
		isEditable: function(){
			return true;
		},
		
		/**
		 * Host callback which is triggered when collision occurs between this object and
		 * another object.  This will typically trigger an event callback for scripted events.
		 * @param collisionObj {R.engine.Object2D} The object that this object collided with
		 * @param time {Number} The time at which the collision occurred
		 * @param targetMask {Number} The collision mask for the object this collided with
		 * @return {Number} Returns a flag which tells the collision system what to do
		 */
		onCollide: function(collisionObj, time, targetMask) {
			var cData = this.getComponent("collide").getCollisionData();
			var cResult = this.callScriptedEvent("onCollide", ["collisionData", "targetMask", "worldTime"], [cData, targetMask, time]);
			
			// We may want to do something here...
			
			return cResult;
		}
		
	}, /** @scope R.objects.SpriteActor.prototype */{ 
		/**
		 * Get the class name of this object
		 * @return The string <tt>R.objects.SpriteActor</tt>
		 * @type String
		 */
		getClassName: function(){
			return "R.objects.SpriteActor";
		}
	});
	
}