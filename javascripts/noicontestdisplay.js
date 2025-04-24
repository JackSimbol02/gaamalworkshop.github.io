/*
 * Botzone 2.0 比赛展示控制脚本
 * 作者：zhouhy
 * 需求：jQuery
 */

var currPeriod = -1, currRound = 0, roundCount, playerCount, groupCount, contestResults = {};
var displayArea, prgbarStatus, prgbarInner, mask, roundTitle, dSplash, dRoundTitle, dMatchView, dFloatInfo, dCountDown, dRuleDescription, timCountDown,
	timLogProvider, currLog, dummy = function () { }, playerNames;
var chineseNum = "一二三四五六七八九";
var translate = {
	"anhui": "安徽",
	"macau": "澳门",
	"beijing": "北京",
	"chongqing": "重庆",
	"fujian": "福建",
	"gansu": "甘肃",
	"guangdong1": "广东①",
	"guangdong2": "广东②",
	"guangxi": "广西",
	"guizhou": "贵州",
	"hainan": "海南",
	"hebei": "河北",
	"henan": "河南",
	"heilongjiang": "黑龙江",
	"hubei": "湖北",
	"hunan": "湖南",
	"jilin": "吉林",
	"jiangsu": "江苏",
	"jiangxi": "江西",
	"liaoning": "辽宁",
	"neimenggu": "内蒙古",
	"ningxia": "宁夏",
	"qinghai": "青海",
	"shandong": "山东",
	"shanxi": "山西",
	"shaanxi": "陕西",
	"shanghai": "上海",
	"sichuan": "四川",
	"taiwan": "台湾",
	"tianjin": "天津",
	"xizang": "西藏",
	"hongkong": "香港",
	"xinjiang": "新疆",
	"yunnan": "云南",
	"zhejiang": "浙江",
	"Administrator": "Sample"
};

function TranslateName(name) {
	var result = translate[name] || name;
	if (result && result.length == 2)
		result = result[0] + "　" + result[1];
	return result;
}

// PlayerAPI 预留接口
var callbacks = {}, notifications = {
	initcomplete: dummy,
	playermove: dummy
};

function PlayFullLogs(loglist, url) {
	var iframe = document.getElementById('frmViewPort');
	if (iframe.contentWindow.location.href == url)
		iframe.contentWindow.location.reload();
	else
		iframe.src = url;
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
	dRuleDescription = $("#dRuleDescription");
	mask = $("#dMask").fadeOut(1000);
	currPeriod = 0;
	UpdateSize();
});

function TogglePosition() {
	displayArea.toggleClass("lefttop");
	$(".navbar").toggle();
}

function LoadContestResult(type, callback) {
	$.getJSON("/static/noi2014" + type + ".json?" + Math.random(), function (result) {
		if (!result)
			return;
		$("#pStat_" + type + " span.glyphicon").show();
		contestResults[type] = result;
		callback();
	});
}

function GetContestResult(type, callback) {
	var proc = function () {
		var currTable = $("#tabRound");
		var result = contestResults[type];
		var lresult = [];
		for (var team in result.lastResult)
			if (result.lastResult[team].inmatch)
				lresult.push({
					name: team,
					rank: result.lastResult[team].rank,
					score: result.lastResult[team].score
				});
		lresult.sort(function (a, b) {
			return a.rank - b.rank;
		});
		playerCount = lresult.length;
		groupCount = Math.ceil(playerCount / 4);
		currRound = roundCount = groupCount;
		if (type == 'round1') {
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
		} else {
			var html = "", i = 0;
			for (var row = 0; row < 4; row++) {
				html += "<tr>";
				for (var col = 0; col < groupCount; col++) {
					var rawname = (lresult[i] || { name: "Sample" }).name;
					html += "<td><p class=\"teamname\">" + TranslateName(rawname) + "</p><p class=\"score\" data-name=\"" + rawname + "\">" + (lresult[i] || { score: 0 }).score + "</p></td>";
					i += 4;
				}
				html += "</tr>";
				i = row + 1;
			}
			html += "<tr class=\"indicator\">";
			for (var col = 0; col < groupCount; col++)
				html += "<td></td>";
			html += "</tr>";
			var prizes = [];
			for (var i = 0; i < result.result.length; i++)
				if (result.result[i].rank < 6)
					prizes[result.result[i].rank] = TranslateName(i);
			$("#dFinalResult .team.firstprize").text(prizes[0]);
			$("#dFinalResult .team.secondprize").text(prizes[1] + " " + prizes[2]);
			$("#dFinalResult .team.thirdprize").text(prizes[3] + " " + prizes[4] + " " + prizes[5]);
			currTable.html(html);
		}
		callback(currTable);
	};
	if (!contestResults[type])
		LoadContestResult(type, proc);
	else
		proc();
}

function NextStep() {
	$("#btnNext").prop("disabled", true);
	if (timLogProvider) {
		clearTimeout(timLogProvider);
		timLogProvider = null;
	}
	var round = Math.floor((currPeriod - 1) / 3);
	if (currPeriod == 0) { // 初始画面
		mask.fadeIn(1000, function () {
			dSplash.hide();
			dRuleDescription.show();
			currRound = 6;
			currPeriod = -2;
			mask.fadeOut(1000);
			ShowPeriod();
		});
	} else if (currPeriod == -2 && currRound == 6) { // 游戏介绍第一张
		currRound--;
		$("#dRuleDescription .desctitle").text("游戏规则 - 使用牌面");
		$("#dRuleDescription .desccontent.content1").fadeOut();
		$("#dRuleDescription .fullpicdesc").addClass("pos1");
		ShowPeriod();
	} else if (currPeriod == -2 && currRound == 5) { // 游戏介绍第二张
		currRound--;
		$("#dRuleDescription .desctitle").text("游戏规则 - 胡牌牌型");
		$("#dRuleDescription .fullpicdesc").addClass("pos2");
		ShowPeriod();
	} else if (currPeriod == -2 && currRound == 4) { // 游戏介绍第三张
		currRound--;
		$("#dRuleDescription .fullpicdesc").addClass("pos3");
		ShowPeriod();
	} else if (currPeriod == -2 && currRound == 3) { // 游戏动作
		currRound--;
		$("#dRuleDescription .desctitle").text("游戏规则 - 动作");
		$("#dRuleDescription .fullpicdesc").removeClass("pos1");
		$("#dRuleDescription .desccontent.content2").fadeIn();
		ShowPeriod();
	} else if (currPeriod == -2 && currRound == 2) { // 赛制介绍
		currRound--;
		$("#dRuleDescription .desctitle").text("排名规则");
		$("#dRuleDescription .fullpicdesc").removeClass("pos1");
		$("#dRuleDescription .desccontent.content2").fadeOut(function () {
			$("#dRuleDescription .desccontent.content3").fadeIn();
		});
		ShowPeriod();
	} else if (currPeriod == -2) { // 赛制介绍结束
		mask.fadeIn(1000, function () {
			dRuleDescription.hide();
			dRoundTitle.show();
			GetContestResult("round1", function (currTable) {
				currPeriod = 1;
				roundTitle.text("第一轮").css({
					fontSize: 50,
					color: "#ff9700",
					marginTop: 100
				});
				mask.fadeOut(1000, function () {
					roundTitle.animate({
						color: "#0097ff",
						fontSize: 25
					}).animate({
						marginTop: 10
					}, function () {
						currTable.fadeIn();
					});
				});
				ShowPeriod();
			});
		});
	} else if (currPeriod % 3 == 1) { // 标题页
		if (currRound == 0) {
			mask.fadeIn(1000, function () {
				roundTitle.append(" - 最终排名");
				$("#tabRound").hide();
				var results = [], result = contestResults["round" + (round + 1)];
				var nonZeroCount = 0;
				for (var i in result.result) {
					results[result.result[i].rank] = {
						name: i,
						score: result.result[i].score
					};
					if (result.result[i].score > 0)
						nonZeroCount++;
				}

				var html = "", i = 0;
				for (var row = 0; row < 4; row++) {
					html += "<tr>";
					for (var col = 0; col < Math.ceil(nonZeroCount / 4) ; col++) {
						if (i >= nonZeroCount)
							html += "<td></td>";
						else {
							var rawname = (results[i] || { name: "-" }).name;
							html += "<td><p class=\"teamname\">" + TranslateName(rawname) + "</p><p class=\"score\" data-name=\"" + rawname + "\">" + (results[i] || { score: 0 }).score + "</p></td>";
							i++;
						}
					}
					html += "</tr>";
				}
				$("#tabResult").html(html).show();
				mask.fadeOut();
				currRound--;
				ShowPeriod();
			});
		} else if (currRound == -1) {
			mask.fadeIn(1000, function () {
				if (round == 5) {
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
					GetContestResult("round" + (round + 2), function (currTable) {
						currPeriod += 3;
						roundTitle.text("第" + chineseNum[round + 1] + "轮").css({
							fontSize: 50,
							color: "#ff9700",
							marginTop: 100
						});
						mask.fadeOut(1000, function () {
							roundTitle.animate({
								color: "#0097ff",
								fontSize: 25
							}).animate({
								marginTop: 10
							}, function () {
								currTable.fadeIn();
							});
						});
						ShowPeriod();
					});
				}
			});
		} else {
			$("#tabRound td").removeClass("current");
			$("#tabRound tr td:nth-child(" + currRound + ")").addClass("current");
			currPeriod++;
			ShowPeriod();
			mask.fadeOut(1000);
		}
	} else if (currPeriod % 3 == 2) { // 显示指针
		mask.fadeIn(1000, function () {
			dRoundTitle.hide();
			dMatchView.show();
			$.get("/match/" + contestResults["round" + (round + 1)].matches[currRound - 1], { lite: true }, function (data) {
				dMatchView.show();
				playerNames = data.players;
				for (var i = 0; i < playerNames; i++) {
					var to = playerNames[i].name.indexOf(']');
					playerNames[i].name = "【" + TranslateName(playerNames[i].name.substring(1, to)) + "】";
				}
				PlayFullLogs(data.logs, data.viewurl);
				mask.fadeOut(1000);
				currPeriod++;
				dFloatInfo.text("第" + chineseNum[round] + "轮 第 " + (roundCount - currRound + 1) + " / " + roundCount + " 场");
				ShowPeriod();
			}, "json");
		});
	} else if (currPeriod % 3 == 0) { // 显示对局
		mask.fadeIn(1000, function () {
			var result = contestResults["round" + (round + 1)];
			for (var i = 0; i < 4; i++) {
				var curr = $("#tabRound tr:eq(" + i + ") td:eq(" + (currRound - 1) + ") p.score");
				if (result.result[curr.data("name")] && result.lastResult[curr.data("name")])
					curr.append(" + " + (result.result[curr.data("name")].score - result.lastResult[curr.data("name")].score));
			}
			dMatchView.hide();
			dRoundTitle.show();
			currRound--;
			currPeriod -= 2;
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
	$("#sRoundCount").text("对局总数：" + roundCount);
	$("#btnNext").prop("disabled", false);
}

function UpdatePeriod() {
	currPeriod = parseInt($("#txtCurrPeriod").val());
	currRound = parseInt($("#txtCurrRound").val());
}

function ToggleCountDown(ctrl) {
	$(ctrl).toggleClass("active");
	$("#dCountDown").toggleClass("visible");
}

function ToggleTimer(ctrl) {
	if (timCountDown) {
		clearTimeout(timCountDown);
		timCountDown = null;
	} else {
		var fn = function () {
			var min = parseInt($("#txtMinute").val()), sec = parseInt($("#txtSecond").val());
			if (sec-- == 0) {
				sec = 59;
				if (min-- == 0) {
					$(ctrl).toggleClass("active");
					return;
				}
			}
			$("#txtMinute").val(min);
			$("#txtSecond").val(sec);
			if (sec < 10)
				sec = "0" + sec;
			$("#dCountDown p.countdown").text(min + ":" + sec);
			timCountDown = setTimeout(fn, 1000);
		};
		timCountDown = setTimeout(fn, 1000);
	}
	$(ctrl).toggleClass("active");
}
