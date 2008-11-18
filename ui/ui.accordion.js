/*
 * jQuery UI Accordion @VERSION
 * 
 * Copyright (c) 2007, 2008 Jörn Zaefferer
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Accordion
 *
 * Depends:
 *	ui.core.js
 */
(function($) {

$.widget("ui.accordion", {
	_init: function() {
		var options = this.options;
		
		if ( options.navigation ) {
			var current = this.element.find("a").filter(options.navigationFilter);
			if ( current.length ) {
				if ( current.filter(options.header).length ) {
					options.active = current;
				} else {
					options.active = current.parent().parent().prev();
					current.addClass("current");
				}
			}
		}
		
		// calculate active if not specified, using the first header
		options.headers = this.element.find(options.header);
		options.active = findActive(options.headers, options.active);
		
		// IE7-/Win - Extra vertical space in Lists fixed
		if ($.browser.msie) {
			this.element.find('a').css('zoom', '1');
		}
		
		if (!this.element.hasClass("ui-accordion")) {
			this.element.addClass("ui-accordion");
			$('<span class="ui-accordion-left"/>').insertBefore(options.headers);
			$('<span class="ui-accordion-right"/>').appendTo(options.headers);
			options.headers.addClass("ui-accordion-header");
		}
		
		var maxHeight;
		if ( options.fillSpace ) {
			maxHeight = this.element.parent().height();
			options.headers.each(function() {
				maxHeight -= $(this).outerHeight();
			});
			var maxPadding = 0;
			options.headers.next().each(function() {
				maxPadding = Math.max(maxPadding, $(this).innerHeight() - $(this).height());
			}).height(maxHeight - maxPadding);
		} else if ( options.autoHeight ) {
			maxHeight = 0;
			options.headers.next().each(function() {
				maxHeight = Math.max(maxHeight, $(this).outerHeight());
			}).height(maxHeight);
		}
				
		this.element.attr('role','tablist');

		var self=this;
		options.headers
			.attr('role','tab')
			.bind('keydown', function(event) { return self._keydown(event); })
			.next()
			.attr('role','tabpanel');
		
		options.headers
			.not(options.active || "")
			.attr('aria-expanded','false')
			.attr("tabIndex", "-1")
			.next()
			.hide();
			
		// make sure at least one header is in the tab order
		if (!options.active.length) {
			options.headers.eq(0).attr('tabIndex','0');
		} else {
			options.active
				.attr('aria-expanded','true')
				.attr("tabIndex", "0")
				.parent().andSelf().addClass(options.selectedClass);
		}
		
		// only need links in taborder for Safari
		if (!$.browser.safari)
			options.headers.find('a').attr('tabIndex','-1');
		
		if (options.event) {
			this.element.bind((options.event) + ".accordion", clickHandler);
		}
	},
	
	_keydown: function(event) {
		if (this.options.disabled || event.altKey || event.ctrlKey)
			return;

		var keyCode = $.keyCode;
		
		var length = this.options.headers.length;
		var currentIndex = this.options.headers.index(event.target);
		var toFocus = false;
		
		switch(event.keyCode) {
			case keyCode.RIGHT:
			case keyCode.DOWN:
				toFocus = this.options.headers[(currentIndex + 1) % length];
				break;
			case keyCode.LEFT:
			case keyCode.UP:
				toFocus = this.options.headers[(currentIndex - 1 + length) % length];
				break;
			case keyCode.SPACE:
			case keyCode.ENTER:
				return clickHandler.call(this.element[0], { target: event.target });
		}
		
		if (toFocus) {
			$(event.target).attr('tabIndex','-1');
			$(toFocus).attr('tabIndex','0');
			toFocus.focus();
			return false;
		}

		return true;
	},
	
	activate: function(index) {
		// call clickHandler with custom event
		clickHandler.call(this.element[0], {
			target: findActive( this.options.headers, index )[0]
		});
	},
	
	destroy: function() {
		this.options.headers.parent().andSelf().removeClass(this.options.selectedClass);
		this.options.headers.prev(".ui-accordion-left").remove();
		this.options.headers.children(".ui-accordion-right").remove();
		this.options.headers.next().css("display", "");
		if ( this.options.fillSpace || this.options.autoHeight ) {
			this.options.headers.next().css("height", "");
		}
		$.removeData(this.element[0], "accordion");
		
		this.element.removeClass("ui-accordion").unbind(".accordion");
	}
});

function scopeCallback(callback, scope) {
	return function() {
		return callback.apply(scope, arguments);
	};
};

function completed(cancel) {
	// if removed while animated data can be empty
	if (!$.data(this, "accordion")) {
		return;
	}
	
	var instance = $.data(this, "accordion");
	var options = instance.options;
	options.running = cancel ? 0 : --options.running;
	if ( options.running ) {
		return;
	}
	if ( options.clearStyle ) {
		options.toShow.add(options.toHide).css({
			height: "",
			overflow: ""
		});
	}
	instance._trigger('change', null, options.data);
}

function toggle(toShow, toHide, data, clickedActive, down) {
	var options = $.data(this, "accordion").options;
	options.toShow = toShow;
	options.toHide = toHide;
	options.data = data;
	var complete = scopeCallback(completed, this);
	
	$.data(this, "accordion")._trigger("changestart", null, options.data);
	
	// count elements to animate
	options.running = toHide.size() === 0 ? toShow.size() : toHide.size();
	
	if ( options.animated ) {
		var animOptions = {};
		
		if ( !options.alwaysOpen && clickedActive ) {
			animOptions = {
				toShow: $([]),
				toHide: toHide,
				complete: complete,
				down: down,
				autoHeight: options.autoHeight
			};
		} else {
			animOptions = {
				toShow: toShow,
				toHide: toHide,
				complete: complete,
				down: down,
				autoHeight: options.autoHeight
			};
		}
		
		if (!options.proxied) {
			options.proxied = options.animated;
		}
		
		if (!options.proxiedDuration) {
			options.proxiedDuration = options.duration;
		}
		
		options.animated = $.isFunction(options.proxied) ?
			options.proxied(animOptions) : options.proxied;
		
		options.duration = $.isFunction(options.proxiedDuration) ?
			options.proxiedDuration(animOptions) : options.proxiedDuration;

		var animations = $.ui.accordion.animations,
			duration = options.duration,
			easing = options.animated;
		
		if (!animations[easing]) {
			animations[easing] = function(options) {
				this.slide(options, {
					easing: easing,
					duration: duration || 700
				});
			};
		}
		
		animations[easing](animOptions);
		
	} else {
		if ( !options.alwaysOpen && clickedActive ) {
			toShow.toggle();
		} else {
			toHide.hide();
			toShow.show();
		}
		complete(true);
	}
	toHide.prev().attr('aria-expanded','false').attr("tabIndex", "-1");
	toShow.prev().attr('aria-expanded','true').attr("tabIndex", "0").focus();;
}

function clickHandler(event) {
	var options = $.data(this, "accordion").options;
	if (options.disabled) {
		return false;
	}
	
	// called only when using activate(false) to close all parts programmatically
	if ( !event.target && !options.alwaysOpen ) {
		options.active.parent().andSelf().toggleClass(options.selectedClass);
		var toHide = options.active.next(),
			data = {
				options: options,
				newHeader: $([]),
				oldHeader: options.active,
				newContent: $([]),
				oldContent: toHide
			},
			toShow = (options.active = $([]));
		toggle.call(this, toShow, toHide, data );
		return false;
	}
	// get the click target
	var clicked = $(event.target);
	
	// due to the event delegation model, we have to check if one
	// of the parent elements is our actual header, and find that
	// otherwise stick with the initial target
	clicked = $( clicked.parents(options.header)[0] || clicked );
	
	var clickedActive = clicked[0] == options.active[0];
	
	// if animations are still active, or the active header is the target, ignore click
	if (options.running || (options.alwaysOpen && clickedActive)) {
		return false;
	}
	if (!clicked.is(options.header)) {
		return;
	}
	
	// switch classes
	options.active.parent().andSelf().toggleClass(options.selectedClass);
	if ( !clickedActive ) {
		clicked.parent().andSelf().addClass(options.selectedClass);
	}
	
	// find elements to show and hide
	var toShow = clicked.next(),
		toHide = options.active.next(),
		data = {
			options: options,
			newHeader: clickedActive && !options.alwaysOpen ? $([]) : clicked,
			oldHeader: options.active,
			newContent: clickedActive && !options.alwaysOpen ? $([]) : toShow,
			oldContent: toHide
		},
		down = options.headers.index( options.active[0] ) > options.headers.index( clicked[0] );
	
	options.active = clickedActive ? $([]) : clicked;
	toggle.call(this, toShow, toHide, data, clickedActive, down );
	
	return false;
};

function findActive(headers, selector) {
	return selector
		? typeof selector == "number"
			? headers.filter(":eq(" + selector + ")")
			: headers.not(headers.not(selector))
		: selector === false
			? $([])
			: headers.filter(":eq(0)");
}

$.extend($.ui.accordion, {
	version: "@VERSION",
	defaults: {
		selectedClass: "selected",
		alwaysOpen: true,
		animated: 'slide',
		event: "click",
		header: "a",
		autoHeight: true,
		running: 0,
		navigationFilter: function() {
			return this.href.toLowerCase() == location.href.toLowerCase();
		}
	},
	animations: {
		slide: function(options, additions) {
			options = $.extend({
				easing: "swing",
				duration: 300
			}, options, additions);
			if ( !options.toHide.size() ) {
				options.toShow.animate({height: "show"}, options);
				return;
			}
			var hideHeight = options.toHide.height(),
				showHeight = options.toShow.height(),
				difference = showHeight / hideHeight,
				padding = options.toShow.outerHeight() - options.toShow.height(),
				margin = options.toShow.css('marginBottom'),
				overflow = options.toShow.css('overflow')
				tmargin = options.toShow.css('marginTop');
			options.toShow.css({ height: 0, overflow: 'hidden', marginTop: 0, marginBottom: -padding }).show();
			options.toHide.filter(":hidden").each(options.complete).end().filter(":visible").animate({height:"hide"},{
				step: function(now) {
					var current = (hideHeight - now) * difference;
					if ($.browser.msie || $.browser.opera) {
						current = Math.ceil(current);
					}
					options.toShow.height( current );
				},
				duration: options.duration,
				easing: options.easing,
				complete: function() {
					if ( !options.autoHeight ) {
						options.toShow.css("height", "auto");
					}
					options.toShow.css({marginTop: tmargin, marginBottom: margin, overflow: overflow});
					options.complete();
				}
			});
		},
		bounceslide: function(options) {
			this.slide(options, {
				easing: options.down ? "easeOutBounce" : "swing",
				duration: options.down ? 1000 : 200
			});
		},
		easeslide: function(options) {
			this.slide(options, {
				easing: "easeinout",
				duration: 700
			});
		}
	}
});

})(jQuery);
