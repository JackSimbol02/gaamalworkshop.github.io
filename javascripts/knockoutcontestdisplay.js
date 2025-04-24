/*
 * Botzone 2.0 比赛展示控制脚本
 * 作者：zhouhy
 * 需求：jQuery
 */

var currPeriod = -1, currRound = 0, playerPerMatch, roundCount, playerCount, currMatchCount, contest, contestResult, bot2user;
var displayArea, prgbarStatus, prgbarInner, mask, dSplash, dRoundTitle, dMatchView, dFloatInfo,
	timLogProvider, currLog, dummy = function () { }, playerNames;
var interval = 1000;
var chineseNum = "零一二三四五六七八九";
var loglist;

function num2chn(i) {
	result = "";
	for (; i > 0; i = Math.floor(i / 10)) {
		result = chineseNum[i % 10] + result;
	}
	return result;
}

// PlayerAPI 预留接口
var callbacks = {}, notifications = {
	initcomplete: dummy,
	playermove: dummy
};

function UpdateInterval(ctrl) {
	interval = parseInt(ctrl.value);
}

function PlayFullLogs(loglist, url) {
	window.loglist = loglist;
	var iframe = document.getElementById('frmViewPort');
	if (iframe.contentWindow.location.href == url)
		iframe.contentWindow.location.reload();
	else
		iframe.src = url;
	iframe.onload = function () {
		iframe.contentWindow.sizeHack = true;
	};
	notifications.initcomplete = function () {
		currLog = 0;

		var OnTick = function () {
			if (callbacks.readfulllog)
				callbacks.readfulllog(loglist[currLog]);
			prgbarInner.css({ width: ++currLog * 100 / loglist.length + "%" });
			if (currLog < loglist.length)
				timLogProvider = setTimeout(OnTick, interval);
		}
		timLogProvider = setTimeout(OnTick, interval);
	}
}

$(document).ready(function () {
	prgbarStatus = $("#prgbarStatus");
	prgbarInner = $("#prgbarStatus div");
	displayArea = $("#dMainBlock");
	dSplash = $("#dSplash");
	dRoundTitle = $("#dRoundTitle");
	dMatchView = $("#dMatchView");
	dFloatInfo = $("#dFloatInfo");
	mask = $("#dMask").fadeOut(1000);
	currPeriod = 0;
	UpdateSize();

	// 根据contest初始化所有需要的信息

	// 建立Bot->User映射
	bot2user = {};
	for (var i = 0; i < contest.players.length; i++) {
		bot2user[contest.players[i].bot._id] = contest.players[i].bot.user.name;
	}

	// 读取淘汰赛信息
	playerCount = contest.players.length;
	contestResult = JSON.parse(contest.result);
	if (!(contestResult instanceof Array)) {
		contestResult = [];
		// 如果没有提供结果……就自己产生！
		for (var i = 0; i < contest.matches.length; i++) {
			var currMatch = contest.matches[i];
			var subtitle = "", maxID = 0, maxCount = 0;
			playerPerMatch = currMatch.players;
			for (var j = 0; j < currMatch.players.length; j++) {
				if (subtitle == "")
					subtitle = bot2user[currMatch.players[j].bot];
				else
					subtitle += " VS " + bot2user[currMatch.players[j].bot];
				if (currMatch.scores[j] > currMatch.scores[maxID]) {
					maxID = j;
					maxCount = 1;
				} else if (currMatch.scores[j] == currMatch.scores[maxID])
					maxCount++;
			}
			contestResult.push({
				title: "第" + num2chn(parseInt(i) + 1) + "场",
				subtitle: subtitle,
				matches: [currMatch._id],
				winner: {
					user: maxCount > 1 ? "-" : bot2user[currMatch.players[maxID].bot]
				},
				loser: {
					user: "-"
				}
			});
		}
	} else {
		playerPerMatch = 2;

		// 产生标题
		var id = 0, currPlayerCount = playerCount;
		for (var i = 0; currPlayerCount > 2; i++) {
			for (var j = 0; j < currPlayerCount / playerPerMatch; j++) {
				contestResult[id].title = "第" + num2chn(parseInt(i) + 1) + "轮淘汰赛 " + (j + 1) + " / " + currPlayerCount / playerPerMatch;
				var name1, name2;
				if (Math.random() > 0.5) {
					name1 = contestResult[id].winner.user;
					name2 = contestResult[id].loser.user;
				} else {
					name1 = contestResult[id].loser.user;
					name2 = contestResult[id].winner.user;
				}
				contestResult[id].subtitle = name1 + " VS " + name2;
				id++;
			}
			currPlayerCount /= 2;
		}
		for (; id < contestResult.length; id++) {
			if (id == contestResult.length - 2)
				contestResult[id].title = "三四名角逐赛";
			else
				contestResult[id].title = "冠亚军决赛";
			var name1, name2;
			if (Math.random() > 0.5) {
				name1 = contestResult[id].winner.user;
				name2 = contestResult[id].loser.user;
			} else {
				name1 = contestResult[id].loser.user;
				name2 = contestResult[id].winner.user;
			}
			contestResult[id].subtitle = name1 + " VS " + name2;
		}
	}
});

function TogglePosition() {
	displayArea.toggleClass("lefttop");
	$(".navbar").toggle();
}

function NextStep() {
	$("#btnNext").prop("disabled", true);
	if (timLogProvider) {
		clearTimeout(timLogProvider);
		timLogProvider = null;
	}
	var roundInfo = contestResult[currRound];
	if (currPeriod == 0) { // 初始画面
		mask.fadeIn(1000, function () {
			dSplash.find(".gamename").text(roundInfo.title);
			dSplash.find(".contestname").text(roundInfo.subtitle);
			mask.fadeOut(1000);
			currPeriod++;
			ShowPeriod();
		});
	} else if (currPeriod == 1) { // 该轮首页
		mask.fadeIn(1000, function () {
			dSplash.hide();
			dMatchView.show();
			$.get("/match/" + roundInfo.matches[0], { lite: true }, function (data) {
				playerNames = data.players;
				mask.fadeOut(1000);
				PlayFullLogs(data.logs, data.viewurl);
				currPeriod++;
				dFloatInfo.text(roundInfo.subtitle + " 1 / " + roundInfo.matches.length);
				ShowPeriod();
			}, "json");
		});
	} else if (currPeriod == roundInfo.matches.length + 1) { // 末局放完
		mask.fadeIn(1000, function () {
			dMatchView.hide();
			dSplash.show().find(".contestname").text(roundInfo.subtitle);
			dSplash.find(".gamename").text("胜者：" + roundInfo.winner.user);
			mask.fadeOut(1000);
			currPeriod = 0;
			currRound++;
			ShowPeriod();
		});
	} else { // 显示对局中
		mask.fadeIn(1000, function () {
			$.get("/match/" + roundInfo.matches[currPeriod - 1], { lite: true }, function (data) {
				playerNames = data.players;
				mask.fadeOut(1000);
				PlayFullLogs(data.logs, data.viewurl);
				dFloatInfo.text(roundInfo.subtitle + " " + currPeriod + " / " + roundInfo.matches.length);
				currPeriod++;
				ShowPeriod();
			}, "json");
		});
	}
}

function UpdateSize() {
	displayArea.css({
		width: $("#txtDisplayWidth").val(),
		height: $("#txtDisplayHeight").val()
	});
}

function ShowPeriod() {
	$("#btnNext").prop("disabled", false);
}
