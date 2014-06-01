define(function(require) {
	var id = require("lib/id");
	var Event = require("lib/Event");
	var Game = require("./Game");
	var jsonChessConstants = require("jsonchess/constants");
	
	function Challenge(owner, options) {
		this._id = id();
		this._owner = owner;
		
		this.Expired = new Event(this);
		this.Accepted = new Event(this);
		this.Timeout = new Event(this);
		this.Canceled = new Event(this);
		
		this._options = {
			initialTime: "10m",
			timeIncrement: "0",
			acceptRatingMin: "-100",
			acceptRatingMax: "+100"
		};
		
		if(options) {
			for(var p in options) {
				this._options[p] = options[p];
			}
		}
		
		this._acceptRatingMin = this._getAbsoluteGuestRating(this._options.acceptRatingMin);
		this._acceptRatingMax = this._getAbsoluteGuestRating(this._options.acceptRatingMax);
		
		this._timeoutTimer = setTimeout((function() {
			this._timeout();
		}).bind(this), jsonChessConstants.CHALLENGE_TIMEOUT);
	}
	
	Challenge.prototype.getId = function() {
		return this._id;
	}
	
	Challenge.prototype.accept = function(user) {
		var guestRating = user.getRating();
		var game = null;
		
		if(user !== this._owner && guestRating >= this._acceptRatingMin && guestRating <= this._acceptRatingMax) {
			var white, black;
			var ownerRatio = this._owner.getGamesAsWhiteRatio();
			var guestRatio = user.getGamesAsWhiteRatio();
			
			if(ownerRatio > guestRatio) {
				white = user;
				black = this._owner;
			}
			
			else {
				white = this._owner;
				black = user;
			}
			
			game = new Game(white, black, {
				initialTime: this._options.initialTime,
				timeIncrement: this._options.timeIncrement
			});
			
			this._clearTimeoutTimer();
			
			this.Accepted.fire({
				game: game
			});
			
			this.Expired.fire();
		}
		
		return game;
	}
	
	Challenge.prototype.cancel = function() {
		this._clearTimeoutTimer();
		this.Canceled.fire();
		this.Expired.fire();
	}
	
	Challenge.prototype._timeout = function() {
		this.Timeout.fire();
		this.Expired.fire();
	}
	
	Challenge.prototype._clearTimeoutTimer = function() {
		if(this._timeoutTimer !== null) {
			clearTimeout(this._timeoutTimer);
			
			this._timeoutTimer = null;
		}
	}
	
	Challenge.prototype._getAbsoluteGuestRating = function(ratingSpecifier) {
		var firstChar = ratingSpecifier.charAt(0);
		
		if(firstChar === "-" || firstChar === "+") {
			return this._owner.getRating() + parseInt(ratingSpecifier);
		}
		
		else {
			return parseInt(ratingSpecifier);
		}
	}
	
	Challenge.prototype.toJSON = function() {
		return {
			id: this._id,
			owner: this._owner,
			options: this._options
		};
	}
	
	return Challenge;
});