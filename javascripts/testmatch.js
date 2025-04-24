/*
 * Botzone 2.0 模拟比赛播放控制脚本
 * 作者：zhouhy
 * 需求：jQuery
 */

var prgbarStatus, prgbarInner, txtNewLog, txtFullLogs;

// PlayerAPI 预留接口
var init = false, loglist, callbacks = {}, notifications = {
	initcomplete: function () {
		if (init)
			FullInitialize();
		else
			init = true;
	},
	playermove: function (move) {
		clearTimeout(timCountDown);
		lblStatus.text(__("match.waiting"));
		prgbarStatus.addClass("active");
		prgbarInner.removeClass("progress-bar-warning");
	}
};
var timCountDown, currLog;

$(document).ready(function () {
	if (init)
		FullInitialize();
	else
		init = true;
});

function SendLog() {
	if (callbacks.newlog)
		callbacks.newlog(txtNewLog.val());
	txtNewLog.val("");
}

function PlayFullLogs() {
	clearTimeout(timCountDown);
	document.getElementById('frmViewPort').contentWindow.location.reload();
	loglist = JSON.parse(txtFullLogs.val());

	currLog = 0;

	var OnTick = function () {
		if (callbacks.readfulllog)
			callbacks.readfulllog(loglist[currLog]);
		prgbarInner.css({ width: ++currLog * 100 / loglist.length + "%" });
		if (currLog < loglist.length)
			timCountDown = setTimeout(OnTick, 1000);
	}
	timCountDown = setTimeout(OnTick, 1000);
}

function FullInitialize() {
	prgbarStatus = $("#prgbarStatus");
	prgbarInner = $("#prgbarStatus div");

	txtNewLog = $("#txtNewLog").keypress(function (event) {
		if ((event.keyCode || event.which) == 13) {
			SendLog();
		}
	});

	txtFullLogs = $("#txtFullLogs").keypress(function (event) {
		if ((event.keyCode || event.which) == 13) {
			PlayFullLogs();
		}
	});
}
