define(function(require) {
	var Event=require("lib/Event");
	var time=require("lib/time");
	var Publisher=require("lib/Publisher");
	
	function Client(connection, session) {
		this._session=session;
		this._connection=connection;
		
		this.Disconnected=new Event(this);
		
		this._timeLastMessageReceived=0;
		this._timeLastMessageSent=0;
		this._timeConnected=time();
		
		this._publisher=new Publisher();
		
		this._connectionMessageHandler=(function(message) {
			if(message.type==="utf8") {
				var data=JSON.parse(message.utf8Data);
				
				this._publisher.publish(data.url, data.data);
				this._timeLastMessageReceived=time();
			}
		}).bind(this);
		
		this._connectionCloseHandler=(function(reason, description) {
			this.Disconnected.fire({
				reason: reason,
				description: description
			});
		}).bind(this);
		
		this._setupConnection();
	}
	
	Client.prototype.subscribe=function(url, callback) {
		this._publisher.subscribe(url, callback);
	}
	
	Client.prototype.unsubscribe=function(url, callback) {
		this._publisher.unsubscribe(url, callback);
	}

	Client.prototype.send=function(url, data) {
		this._connection.sendUTF(JSON.stringify({
			url: url,
			data: data
		}));
		
		this._timeLastMessageSent=time();
	}
	
	Client.prototype.getSession=function() {
		return this._session;
	}
	
	Client.prototype.close=function() {
		this._connection.close();
		this._teardownConnection();
	}
	
	Client.prototype.getTimeLastActive=function() {
		return Math.max(this._timeConnected, this._timeLastMessageReceived);
	}
	
	Client.prototype._setupConnection=function() {
		this._connection.on("message", this._connectionMessageHandler);
		this._connection.on("close", this._connectionCloseHandler);
	}
	
	Client.prototype._teardownConnection=function() {
		this._connection.off("message", this._connectionMessageHandler);
		this._connection.off("close", this._connectionCloseHandler);
	}

	return Client;
});