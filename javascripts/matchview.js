/// <reference path="jquery-2.1.0.js" />
/// <reference path="bootstrap.js" />
/// <reference path="global.js" />
/// <reference path="../../ideref/TweenMax.js" />
/*
 * Botzone 2.0 比赛播放控制脚本
 * 作者：zhouhy
 * 需求：jQuery、Botzone2.0的global脚本框架、socket.io、aceeditor、GreenSocks
 */

transformDetail.req2simple = new Function("request", transformDetail.req2simple);
transformDetail.simple2res = new Function("response", transformDetail.simple2res);
transformDetail.res2simple = new Function("response", transformDetail.res2simple);

var timeLeft, timCountDown = null, currLog, matchID, humanTimeout, apiVersion = 1, initialTimeline;

var DUMMY_OBJECT = {}, prgbarMouseDown = false, incapableToSeek = false;

var frmViewPort;

var lblStatus, lblTurn, prgbarStatus, prgbarInner, prgbarSeekOverlay, chkEnableSeekPreview, dPlayback, dLive,
	editor, frmDanmaku, danmakuConsoleVisible = false, btnExpand, dDanmakuOverlay, tglbtnPlay,
	repSpeed, inQueue = true, ignoreLongRunning = false, humanMatchHung = false;

// PlayerAPI 预留接口
var init = false, loglist, globaldata, live, initdata, forkedFrom, seekCallbackSuppressable;
var callbacks = {
	readfulllog: null,
	readhistory: null,
	gameover: null,
	play: null,
	pause: null,
	newlog: null,
	newrequest: null,
	seekpreview: null,
	seek: null,
	render: null,
	v2: {
		display: null,
		request: null,
		gameover: null
	}
};
var notifications = {
	initcomplete: function (apiver, introTL) {
		apiVersion = apiver || 1;
		initialTimeline = introTL;

		if (apiVersion != 2 && !callbacks.seek && !callbacks.seekpreview &&
			frmViewPort[0].contentWindow.TweenMax)
			// 其实是针对 Pacman 和 Pacman2 的兼容措施
			incapableToSeek = true;

		if (init)
			FullInitialize();
		else
			init = true;
	},
	playermove: function (move) {
		if (timCountDown != null) {
			clearTimeout(timCountDown);
			timCountDown = null;
		}
		Botzone.gio.emit('match.playermove', move);
		prgbarStatus.addClass("active");
		if (callbacks.seekpreview)
			prgbarStatus.addClass("seekable");
		prgbarInner.removeClass("progress-bar-warning");
		if (humanMatchHung) {
			lblStatus.text(__("match.humanmatchhung"));
			prgbarInner.addClass("progress-bar-success");
		} else
			lblStatus.text(__("match.waiting"));
	},
	requestpause: function () {
		if (tglbtnPlay.hasClass("active")) {
			tglbtnPlay.click();
			return true;
		} else
			return false;
	},
	requestresume: function () {
		if (!tglbtnPlay.hasClass("active")) {
			tglbtnPlay.click();
			return true;
		} else
			return false;
	}
};

/*
 * 弹幕数据结构
 * {
 *  logid: number; // 出现时间
 *	id: number; // 唯一数字编号
 *  author: string; // 作者ID
 *  content: string; // 内容
 *  color: string; // 十六进制 RGB 颜色
 *  type: string; // 类型
 *  width: number; // 自身宽度
 * }
 */
// 弹幕配置
var cfgDanmaku = {
	lifeTime: 10, // 单位：秒每弹幕
	fontSize: 24, // 单位：px
	regularLines: [], // 记录普通弹幕中各行存活弹幕
	fixedLines: [], // 记录固定弹幕中各行存活弹幕
	danmakusByTime: [],
	width: 0, // 容器宽度，留待初始化
	height: 0, // 容器高度，留待初始化
	lineCount: 0, // 容器能容纳弹幕行数，留待初始化
	pause: false,
	animRoot: new TimelineMax(),
	clear: function () {
		dDanmakuOverlay.find("span").remove();
		this.danmakusByTime = [];
	},
	checkOverlay: function (danmakuA, danmakuB) {
		// 检查是否会重叠，并返回重叠程度（时间百分比）
		if (danmakuA.logid > danmakuB.logid) {
			var temp = danmakuA;
			danmakuA = danmakuB;
			danmakuB = temp;
		}
		var deltaTime = (danmakuB.logid - danmakuA.logid) / (this.lifeTime * 1000 / repSpeed);

		// 一出生就重叠了？
		var rBorderOfA = deltaTime * (danmakuA.width + this.width);
		if (rBorderOfA <= danmakuA.width)
			return 1;

		// B 追不上？
		if (danmakuB.width <= danmakuA.width)
			return 0;

		// A 死亡前会重叠？
		// [===A===].................|[===A===]
		//          [====B====]......|[====B====]
		// t * (danmakuA.width + this.width) + rBorderOfA - danmakuA.width = t * (danmakuB.width + this.width)
		var t = (rBorderOfA - danmakuA.width) / (danmakuB.width - danmakuA.width);
		if (t + deltaTime < 1)
			return 1 - t - deltaTime;
		return 0;
	},
	engineInitialize: function () {
		// 获得容器维度
		this.width = dDanmakuOverlay.width();
		this.height = dDanmakuOverlay.height();

		// 计算可容纳弹幕行数
		this.lineCount = Math.floor(this.height / this.fontSize);
		for (var i = 0; i < this.lineCount; i++) {
			this.regularLines[i] = [];
			this.fixedLines[i] = [];
		}

		// 分配所有弹幕
		for (var i = 0; i < danmakus.length; i++) {
			danmakus[i].id = i;
			var time = danmakus[i].logid;
			if (this.danmakusByTime[time])
				this.danmakusByTime[time].push(danmakus[i]);
			else
				this.danmakusByTime[time] = [danmakus[i]];
		}
	},
	pauseAll: function () {
		this.animRoot.pause();
		this.pause = true;
	},
	resumeAll: function () {
		this.animRoot.resume();
		this.pause = false;
	},
	launchDanmaku: function (danmaku) {
		this.width = dDanmakuOverlay.width();
		this.height = dDanmakuOverlay.height();
		// 寻找最合适的行发射弹幕
		var currLine, animateOption;
		var rgb = parseInt(danmaku.color, 16);
		rgb = [Math.floor(rgb / 65536), Math.floor(rgb / 256) % 256, Math.floor(rgb % 256)];
		var reverseShadow = 0.213 * rgb[0] + 0.715 * rgb[1] + 0.072 * rgb[2] < 0.5 * 256;
		var sDanmaku = $("<span></span>").text(danmaku.content);
		if (userMe && danmaku.author == userMe._id)
			sDanmaku.addClass("mine");
		if (reverseShadow)
			sDanmaku.addClass("reverse-shadow");
		dDanmakuOverlay.append(sDanmaku);
		danmaku.width = sDanmaku.width();
		if (danmaku.type == 'regular') {
			var minOverlay = 1, minOverlayLine = 0;
			for (var j = 0; j < this.lineCount / 2; j++) {
				var rl = this.regularLines[j], maxOverlay = 0;
				if (rl.length == 0) {
					minOverlayLine = j;
					break;
				}
				for (var k = 0; k < rl.length; k++) {
					var overlay = this.checkOverlay(rl[k], danmaku);
					if (overlay > maxOverlay)
						maxOverlay = overlay;
				}
				if (overlay < minOverlay) {
					minOverlayLine = j;
					if (overlay == 0)
						break;
					minOverlay = overlay;
				}
			}
			currLine = this.regularLines[minOverlayLine];
			animateOption = {
				x: -danmaku.width - this.width
			};
			sDanmaku.css({
				top: minOverlayLine * this.fontSize,
				lineHeight: this.fontSize + "px",
				color: '#' + danmaku.color
			});
		} else {
			var line;
			if (danmaku.type == 'fixed_top') {
				line = 0;
				for (var j = 1; j < this.lineCount; j++)
					if (this.fixedLines[j].length < this.fixedLines[line].length)
						line = j;
			} else {
				line = this.lineCount - 1;
				for (var j = line - 1; j >= 0; j--)
					if (this.fixedLines[j].length < this.fixedLines[line].length)
						line = j;
			}
			currLine = this.fixedLines[line];
			animateOption = {
				opacity: 0.8
			};
			sDanmaku = $("<span></span>").css({
				zIndex: 15,
				left: 0,
				right: 0,
				margin: 'auto',
				textAlign: 'center',
				top: line * this.fontSize,
				color: '#' + danmaku.color,
				lineHeight: this.fontSize + "px",
				opacity: 1
			}).append(sDanmaku);
			dDanmakuOverlay.append(sDanmaku);
		}
		currLine.push(danmaku);
		animateOption.ease = Linear.easeNone;
		animateOption.onComplete = function () {
			sDanmaku.remove();
			var i;
			for (i = 0; i < currLine.length; i++)
				if (currLine[i].id == danmaku.id)
					break;
			currLine.splice(i, 1);
		};
		var tm = this.animRoot.to(sDanmaku, this.lifeTime, animateOption, this.animRoot.time());
		if (this.pause)
			tm.pause();
	},
	launchDanmakusAt: function (time) {
		if (this.danmakusByTime[time]) {
			var currTime = this.danmakusByTime[time];
			for (var i = 0; i < currTime.length; i++)
				this.launchDanmaku(currTime[i]);
		}
	}
};

function GetCurrentTurn() {
	return parseInt(lblTurn.text().match(/([0-9]+)$/)[1]);
}

function Replay() {
	if (timCountDown != null) {
		clearTimeout(timCountDown);
		timCountDown = null;
	}
	if (Botzone.rootTimeline) {
		Botzone.rootTimeline.kill();
		Botzone.rootTimeline = null;
	}
	init = true;
	cfgDanmaku.clear();
	frmViewPort[0].contentWindow.location.reload();
	if (live) {
		loglist = [];
		if ($("#tglbtnDebugMode").hasClass("active"))
			$("#debugModeToolbar").fadeOut();
		dPlayback.fadeOut(300, function () {
			dLive.fadeIn(300);
		});
	}
}

//// 弹幕发射逻辑 - 始

var confPostDanmaku = new FormConfig({
	method: "post",
	action: "/danmaku/post",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false)
			this.setFieldError("input[name=content]", __(result.message));
		else {
			this.setFieldError("input[name=content]");
			btnExpand.click();
			$("#txtDanmaku").val("");
			danmakus.push(result.danmaku);
			danmakus[danmakus.length - 1].id = danmakus.length - 1;
			cfgDanmaku.launchDanmaku(danmakus[danmakus.length - 1]);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFieldError("input[name=content]", __("generalerror") + errorThrown);
	}
});

validateFunctions.checkDanmakuTime = function () {
	if (apiVersion == 2)
		$("#iDanmakuTime").val(Botzone.rootTimeline.currentLabel().match(/__turn([0-9\.]*)/)[1] * 2);
	else
		$("#iDanmakuTime").val(currLog);
}

validateFunctions.checkDanmakuContent = function (content) {
	if (content == "" || content == null)
		return __("danmaku.nonnull");
	else if (content.length > Botzone.consts.danmaku.content_length_max)
		return __("danmaku.toolong");
	return null;
};

//// 弹幕发射逻辑 - 终

function ReloadSingleDigitCaptcha() {
	$("#imgSingleDigitCaptcha").prop("src", "/captcha/digit?" + Math.random());
}

function ForkGametable(ctrl) {
	if (ctrl) {
		$(ctrl).closest(".popover").popover('hide');
		Botzone.replacePage('/gametable/fork/' + matchID + '?turnid=' + GetCurrentTurn() + '&' + $(ctrl).closest("form").serialize());
	} else
		Botzone.replacePage('/gametable/fork/' + matchID + '?turnid=' + GetCurrentTurn());
}

function QuickMatchToGametable(ctrl) {
	if (ctrl) {
		$(ctrl).closest(".popover").popover('hide');
		Botzone.replacePage('/gametable' + location.pathname + location.search + '&' + $(ctrl).closest("form").serialize());
	} else
		Botzone.replacePage('/gametable' + location.pathname + location.search);
}

$(document).ready(function () {
	if (!loglist || loglist.length == 0)
		loglist = [];

	if (forkedFrom)
		Botzone.alert(__("gametable.fork.matchhint", forkedFrom));

	// 调试模式开关
	var debugMode = $.cookie("match-debug-mode");
	if (debugMode == "true")
		$("#tglbtnDebugMode").addClass("active");

	var frmSingleDigitCaptcha = $("#frmSingleDigitCaptcha"),
		btnForkGametable = $("#btnForkGametable"),
		btnQuickMatchToGametable = $("#btnQuickMatchToGametable");
	if (frmSingleDigitCaptcha.length > 0) {
		// 需要输入验证码
		btnForkGametable.popover({
			title: __("match.fork.title"),
			content: frmSingleDigitCaptcha.remove().show(),
			container: "body",
			html: true
		}).click(ReloadSingleDigitCaptcha);
		btnQuickMatchToGametable.popover({
			title: __("quickmatch.togametable.title"),
			content: frmSingleDigitCaptcha.remove().show(),
			container: "body",
			html: true
		}).click(ReloadSingleDigitCaptcha);
	} else {
		btnForkGametable.click(function () {
			ForkGametable();
		});
		btnQuickMatchToGametable.click(function () {
			QuickMatchToGametable();
		});
	}


	// Log 查看器默认状态
	var lastOptions = $.cookie("match-last-visualizer-options");
	if (lastOptions)
		try {
			lastOptions = JSON.parse(lastOptions);
			$("#cmbType option[value=" + lastOptions.type + "]").prop("selected", true);
			$("#cmbIndent option[value=" + lastOptions.indent + "]").prop("selected", true);
			$("#cmbPlayer_quickDebug option[value=" + lastOptions.player + "]").prop("selected", true);
			ChangeDBGType();
		} catch (ex) { }

	Botzone.ldscreen.fadeIn();
	if (init)
		FullInitialize();
	else
		init = true;
	repSpeed = $.cookie("rep_speed") || 1000;
	$("#sldReplaySpeed").slider({
		min: 200,
		max: 2000,
		value: repSpeed,
		orientation: "vertical",
		change: function (event, ui) {
			$.cookie("rep_speed", repSpeed = ui.value, { path: '/' });
			if (apiVersion == 2)
				Botzone.rootTimeline.timeScale(1000 / repSpeed);
		}
	});
	editor = ace.edit("txtLogVisualizer");
	editor.getSession().setMode("ace/mode/json");
	editor.getSession().setUseWrapMode(true);
	editor.setValue(_rawLogJSON || "");
	lblStatus = $("#lblStatus");
	lblTurn = $("#lblTurn");
	prgbarSeekOverlay = $("#prgbarStatus .seek-overlay");
	chkEnableSeekPreview = $("#chkEnableSeekPreview")
		.prop("checked", $.cookie("enable-seek-preview") != "false")
		.change(function () { $.cookie("enable-seek-preview", this.checked, { path: '/' }); });

	var mouseInPrgbarX = 0, lastMouseState = false, giveUp = false, oldProgress;
	prgbarStatus = $("#prgbarStatus").mousemove(function (e) {
		mouseInPrgbarX = e.offsetX;
	}).mousedown(function () {
		prgbarMouseDown = true;
		$("body").css("userSelect", "none");
		giveUp = true;
		if (apiVersion == 2)
			oldProgress = Botzone.rootTimeline.progress();
	}).mouseup(function (e) {
		if (prgbarMouseDown)
			$("body").css("userSelect", "");
		prgbarMouseDown = false;
		giveUp = false;
	});
	$(document).off('mouseup').on('mouseup', function () {
		if (prgbarMouseDown)
			$("body").css("userSelect", "");
		prgbarMouseDown = false;
	});

	var onTick = function () {
		if (prgbarStatus.hasClass("seekable") && !incapableToSeek) {
			if (prgbarMouseDown) {
				var totalWidth = prgbarStatus.width();
				var ratio = mouseInPrgbarX / totalWidth;

				prgbarSeekOverlay.css("width", ratio * 100 + "%");

				if (mouseInPrgbarX > prgbarInner.width()) {
					if (!prgbarSeekOverlay.hasClass("right"))
						prgbarSeekOverlay.addClass("right");
				} else if (prgbarSeekOverlay.hasClass("right"))
					prgbarSeekOverlay.removeClass("right");

				if (callbacks.seekpreview)
					callbacks.seekpreview(ratio);
			} else if (Botzone.rootTimeline)
				prgbarInner.css("width", Botzone.rootTimeline.progress() * 100 + "%");

			if (prgbarMouseDown != lastMouseState) {
				var totalWidth = prgbarStatus.width();
				var ratio = mouseInPrgbarX / totalWidth;

				if (!prgbarMouseDown) {
					if (giveUp && callbacks.seekpreview && Botzone.rootTimeline)
						Botzone.rootTimeline.progress(oldProgress, seekCallbackSuppressable);
					else if (callbacks.seek) {
						callbacks.seek(ratio);
						UpdateQuickDebugger();
					} else {

						// 使用 NAIVE 跳回合实现：重启播放器，用readhistory读入选中位置前的回合
						FullInitialize = function () {
							_FullInitialize();

							notifications.requestpause();

							currLog = Math.floor(ratio * loglist.length);
							if (currLog == loglist.length)
								currLog--;

							var displays = [];
							for (var i = 0; i <= currLog; i++) {
								var curr = loglist[i];
								if (curr && curr.output && curr.output.display)
									displays.push(JSON.parse(JSON.stringify(curr.output.display)));
							}
							callbacks.readhistory(displays);

							lblTurn.text(__("match.turn", Math.floor(currLog / 2)));
							UpdateQuickDebugger();
							prgbarInner.css({ width: ++currLog * 100 / loglist.length + "%" });

							// 恢复原来的初始化函数
							FullInitialize = _FullInitialize;
						}

						Botzone.ldscreen.fadeIn();

						Replay();
					}
					prgbarInner.css("width", ratio * 100 + "%");
				}
				lastMouseState = prgbarMouseDown;
			}
		}
		if (callbacks.render)
			callbacks.render();
	};

	TweenMax.ticker.addEventListener('tick', onTick);

	prgbarInner = $("#prgbarStatus .progress-bar");
	dPlayback = $("#dPlayback");
	dLive = $("#dLive");
	tglbtnPlay = $("#tglbtnPlay");
	dDanmakuOverlay = $("#dDanmakuOverlay");
	btnExpand = $("#btnExpand").click(function () {
		if (danmakuConsoleVisible) {
			frmDanmaku.hide();
			btnExpand.text("<");
			danmakuConsoleVisible = false;
		} else {
			frmDanmaku.show();
			btnExpand.text(">");
			danmakuConsoleVisible = true;
		}
	});
	frmDanmaku = $("#frmDanmaku");
	if ($.fn.colpick)
		$("#colorPicker").colpick({
			flat: true,
			layout: 'hex',
			color: 'FFFFFF',
			submit: 0,
			onChange: function (hsb, hex, rgb, el, bySetColor) {
				$("#iDanmakuColor").val(hex);
			}
		});
	frmViewPort = $("#frmViewPort");
	frmViewPort.prop("src", frmViewPort.data("src") + "?rand=" + Math.random()).focus();
	Botzone.onExit(function () {
		editor.destroy();
		TweenMax.ticker.removeEventListener('tick', onTick);
		loglist = [];
		initdata = "";
	});
});

function SetNotInQueue() {
	if (!inQueue)
		return;
	if (callbacks.seekpreview)
		prgbarStatus.addClass("seekable");
	lblStatus.text(__("match.waiting"));
	inQueue = false;
	var btnAbort = $("#btnAbort");
	if (btnAbort.length > 0) {
		btnAbort.show();
		btnAbort.prev().removeClass("btn-block");
	}
}

var FullInitialize, _FullInitialize = FullInitialize = function () {
	var stopKeyCodes = { 32: true, 37: true, 38: true, 39: true, 40: true };

	// 阻止方向键漏出（一定要在 iframe 加载完后再绑定……）
	var preventEvent = function (e) {
		if (e.keyCode in stopKeyCodes) {
			e.preventDefault();
			return false;
		}
	};
	$(frmViewPort[0].contentWindow.document).keydown(preventEvent).keypress(preventEvent)
		.click(function () { frmViewPort.focus(); });
	$(frmViewPort[0].contentWindow).keydown(preventEvent).keypress(preventEvent);

	// 判断是否通过 setSize 给定了最小宽度
	var ratio;
	if (frmViewPort[0].width && (ratio = window.innerWidth / frmViewPort[0].width) < 1) {
		$(frmViewPort[0].contentWindow.document.documentElement).css({
			width: frmViewPort[0].width,
			transform: 'scale(' + ratio + ')',
			transformOrigin: "left top"
		});
		frmViewPort[0].height *= ratio;
	}

	var presetHeight = frmViewPort.prop("height");
	frmViewPort.prop("height", Math.max(presetHeight, $(frmViewPort[0].contentWindow.document.body).height()));

	cfgDanmaku.engineInitialize();

	function fnLaunchDanmakus(logid) {
		if (!prgbarMouseDown)
			cfgDanmaku.launchDanmakusAt(logid);
	}

	function log2timeline(display, i) {
		var currTurn = Math.floor(i / 2);
		var tl = display && callbacks.v2.display(JSON.parse(JSON.stringify(display)));
		if (!tl) {
			Botzone.rootTimeline.addLabel("__turn" + (currTurn + 1));
			Botzone.rootTimeline.call(fnLaunchDanmakus, [i + 1]);
			Botzone.rootTimeline.call(fnLaunchDanmakus, [i + 2]);
			return;
		}

		var insertTime = tl.getLabelTime("insertPoint");
		Botzone.rootTimeline.fromTo(lblTurn, 0.0001, { textContent: __("match.turn", currTurn - 1) },
			{
				immediateRender: false,
				textContent: __("match.turn", currTurn),
				onComplete: UpdateQuickDebugger.bind(currTurn),
				onReverseComplete: UpdateQuickDebugger.bind(currTurn - 1)
			}, "__turn" + currTurn);
		Botzone.rootTimeline.add(tl, "__turn" + currTurn);
		if (insertTime == -1)
			insertTime = tl.duration();
		Botzone.rootTimeline.addLabel("__turn" + (currTurn + 1), "__turn" + currTurn + "+=" + insertTime);
		Botzone.rootTimeline.call(fnLaunchDanmakus, [i + 2], null, "__turn" + currTurn + "+=" + insertTime);
		Botzone.rootTimeline.addLabel("__turn" + (currTurn + 0.5), "__turn" + currTurn + "+=" + insertTime / 2);
		Botzone.rootTimeline.call(fnLaunchDanmakus, [i + 1], null, "__turn" + currTurn + "+=" + insertTime / 2);
	}
	initialTimeline = initialTimeline || new TimelineMax();

	if (apiVersion == 2) {
		tglbtnPlay.removeClass("active").off('click').click(function () {
			if (!tglbtnPlay.hasClass("active")) {
				if (callbacks.play)
					callbacks.play();
				Botzone.rootTimeline.play();
				tglbtnPlay.addClass("active");
				cfgDanmaku.resumeAll();
			} else {
				if (callbacks.pause)
					callbacks.pause();
				Botzone.rootTimeline.pause();
				tglbtnPlay.removeClass("active");
				cfgDanmaku.pauseAll();
			}
		});
	} else {
		tglbtnPlay.addClass("active").off('click').click(function () {
			if (!tglbtnPlay.hasClass("active")) {
				if (callbacks.play)
					callbacks.play();
				if (timCountDown == null)
					timCountDown = setTimeout(OnTick, repSpeed);
				tglbtnPlay.addClass("active");
				cfgDanmaku.resumeAll();
			} else {
				if (callbacks.pause)
					callbacks.pause();
				tglbtnPlay.removeClass("active");
				if (timCountDown != null) {
					clearTimeout(timCountDown);
					timCountDown = null;
				}
				cfgDanmaku.pauseAll();
			}
		});
	}

	lblTurn.text(lblTurn.text().trim() || __("match.turn", 0));

	if (!live) {
		// 回放

		if ($("#tglbtnDebugMode").hasClass("active"))
			$("#debugModeToolbar").fadeIn();

		lblTurn.show();
		lblStatus.hide();

		if (apiVersion == 2) {
			// 新版 API 初始化流程
			prgbarStatus.addClass("v2");
			Botzone.rootTimeline = new TimelineMax();
			Botzone.rootTimeline.timeScale(1000 / repSpeed);
			Botzone.rootTimeline.addLabel("__turn0");
			Botzone.rootTimeline.pause();

			Botzone.rootTimeline.call(fnLaunchDanmakus, [0]);

			for (var i = 0; i < loglist.length; i += 2)
				log2timeline(loglist[i].output && loglist[i].output.display, i);

			Botzone.rootTimeline.eventCallback("onComplete", function () {
				tglbtnPlay.removeClass("active");
			});

			var playingWhenEnter = null;
			callbacks.seekpreview = function (ratio) {
				if (playingWhenEnter == null) {
					playingWhenEnter = Botzone.rootTimeline.isActive();
					tglbtnPlay.addClass("active");
				}
				notifications.requestpause();
				if (chkEnableSeekPreview.prop("checked"))
					Botzone.rootTimeline.progress(ratio, seekCallbackSuppressable);
				else {
					var label = Botzone.rootTimeline.getLabelBefore(ratio * Botzone.rootTimeline.duration());
					var turn = Math.floor(label.match(/__turn([0-9\.]*)/)[1]);
					lblTurn.text(__("match.turn", turn));
					UpdateQuickDebugger(turn);
				}
			};
			callbacks.seek = function (ratio) {
				Botzone.rootTimeline.progress(ratio, seekCallbackSuppressable);
				if (playingWhenEnter == true)
					notifications.requestresume();
				playingWhenEnter = null;
			};

			initialTimeline.call(function () {
				notifications.requestresume(); // 正式开始
			});

		} else {
			currLog = 0;

			var OnTick = function () {
				if (timCountDown != null) {
					clearTimeout(timCountDown);
					timCountDown = null;
				}
				if (currLog >= loglist.length)
					return tglbtnPlay.removeClass("active");
				lblTurn.text(__("match.turn", Math.floor(currLog / 2)));
				UpdateQuickDebugger();
				if (callbacks.readfulllog)
					callbacks.readfulllog(JSON.parse(JSON.stringify(loglist[currLog])));
				cfgDanmaku.launchDanmakusAt(currLog);
				prgbarInner.css({ width: ++currLog * 100 / loglist.length + "%" });
				if (currLog < loglist.length && timCountDown == null)
					timCountDown = setTimeout(OnTick, repSpeed);
				else
					tglbtnPlay.removeClass("active");
			}

			if (timCountDown == null && currLog < loglist.length)
				timCountDown = setTimeout(OnTick, repSpeed);
		}

		if (!incapableToSeek)
			prgbarStatus.addClass("seekable");
		else
			lblTurn.hide();

	} else {
		// 实时

		lblTurn.hide();
		lblStatus.show();

		initialTimeline.progress(1, seekCallbackSuppressable);
		if (apiVersion == 2) {
			currLog = 0;
			prgbarStatus.addClass("v2");

			Botzone.rootTimeline = new TimelineMax();
			Botzone.rootTimeline.timeScale(1);
			Botzone.rootTimeline.addLabel("__turn0");

			callbacks.newlog = function (log) {
				Botzone.rootTimeline.timeScale(1);
				log2timeline(log, currLog);
				currLog += 2;
			};
			callbacks.readhistory = function (logs) {
				logs.forEach(callbacks.newlog);
				Botzone.rootTimeline.progress(1, seekCallbackSuppressable);
			};
			callbacks.newrequest = function (req) {
				var tl = callbacks.v2.request(req);
				if (tl)
					Botzone.rootTimeline.add(tl, Botzone.rootTimeline.currentLabel());
				Botzone.rootTimeline.timeScale(Math.max((Botzone.rootTimeline.duration() - Botzone.rootTimeline.time()) * 2 / 3, 1));
			};
			callbacks.gameover = function (scores) {
				var tl = callbacks.v2.gameover(scores);
				if (tl)
					Botzone.rootTimeline.add(tl, Botzone.rootTimeline.currentLabel());
			};

			var playingWhenEnter = null;
			callbacks.seekpreview = function (ratio) {
				if (playingWhenEnter == null) {
					playingWhenEnter = Botzone.rootTimeline.isActive();
					tglbtnPlay.addClass("active");
				}
				notifications.requestpause();
				Botzone.rootTimeline.progress(ratio, seekCallbackSuppressable);
			};
			callbacks.seek = function (ratio) {
				Botzone.rootTimeline.progress(ratio, seekCallbackSuppressable);
				if (playingWhenEnter == true)
					notifications.requestresume();
				playingWhenEnter = null;
			};
		}

		// 实况
		if (Botzone.emulated_gio)
			Botzone.gio = Botzone.emulated_gio;
		else
			Botzone.gio = Botzone.io_bak.connect(window.location.host + '/match');

		Botzone.gio.connect(); // 再次连接，保证连上

		Botzone.gio.removeAllListeners('match.playerturn');
		Botzone.gio.removeAllListeners('match.newlog');
		Botzone.gio.removeAllListeners('match.newrequest');
		Botzone.gio.removeAllListeners('match.newdanmaku');
		Botzone.gio.removeAllListeners('match.end');
		Botzone.gio.removeAllListeners('match.end.initdata');
		Botzone.gio.removeAllListeners('match.hanghumanmatch');
		Botzone.gio.removeAllListeners('match.unexpectedend');

		DisplaySocketStatus(Botzone.gio, $("#dLiveStatus"),
			'<span class="glyphicon glyphicon-facetime-video"></span><span>' + __("match.live") + '</span>',
			function () {
				// 发送ready事件
				Botzone.gio.emit('match.ready', { id: matchID, loadedLen: loglist.length });
			});

		// 监听自己回合
		Botzone.gio.on('match.playerturn', function (data) {
			if (Botzone.emulated_gio || (userMe && data.id == userMe._id)) {
				prgbarStatus.removeClass("active seekable");
				lblStatus.text(__("match.myturn"));
				if (humanTimeout != -1) {
					timeLeft = humanTimeout - data.timeElapsed / 1000;
					prgbarInner.addClass("progress-bar-warning").css({ width: (timeLeft * 100 / humanTimeout) + "%" });
					var OnTick = function () {
						if (timCountDown != null) {
							clearTimeout(timCountDown);
							timCountDown = null;
						}
						prgbarInner.css({ width: (--timeLeft * 100 / humanTimeout) + "%" });
						if (timeLeft > 0 && timCountDown == null)
							timCountDown = setTimeout(OnTick, 1000);
						else
							lblStatus.text(__("match.waiting"));
					}
					if (timCountDown == null)
						timCountDown = setTimeout(OnTick, 1000);
				}
			}
		});

		// 监听新log
		Botzone.gio.on('match.newlog', function (data) {
			humanMatchHung = false;
			SetNotInQueue();
			prgbarInner.removeClass("progress-bar-success");
			loglist.push(data);
			if (callbacks.newlog)
				callbacks.newlog(JSON.parse(JSON.stringify(data)));
		});
		Botzone.gio.on('match.newrequest', function (data) {
			loglist.push(data);
			prgbarStatus.removeClass("active seekable");
			lblStatus.text(__("match.myturn"));
			prgbarInner.addClass("progress-bar-warning");
			if (callbacks.newrequest)
				callbacks.newrequest(JSON.parse(JSON.stringify(data)));
		});
		Botzone.gio.on('match.newdanmaku', function (danmaku) {
			danmakus.push(danmaku);
			danmakus[danmakus.length - 1].id = danmakus.length - 1;
			cfgDanmaku.launchDanmaku(danmakus[danmakus.length - 1]);
		});
		Botzone.gio.on('match.hanghumanmatch', function () {
			if (!prgbarInner.hasClass("progress-bar-warning")) {
				// 等待中 -> 等待其他对局
				lblStatus.text(__("match.humanmatchhung"));
				prgbarInner.addClass("progress-bar-success");
			} else
				humanMatchHung = true;
		});
		Botzone.gio.on('match.unexpectedend', function () {
			Botzone.replacePage(location.href);
		});
		Botzone.gio.on('match.end.initdata', function (data) {
			initdata = data;
		})
		Botzone.gio.on('match.end', function (data) {
			try {
				if (callbacks.gameover)
					callbacks.gameover(JSON.parse(JSON.stringify(data)));
			} catch (ex) { }
			live = false;
			Botzone.gio && Botzone.gio.close && Botzone.gio.close();

			function loadVisualizer(data) {
				var aborted = false;
				if (data instanceof Object) {
					editor.setValue(JSON.stringify(data.logs));
					loglist = data.logs;
					if (data.status == 'aborted')
						aborted = true;
				} else {
					editor.setValue(data.logs);
					loglist = JSON.parse(data.logs);
					if (data.status == 'aborted')
						aborted = true;
				}
				if (aborted)
					Botzone.alert(__("match.aborted"));
				var count = (loglist.length - 1) / 2;
				var result = "<option selected disabled>" + __("match.logvisualizer.turn") + "</option>";
				for (var i = 0; i < count; i++)
					result += "<option value=\"" + i + "\">" + (i + 1) + "</option>";
				$("#cmbTurn").html(result);
				lblTurn.text(__("match.turn", count));
				UpdateQuickDebugger(Math.floor((loglist.length - 2) / 2));
			}

			if (Botzone.emulated_gio) // 单机版
				loadVisualizer(Botzone.gio.getMatch());
			else
				$.get(window.location.href, { lite: true }, loadVisualizer, "json");
			dLive.fadeOut(300, function () {
				dPlayback.fadeIn(300);
			});
			lblStatus.text("").hide();
			if (timCountDown != null) {
				clearTimeout(timCountDown);
				timCountDown = null;
			}
			prgbarStatus.addClass("active seekable");
			if (incapableToSeek) {
				prgbarStatus.removeClass("seekable");
				lblTurn.hide();
			} else
				lblTurn.show();
			prgbarInner.removeClass("progress-bar-success").removeClass("progress-bar-warning");
			tglbtnPlay.removeClass("active");
			Botzone.rootTimeline && Botzone.rootTimeline.timeScale(1000 / repSpeed);

			if ($("#tglbtnDebugMode").hasClass("active"))
				$("#debugModeToolbar").fadeIn();
		});
		if (callbacks.readhistory)
			callbacks.readhistory(JSON.parse(JSON.stringify(loglist)));

		if (loglist && loglist.length > 0)
			SetNotInQueue();
	}

	Botzone.ldscreen.stop().fadeOut();

	$(frmViewPort[0].contentWindow.document).focus();
}

function PostDanmaku() {
	if (live) {
		var txtDanmaku = $("#txtDanmaku");
		Botzone.gio.emit('match.newdanmaku', {
			content: txtDanmaku.val(),
			color: $("#iDanmakuColor").val(),
			type: $("#frmDanmaku input[name=type]:checked").val(),
			match: matchID
		});
		txtDanmaku.val("");
	} else
		ValidateAndSubmit($('#frmDanmaku'), confPostDanmaku);
}

function AbortMatch(ctrl, matchid) {
	var $btn = $(ctrl);
	$btn.addClass("disabled");
	$.get("/match/" + matchid + "/abort", function (result) {
		$btn.removeClass("disabled")
		if (result.success == true)
			$btn.remove();
		else
			alert(result.message);
	}, "json");
}

function Like(ctrl, matchid) {
	var btn = $(ctrl);
	btn.addClass("disabled");
	$.post("/match/like", { match: matchid }, function (result) {
		btn.removeClass("disabled")
		if (result.success == true) {
			if (result.liked)
				btn.addClass("active");
			else
				btn.removeClass("active");
			btn.find("span.likecount").text(result.likecount);
		} else
			alert(result.message);
	}, "json");
}

var verdict2error = {
	"OK": "程序正常运行 / Program was executed normally",
	"RE": "错误：程序崩溃 / ERROR: Program raised a runtime error",
	"MLE": "错误：程序内存爆炸 / ERROR: Program consumed more memory than permitted",
	"TLE": "错误：决策超时 / ERROR: The time limit was exceeded",
	"NJ": "错误：程序输出不是JSON / ERROR: Program produced output in a non-JSON form",
	"OLE": "错误：程序输出爆炸 / ERROR: Program produced excessive output",
	"MF": "错误：程序输出格式错误 / ERROR: Malformed output"
};

function ShowVisualizer() {
	$("#cmbTurn [value=" + (GetCurrentTurn() - 1) + "]").prop("selected", true);
	$('#dlgLogVisualizer').modal('show');
	UpdateVisualizer();
}

function ToggleDebugMode(ctrl) {
	$("#debugModeToolbar").fadeToggle();
	$.cookie("match-debug-mode", $(ctrl).toggleClass("active").hasClass("active"), { path: '/' });
}

function SetDBGIgnoreLongRunning(to) {
	if (ignoreLongRunning == to)
		return;
	ignoreLongRunning = to;
	UpdateQuickDebugger();
}

function ChangeDBGType(to) {
	if (!transformDetail.supported)
		return;
	var player = document.getElementById('cmbPlayer_quickDebug').value;
	if (to) {
		transformDetail.simpleio[player] = to == "simple";
		UpdateQuickDebugger();
	} else
		$(transformDetail.simpleio[player] ? "#btnDBGSimple" : "#btnDBGJson").click();
}

function RebuildPlayerInput(result, player, turn) {
	result.requests = [];
	result.responses = [];
	var realTurn = turn;
	var i;

	// 先找到第一个没开启keep_running的回合
	for (i = turn; i >= 0; i--)
		if (loglist[i * 2 + 1] &&
			loglist[i * 2 + 1][player]) {
				turn = i;
				if (ignoreLongRunning || !loglist[turn * 2 + 1][player].keep_running)
					break;
			}

	// 正常计算原始输入
	for (i = 0; i < turn; i++) {
		if (player in loglist[i * 2].output.content) {
			result.requests.push(loglist[i * 2].output.content[player]);
			if (transformDetail.simpleio[player])
				result.responses.push(loglist[i * 2 + 1][player].raw || loglist[i * 2 + 1][player].response);
			else
				result.responses.push(loglist[i * 2 + 1][player].response);
			result.globaldata = loglist[i * 2 + 1][player].globaldata;
			result.data = loglist[i * 2 + 1][player].data;
		}
	}
	result.requests.push(loglist[i * 2].output.content[player]);

	if (transformDetail.simpleio[player])
		try {
			var realinput = result.requests.length;
			for (var i = 0; i < result.requests.length; i++) {
				realinput += "\n" + transformDetail.req2simple(result.requests[i]).trim();
				if (i in result.responses) {
					if (typeof result.responses[i] !== 'string')
						result.responses[i] = transformDetail.res2simple(result.responses[i]);
					realinput += "\n" + result.responses[i].trim();
				}
			}
			realinput += "\n" + (result.data || "").trim() + "\n" + (result.globaldata || "").trim();
			result = realinput;
		} catch (ex) { }

	// 接着，把剩下的回合的输入拼接上
	if (turn != realTurn) {
		if (typeof result !== 'string')
			result = JSON.stringify(result);
		result += "\n";
		for (turn++; turn <= realTurn; turn++)
			if (loglist[turn * 2 + 1] &&
				loglist[turn * 2 + 1][player]) {
					var req = loglist[turn * 2].output.content[player];
					if (transformDetail.simpleio[player])
						result += transformDetail.req2simple(req).trim() + "\n";
					else
						result += (typeof req === 'string' ? req : JSON.stringify(req)) + "\n";
				}
	}

	return result;
}

function UpdateQuickDebugger(turn) {
	if (live)
		return;
	if (!loglist[turn * 2])
		turn = GetCurrentTurn() - 1;
	var result = {}, player = document.getElementById('cmbPlayer_quickDebug').value;
	if (!loglist[turn * 2] || !loglist[turn * 2].output)
		return;
	SaveOptions();
	if (player.toString() in loglist[turn * 2].output.content)
		result = RebuildPlayerInput(result, player, turn);
	else
		result = __("none");
	$("#playerInput").val(typeof result == 'string' ? result : JSON.stringify(result));

	result = {};
	if (player.toString() in loglist[turn * 2 + 1]) {
		var item = loglist[turn * 2 + 1][player];
		if (transformDetail.simpleio[player]) {
			if (!("raw" in item))
				item.raw = transformDetail.res2simple(item.response).trim();
			result = item.raw;
			if ("debug" in item)
				result += "\n" + item.debug;
			$("#playerOutput").val(result);
			return;
		}
		result.response = item.response;
		result.debug = item.debug;
		result.globaldata = item.globaldata;
		result.data = item.data;

		if (!result.response) {
			var log = item;
			if (log) {
				result.error = result.error || verdict2error[log.verdict];
				result.output = log.output;
			}
		}
	} else
		result = __("none");

	$("#playerOutput").val(JSON.stringify(result));
}

function SaveOptions() {
	var future = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000));
	$.cookie("match-last-visualizer-options", JSON.stringify({
		type: document.getElementById('cmbType').value,
		indent: document.getElementById('cmbIndent').value,
		player: document.getElementById('cmbPlayer_quickDebug').value
	}), { expires: future, path: '/' });
}

function UpdateVisualizer() {
	var player = parseInt(document.getElementById('cmbPlayer').value);
	var turn = parseInt(document.getElementById('cmbTurn').value) || 0;
	var type = document.getElementById('cmbType').value;
	var indent = document.getElementById('cmbIndent').value == 'tabindent';

	SaveOptions();

	var cppbeginnerstr = document.getElementById('cmbIndent').value == 'cppbeginnerstring';
	var result = {};
	try {
		if (type == "fulllogs") {
			editor.setValue(JSON.stringify(loglist, null, indent ? '\t' : null));
		} else if (type == "globaldata") {
			editor.setValue(globaldata[player]);
		} else if (type == "judgelastinput") {
			var parsedInitdata;
			try {
				parsedInitdata = initdata == "" ? initdata : JSON.parse(initdata || "\"\"");
			} catch (ex) {
				parsedInitdata = initdata;
			}
			editor.setValue(JSON.stringify(
				{
					log: loglist.slice(0, loglist.length - 1),
					initdata: parsedInitdata
				}, null, indent ? '\t' : null));
		} else if (type == "playerinput") {
			if (player.toString() in loglist[turn * 2].output.content)
				result = RebuildPlayerInput(result, player, turn);
			else
				result.error = "玩家此回合没有收到输入 / No input this turn";
			editor.setValue(typeof result == 'string' ? result : JSON.stringify(result, null, indent ? '\t' : null));
		} else if (type == "playeroutput") {
			if (player.toString() in loglist[turn * 2 + 1]) {
				if (transformDetail.simpleio[player]) {
					result = loglist[turn * 2 + 1][player].raw;
					if ("debug" in loglist[turn * 2 + 1][player])
						result += "\n" + loglist[turn * 2 + 1][player].debug;
					editor.setValue(result);
					return;
				}
				result.response = loglist[turn * 2 + 1][player].response;
				result.debug = loglist[turn * 2 + 1][player].debug;
				result.globaldata = loglist[turn * 2 + 1][player].globaldata;
				result.data = loglist[turn * 2 + 1][player].data;
			} else
				result.error = "玩家此回合没有收到输入，因此也没有输出 / No input this turn, hence no output";
			if (!result.response) {
				var log = loglist[turn * 2 + 1][player];
				if (log) {
					result.error = result.error || verdict2error[log.verdict];
					result.output = log.output;
				}
			}
			editor.setValue(JSON.stringify(result, null, indent ? '\t' : null));
		} else if (type == "judgeinput") {
			result = loglist.slice(0, turn * 2);
			var parsedInitdata;
			try {
				parsedInitdata = initdata == "" ? initdata : JSON.parse(initdata || "\"\"");
			} catch (ex) {
				parsedInitdata = initdata;
			}
			editor.setValue(JSON.stringify({ log: result, initdata: parsedInitdata }, null, indent ? '\t' : null));
		} else if (type == "judgeoutput") {
			result = loglist[turn * 2].output;
			editor.setValue(JSON.stringify(result, null, indent ? '\t' : null));
		}
	} finally {
		if (cppbeginnerstr) {
			var raw = editor.getValue();
			var strs = [];
			for (var i = 0; i < raw.length; i += 2000)
				strs.push(raw.substr(i, 2000));
			for (var i = 0; i < strs.length; i++)
				strs[i] = "string(\"" + strs[i].replace(/"/g, '\\"') + "\")";
			raw = "";
			for (var i = 0; i < strs.length; i++)
				if (i == 0)
					raw += strs[i];
				else
					raw += " + " + strs[i];
			raw += ";";
			editor.setValue(raw);
		}
	}
}


