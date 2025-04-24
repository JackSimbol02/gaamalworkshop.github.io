/**
 * Botzone 2.0 前端轻对局 Controller
 * 作者：zhouhy
 */

var Controller = (function () {

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

	function Controller(judgeScriptURL, playerScriptURL, initdata, playerSlotID) {
		var that = this;
		this.handlers = {};
		this.loglist = [];
		this.status = 'open';
		this.initdata = initdata || "";
		this.playerSlotID = playerSlotID;

		function initOnce() {
			// 真正的初始化函数
			if (!that.retracted) {
				that.loglist = [];
				that.initdata = initdata || "";
				that.slots = [];
				that.slots[1 - playerSlotID] = {
					worker: that.emPlayer,
					requests: [],
					responses: [],
					data: "",
					globaldata: ""
				};
			} else {
				for (var i = 0; i < that.loglist.length; i += 2)
					that.emit('match.newlog', that.loglist[i].output.display || "");
			}
			delete that.retracted;
			that.status = 'waiting';
			that.nextTurn();
		}

		var readyBits = 0, maxBits = 3;

		function ready(id) {
			return function () {
				readyBits |= 1 << id;
				if (readyBits == maxBits)
					initOnce();
			};
		}

		this.on('match.ready', function () {
			if (readyBits == maxBits)
				return initOnce();
			Botzone.onExit(function () {
				try {
					that.emJudge.terminate();
				} catch (ex) {}
				try {
					that.slots[1 - that.playerSlotID].worker.terminate();
				} catch (ex) {}
			});
			initWorkerProxy(function (makeWorker) {
				that.emJudge = makeWorker(judgeScriptURL);
				that.emJudge.onmessage = function (e) {
					if (e.data.ready)
						ready(0)();
					else
						Botzone.alert(e.data.output, true);
				};
				that.emPlayer = makeWorker(playerScriptURL);
				that.emPlayer.onmessage = function (e) {
					if (e.data.ready)
						ready(1)();
					else
						Botzone.alert(e.data.output, true);
				};
			});
		});
	}

	Controller.prototype.nextTurn = function () {
		// 我知道这个函数用promise更优雅
		// 我也想用await/async
		// 然而为了兼容性……
		
		var that = this;
		asyncCallEmscripten(this.emJudge, { log: this.loglist, initdata: this.initdata }, next);

		function next(err, output) {
			// 裁判回合
			var judgeLogItem = {};
			try {
				if (err)
					throw err;
				judgeLogItem.output = JSON.parse(output);
				judgeLogItem.verdict = "OK";
				if (that.loglist.length == 0)
					that.initdata = judgeLogItem.output.initdata || that.initdata;
			} catch (ex) {
				judgeLogItem.output = ex;
				judgeLogItem.verdict = "RE";

				// 中断对局
				that.status = "aborted";
				that.emit('match.end');
				return;
			} finally {
				that.loglist.push(judgeLogItem);
			}

			that.emit('match.newlog', judgeLogItem.output.display || "");

			if (judgeLogItem.output.command == 'finish') {
				// 裁判判定游戏结束
				var scores = [judgeLogItem.output.content[0], judgeLogItem.output.content[1]];
				that.status = "finished";
				that.emit('match.end', scores);
				return;
			}

			
			// 玩家回合
			var playerLogItem = {}, readyBits = 0, maxBits = 0;
			that.loglist.push(playerLogItem);
			setTimeout(function () {
				function ready(id) {
					readyBits |= 1 << id;
					if (readyBits == maxBits)
						setTimeout(function () {
							that.nextTurn();
						}, 100);
				}

				for (var i in judgeLogItem.output.content) {
					maxBits |= 1 << i;
					playerLogItem[i] = {};
					if (that.slots[i]) {
						// Bot 回合
						var slot = that.slots[i];
						slot.requests.push(judgeLogItem.output.content[i]);
						var inputobj = {
							requests: slot.requests,
							responses: slot.responses,
							data: slot.data,
							globaldata: slot.globaldata,
							time_limit: 1000,
							memory_limit: 256
						}, realinput = inputobj;
						if (transformDetail.simpleio[i])
							try {
								realinput = inputobj.requests.length;
								for (var j = 0; j < inputobj.requests.length; j++) {
									realinput += "\n" + transformDetail.req2simple(inputobj.requests[j]).trim();
									if (inputobj.responses[j])
										realinput += "\n" + inputobj.responses[j].trim();
								}
								realinput += "\n" + (inputobj.data || "").trim() + "\n" + (inputobj.globaldata || "").trim();
							} catch (ex) { }

						asyncCallEmscripten(slot.worker, realinput, (function (i) {
							return function (err, raw) {
								try {
									if (err)
										throw err;
										
									var output = parseOutput(
										raw,
										transformDetail.simpleio[i]
									);

									playerLogItem[i].verdict = "OK";
									playerLogItem[i].response = output.response;
									slot.responses.push(output.raw || output.response);
									slot.data = playerLogItem[i].data = output.data;
									slot.globaldata = playerLogItem[i].globaldata = output.globaldata;
									playerLogItem[i].debug = output.debug;
									playerLogItem[i].raw = output.raw;
								} catch (ex) {
									playerLogItem[i].output = ex;
									playerLogItem[i].verdict = "RE";
								}
								ready(i);
							};
						})(i));
					} else {
						// 人类回合
						that.emit('match.playerturn');
						that.emit('match.newrequest', judgeLogItem.output.content[i] || "");
						that.once('match.playermove', (function (i) {
							return function (response) {
								$("#btnRetract").prop("disabled", true);
								playerLogItem[i].response = JSON.parse(JSON.stringify(response));
								playerLogItem[i].verdict = "OK";
								ready(i);
							};
						})(i));
						$("#btnRetract").prop("disabled", false);
					}
				}
			}, 1000);
		}
	};

	function parseOutput(raw, simpleio) {
		var output;
		if (simpleio) {
			function nextLine() {
				newlinepos = raw.indexOf('\n', lastpos);
				if (newlinepos != -1) {
					var line = raw.substring(lastpos, newlinepos);
					if (!line)
						throw "OK";
					lastpos = newlinepos + 1;
					return line.trim();
				}
				throw "OK";
			}

			output = {
				response: "",
				debug: "",
				data: "",
				globaldata: "",
				raw: raw
			};
			var newlinepos, lastpos = 0;
			try {
				output.response = transformDetail.simple2res(nextLine());
				output.debug = nextLine();
				output.data = nextLine();
				output.globaldata = raw.substr(lastpos);
			} catch (ex) {
				if (ex != "OK") {
					throw "MF";
				}
			}
		} else {
			try {
				output = JSON.parse(raw);
			} catch (e) {
				throw "NJ";
			}
			if (!output) {
				throw "NJ";
			}
		}
		return output;
	}

	function asyncCallEmscripten(worker, input, callback) {
		// 与 Emscripten 程序进行异步交互
		worker.onmessage = function (e) {
			if (e.data.success)
				callback(null, e.data.output);
			else
				callback(e.data.output);
		};
		worker.postMessage(input);
	}

	Controller.prototype.connect = function () {
		var that = this;
		setTimeout(function () {
			that.emit('reconnect');
		}, 0);
	};
	Controller.prototype.emit = function (event, data) {
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
	Controller.prototype.removeAllListeners = function (event) {
		delete this.handlers[event];
	};
	Controller.prototype.getMatch = function () {
		return { logs: this.loglist, status: this.status };
	};
	Controller.prototype.once = function (event, fn) {
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
	Controller.prototype.on = function (event, fn) {
		if (event in this.handlers)
			this.handlers[event].push(fn);
		else
			this.handlers[event] = [fn];
	};
	Controller.prototype.retract = function () {
		// 悔棋悔到上一次人类行动
		for (var i = this.loglist.length - 1; i >= 1; i--)
			// 后面这个判断是因为……玩家回合会提前塞一个空的 response 对象进去 loglist
			if (this.playerSlotID in this.loglist[i] && this.loglist[i][this.playerSlotID].response) {
				this.loglist = this.loglist.slice(0, i - 1);
				i--; // 现在 i 应该指着最后那一回合之后那一回合的 Judge 输出（也就是，这个 i 是右端点、不包含）
				break;
			}
		if (i != 0) {
			// 填充 Bot 的记录
			var req = this.slots[1 - this.playerSlotID].requests = [];
			var res = this.slots[1 - this.playerSlotID].responses = [];
			for (var j = 0; j < i; j++) {
				if (this.loglist[j].output &&
					this.loglist[j].output.content &&
					this.loglist[j].output.content[1 - this.playerSlotID])
					req.push(this.loglist[j].output.content[1 - this.playerSlotID]);
				else if (this.loglist[j][1 - this.playerSlotID]) {
					if (transformDetail.simpleio[1 - this.playerSlotID])
						res.push(this.loglist[j][1 - this.playerSlotID].raw);
					else
						res.push(this.loglist[j][1 - this.playerSlotID].response);
				}
			}
			this.retracted = true;
		}
		this.removeAllListeners('match.playermove');
		if (window.Replay)
			window.Replay();
	};
	return Controller;
})();
