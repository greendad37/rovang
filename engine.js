/*

Gamebook Engine, version 1.04 (updated 22 Jan 2016)
-- version 1.04: fixed a typo in data-load-refresh
-- version 1.03: changed data-load-if to data-logic-if, likewise for elseif and else
-- version 1.02: added parent (^) scene selectors
-- version 1.01: added data-click-deactivate, data-load-deactivate
-- version 1.00: initial release

Copyright 2014-2016 Joe Rovang

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License <http://www.gnu.org/licenses/> for
more details.

*/


/* --- [ GLOBAL VARIABLES ] --- */

window.Story = { }; // the gamebook as a whole
window.Scene = { }; // where the story is now
window.Canon = { }; // the body from which the scene loads content
window.Variables = { }; // place to store story variables
window.Util = { }; // namespace for utility functions

Story.bookmarks = [ ]; // array to store a history of bookmarks (canon elements)
Story.bookmarkSelectors = [ ]; // array to store a history of selectors (text) for use with save/load
Scene.movingParts = 0; // how the engine delays resizes and fade-ins until chained load actions are done
Scene.$new = $(); // how the engine remembers which elements have been added by load actions

window.Settings = {
	FADE_SPEED: 300, // duration of each fade in and each fade out (in milliseconds)
	SCROLL_SPEED: 300, // duration of scroll (in milliseconds)
	RESIZE_SPEED: 300, // duration of scene resize (in milliseconds)
	WARN_WHEN_LEAVING: true, // whether to alert the reader when they try to navigate away from this page
	USE_OXFORD_COMMA: true // whether comma-series lists with 3+ items should use comma before conjunction
};


/* --- [ PAGE READY ] --- */

/* Perform once page is ready */
$(document).ready( function() {
	Story.initialize();

	if ( Settings.WARN_WHEN_LEAVING ) {
		window.onbeforeunload = function() { 
			return "Any unsaved story progress will be lost if you close or reload this page.";
		};
	};

} );


/* --- [ UTILITY FUNCTIONS ] --- */

/* Testing whether a variable is undefined */
Util.isUndefined = function( someVariable ) {
	return typeof someVariable === "undefined";
};

/* Testing whether a string variable contains text (fails for other data types) */
Util.containsText = function( str ) {
	if ( typeof str !== "string" ) { return false };
	return ( str.length > 0 );
};

/* Counting the number of elements in a variable (0 if not a jQuery object) */
Util.elementCount = function( $element ) {
	if ( !( $element instanceof jQuery ) ) { return 0 };
	return $element.length;
};

/* Testing whether a string starts with a specific substring */
String.prototype.startsWith = function( str ) {
	return ( str === this.substr( 0, str.length ) );
};


/* --- [ OBJECT PROPERTIES ] --- */

/* Checking whether an object has a property */
Util.hasProperty = function( obj, prop ) {
	if ( Util.isUndefined( obj ) ) { return false };
	if ( !Util.containsText( prop ) ) { return false };
	return obj.hasOwnProperty( prop );
};

/* Getting a property that may or may not exist in an object that may or may not exist */
Util.getProperty = function( obj, prop ) {
	if ( !Util.hasProperty( obj, prop ) ) {
		if ( !Util.containsText( prop ) ) { return }
		else if ( prop.charAt( 0 ) === "$" ) { return $() }
		else { return };
	};
	return obj[ prop ];
};

/* Getting a property value as text */
Util.getPropertyAsText = function( obj, prop ) {
	var value = Util.getProperty( obj, prop );
	if ( !Util.containsText( value ) ) { return "" };
	return value;
};


/* --- [ ELEMENT ATTRIBUTES ] --- */

/* Testing whether a jQuery object's first element has an attribute defined */
jQuery.fn.hasAttr = function( attributeName ) {
	if ( !Util.containsText( attributeName ) ) { return false };
	return !Util.isUndefined ( this.attr( attributeName ) );
};


/* --- [ ARRAYS ] --- */

/* Checking whether a variable contains an array */
Util.isArray = function( array ) { return jQuery.isArray( array ) };

/* Converting a semicolon-delimited list to an array of trimmed strings */
Util.parameterStringToArray = function( str ) {
	if ( !Util.containsText( str ) ) { return [ ] };
	var array = str.split( ";" );
	array = jQuery.map( array, function( value, i ) { return jQuery.trim( value ) } ); // trim all items in array
	return array;
};

/* Getting an attribute's value from a given element (optional: get value number from semicolon-delimited list) */
Util.getAttributeValue = function( $element, attributeName, pos ) {
	if ( Util.elementCount( $element ) === 0 ) { return };
	if ( !$element.hasAttr( attributeName ) ) { return };

	var str = $element.attr( attributeName );
	if ( Util.isUndefined( pos ) ) { return str };
	pos = parseInt( pos );
	if ( isNaN( pos ) || pos < 1 ) { return };

	var array = Util.parameterStringToArray( str );
	if ( pos > array.length ) { return };
	return array[ pos - 1 ];
};

/* Choosing a random element from an array */
Util.chooseOneFromArray = function( array ) {
	if ( !Util.isArray( array ) ) { return };
	if ( array.length === 0 ) { return };
	return array[ Math.floor( Math.random() * array.length ) ];
};

/* Choosing a random substring from a semicolon-delimited string */
Util.chooseOneFromParameters = function( str ) {
	if ( !Util.containsText( str ) ) { return };
	return Util.chooseOneFromArray( Util.parameterStringToArray( str ) );
};

/* Choosing random text from an array */
Util.chooseTextFromArray = function( array ) {
	var text = Util.chooseOneFromArray( array );
	if ( Util.isUndefined( text ) || text === null ) { return "" };
	return text;
};

/* Getting the length of an array */
Util.arrayLength = function( array ) {
	if ( !Util.isArray( array ) ) { return 0 };
	return array.length;
};

/* Checking if a value is present in an array */
Util.arrayContains = function( array, value ) {
	if ( Util.arrayLength( array ) === 0 ) { return false };
	if ( !Util.arrayValueIsOK( value ) ) { return false };
	return jQuery.inArray( value, array ) > -1;
};

/* Checking whether a value is good enough for inclusion in an array */
Util.arrayValueIsOK = function( value ) {
	if ( Util.isUndefined( value ) || value === null || value === "" ) { return false };
	return true;
};

/* Adding to an array (if value isn't already present) */
Util.addToArray = function( array, value ) {
	var valueOK = Util.arrayValueIsOK( value );
	if ( !Util.isArray( array ) ) { return valueOK ? [ value ] : [ ] };
	if ( !valueOK ) { return array };
	if ( Util.arrayContains( array, value ) ) { return array };
	array.push( value );
	return array;
};

/* Removing a value from an array (if present) */
Util.removeFromArray = function( array, value ) {
	if ( Util.arrayLength( array ) === 0 ) { return [ ] };
	if ( !Util.arrayValueIsOK( value ) ) { return array };
	var index;
	while ( true ) {
		index = jQuery.inArray( value, array );
		if ( index === -1 ) { break };
		array.splice( index, 1 );
	};
	return array;
};

/* Emptying an array */
Util.emptyArray = function( array ) {
	if ( !Util.isArray( array ) ) { return [ ] };
	while ( true ) {
		if ( Util.arrayLength( array ) === 0 ) { break };
		array.pop();
	};
	return array;
};

/* Listing the contents of an array */
Util.listArray = function( array, separator ) {
	if ( Util.arrayLength( array ) === 0 ) { return "" };
	if ( !Util.containsText( separator ) ) { return array.join( "" ) };
	return array.join( separator );
};


/* --- [ VARIABLES ] --- */

/* Trimming the Variables namespace off a variable name */
Story.trimVariableName = function( variableName ) {
	if ( !Util.containsText( variableName ) ) { return };
	if ( variableName.startsWith( "Variables." ) ) { variableName = variableName.substr( 10 ) };
	return variableName;
};

/* Setting a variable by evaluating an expression */
Story.setVariableByExpression = function( variableName, expression ) {
	variableName = Story.trimVariableName( variableName );
	if ( !Util.containsText( variableName ) ) { return };

	var result;
	if ( Util.containsText( expression ) ) { result = Util.evaluatePossiblyAsString( expression ) };

	try { Variables[ variableName ] = result }
	catch ( error ) { return console.log( error ) };
};

/* Setting a variable to a random integer (0 to n-1) */
Story.setRandom = function( variableName, numChoices ) {
	variableName = Story.trimVariableName( variableName );
	if ( !Util.containsText( variableName ) ) { return };

	numChoices = parseInt( numChoices );
	if ( isNaN( numChoices ) ) { numChoices = 0 };

	var result = 0;
	if ( numChoices > 1 ) { result = Math.floor( Math.random() * numChoices ) };

	try { Variables[ variableName ] = result }
	catch ( error ) { return console.log( error ) };
};

/* Adding to a variable's current value */
Story.addToVariable = function( variableName, amount ) {
	variableName = Story.trimVariableName( variableName );
	if ( !Util.containsText( variableName ) ) { return };

	amount = Number( amount );
	if ( isNaN( amount ) || amount === 0 ) { return };

	previous = Number( Story.getVariable( variableName ) );
	if ( isNaN( previous ) ) { previous = 0 };

	try { Variables[ variableName ] = previous + amount }
	catch ( error ) { return console.log( error ) };
};

/* Getting a variable's value */
Story.getVariable = function( variableName ) {
	variableName = Story.trimVariableName( variableName );
	if ( !Util.containsText( variableName ) ) { return };

	var result;
	try { result = Variables[ variableName ] }
	catch ( error ) { console.log( error ) };
	return result;
};

/* Resetting story variables */
Story.resetVariables = function() {
	window.Variables = { };
};


/* --- [ FINDING ELEMENTS ] --- */

/* Finding elements by parameters that can be class names, CSS selectors, or variable names */
jQuery.fn.findFlexibly = function( str, $startingElement ) {
	var $this = this;
	str = jQuery.trim( str );
	if ( !Util.containsText( str ) ) { return $() };

	var selectors = [ ];
	jQuery.each( Util.parameterStringToArray( str ), function( index, selector ) {
		if ( selector.startsWith( "Variables." ) ) {
			var value = Story.getVariable( selector );
			if ( Util.containsText( value ) ) {
				jQuery.each( Util.parameterStringToArray( value ), function( i, sel ) {
					selectors.push( sel )
				} );
			};
		} else selectors.push( selector );
	} );

	var $results = $();
	( function() {
		jQuery.each( selectors, function( index, str ) {

			/* If it consists of one or more carets, get parent object */
			if ( /^\^+$/.test( str ) ) { // one or more carets, surrounded by string start/end
				addResult( parentFind( $startingElement, str.length ) );
			};

			/* If it doesn't make for a bad selector, check as a class name first */
			var hasSpace = str.indexOf( " " ) > -1;
			var hasDot = str.indexOf( "." ) > -1;
			var successUsingDot = false;
			if ( !hasSpace && !hasDot ) {
				var dotClassName = "." + str;
				if ( isValidSelector ( dotClassName ) ) {
					var $resultUsingDot = $this.find( dotClassName );
					addResult( $resultUsingDot );
					successUsingDot = ( Util.elementCount( $resultUsingDot ) > 0 );
				}
			};

			/* And now try as a selector */
			if ( !isValidSelector( str ) || successUsingDot ) { return };
			
			addResult( $this.find( str ) );
		} );

	} ) ( );
	return $results;

	/* How to test for valid selector syntax */
	function isValidSelector( selector ) {
		try { $( selector ) } catch ( error ) { return false };
		return true;
	};

	/* How to add a result */
	function addResult( $result ) {
		if ( Util.elementCount( $result ) === 0 ) { return };
		$results = $results.add( $result );
	};

	/* How to find an element's parent, grandparent, etc. */
	function parentFind( $element, parentLevels ) {

		parentLevels = parseInt( parentLevels );
		if ( isNaN( parentLevels ) ) { return };

		while ( true ) {
			if ( Util.elementCount( $element ) === 0 ) { return $() };
			if ( $element[0] === Scene.elem[0] ) { return Scene.elem.children() };
			if ( !Scene.contains( $element ) ) { return $() };
			if ( parentLevels <= 0 ) { return $element };
			$element = $element.parent();
			parentLevels--;
		};
	};

};

/* Finding all elements in the scene matching the specified class name or CSS selector */
Scene.find = function( classNameOrSelector, $startingElement ) {
	return Scene.elem.findFlexibly( classNameOrSelector, $startingElement );
};

/* Finding the first canon element matching the specified class name or CSS selector */
Canon.find = function( classNameOrSelector ) {
	return Canon.elem.findFlexibly( classNameOrSelector ).first();
};

/* Generating a clone of the first element in a jQuery object */
Canon.clone = function( $element ) {
	if ( Util.elementCount( $element ) === 0 ) { return $() };
	return $element.first().clone();
};

/* Finding within a jQuery selection without removing the parent from the find */
jQuery.fn.findIncludingSelf = function( selector ) {
    return this.filter( selector ).add( this.find( selector ) );
};

/* Testing whether an element is in the scene container */
Scene.contains = function( $element ) {
	if ( Util.elementCount( $element ) === 0 ) { return false };
	return jQuery.contains( Scene.elem[0], $element[0] );
};


/* --- [ SCENE SUPPORT ] --- */

/* Locking the scene container so it won't resize until load actions have been performed */
Scene.lock = function() {
	Scene.movingParts++;
	if ( Scene.isLocked ) { return false };
	Scene.isLocked = true;
	Scene.lockSize();
	Scene.pauseLinks();
	Scene.$new = $();
	return true;
};

/* Adding a new element to the list of recently-added elements (and running its load actions) */
Scene.postNew = function( $newElement, options ) {
	if ( Util.elementCount( $newElement ) === 0 ) { return };
	Scene.$new = Scene.$new.add( $newElement );
	if ( !Util.getProperty( options, "noRun" ) ) {
		Scene.runLoadActions( $newElement );
		Scene.doCommaSeries( $newElement );
	};
	$newElement.hide();
};

/* Unlocking the scene container so it begins resizing to fit new contents (also begin fading in new) */
Scene.unlock = function() {
	Scene.movingParts--;
	if ( Scene.movingParts > 0 ) { return false };
	Scene.unpauseLinks();
	Scene.$new.show();
	Scene.resize();
	Scene.fadeIn( Scene.$new.hide() );
	Scene.isLocked = false;
	return true;
};

/* Lock the scene container to prevent immediate resizing */
Scene.lockSize = function() {
	var $theScene = Scene.elem;
	$theScene.css( { "height": $theScene.height() } );
};

/* Smoothly resizing the scene container to accommodate its new contents */
Scene.resize = function() {
	var $theScene = Scene.elem;
	$theScene.stop(); // cancel any existing animation already running on the container
	var startingHeight = $theScene.height();
	$theScene.css( { "height": "auto" } );
	var endingHeight = $theScene.height();
	$theScene.css( { "height": startingHeight } );
	$theScene.animate( { "height": endingHeight }, Settings.RESIZE_SPEED, function() {
		$theScene.css( { "height": "auto" } );
	 } );
};


/* --- [ FADING ELEMENTS IN AND OUT ] --- */

/* Namespace notwithstanding, the functions below don't care whether the element is in the scene container. */

/* How to fade elements out */
Scene.fadeOut = function( $elements, callback ) {
	if ( Util.isUndefined( callback ) ) { callback = function() { } };
	if ( Util.elementCount( $elements ) === 0 ) { return callback() }; // run callback even if no elements
	if ( $elements.filter( ":visible" ).length === 0 ) { return callback() }; // run callback now if all already hidden

	$elements.stop().fadeOut( Settings.FADE_SPEED )
		.promise().done( callback ); // fade out and then run callback (only once if multiple elements)
};

/* How to fade elements in */
Scene.fadeIn = function( $elements, callback ) {
	if ( Util.isUndefined( callback ) ) { callback = function() { } };
	if ( Util.elementCount( $elements ) === 0 ) { return callback() }; // run callback even if no elements
	if ( $elements.filter( ":hidden" ).length === 0 ) { return callback() }; // run callback now if all already visible

	$elements.stop().fadeIn( Settings.FADE_SPEED )
		.promise().done( callback ); // fade in and then run callback (only once if multiple elements)
};


/* --- [ SCROLLING THE WINDOW ] --- */

/* Scrolling to top of page */
Scene.scrollToTop = function() { Scene.scrollToPosition( 0 ) };

/* Scrolling to a jQuery object's first element */
Scene.scrollTo = function ( $target ) {
	if ( Util.elementCount( $target ) === 0 ) { return Scene.scrollToTop() };

	if ( $target.isOnScreen() ) { return }; // don't scroll if the target is already on-screen

	var firstInScene = Scene.elem.children().first();
	if ( $target[0] === firstInScene[0] ) { return Scene.scrollToTop() }; // scroll to top if first in scene

	Scene.scrollToPosition( $target.offset().top );
};

/* Scrolling to a specific Y-position */
Scene.scrollToPosition = function( pos ) {
	$( "html, body" ).stop().animate( { scrollTop: pos }, Settings.SCROLL_SPEED );
};

/* Determining whether a jQuery object's first element is at least partly on-screen already */
jQuery.fn.isOnScreen = function() {
	if ( Util.elementCount( this ) === 0 ) { return false };
	var me = this[0];
	var myBounds = me.getBoundingClientRect();
	return (
		myBounds.bottom >= 0 &&
		myBounds.right >= 0 &&
		myBounds.top <= ( window.innerHeight || document.documentElement.clientHeight ) &&
		myBounds.left <= ( window.innerWidth || document.documentElement.clientWidth )
    );
}


/* --- [ STARTING THE STORY ] --- */

/* Initializing the story */
Story.initialize = function() {
	Story.setStoryCode();
	if ( !Canon.locateElement() ) { return false };
	Story.perkUpLinks();
	if ( !Scene.locateElement() ) { return false };
	Story.startHandlingClicks();
	if ( !Scene.loadStart( { doDebut: true } ) ) { return false };
	return true;
};

/* Notifying the reader that the story is empty */
Story.notifyAboutEmpty = function() {
	alert( "This story appears to be empty." );
};

/* Locating the canon element in the page */
Canon.locateElement = function() {
	Canon.elem = $( "#canon" );
	if ( Util.elementCount( Canon.elem ) === 0 ) {
		Story.notifyAboutEmpty();
		return false;
	};
	return true;
};

/* Locating the scene element in the page */
Scene.locateElement = function() {
	Scene.elem = $( "#scene" );
	if ( Util.elementCount( Scene.elem ) === 0 ) {
		Story.notifyAboutEmpty();
		return false;
	};
	return true;
};

/* Loading the start of the story */
Scene.loadStart = function( args ) {
	var doDebut = Util.getProperty( args, "doDebut" );

	var selector = ".start";
	var $theStart = Canon.find( selector );
	if ( Util.elementCount( $theStart ) === 0 ) {
		selector = ":first";
		var $theStart = Canon.find( selector );
	};
	if ( Util.elementCount( $theStart ) === 0 ) {
		alert( "This story appears to be empty." );
		return false;
	};

	if ( doDebut ) { Scene.debut( $theStart, selector ) }
	else { Scene.goTo( $theStart, selector ) };
	return true;
};

/* Resetting the story */
Story.reset = function( args ) {
	var $alternateStart = Util.getProperty( args, "$alternateStart" );
	var selector = Util.getProperty( args, "selector" );
	var doQuietly = Util.getProperty( args, "doQuietly" );

	if ( !doQuietly ) {
		if ( !window.confirm( "Abandon your current progress and restart this story?" ) ) {
			return;
		};
	};

	Story.resetVariables();
	Story.resetBookmarks();
	if ( Util.elementCount( $alternateStart ) > 0 ) {
		Scene.goTo( $alternateStart, selector );
	} else { Scene.loadStart() };
};


/* --- [ LINKS ] --- */

/* Perking up the story's links (this means giving them some sort of HREF if they lacked one) */
Story.perkUpLinks = function() {

	/* Find links without href or name */
	var $allLinks = $( "a" );
	var $linksWithoutHREF = $allLinks.filter( ":not([href]):not([name])" );
	var $linksToTop = $allLinks.filter( "[href='#top']" );

	addHREF( $linksWithoutHREF );

	monitor( $linksWithoutHREF );
	monitor( $linksToTop );
	
	/* How to add placeholder HREFs */
	function addHREF( $links ) {
		$links.attr( "href", "javascript:" ); // makes link look active in browser
	};

	/* How to monitor links with JavaScript */
	function monitor( $links ) {
		$links.addClass( "gamebook-click-action" ); // lets click handler find these
	};
};

/* Installing the click handler in the scene's links */
Story.startHandlingClicks = function() {
	$( "body" ).on( "click", ".gamebook-click-action", function( event ) {
		Story.handleClick ( $(this), event );
	} );
};

/* Handling scene link clicks */
Story.handleClick = function ( $element, event ) {

	/* Intercept link functionality */
	event.preventDefault();

	/* Interpret a "#top" href as scrolling to the top */
	if ( $element.attr( "href" ) === "#top" ) { Scene.scrollToTop() };

	/* Ignore click actions while paused (during transition between scenes) */
	if ( Scene.linksPaused ) { return };

	/* Perform click action(s) */
	Scene.runClickActions( $element );
};

/* Pausing links (while passages are fading out) */
Scene.pauseLinks = function() {
	Scene.linksPaused = true;
	Scene.elem.addClass( "links-paused" ); // for styling
};

/* Unpausing links */
Scene.unpauseLinks = function() {
	Scene.linksPaused = false;
	Scene.elem.removeClass( "links-paused" );
};


/* --- [ SCENE CHANGES ] --- */

/* Going to a different scene */
Scene.goTo = function( $canonElement, selector ) {
	if ( Util.elementCount( $canonElement ) === 0 ) {
		return alert( "That part of the story hasn't been written yet." );
	};

	Scene.scrollToTop();
	Scene.lock();
	Scene.fadeOut( Scene.elem.children(), function() {
		var $new = Canon.clone( $canonElement );
		Scene.elem.html( $new );
		Story.addBookmark( $canonElement, selector );
		Scene.postNew( $new );
		Scene.unlock();
	} );
};

/* Going back to a scene */
Scene.goBackTo = function( $canonElement ) {
	if ( Util.elementCount( $canonElement ) === 0 ) {
		return console.log( "'goBackTo' function had nowhere to go" );
	};

	Scene.scrollToTop();
	Scene.lock();
	Scene.fadeOut( Scene.elem.children(), function() {
		var $new = Canon.clone( $canonElement );
		Scene.elem.html( $new );
		Scene.postNew( $new );
		Scene.unlock();
	} );
};

/* Prepending to the current scene */
Scene.prependToScene = function( $canonElement ) {
	if ( Util.elementCount( $canonElement ) === 0 ) { return };

	Scene.scrollToTop();
	Scene.lock();
	var $new = Canon.clone( $canonElement );
	Scene.elem.prepend( $new );
	Scene.postNew( $new );
	Scene.unlock();
};

/* Appending to the current scene */
Scene.appendToScene = function( $canonElement ) {
	if ( Util.elementCount( $canonElement ) === 0 ) { return };

	Scene.lock();
	var $new = Canon.clone( $canonElement );
	Scene.elem.append( $new );
	Scene.scrollTo( $new );
	Scene.postNew( $new );
	Scene.unlock();
};

/* Prepending or appending to something in the current scene */
Scene.prependOrAppend = function( args ) {
	var action = Util.getProperty( args, "action" );
	if ( action !== "append" && action !== "prepend" ) { return };

	var $canonElement = Util.getProperty( args, "$canonElement" );
	if ( Util.elementCount( $canonElement ) === 0 ) { return };

	var $targets = Util.getProperty( args, "$targets" );
	if ( Util.elementCount( $targets ) === 0 ) {
		if ( action === "append" ) { Scene.appendToScene( $canonElement ) }
		else if ( action === "prepend" ) { Scene.prependToScene( $canonElement ) };
		return;
	};

	var insideOrOuside = Util.getProperty( args, "insideOrOutside" );
	var addOutside = ( insideOrOutside === "outside" || insideOrOutside === "out" );

	Scene.lock();
	var $firstNew;
	$targets.each( function() {
		var $new = Canon.clone( $canonElement );
		if ( Util.elementCount( $firstNew ) === 0 ) { $firstNew = $new };
		doAction( $(this), $new );
		Scene.postNew( $new );
	} );
	Scene.scrollTo( $firstNew );
	Scene.unlock();

	/* How to do the action */
	function doAction( theTarget, theNew ) {
		if ( action === "prepend" ) {
			if ( addOutside ) { theTarget.before( theNew ) } else { theTarget.prepend( theNew ) };
		} else if ( action === "append" ) {
			if ( addOutside ) { theTarget.after( theNew ) } else { theTarget.append( theNew ) };
		};
	};
};

/* Replacing something in the current scene */
Scene.replace = function( $sceneElements, $canonElement ) {
	if ( Util.elementCount( $sceneElements ) === 0 ) { return };
	if ( Util.elementCount( $canonElement ) === 0 ) { return Scene.remove( $sceneElements ) };

	Scene.scrollTo( $sceneElements );
	Scene.lock();
	Scene.fadeOut( $sceneElements, function() {
		$sceneElements.each( function() {
			var $new = Canon.clone( $canonElement );
			$(this).replaceWith( $new );
			Scene.postNew( $new );
		} );
		Scene.unlock();
	} );
};

/* Refreshing something in the current scene */
Scene.refresh = function( $sceneElements ) {
	if ( Util.elementCount( $sceneElements ) === 0 ) { return };

	Scene.scrollTo( $sceneElements );
	Scene.lock();

	Scene.fadeOut( $sceneElements, function() {
		$sceneElements.each( function() {
			Scene.postNew( $(this) );
		} );
		Scene.unlock();
	} );
};

/* Refreshing the whole scene */
Scene.refreshAll = function() {
	Scene.refresh( Scene.elem.children() );
};

/* Removing something from the current scene */
Scene.remove = function( $sceneElements ) {
	if ( Util.elementCount( $sceneElements ) === 0 ) { return };

	Scene.scrollTo( $sceneElements );
	Scene.lock();

	Scene.fadeOut( $sceneElements, function() {
		$sceneElements.remove();
		Scene.unlock();
	} );
};

/* Deactivating certain links in the current scene */
Scene.deactivate = function( $sceneElements ) {
	if ( Util.elementCount( $sceneElements ) === 0 ) { return };
	$sceneElements = $sceneElements.findIncludingSelf( "a, .gamebook-click-action" );
	if ( Util.elementCount( $sceneElements ) === 0 ) { return };

	Scene.scrollTo( $sceneElements );
	Scene.lock();
	Scene.fadeOut( $sceneElements, function() {
		$sceneElements.each( function() {
			var $old = $(this);
			var $new = $( "<span></span>" );
			$new.html( $old.html() );
			$new.addClass( $old.attr( "class" ) );
			$new.removeClass( "javascript-action" );
			$old.replaceWith( $new );
			Scene.postNew( $new );
		} );
		Scene.unlock();
	} );
};

/* Setting up the scene for the first time */
Scene.debut = function( $canonElement, selector ) {

	var doSlide = true; // false = just fade the scene container in instead of resizing smoothly

	/* When sliding is enabled, I use a loathsome kludge to make jQuery fade the (barely visible) scene container's contents once to get an accurate measurement of what their height would be after their real fade-in. When I didn't do this (or if I did it with opacity at 0, or if I did it too quickly even!), the estimated size pre-fade didn't match their eventual size post-fade, leading to an ugly jump at the end of the container resize. */

	if ( Util.elementCount( $canonElement ) === 0 ) { return Story.notifyAboutEmpty() };

	Scene.scrollToTop();
	Scene.lock();

	if ( doSlide ) { Scene.elem.css( { opacity: .01 } ) };

	Story.addBookmark( $canonElement, selector );

	var $new = Canon.clone( $canonElement );
	Scene.elem.html( $new );
	Scene.postNew( $new );
	
	if ( doSlide ) {
		$new.hide().fadeIn( 200, function() {
			Scene.elem.css( { opacity: 1 } );
			Scene.elem.fadeIn( 200 ); // for a nice extra touch, fade in while sliding
			Scene.unlock();
		} );
	} else { Scene.unlock() };

};


/* --- [ EVALUATING ] --- */

/* Evaluating an expression with gentle console messages in place of errors */
Util.evaluate = function( expression )
{
	if ( !Util.containsText( expression ) ) { return };
	var result;
	try { result = eval( expression ) }
	catch ( error ) { console.log( error ); return };
	return result;
};

/* Evaluating an expression to a boolean result */
Util.evaluateToBoolean = function( expression )
{
	if ( !Util.containsText( expression ) ) { return false };
	var result;
	try { result = eval( expression ) }
	catch ( error ) { console.log( error ); return false };
	return Boolean( result );
};

/* Evaluating an expression the writer may just have forgotten to put quotes around */
Util.evaluatePossiblyAsString = function( expression )
{
	if ( !Util.containsText( expression ) ) { return };
	var result;
	try { result = eval( expression ) }
	catch ( error ) {
		var isReferenceError = error instanceof ReferenceError;
		var isVariableName = expression.startsWith( "Variables." );
		if ( isReferenceError && !isVariableName ) {
			return expression;
		} else { console.log( error ); return };
	};
	return result;
};


/* --- [ BOOKMARKS ] --- */

/* How to look up the last bookmark item without removing it from the list */
Story.getLastBookmark = function() {
	var theLength = Story.bookmarks.length;
	if ( theLength === 0 ) { return $() };
	return Story.bookmarks[ theLength - 1 ];
};

/* Adding a bookmark */
Story.addBookmark = function( $canonElement, selector ) {
	if ( Util.elementCount( $canonElement ) === 0 ) { return };
	if ( Util.isUndefined( selector ) ) { selector = "" }; // safeguard, probably unneeded

	/* Don't add a duplicate of the same scene */
	var $lastBookmark = Story.getLastBookmark();
	if ( Util.elementCount( $lastBookmark ) > 0 ) {
		if ( $canonElement[0] === $lastBookmark[0] ) { return };
	};

	/* Add it (or if "nobookmark" is specified, add an empty listing, which is useful when going back) */
	var noBookmark = $canonElement.hasAttr( "data-load-nobookmark" ) ||
			$canonElement.hasAttr( "data-nobookmark" );
	Story.bookmarks.push( noBookmark ? $() : $canonElement );
	Story.bookmarkSelectors.push( noBookmark ? "" : selector );

};

/* Going back into bookmark history */
Scene.back = function( $fallback ) {
	if ( Story.bookmarks.length <= 1 ) { return outOfBookmarks() };

	/* Remove the most recent bookmark */
	Story.bookmarks.pop();
	Story.bookmarkSelectors.pop();

	/* Trim off all the end-of-list bookmarks that are empty (nobookmark) objects */
	while ( ( Story.bookmarks.length > 0 ) && ( Util.elementCount( Story.getLastBookmark() ) === 0 ) ) {
		Story.bookmarks.pop();
		Story.bookmarkSelectors.pop();
	};

	/* Go to the most recent remaining bookmark */
	var $target = Story.getLastBookmark();
	if ( Util.elementCount( $target ) === 0 ) { $target = $fallback };
	if ( Util.elementCount( $target ) === 0 ) { return outOfBookmarks() };
	Scene.goBackTo( $target );

	/* How to respond to an inability to go back */
	function outOfBookmarks() {
		if ( Util.elementCount( $fallback ) > 0 ) {
			Scene.goTo( $fallback );
		}
		else { alert( "This is as far back as you can go." ) };
	};

};

/* Resetting bookmarks */
Story.resetBookmarks = function( args ) {
	var keepCurrent = Util.getProperty( args, "keepCurrent" );
	if ( Story.bookmarks.length === 0 ) { keepCurrent = false };

	if ( keepCurrent ) {
		var $lastBookmark = Story.bookmarks[ Story.bookmarks.length - 1 ];
		var lastSelector = Story.bookmarkSelectors[ Story.bookmarkSelectors.length - 1 ];
		Story.bookmarks = [ $lastBookmark ];
		Story.bookmarkSelectors = [ lastSelector ];
	} else {
		Story.bookmarks = [ ];
		Story.bookmarkSelectors = [ ];
	};

};


/* --- [ CLICK ACTIONS ] --- */

/* Doing the click actions for a particular link element */
Scene.runClickActions = function( $element ) {
	if ( Util.elementCount ( $element ) === 0 ) { return };
	var thisLabel;
	var $refreshToo = $();

	/* The following actions are listed in a specific order in case multiples apply to the same element */

	/* Reset the story when this link is clicked */
	thisLabel = "data-click-resetstory";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var selector = Util.getAttributeValue( $element, thisLabel, 1 );
			var $alternateStart = Canon.find( selector );
			Story.reset( {
				$alternateStart: $alternateStart,
				selector: selector,
				doQuietly: Util.getAttributeValue( $element, thisLabel, 2 ) === "quiet" || selector === "quiet"
			} );
		} ) ( );
	};

	/* Load story from save data when this link is clicked */
	thisLabel = "data-click-loadstory";
	if ( $element.hasAttr( thisLabel ) ) { Story.load() };

	/* Set a variable to a new value when this link is clicked */
	thisLabel = "data-click-setvar";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var variableName = Util.getAttributeValue( $element, thisLabel, 1 );
			if ( !Util.containsText( variableName ) ) { return };

			var value = Util.getAttributeValue( $element, thisLabel, 2 );
			Story.setVariableByExpression( variableName, value );

			var refreshThese = Scene.find ( Util.getAttributeValue( $element, thisLabel, 3 ), $element );
			if ( Util.elementCount ( refreshThese ) > 0 ) { $refreshToo = $refreshToo.add( refreshThese ) };
		} ) ( );
	};

	/* Set a variable to a random integer when this link is clicked */
	thisLabel = "data-click-setrandom";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var variableName = Util.getAttributeValue( $element, thisLabel, 1 );
			if ( !Util.containsText( variableName ) ) { return };

			var numChoices = parseInt( Util.getAttributeValue( $element, thisLabel, 2 ) );
			if ( isNaN( numChoices ) ) { numChoices = 2 };
			Story.setRandom( variableName, numChoices );

			var refreshThese = Scene.find ( Util.getAttributeValue( $element, thisLabel, 3 ), $element );
			if ( Util.elementCount ( refreshThese ) > 0 ) { $refreshToo = $refreshToo.add( refreshThese ) };
		} ) ( );
	};

	/* Add to (or subtract from) a variable's existing value when this link is clicked */
	thisLabel = "data-click-addtovar";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var variableName = Util.getAttributeValue( $element, thisLabel, 1 );
			if ( !Util.containsText( variableName ) ) { return };

			var amount = parseInt( Util.getAttributeValue( $element, thisLabel, 2 ) );
			if ( isNaN( amount ) ) { amount = 1 };
			Story.addToVariable( variableName, amount );

			var refreshThese = Scene.find ( Util.getAttributeValue( $element, thisLabel, 3 ), $element );
			if ( Util.elementCount ( refreshThese ) > 0 ) { $refreshToo = $refreshToo.add( refreshThese ) };
		} ) ( );
	};

	/* Run load actions from a canon passage when this link is clicked */
	thisLabel = "data-click-macro";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var selectors = Util.getAttributeValue( $element, thisLabel );
			jQuery.each( Util.parameterStringToArray( selectors ), function( index, selector ) {
				var $canonElement = Canon.find( selector );
				Scene.runLoadActions( $canonElement.clone(), { isMacro: true } );
			} );
		} ) ( );
	};

	/* Execute JavaScript code when this link is clicked */
	thisLabel = "data-click-run";
	if ( $element.hasAttr( thisLabel ) ) {
		Util.evaluate( Util.getAttributeValue( $element, thisLabel ) );
	};

	/* Replace this link with a canon passage when this link is clicked */
	thisLabel = "data-click-become";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var selectors = Util.getAttributeValue( $element, thisLabel );
			var selector = Util.chooseOneFromParameters( selectors );
			var $canonElement = Canon.find( selector );
			Scene.replace( $element, $canonElement );
		} ) ( );
	};

	/* Go to another scene when this link is clicked */
	thisLabel = "data-click";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var selectors = Util.getAttributeValue( $element, thisLabel );
			var selector = Util.chooseOneFromParameters( selectors );
			Scene.goTo( Canon.find( selector ), selector );
		} ) ( );
	};

	/* Go to one of two scenes, depending on a boolean expression result */
	thisLabel = "data-click-switch";
	if ( $element.hasAttr( thisLabel ) && !$element.hasAttr( "data-click" ) ) {
		( function() {
			var result = Util.evaluateToBoolean( Util.getAttributeValue( $element, thisLabel, 1 ) );
			var selector1 = Util.getAttributeValue( $element, thisLabel, 2 );
			var selector2 = Util.getAttributeValue( $element, thisLabel, 3 );
			var selector = result ? selector1 : selector2;
			var $target = Canon.find( selector );
			Scene.goTo( $target, selector );
		} ) ( );
	};

	/* Go back to the previous bookmark when this link is clicked */
	thisLabel = "data-click-back";
	if ( $element.hasAttr( thisLabel ) && !$element.hasAttr( "data-click" ) &&
			!$element.hasAttr( "data-click-switch" ) ) {
		Scene.back( Canon.find( Util.getAttributeValue( $element, thisLabel, 1 ) ) );
	};

	/* Prepend a canon passage to something in the current scene when this link is clicked */
	thisLabel = "data-click-prepend";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var $canonElement = Canon.find( Util.getAttributeValue( $element, thisLabel, 1 ) );

			var targetSelector = Util.getAttributeValue( $element, thisLabel, 2 );
			if ( !Util.containsText( targetSelector ) ) { return Scene.prependToScene( $canonElement ) };
			var $targets = Scene.find( targetSelector, $element );
			if ( Util.elementCount( $targets ) === 0 ) { return };

			Scene.prependOrAppend( {
				action: "prepend",
				$canonElement: $canonElement,
				$targets: $targets,
				insideOrOutside: Util.getAttributeValue( $element, thisLabel, 3 )
			} );

		} ) ( );
	};

	/* Append a canon passage to something in the current scene when this link is clicked */
	thisLabel = "data-click-append";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var $canonElement = Canon.find( Util.getAttributeValue( $element, thisLabel, 1 ) );

			var targetSelector = Util.getAttributeValue( $element, thisLabel, 2 );
			if ( !Util.containsText( targetSelector ) ) { return Scene.appendToScene( $canonElement ) };
			var $targets = Scene.find( targetSelector, $element );
			if ( Util.elementCount( $targets ) === 0 ) { return };

			Scene.prependOrAppend( {
				action: "append",
				$canonElement: $canonElement,
				$targets: $targets,
				insideOrOutside: Util.getAttributeValue( $element, thisLabel, 3 )
			} );

		} ) ( );
	};

	/* Replace something in the current scene with a canon passage when this link is clicked */
	thisLabel = "data-click-replace";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var targetSelector = Util.getAttributeValue( $element, thisLabel, 1 );
			if ( !Util.containsText( targetSelector ) ) { return };
			var $targets = Scene.find( targetSelector, $element );

			var $canonElement = Canon.find( Util.getAttributeValue( $element, thisLabel, 2 ) );
			Scene.replace( $targets, $canonElement );
		} ) ( );
	};

	/* Deactivate certain links in the current scene when this link is clicked */
	thisLabel = "data-click-deactivate";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var selectors = Util.getAttributeValue( $element, thisLabel );
			var $targets;
			if ( !Util.containsText( selectors ) ) {
				if ( !Scene.contains( $element ) ) { return } // avoid altering elements outside scene
				else { $targets = $element };
			}
			else { $targets = Scene.find( selectors, $element ) };

			Scene.deactivate( $targets );
		} ) ( );
	};

	/* Refresh something in the current scene (rerun its load actions) when this link is clicked */
	thisLabel = "data-click-refresh";
	if ( $element.hasAttr( thisLabel ) || Util.elementCount ( $refreshToo ) > 0 ) {
		( function() {
			var selectors = Util.getAttributeValue( $element, thisLabel );
			if ( !Util.containsText( selectors ) && $element.hasAttr( thisLabel ) ) { return Scene.refreshAll() };
			var $targets = Scene.find( selectors, $element ).add( $refreshToo );
			Scene.refresh( $targets );
		} ) ( );
	};

	/* Remove something from the current scene when this link is clicked */
	thisLabel = "data-click-remove";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var selectors = Util.getAttributeValue( $element, thisLabel );
			var $targets;
			if ( !Util.containsText( selectors ) ) {
				if ( !Scene.contains( $element ) ) { return } // avoid altering elements outside scene
				else { $targets = $element };
			}
			else { $targets = Scene.find( selectors, $element ) };

			Scene.remove( $targets );
		} ) ( );
	};

	/* Reset the reader's scene history when this link is clicked */
	thisLabel = "data-click-resetbookmarks";
	if ( $element.hasAttr( thisLabel ) ) { Story.resetBookmarks( { keepCurrent: true } ) };

	/* Save story progress when this link is clicked */
	thisLabel = "data-click-savestory";
	if ( $element.hasAttr( thisLabel ) ) { Story.save() };

};


/* --- [ LOAD ACTIONS ] --- */

/* Processing load-action elements in a scene passage */
Scene.runLoadActions = function( $passage, options ) {
	if ( Util.elementCount ( $passage ) === 0 ) { return };
	var isMacro = Util.getProperty( options, "isMacro" );

	/* Erase any existing logic results */
	$passage.findIncludingSelf( "[data-logic-result]" ).removeAttr( "data-logic-result" );

	/* Find elements containing recognized load actions */
	var $actions = $passage.findIncludingSelf( "[data-logic-if], [data-logic-elseif], [data-logic-else], [data-load], [data-load-addtovar], [data-load-append], [data-load-become], [data-load-deactivate], [data-load-expression], [data-load-goto], [data-load-macro], [data-load-prepend], [data-load-refresh], [data-load-remove], [data-load-resetbookmarks], [data-load-replace], [data-load-run], [data-load-savestory], [data-load-setrandom], [data-load-setvar], [data-load-switch], [data-load-var]" );
		/* Potential bug culprit: the list of selectors above is used to limit how many elements are processed below, but if a new load action is added below without adding it here, that load action type will never trigger. This can be difficult to debug! */

	/* Process each element's load actions (in the order they appear in the passage) */
	$actions.each( function() {
		var $this = $(this);
		runElementLogic( $this ); // update logic
		if ( $this.attr( "data-logic-result" ) !== "false" ) { // run other actions if logic isn't false
			runElementLoadActions( $this, { isMacro: isMacro, $actions: $actions } );
		};
	} );

	/* How to update an element's logic result */
	function runElementLogic( $element ) {

		/* How to apply a boolean result to this element */
		function applyResult( booleanValue ) {
			$element.attr( "data-logic-result", booleanValue ? "true" : "false" );
		};

		/* Automatically apply false if inside a false parent element */
		var $falseParents = $element.parents( "[data-logic-result='false']" );
		if ( Util.elementCount( $falseParents ) > 0 ) {
			applyResult( false );
			return;
		};

		/* Determine logic type of this element */
		var logicType;
		if ( $element.hasAttr( "data-logic-if" ) ) { logicType = "if" }
		else if ( $element.hasAttr( "data-logic-elseif" ) ) { logicType = "else if" }
		else if ( $element.hasAttr( "data-logic-else" ) ) { logicType = "else" }
		else { return };

		var result;

		/* "If" result = evaluate expression */
		if ( logicType === "if" ) {
			result = Util.evaluateToBoolean( $element.attr( "data-logic-if" ) );
			applyResult( result );
			return;
		};

		/* The other logic types need to know whether a previous logic sibling was true */
		var hadTrueSibling = ( Util.elementCount( $element.prevAll( "[data-logic-result='true']" ) ) > 0 );

		/* "Else if" result = false if prior sibling was true, otherwise evaluate expression */
		if ( logicType === "else if" ) {
			if ( hadTrueSibling ) { result = false }
			else { result = Util.evaluateToBoolean( $element.attr( "data-logic-elseif" ) ) };
			applyResult( result );
			return;
		};

		/* "Else" result = false if prior sibling was true, otherwise true */
		if ( logicType === "else" ) {
			result = !hadTrueSibling;
			applyResult( result );
			return;
		};

	};
};

/* How to process an element's other load actions (each occurs before the element fades in) */
function runElementLoadActions( $element, options ) {
	var thisLabel;
	var $refreshToo = $();
	var isMacro = Util.getProperty( options, "isMacro" );
	var $actions = Util.getProperty( options, "$actions" );

	/* The following actions are listed in a specific order in case multiples apply to the same element */

	/* Skip load actions when appropriate */
	thisLabel = "data-load-skip";
	if ( $element.hasAttr( thisLabel ) ) { return };

	/* Reset the reader's scene history if/when this element loads */
	thisLabel = "data-load-resetbookmarks";
	if ( $element.hasAttr( thisLabel ) ) {
		Story.resetBookmarks( { keepCurrent: true } );
	};

	/* Set a variable to a new value if/when this element loads */
	thisLabel = "data-load-setvar";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var variableName = Util.getAttributeValue( $element, thisLabel, 1 );
			if ( !Util.containsText( variableName ) ) { return };

			var value = Util.getAttributeValue( $element, thisLabel, 2 );
			Story.setVariableByExpression( variableName, value );

			var refreshThese = Scene.find ( Util.getAttributeValue( $element, thisLabel, 3 ) );
			if ( Util.elementCount ( refreshThese ) > 0 ) { $refreshToo = $refreshToo.add( refreshThese ) };
		} ) ( );
	};

	/* Set a variable to a random integer if/when this element loads */
	thisLabel = "data-load-setrandom";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var variableName = Util.getAttributeValue( $element, thisLabel, 1 );
			if ( !Util.containsText( variableName ) ) { return };

			var numChoices = parseInt( Util.getAttributeValue( $element, thisLabel, 2 ) );
			if ( isNaN( numChoices ) ) { numChoices = 2 };
			Story.setRandom( variableName, numChoices );

			var refreshThese = Scene.find ( Util.getAttributeValue( $element, thisLabel, 3 ) );
			if ( Util.elementCount ( refreshThese ) > 0 ) { $refreshToo = $refreshToo.add( refreshThese ) };
		} ) ( );
	};

	/* Add to (or subtract from) a variable's existing value if/when this element loads */
	thisLabel = "data-load-addtovar";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var variableName = Util.getAttributeValue( $element, thisLabel, 1 );
			if ( !Util.containsText( variableName ) ) { return };

			var amount = parseInt( Util.getAttributeValue( $element, thisLabel, 2 ) );
			if ( isNaN( amount ) ) { amount = 1 };
			Story.addToVariable( variableName, amount );

			var refreshThese = Scene.find ( Util.getAttributeValue( $element, thisLabel, 3 ) );
			if ( Util.elementCount ( refreshThese ) > 0 ) { $refreshToo = $refreshToo.add( refreshThese ) };
		} ) ( );
	};

	/* Run load actions from a canon passage if/when this element loads */
	thisLabel = "data-load-macro";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var selectors = Util.getAttributeValue( $element, thisLabel );
			jQuery.each( Util.parameterStringToArray( selectors ), function( index, selector ) {
				var $canonElement = Canon.find( selector );
				Scene.runLoadActions( $canonElement.clone(), { isMacro: true } );
			} );
		} ) ( );
	};

	/* Execute JavaScript code if/when this element loads */
	thisLabel = "data-load-run";
	if ( $element.hasAttr( thisLabel ) ) {
		Util.evaluate( Util.getAttributeValue( $element, thisLabel ) );
	};

	/* Replace this element's contents with a canon passage if/when this element loads */
	thisLabel = "data-load";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var selectors = Util.getAttributeValue( $element, thisLabel );
			var selector = Util.chooseOneFromParameters( selectors );
			var $new = Canon.find( selector ).clone();
			$element.html( $new );
			Scene.runLoadActions( $new );
			Scene.doCommaSeries( $new );
		} ) ( );
	};

	/* Replace this element's contents with a variable's value if/when this element loads */
	thisLabel = "data-load-var";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var result = Story.getVariable( Util.getAttributeValue( $element, thisLabel, 1 ) );
			var fallbackStr = Util.getAttributeValue( $element, thisLabel, 2 );
			if ( Util.isUndefined ( result ) || result === null ) {
				result = fallbackStr;
				if ( !Util.containsText( result ) ) { result = "" };
			};
			$element.html( result );
		} ) ( );
	};

	/* Replace the contents of this element with list elements based on an array if/when this element loads */
	thisLabel = "data-load-array";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var array = Story.getVariable( Util.getAttributeValue( $element, thisLabel, 1 ) );
			var fallbackStr = Util.getAttributeValue( $element, thisLabel, 2 );

			if ( Util.isUndefined( array ) ) { return doFallback() };
			if ( !Util.isArray ( array ) ) { return $element.html( makeListItem( array ) ) };
			if ( array.length === 0 ) { return doFallback() };

			var $listItems = $();
			jQuery.each( array, function( index, value ) {
				$listItems = $listItems.add( makeListItem( value ) );
			} );
			$element.html( $listItems );

			/* How to make a list item */
			function makeListItem( str ) {
				if ( $element.is( "ol" ) || $element.is( "ul" ) ) {
					return jQuery( "<li>" + str + "</li>" )
				} else {
					return jQuery( "<span>" + str + "</span>" )
				};
			};

			/* How apply the fallback item */
			function doFallback() {
				if ( !Util.containsText( fallbackStr ) ) { return $element.empty() };
				$element.html( makeListItem( fallbackStr ) );
			};
		} ) ( );
	};

	/* Replace this element's contents with a JavaScript expression's result if/when this element loads */
	thisLabel = "data-load-expression";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var result = Util.evaluate( Util.getAttributeValue( $element, thisLabel ) );
			if ( Util.isUndefined ( result ) || result === null ) { result = "" };
			$element.html( result );
		} ) ( );
	};

	/* Replace this element's contents with one of two strings, depending on a boolean expression result */
	thisLabel = "data-load-switch";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var result = Util.evaluateToBoolean( Util.getAttributeValue( $element, thisLabel, 1 ) );
			var str1 = Util.getAttributeValue( $element, thisLabel, 2 );
			if ( !Util.containsText( str1 ) ) { str1 = "" };
			var str2 = Util.getAttributeValue( $element, thisLabel, 3 );
			if ( !Util.containsText( str2 ) ) { str2 = "" };
			$element.html( result ? str1 : str2 );
		} ) ( );
	};

	/* Replace this element with a canon passage if/when this element loads */
	thisLabel = "data-load-become";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var selectors = Util.getAttributeValue( $element, thisLabel );
			var selector = Util.chooseOneFromParameters( selectors );
			var $canonElement = Canon.find( selector );
			Scene.replace( $element, $canonElement );
		} ) ( );
	};

	/* Go to another scene if/when this element loads */
	thisLabel = "data-load-goto";
	if ( $element.hasAttr( "data-load-goto" ) ) {
		( function() {
			var selectors = Util.getAttributeValue( $element, thisLabel );
			var selector = Util.chooseOneFromParameters( selectors );
			var $target = Canon.find( selector );
			if ( Util.elementCount( $target ) === 0 ) { return };

			/* Skip remaining load actions in the scene being departed (not applicable if run from a macro) */
			if ( !isMacro ) { $actions.attr( "data-load-skip", "" ) };

			Scene.goTo( $target, selector );
		} ) ( );
	};

	/* Prepend a canon element to something in the current scene if/when this element loads */
	thisLabel = "data-load-prepend";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var $canonElement = Canon.find( Util.getAttributeValue( $element, thisLabel, 1 ) );

			var targetSelector = Util.getAttributeValue( $element, thisLabel, 2 );
			if ( !Util.containsText( targetSelector ) ) { return Scene.prependToScene( $canonElement ) };
			var $targets = Scene.find( targetSelector, $element );
			if ( Util.elementCount( $targets ) === 0 ) { return };

			Scene.prependOrAppend( {
				action: "prepend",
				$canonElement: $canonElement,
				$targets: $targets,
				insideOrOutside: Util.getAttributeValue( $element, thisLabel, 3 )
			} );

		} ) ( );
	};

	/* Append a canon element to something in the current scene if/when this element loads */
	thisLabel = "data-load-append";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var $canonElement = Canon.find( Util.getAttributeValue( $element, thisLabel, 1 ) );

			var targetSelector = Util.getAttributeValue( $element, thisLabel, 2 );
			if ( !Util.containsText( targetSelector ) ) { return Scene.appendToScene( $canonElement ) };
			var $targets = Scene.find( targetSelector, $element );
			if ( Util.elementCount( $targets ) === 0 ) { return };

			Scene.prependOrAppend( {
				action: "append",
				$canonElement: $canonElement,
				$targets: $targets,
				insideOrOutside: Util.getAttributeValue( $element, thisLabel, 3 )
			} );

		} ) ( );
	};

	/* Replace something in the current scene with a canon element if/when this element loads */
	thisLabel = "data-load-replace";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var targetSelector = Util.getAttributeValue( $element, thisLabel, 1 );
			if ( !Util.containsText( targetSelector ) ) { return };
			var $targets = Scene.find( targetSelector, $element );

			var $canonElement = Canon.find( Util.getAttributeValue( $element, thisLabel, 2 ) );
			Scene.replace( $targets, $canonElement );
		} ) ( );
	};

	/* Deactivate certain links in the current scene if/when this element loads */
	thisLabel = "data-load-deactivate";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var targetSelector = Util.getAttributeValue( $element, thisLabel, 1 );
			if ( !Util.containsText( targetSelector ) ) { return };
			var $targets = Scene.find( targetSelector, $element );

			Scene.deactivate( $targets );
		} ) ( );
	};

	/* Refresh something in the current scene (rerun its load actions) if/when this element loads */
	thisLabel = "data-load-refresh";
	if ( $element.hasAttr( thisLabel ) || Util.elementCount ( $refreshToo ) > 0 ) {
		( function() {
			var selectors = Util.getAttributeValue( $element, thisLabel );
			if ( !Util.containsText( selectors ) && $element.hasAttr( thisLabel ) ) {
				$element.removeAttr( "data-load-refresh" ); // to avoid an infinite refresh loop
				return Scene.refreshAll();
			};
			var $targets = Scene.find( selectors ).add( $refreshToo );
			Scene.refresh( $targets );
		} ) ( );
	};

	/* Remove something from the current scene if/when this element loads */
	thisLabel = "data-load-remove";
	if ( $element.hasAttr( thisLabel ) ) {
		( function() {
			var selectors = Util.getAttributeValue( $element, thisLabel );
			var $targets;
			if ( !Util.containsText( selectors ) ) { $targets = $element }
			else { $targets = Scene.find( selectors, $element ) };

			Scene.remove( $targets );
		} ) ( );
	};

	/* Save story progress if/when this element loads (auto-save) */
	if ( $element.hasAttr( "data-load-savestory" ) ) {
		Story.save( { doQuietly: true } );
	};

};


/* --- [ COMMA SERIES ] --- */

/* Adding commas and conjunction to inline lists */
Scene.doCommaSeries = function( $passage ) {
	if ( Util.elementCount( $passage ) === 0 ) { return };
	var $lists = $passage.find( ".comma-series:visible" );
	if ( Util.elementCount( $lists ) === 0 ) { return };
	$lists.each( function() { doThisSeries( $(this) ) } );

	/* How to process a single series */
	function doThisSeries( $container ) {
		if ( Util.elementCount( $container ) === 0 ) { return };
		if ( !$container.hasClass( "comma-series" ) ) { return };

		var $children = $container.children();
		$children.removeClass( "series-add-comma" );
		$children.removeClass( "series-add-and" );
		$children.removeClass( "series-add-or" );
		$children.removeClass( "series-add-comma-and" );
		$children.removeClass( "series-add-comma-or" );

		$children = $children.filter( ":visible" );
		var childCount = Util.elementCount( $children );
		if ( childCount === 0 ) { return };
		$lastChild = $children.eq( -1 );
		$nextToLastChild = $children.eq( -2 );

		var conjunction = $container.hasClass( "or" ) ? "or" : "and";
		var useOxford = Settings.USE_OXFORD_COMMA;

		if ( childCount === 1 ) { return }
		else if ( childCount === 2 ) { $nextToLastChild.addClass( "series-add-" + conjunction ) }
		else {
			$children.addClass( "series-add-comma" );
			$lastChild.removeClass( "series-add-comma" );
			$nextToLastChild.removeClass( "series-add-comma" );
			$nextToLastChild.addClass( "series-add-" + ( useOxford ? "comma-" : "" ) + conjunction );
		};
	};
};


/* --- [ SAVE/LOAD ] --- */

/* Assigning a (hopefully unique) story code for saving and loading */
Story.setStoryCode = function() {
	var code = "story";
	var $head = $( "head" );
	if ( Util.elementCount( $head ) > 0 ) {
		if ( $head.hasAttr( "data-storyid" ) ) {
			code = $head.attr( "data-storyid" );
		};
	};
	Story.code = code;
};

/* Saving story progress */
Story.save = function( args ) {
	var doQuietly = Util.getProperty( args, "doQuietly" );
	localStorage.setItem( Story.code + "-variables", JSON.stringify( Variables ) );
	localStorage.setItem( Story.code + "-bookmarks", JSON.stringify( Story.bookmarkSelectors ) );
	localStorage.setItem( Story.code + "-scene", Scene.elem.html() );
	if ( !doQuietly ) { alert( "Game saved." ) };
};

/* Loading story progress */
Story.load = function( args ) {
	var doQuietly = Util.getProperty( args, "doQuietly" );

	if ( !doQuietly ) {
		if ( !window.confirm( "Abandon your current progress to load the most recent save data?" ) ) { return };
	};

	/* Try loading; abort if it fails */
	var loadedVariables = JSON.parse( localStorage.getItem( Story.code + "-variables" ) );
	if ( Util.isUndefined( loadedVariables ) || ( loadedVariables === null ) ) {
		return alert( "No save data exists for this story." );
	};

	/* Restore from save */
	Scene.scrollToTop();
	Scene.lock();
	Scene.fadeOut( Scene.elem.children(), function() {
		Variables = loadedVariables;
		Story.bookmarkSelectors = JSON.parse( localStorage.getItem( Story.code + "-bookmarks" ) );
		restoreBookmarksFromSelectors();
		Scene.elem.html( localStorage.getItem( Story.code + "-scene" ) );
		Scene.postNew( Scene.elem.children(), { noRun: true } );
		Scene.unlock();
	} );

	/* How to restore bookmarks as jQuery objects from the loaded array of selectors */
	function restoreBookmarksFromSelectors() {
		Story.bookmarks = [ ];
		var selectors = Story.bookmarkSelectors;
		if ( selectors.length === 0 ) { return };

		jQuery.each( selectors, function( index, selector ) {
			Story.bookmarks.push( Canon.find( selector ) );
		} );
	};

};