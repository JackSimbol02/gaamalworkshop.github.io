/**
 * Botzone 2.0 本地对局工具相关
 * 作者：zhouhy
 */

// var cSharpNotifier = {
// 	judgeReady() {

// 	},
// 	judgeResponse(str) {

// 	},
// 	judgeFail(str) {

// 	},
// 	humanResponse(str) {

// 	}
// }

// LocalMatchController.emit(xxx)
// LocalMatchController.loglist.push
// LocalMatchController.sendToJudge('xx')
// LocalMatchController.status = 'xx'
var LocalMatchController = (function () {

	function initWorkerProxy(cb) {
		var iframe = $('#xorigin-workerproxy');
		iframe.prop("src", iframe.data("src"));
		var count = 0;
		var workers = [];
		iframe.one("load", function () {
			onmessage = function (e) {
				workers[e.data.id].onmessage(e.data);
			};
			cb(function (url) {
				iframe[0].contentWindow.postMessage({ type: "NEW", url: url }, "*");
				var id = count;
				count++;
				var w = {
					postMessage: function (msg) {
						iframe[0].contentWindow.postMessage({ type: "SEND", id: id, data: msg }, "*");
					},
					terminate: function () {
						iframe[0].contentWindow.postMessage({ type: "CLOSE", id: id }, "*");
						workers[id] = null;
					}
				};
				workers.push(w);
				return w;
			});
		});
	}
	function LocalMatchController(judgeScriptURL) {
		var that = this;
		this.emJudge = null;
		this.handlers = {};
		this.loglist = [];
		this.status = 'open';

		this.on('match.ready', function () {
			Botzone.onExit(function () {
				try {
					that.emJudge.terminate();
				} catch (ex) { }
			});
			initWorkerProxy(function (makeWorker) {
				that.emJudge = makeWorker(judgeScriptURL);
				that.emJudge.onmessage = function (e) {
					if (e.data.ready)
						cSharpNotifier.judgeReady();
					else
						cSharpNotifier.judgeFail(e.data.output);
				};
			});
			that.on('match.playermove', function (resp) {
				cSharpNotifier.humanResponse(JSON.stringify(resp));
			});
		});
	}

	LocalMatchController.prototype.sendToJudge = function (str) {
		// 与 Emscripten 程序进行异步交互
		this.emJudge.onmessage = function (e) {
			if (e.data.success)
				cSharpNotifier.judgeResponse(e.data.output);
			else
				cSharpNotifier.judgeFail(e.data.output);
		};
		if (typeof str !== 'string')
			str = JSON.stringify(str);
		this.emJudge.postMessage(str);
	}

	LocalMatchController.prototype.connect = function () {
		var that = this;
		setTimeout(function () {
			that.emit('reconnect');
		}, 0);
	};
	LocalMatchController.prototype.emit = function (event, data) {
		var that = this;
		if (event in this.handlers) {
			var h = this.handlers[event];
			setTimeout(function () {
				if (h)
					for (var i = 0; i < h.length; i++)
						h[i].call(that, data);
			}, 0);
		}
	};
	LocalMatchController.prototype.removeAllListeners = function (event) {
		delete this.handlers[event];
	};
	LocalMatchController.prototype.getMatch = function () {
		return { logs: this.loglist, status: this.status };
	};
	LocalMatchController.prototype.once = function (event, fn) {
		var realFn = function () {
			var h = this.handlers[event];
			if (h)
				for (var i = 0; i < h.length; i++)
					if (h[i] == realFn) {
						h.splice(i, 1);
						break;
					}
			fn.apply(this, arguments);
		}
		this.on(event, realFn);
	};
	LocalMatchController.prototype.on = function (event, fn) {
		if (event in this.handlers)
			this.handlers[event].push(fn);
		else
			this.handlers[event] = [fn];
	};

	return LocalMatchController;
})();
