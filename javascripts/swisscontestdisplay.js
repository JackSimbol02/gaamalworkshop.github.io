/*
 * Botzone 2.0 比赛展示控制脚本
 * 作者：zhouhy
 * 需求：jQuery
 */

var currPeriod = -1, currRound = 0, round = 0, playerPerMatch, roundCount, playerCount, groupCount, contest, contestScores, bot2user;
var displayArea, prgbarStatus, prgbarInner, mask, roundTitle, dSplash, dRoundTitle, dMatchView, dFloatInfo, dRuleDescription,
	timLogProvider, currLog, dummy = function () { }, playerNames;
var chineseNum = "一二三四五六七八九";
var loglist = [];

// PlayerAPI 预留接口
var callbacks = {}, notifications = {
	initcomplete: dummy,
	playermove: dummy
};

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
				timLogProvider = setTimeout(OnTick, 1000);
		}
		timLogProvider = setTimeout(OnTick, 1000);
	}
}

$(document).ready(function () {
	prgbarStatus = $("#prgbarStatus");
	prgbarInner = $("#prgbarStatus div");
	displayArea = $("#dMainBlock");
	dSplash = $("#dSplash");
	dRoundTitle = $("#dRoundTitle");
	dMatchView = $("#dMatchView");
	roundTitle = $("#dRoundTitle .roundname");
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

	// 计算轮数
	playerCount = contest.players.length;
	playerPerMatch = contest.matches[0].players.length;
	groupCount = playerCount / playerPerMatch;
	var matchCount = contest.matches.length;
	roundCount = matchCount / groupCount;
	contestScores = [];
	for (var i = 0; i < roundCount; i++) {
		var currRoundScores = {}, lastRoundScores = contestScores[i - 1] || {};
		for (var j = 0; j < groupCount; j++) {
			var currMatch = contest.matches[i * groupCount + j];
			for (var k = 0; k < playerPerMatch; k++) {
				var name = bot2user[currMatch.players[k].bot];
				var score = currMatch.scores[k];
				var currScore = currRoundScores[name] = (lastRoundScores[name] || 0) + score;
			}
		}
		contestScores.push(currRoundScores);
	}
});

function TogglePosition() {
	displayArea.toggleClass("lefttop");
	$(".navbar").toggle();
}

function GetContestResult(roundID) {
	var currTable = $("#tabRound");
	var result = contestScores[roundID - 1] || {};
	/*if (type == 'round1') {
		var html = "", i = 0;
		for (var row = 0; row < 4; row++) {
			html += "<tr>";
			for (var col = 0; col < groupCount; col++) {
				var rawname = (lresult[row % 2 == 0 ? i++ : i--] || { name: "Sample" }).name;
				html += "<td><p class=\"teamname\">" + TranslateName(rawname) + "</p><p class=\"score\" data-name=\"" + rawname + "\">0</p></td>";
			}
			html += "</tr>";
			i += groupCount + (row % 2 == 0 ? -1 : 1);
		}
		html += "<tr class=\"indicator\">";
		for (var col = 0; col < groupCount; col++)
			html += "<td></td>";
		html += "</tr>";
		currTable.html(html);
	} else*/
	var html = "", i = 0;
	for (var row = 0; row < groupCount; row++) {
		html += "<tr><td class=\"indicator\"></td>";
		var currMatch = contest.matches[roundID * groupCount + row];
		for (var col = 0; col < playerPerMatch; col++) {
			var name = bot2user[currMatch.players[col].bot];
			html += "<td><p class=\"teamname\">" + name + "</p><p class=\"score\">" + (result[name] || 0) + "</p></td>";
			i++;
		}
		html += "</tr>";
	}
	return currTable.html(html);
}

function NextStep() {
	$("#btnNext").prop("disabled", true);
	if (timLogProvider) {
		clearTimeout(timLogProvider);
		timLogProvider = null;
	}
	if (currPeriod == 0) { // 初始画面
		mask.fadeIn(1000, function () {
			dSplash.hide();
			dRoundTitle.show();
			var currTable = GetContestResult(0);
			currPeriod = 1;
			round = 0;
			currRound = groupCount;
			roundTitle.text("第一轮").css({
				fontSize: 80,
				color: "#ff9700"
			});
			mask.fadeOut(1000, function () {
				roundTitle.animate({
					color: "#0097ff",
					fontSize: 40
				}).fadeOut(function () {
					roundTitle.fadeIn();
					currTable.fadeIn();
				});
			});
			ShowPeriod();
		});
	} else if (currPeriod % 3 == 1) { // 标题页
		if (currRound == 0) {
			mask.fadeIn(1000, function () {
				roundTitle.append(" - 最终排名");
				$("#tabRound").hide();
				var ordered = [];
				var currResult = contestScores[round];
				for (var i in currResult) {
					ordered.push({
						name: i,
						score: currResult[i]
					});
				}
				ordered.sort(function (a, b) {
					return b.score - a.score;
				});
				if (round == roundCount - 1) {
					$("#dFinalResult .team.firstprize").text(ordered[0].name);
					$("#dFinalResult .team.secondprize").text(ordered[1].name);
					$("#dFinalResult .team.thirdprize").text(ordered[2].name);
				}

				var html = "", i = 0;
				for (var row = 0; row < groupCount; row++) {
					html += "<tr>";
					for (var col = 0; col < playerPerMatch; col++) {
						html += "<td><p class=\"teamname\">" + ordered[i].name + "</p><p class=\"score\">" + ordered[i].score + "</p></td>";
						i++;
					}
					html += "<td class=\"indicator\"></td></tr>";
				}
				$("#tabResult").html(html).show();
				mask.fadeOut();
				if (round != roundCount - 1)
					currRound--;
				ShowPeriod();
			});
		} else if (currRound == -1) {
			mask.fadeIn(1000, function () {
				if (round == roundCount - 1) {
					$("#tabResult").hide();
					$("#dRoundTitle").hide();
					$("#dFinalResult").show();
					mask.fadeOut(1000, function () {
						$("#dFinalResult .firstprize").animate({
							fontSize: 25,
							opacity: 1
						}, function () {
							$("#dFinalResult .secondprize").animate({
								fontSize: 25,
								opacity: 1
							}, function () {
								$("#dFinalResult .thirdprize").animate({
									fontSize: 25,
									opacity: 1
								});
							});
						});
					});
					ShowPeriod();
				} else {
					$("#tabResult").hide();
					$("#tabRound").hide();
					round++;
					var currTable = GetContestResult(round);
					roundTitle.text("第" + chineseNum[round] + "轮").css({
						fontSize: 80,
						color: "#ff9700"
					});
					mask.fadeOut(1000, function () {
						roundTitle.animate({
							color: "#0097ff",
							fontSize: 40
						}).fadeOut(function () {
							roundTitle.fadeIn();
							currTable.fadeIn();
						});
					});
					currRound = groupCount;
					ShowPeriod();
				}
			});
		} else {
			$("#tabRound tr").removeClass("current");
			$("#tabRound tr:nth-child(" + currRound + ")").addClass("current");
			currPeriod++;
			ShowPeriod();
			mask.fadeOut(1000);
		}
	} else if (currPeriod % 3 == 2) { // 显示指针
		mask.fadeIn(1000, function () {
			dRoundTitle.hide();
			dMatchView.show();
			$.get("/match/" + contest.matches[round * groupCount + currRound - 1]._id, { lite: true }, function (data) {
				dMatchView.show();
				playerNames = data.players;
				PlayFullLogs(data.logs, data.viewurl);
				mask.fadeOut(1000);
				currPeriod++;
				dFloatInfo.text("第" + chineseNum[round] + "轮 第 " + (groupCount - currRound + 1) + " / " + groupCount + " 场");
				ShowPeriod();
			}, "json");
		});
	} else if (currPeriod % 3 == 0) { // 显示对局
		mask.fadeIn(1000, function () {
			document.getElementById('frmViewPort').src = "about:blank";
			for (var i = 0; i < playerPerMatch; i++) {
				$("#tabRound tr:eq(" + (currRound - 1) + ") td:eq(" + (i + 1) + ") p.score")
					.append(" + " + contest.matches[round * groupCount + currRound - 1].scores[i]);
			}
			dMatchView.hide();
			dRoundTitle.show();
			currRound--;
			currPeriod++;
			ShowPeriod();
			mask.fadeOut(1000);
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
	$("#txtCurrPeriod").val(currPeriod);
	$("#txtCurrRound").val(currRound);
	$("#sRoundCount").text("对局总数：" + groupCount);
	$("#btnNext").prop("disabled", false);
}

function UpdatePeriod() {
	currPeriod = parseInt($("#txtCurrPeriod").val());
	currRound = parseInt($("#txtCurrRound").val());
}