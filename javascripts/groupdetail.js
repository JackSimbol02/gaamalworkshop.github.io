/*
 * Botzone 2.0 小组详情页面控制脚本
 * 作者：zhouhy
 * 需求：jQuery、Botzone2.0的global脚本框架、aceeditor
 */

var currBot = {}, bots, currContest, currScoreboard, timContestTime, detailBlock, scoreboardDetailBlock, humanContestDetailBlock, servTime, btnBotOperate,
	tabPlayers, tabEditPlayers, tabMatches, tabHumanPlayers, tabHumanMatches, editor, memberid2nick, memberid2username, contestid2name, group, gameid, clist;
var playerList = {
	initial: [],
	current: [],
	actions: []
};
var selectedScoreboard, selectedHumanContest;

validateFunctions.checkVersion = function (ver) {
	if (ver == "" || ver == null)
		return __("ver.nonnull");
	else if (parseInt(ver) >= currBot.versions.length)
		return __("ver.toolarge");
	return null;
};

validateFunctions.checkNewAdminList = function (admins) {
	if (!admins || !Array.isArray(admins) || admins.length == 0)
		return __("nonnull");
	return null;
};

validateFunctions.checkNewUserList = function (users) {
	if (!users || !Array.isArray(users) || users.length == 0)
		return __("nonnull");
	return null;
};

var confModifyAdminList = new FormConfig({
	method: "post",
	action: "/group/modifyadmin",
	finalValidate: function ($form) {
		var adminids = $form.find("#cmbNewAdminList").val();
		for (var i = 0; i < adminids.length; i++)
			if (adminids[i] == userMe._id)
				break;
		return i != adminids.length || confirm(__("group.admins.excludeself"));
	},
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("success"), false);
			setTimeout(function () {
				Botzone.replacePage(location.href);
			}, 2000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

var confFillPlayers = new FormConfig({
	method: "post",
	action: "/contest/fillplayers",
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("success"), false);
			setTimeout(function () {
				Botzone.replacePage(location.href);
			}, 2000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

var confAddMember = new FormConfig({
	method: "post",
	action: "/group/addmember",
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("success"), false);
			setTimeout(function () {
				Botzone.replacePage(location.href);
			}, 2000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

var confRefreshSession = new FormConfig({
	method: "post",
	action: "/refreshsession",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			alert(__("generalerror"));
		} else {
			Botzone.replacePage(location.href);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		alert(__("generalerror") + errorThrown);
	}
});


//// 创建比赛表单逻辑 - 始

var confCreateScoreboard = new FormConfig({
	method: "post",
	action: "/scoreboard/create",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("success"), false);
			setTimeout(function () {
				Botzone.replacePage(location.href);
			}, 2000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

var confCreateHumanContest = new FormConfig({
	method: "post",
	action: "/humancontest/create",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("success"), false);
			setTimeout(function () {
				Botzone.replacePage(location.href);
			}, 2000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

var confCreateContest = new FormConfig({
	method: "post",
	action: "/contest/create",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("success"), false);
			if (result.modified) {
				$('#dlgCreateContest').modal('hide');
				ShowContestDetail();
			} else
				setTimeout(function () {
					Botzone.replacePage(location.href);
				}, 2000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

validateFunctions.checkContestRuleCode = function () {
	var code;
	$("#iRuleCode").val(Base64.encode(code = editor.getValue()));
	if (code == "" || code == null)
		return __("code.nonnull");
	else if (code.length > Botzone.consts.contest.rule_length_max)
		return __("code.toolong");
	return null;
};

validateFunctions.checkContestTime = function (time) {
	if (time == "" || time == null)
		return __("contesttime.nonnull");
	time = new Date(time);
	if (time == "" || time == null)
		return __("contesttime.invalid");
	else if (time < Date.now())
		return confirm(__("contesttime.inthepast.prompt")) ? null : __("contesttime.inthepast");
	return null;
};

validateFunctions.checkContestName = function (name) {
	if (name == "" || name == null)
		return __("contestname.nonnull");
	else if (name.length > Botzone.consts.contest.name_length_max)
		return __("contestname.toolong");
	return null;
};

validateFunctions.checkContestDesc = function (desc) {
	if (desc == "" || desc == null)
		return __("contestdesc.nonnull");
	else if (desc.length > Botzone.consts.contest.desc_length_max)
		return __("contestdesc.toolong");
	return null;
};

//// 创建比赛表单逻辑 - 终

//// 添加通知表单逻辑 - 始

var confNewAnnouncement = new FormConfig({
	method: "post",
	action: "/group/newannouncement",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("create.success"), false);
			setTimeout(function () {
				Botzone.replacePage(location.href);
			}, 2000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

validateFunctions.checkAnnouncement = function (text) {
	if (text == "" || text == null)
		return __("announcement.nonnull");
	return null;
};

//// 添加通知表单逻辑 - 终

//// 添加对局表单逻辑 - 始

validateFunctions.checkMatchURL = function (url) {
	if (url == "" || url == null)
		return __("matchurl.nonnull");
	else {
		var id = url.match(/[0-9a-f]{24}$/);
		if (id)
			$("#txtMatchID").val(id);
		else
			return __("matchurl.invalid");
	}
};

var confAddMatchToHumanContests = new FormConfig({
	method: "post",
	action: "/humancontest/addmatch",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("modify.success"), false);
			setTimeout(function () {
				$("#dlgAddMatchToHumanContest").modal("hide");
				ShowHumanContestDetail();
			}, 2000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

//// 添加对局表单逻辑 - 终

//// 颁发勋章表单逻辑 - 始

var confIssueBadges = new FormConfig({
	method: "post",
	action: "/group/issuebadges",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("issue.success"), false);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

//// 颁发勋章表单逻辑 - 终

//// 修改昵称表单逻辑 - 始

validateFunctions.checkGroupNick = function (nick) {
	if (nick == "" || nick == null)
		return __("groupnick.nonnull");
	else if (nick.length > Botzone.consts.group.nick_length_max)
		return __("groupnick.toolong");
	return null;
};

var confModifyGroupNick = new FormConfig({
	method: "post",
	action: "/group/changenick",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("modify.success"), false);
			setTimeout(function () {
				Botzone.replacePage(location.href);
			}, 2000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

//// 修改昵称表单逻辑 - 终

function SelectBot(ctrl) {
	if (ctrl)
		currContest = $(ctrl).closest('tr');
	var gameid = currContest.data("gameid");
	for (var i = 0; i < bots.length; i++) {
		if (bots[i].game._id == gameid)
			$("#bot" + i).show();
		else
			$("#bot" + i).hide();
	}
}

playerList.add = function () {
	var val = prompt(__("playerlist.add.prompt"));
	if (!val)
		return;
	val = val.split(",");
	val = val.filter(function (id) {
		return !playerList.current.some(function (player) {
			return player.bot._id == id;
		});
	});
	if (val.length == 0)
		return;
	playerList.actions.push({
		action: "add",
		param: val
	});
	Botzone.ldscreen.fadeIn();
	var finishCount = 0, finalResults = [];
	function finish() {
		if (++finishCount == val.length) {
			playerList.current.push.apply(playerList.current, finalResults);
			finalResults.forEach(function (player) {
				tabEditPlayers.append(playerList.player2row(player));
			});
			Botzone.ldscreen.stop().fadeOut();
		}
	}
	val.forEach(function (id, i) {
		if (!id)
			return finish();
		$.get("/mybots/detail/version/" + id, function (result) {
			if (!result.success)
				return alert(result.message);
			finalResults[i] = {
				type: "bot",
				bot: result.bot,
				score: "N/A"
			};
			finish();
		}, "json").fail(function (jqXHR, textStatus, errorThrown) {
			finishCount = -Number.MAX_VALUE;
			Botzone.generalAjaxErrorHandler(jqXHR, textStatus, errorThrown);
		});
	});
};

playerList.remove = function () {
	var rows = tabEditPlayers.find("tr.active");
	var ids = [];
	rows.each(function () { ids.push($(this).data("botvid")); });
	playerList.actions.push({
		action: "remove",
		param: ids
	});
	playerList.current = playerList.current.filter(function (player) {
		return ids.indexOf(player.bot._id) == -1;
	});
	rows.remove();
};

playerList.change = function (ctrl) {
	var row = $(ctrl).closest("tr");
	var id = row.data("botvid");
	playerList.actions.push({
		action: "change",
		id: id,
		param: ctrl.value
	});
	playerList.current.find(function (player) {
		return player.bot._id == id;
	}).score = ctrl.value || "N/A";
};

playerList.copy = function () {
	var rows = tabEditPlayers.find("tr.active");
	var ids = [];
	rows.each(function () { ids.push($(this).data("botvid")); });
	Botzone.copy(ids.join(","), __("playerlist.copy.success"), __("playerlist.copy.prompt"));
};

playerList.reload = function () {
	playerList.current = JSON.parse(JSON.stringify(playerList.initial));
	playerList.actions = [];
	playerList.load();
};

playerList.confirm = function () {
	if (playerList.actions.length == 0)
		return;
	Botzone.$post("/contest/editplayers", { 
		contest: currContest.data("contestid"),
		actions: JSON.stringify(playerList.actions)
	}, function (result) {
		ShowContestDetail();
	});
};

playerList.mark = function (ctrl) {
	$(ctrl).closest("tr").toggleClass("active");
};

playerList.markAll = function (ctrl) {
	if (!ctrl.checked) {
		tabEditPlayers.find("input").prop("checked", false);
		tabEditPlayers.find("tr:gt(0)").removeClass("active");
	} else {
		tabEditPlayers.find("input").prop("checked", true);
		tabEditPlayers.find("tr:gt(0)").addClass("active");
	}
};

playerList.player2row = function (player) {
	var bot = player.bot;
	var userid = bot.user._id;
	var username = bot.user.name, suffix = "";
	if (memberid2nick[userid])
		suffix = " (" + memberid2nick[userid] + ")";
	var score = player.score;
	if (score == "N/A")
		score = "";
	return "<tr data-botvid=\"" + bot._id + "\"><td><input type=\"checkbox\" onclick=\"playerList.mark(this)\" /></td><td>" +
		Botzone.buildingBlocks.avatar(userid) + " " + Botzone.buildingBlocks.username(userid, username) + suffix + "</td><td>" +
		bot.bot.name + "</td><td><input type=\"number\" value=\"" + score + "\" onchange=\"playerList.change(this)\" /></td></tr>";
};

playerList.load = function () {
	if (tabEditPlayers.length == 0)
		return;
	tabEditPlayers.find("tr:eq(0) input").prop("checked", false);
	tabEditPlayers.find("tr:gt(0)").remove();
	for (var i = 0; i < playerList.current.length; i++) {
		tabEditPlayers.append(playerList.player2row(playerList.current[i]));
	}
};

function ShowHumanContestDetail(ctrl) {
	if (ctrl)
		currHumanContest = $(ctrl).closest('tr');
	Botzone.ldscreen.fadeIn();
	Botzone.$get("/humancontest/detail/" + currHumanContest.data("humancontestid"), null, function (result) {
		var humanContest = result.humanContest;
		selectedHumanContest = humanContest;
		if (timContestTime)
			clearTimeout(timContestTime);
		Botzone.defineRefreshAction(ShowHumanContestDetail);
		humanContestDetailBlock.find(".panel-title span").text(humanContest.name);
		humanContestDetailBlock.find(".humancontest-desc").text(humanContest.desc);
		humanContestDetailBlock.find(".humancontest-game").text(humanContest.game.name);
		humanContestDetailBlock.find(".humancontest-updatetime").text(__("groups.humancontest.updatetime", new Date(humanContest.update_time)).toString());

		tabHumanPlayers.find("tr:gt(0)").remove();
		humanContest.scores.sort(function (p1, p2) {
			return p2.score - p1.score;
		});
		for (var i = 0; i < humanContest.scores.length; i++) {
			var userid = humanContest.scores[i].user._id;
			var username = humanContest.scores[i].user.name, suffix = "";
			if (memberid2nick[userid])
				suffix = " (" + memberid2nick[userid] + ")";
			if (humanContest.scores[i].score == undefined)
				humanContest.scores[i].score = "N/A";
			tabHumanPlayers.append("<tr><td>" + (i + 1) + "</td><td>" +
				Botzone.buildingBlocks.avatar(userid) + " " + Botzone.buildingBlocks.username(userid, username) + suffix +
				"</td><td>" + humanContest.scores[i].score + "</td></tr>");
		}

		tabHumanMatches.find("tr:gt(0)").remove();
		var all, matchPages = [], currMatchPage = 0, nav;
		tabHumanMatches.find("tr").after(result.table);
		all = tabHumanMatches.find("tr:gt(0)");
		nav = $(".humancontestdetail nav ul.pagination").html("").show();
		$("#txtHumanContestFilterKeyword").val("");
		for (var i = 0; i < all.length; i += 100) {
			matchPages.push(all.slice(i, i + 100));
			nav.append($("<li></li>").append($("<a href=\"javascript:;\">" + matchPages.length + "</a>").click(function () {
				tabHumanMatches.find("tr:gt(0)").remove();
				tabHumanMatches.append(matchPages[parseInt(this.innerHTML) - 1]);
				nav.find("li").removeClass("active");
				$(this).closest("li").addClass("active");
			})));
		}
		nav.find("li:eq(0)").addClass("active");
		tabHumanMatches.find("tr:gt(100)").remove();
		$("#btnHumanContestFilterMatches").off("click").on("click", function () {
			var keyword = $("#txtHumanContestFilterKeyword").val();
			if (keyword.length > 0) {
				var result = all.filter(":contains('" + keyword + "')");
				tabHumanMatches.find("tr:gt(0)").remove();
				tabHumanMatches.append(result);
				nav.hide();
			} else {
				nav.show().find("li.active a").click();
			}
		});
		$(".groupblocks").fadeOut(200, function () {
			humanContestDetailBlock.fadeIn(200);
		});
	});
}

function ShowContestDetail(ctrl) {
	if (ctrl)
		currContest = $(ctrl).closest('tr');
	Botzone.$get("/contest/detail/" + currContest.data("contestid"), null, function (result) {
		var contest = result.contest;
		if (timContestTime)
			clearTimeout(timContestTime);
		Botzone.defineRefreshAction(ShowContestDetail);
		detailBlock.find(".panel-title span").text(contest.name);
		detailBlock.find(".contest-desc").text(contest.desc);
		detailBlock.find(".contest-status").text(result.status);
		detailBlock.find(".contest-starttime").text(__("groups.contest.starttime", (contest.start_time = new Date(contest.start_time)).toString()));
		detailBlock.find(".contest-currtime").text(__("groups.contest.currtime", (servTime = new Date(result.currtime)).toString()));
		detailBlock.find(".contest-participant").text("N/A");
		var fnTick = function () {
			if (servTime >= contest.start_time)
				btnBotOperate.hide();
			else
				btnBotOperate.show();
			detailBlock.find(".contest-currtime").text(__("groups.contest.currtime", (servTime = new Date(servTime.getTime() + 1000)).toString()));
			timContestTime = setTimeout(fnTick, 1000);
		};
		if (contest.status != 'open')
			btnBotOperate.hide();
		fnTick();
		tabPlayers.find("tr:gt(0)").remove();
		var admintable = !!tabPlayers.hasClass("admintable");
		contest.players.sort(function (p1, p2) {
			return p2.score - p1.score;
		});
		for (var i = 0; i < contest.players.length; i++) {
			var userid = contest.players[i].bot.user._id;
			var username = contest.players[i].bot.user.name, suffix = "";
			if (memberid2nick[userid])
				suffix = " (" + memberid2nick[userid] + ")";
			if (contest.players[i].score == undefined)
				contest.players[i].score = "N/A";
			if (!admintable)
				tabPlayers.append("<tr><td>" + (i + 1) + "</td><td>" +
					Botzone.buildingBlocks.avatar(userid) + " " + Botzone.buildingBlocks.username(userid, username) + suffix +
					"</td><td>" + contest.players[i].bot.bot.name + "</td><td>" + contest.players[i].score + "</td></tr>");
			else
				tabPlayers.append("<tr><td>" + (i + 1) + "</td><td>" +
					Botzone.buildingBlocks.avatar(userid) + " " + Botzone.buildingBlocks.username(userid, username) + suffix +
					"</td><td><a href=\"javascript:;\" onclick=\"Botzone.viewSource('" + contest.players[i].bot.bot._id +
					"', '" + contest.players[i].bot.bot.name + "', " + contest.players[i].bot.ver +
					", '" + contest._id + "')\" data-toggle=\"modal\" data-target=\"#dlgViewSource\">" +
					contest.players[i].bot.bot.name + "</a></td><td>" + contest.players[i].score + "</td></tr>");
			if (userMe && contest.players[i].bot.user._id == userMe._id)
				detailBlock.find(".contest-participant").text(__("group.contests.myparticipant.prompt", contest.players[i].bot.bot.name, contest.players[i].bot.ver));
		}
		playerList.initial = contest.players;
		playerList.reload();

		tabMatches.find("tr:gt(0)").remove();
		var all, matchPages = [], currMatchPage = 0, nav;
		tabMatches.find("tr").after(result.table);
		all = tabMatches.find("tr:gt(0)");
		nav = $(".contestdetail nav ul.pagination").html("").show();
		$("#txtFilterKeyword").val("");
		for (var i = 0; i < all.length; i += 100) {
			matchPages.push(all.slice(i, i + 100));
			nav.append($("<li></li>").append($("<a href=\"javascript:;\">" + matchPages.length + "</a>").click(function () {
				tabMatches.find("tr:gt(0)").remove();
				tabMatches.append(matchPages[parseInt(this.innerHTML) - 1]);
				nav.find("li").removeClass("active");
				$(this).closest("li").addClass("active");
			})));
		}
		nav.find("li:eq(0)").addClass("active");
		tabMatches.find("tr:gt(100)").remove();
		$("#btnFilterMatches").off("click").on("click", function () {
			var keyword = $("#txtFilterKeyword").val();
			if (keyword.length > 0) {
				var result = all.filter(":contains('" + keyword + "')");
				tabMatches.find("tr:gt(0)").remove();
				tabMatches.append(result);
				nav.hide();
			} else {
				nav.show().find("li.active a").click();
			}
		});
		$(".groupblocks").fadeOut(200, function () {
			detailBlock.fadeIn(200);
		});
	});
}

function ShowScoreboardDetail(ctrl) {
	if (ctrl)
		currScoreboard = $(ctrl).closest('tr');
	Botzone.$get("/scoreboard/detail/" + currScoreboard.data("scoreboardid"), null, function (result) {
		var scoreboard = result.scoreboard;
		selectedScoreboard = scoreboard;
		Botzone.defineRefreshAction(ShowScoreboardDetail);
		scoreboardDetailBlock.find(".panel-title span").text(scoreboard.name);
		scoreboardDetailBlock.find(".scoreboard-desc").text(scoreboard.desc);
		scoreboardDetailBlock.find(".scoreboard-updatetime").text(__("groups.scoreboard.updatetime", new Date(scoreboard.update_time)).toString());
		scoreboardDetailBlock.find(".components").html(
			scoreboard.components.reduce(function (last, curr, i) {
				return last + '<li class="list-group-item"><span class="badge">' +
					(curr.factor * 100).toFixed(2) + '%</span>' + contestid2name[curr.contest] + '</li>';
			}, "")
		);
		tabScoreboardPlayers.html("");
		tabScoreboardPlayers.append('<tbody><tr><th>#</th><th>' + __("groups.scoreboard.player") + '</th>' +
			scoreboard.components.reduce(function (last, curr, i) {
				return last + '<th>' + contestid2name[curr.contest] + '</th>';
			}, "")
			+ '<th>' + __("groups.scoreboard.total") + '</th></tr></tbody>');
		for (var i = 0; i < scoreboard.scores.length; i++) {
			var curr = scoreboard.scores[i];
			curr.total = 0;
			for (var j = 0; j < curr.scores.length; j++)
				curr.total += scoreboard.components[j].factor * (curr.scores[j] || 0);
		}
		scoreboard.scores.sort(function (p1, p2) {
			return p2.total - p1.total;
		});
		for (var i = 0; i < scoreboard.scores.length; i++) {
			var curr = scoreboard.scores[i];
			var userid = curr.user, username = memberid2username[userid] || "N/A", suffix = "";
			if (memberid2nick[userid])
				suffix = " (" + memberid2nick[userid] + ")";
			tabScoreboardPlayers.append("<tr><td>" + (i + 1) + "</td><td>" +
				Botzone.buildingBlocks.avatar(userid) + " " + Botzone.buildingBlocks.username(userid, username) + suffix +
				"</td>" +
				scoreboard.components.reduce(function (last, x, i) {
					return last + "<td>" + (curr.scores[i] == undefined ? "N/A" : curr.scores[i].toFixed(2)) + "</td>";
				}, "")
				+ "<td>" + curr.total.toFixed(2) + "</td></tr>");
		}
		$(".groupblocks").fadeOut(200, function () {
			scoreboardDetailBlock.fadeIn(200);
		});
	});
}

function HideContestDetail() {
	currContest = null;
	Botzone.defineRefreshAction();
	detailBlock.fadeOut(200, function () {
		$(".groupblocks").fadeIn(200);
	});
}

function HideScoreboardDetail() {
	currScoreboard = null;
	Botzone.defineRefreshAction();
	scoreboardDetailBlock.fadeOut(200, function () {
		$(".groupblocks").fadeIn(200);
	});
}

function HideHumanContestDetail() {
	currHumanContest = null;
	Botzone.defineRefreshAction();
	humanContestDetailBlock.fadeOut(200, function () {
		$(".groupblocks").fadeIn(200);
	});
}

function BotQuit() {
	Botzone.$get("/quit/" + currContest.data("contestid"), null, function (result) {
		currContest.find(".myparticipant > span").text("");
		currContest.find(".myparticipant span.selectbot").text(__("group.contests.participate"));
		detailBlock.find(".contest-participant").text("N/A");
	});
}

function RestartContest() {
	Botzone.$get("/contest/restart/" + currContest.data("contestid"), null, function (result) {
		ShowContestDetail();
	});
}

function DisplayContest() {
	Botzone.ldscreen.fadeIn();
	window.location.href = "/contest/display/" + prompt("请指定展示模式：目前只支持swiss、knockout", "knockout") + "?contest=" + currContest.data("contestid");
}

function AddMatchToHumanContest() {
	var humanContest = selectedHumanContest;
	$("#iHumanContestID_addmatch").val(humanContest._id);
	$("#txtMatchID").val("");
	$("#dlgAddMatchToHumanContest").modal("show");
}

function RemoveMatchFromHumanContest(ctrl, matchid) {
	var humanContest = selectedHumanContest;
	Botzone.$post("/humancontest/removematch", { humancontestid: humanContest._id, matchid: matchid }, function (result) {
		$(ctrl).closest("tr").remove();
	});
}

function ModifyHumanContest() {
	var humanContest = selectedHumanContest;
	$("#dlgCreateHumanContest .modal-title").text(__("group.humancontests.modify"));
	$("#iHumanContestID").val(humanContest._id);
	$("#txtName_humancontest").val(humanContest.name);
	$("#txtDesc_humancontest").val(humanContest.desc);
	$("#cmbGame_humancontest").val(humanContest.game._id).prop("disabled", true);
	$("#dlgCreateHumanContest").modal("show");
}

function ModifyScoreboard() {
	var scoreboard = selectedScoreboard;
	$("#dlgCreateScoreboard .modal-title").text(__("group.scoreboards.modify"));
	$("#iScoreboardID").val(scoreboard._id);
	$("#txtName_scoreboard").val(scoreboard.name);
	$("#txtDesc_scoreboard").val(scoreboard.desc);
	var $components = $("#tabComponents_scoreboard");
	var $lastrow = $components.find("tr:last-child");
	var $template = $components.find("tr:nth-child(2)");
	$components.find("tr:not(:first-child):not(:last-child)").remove();
	for (var i = 0; i < scoreboard.components.length; i++) {
		var $curr = $template.clone();
		$curr.find("select").val(scoreboard.components[i].contest);
		$curr.find("input").val((scoreboard.components[i].factor * 100).toFixed(2));
		$curr.find(".removerow").prop("disabled", i == 0);
		$lastrow.before($curr);
	}
	if (scoreboard.components.length == Botzone.consts.contest.scoreboard_max_contest_count)
		$components.find("tr:last-child").hide();
	else
		$components.find("tr:last-child").show();
	$("#dlgCreateScoreboard").modal("show");
}

function ModifyContest() {
	var contestid = currContest.data("contestid");
	Botzone.$get("/contest/detail/" + contestid, { modify: true }, function (result) {
		var contest = result.contest;
		$("#dlgCreateContest .modal-title").text(__("group.contests.modify"));
		$("#iContestID").val(contestid);
		editor.setValue(contest.rule);
		$("#iRuleCode").val(contest.rule);
		$("#txtName_contest").val(contest.name);
		$("#txtDesc_contest").val(contest.desc);
		$("#cmbGame").val(contest.game._id).prop("disabled", true);
		$("#cmbStatus_contest").val(contest.status);
		$("#txtTime_contest").val(new Date(contest.start_time).toString());
		document.getElementById("chkSecret_contest").checked = contest.secret;
		$("#dlgCreateContest").modal("show");
		UpdateContestGameParameters();
		CodeToParameters();
	});
}

$(document).ready(function () {
	AceEditorRequirePathFix();
	memberid2nick = {};
	memberid2username = {};
	contestid2name = {};
	for (var i = 0; i < group.members.length; i++) {
		memberid2nick[group.members[i]._id] = neutralize(group.nicks[i]);
		memberid2username[group.members[i]._id] = neutralize(group.members[i].name);
	}
	for (var i = 0; i < group.contests.length; i++)
		contestid2name[group.contests[i]._id] = neutralize(group.contests[i].name);

	$("#btnCreate").click(function () {
		$("#iContestID").val("");
		$("#cmbGame").prop("disabled", false);
		$("#dlgCreateContest .modal-title").text(__("group.contests.createnew"));
	});
	$("#btnCreateScoreboard").click(function () {
		$("#iScoreboardID").val("");
		$("#dlgCreateScoreboard .modal-title").text(__("group.scoreboards.createnew"));
	});
	$("#btnCreateHumanContest").click(function () {
		$("#iHumanContestID").val("");
		$("#dlgCreateHumanContest .modal-title").text(__("group.humancontests.createnew"));
		$("#cmbGame_humancontest").prop("disabled", false);
	});
	tabMatches = $("#tabMatches table");
	tabPlayers = $("#tabPlayers table");
	tabEditPlayers = $("#tabEditPlayers table");
	tabScoreboardPlayers = $("#tabScoreboardPlayers table");
	tabHumanMatches = $("#tabHumanMatches table");
	tabHumanPlayers = $("#tabHumanPlayers table");
	btnBotOperate = $(".btnbotoperate");
	detailBlock = $(".contestdetail");
	scoreboardDetailBlock = $(".scoreboarddetail");
	humanContestDetailBlock = $(".humancontestdetail");
	$("#txtTime_contest").datetimepicker();
	try {
		editor = ace.edit("txtRuleCode_contest");
		editor.getSession().setMode("ace/mode/javascript");
		editor.getSession().setUseWrapMode(true);
	} catch (ex) { }
	var txtVersion = $("#dlgBotSelect .modal-footer input[type=text]");
	var list = $("#dlgBotSelect .botlistitem").click(function (event) {
		list.removeClass("active");
		currBot = bots[$(this).addClass("active").prop("id").substr(3)];
		txtVersion.val(currBot.versions.length - 1);
	});
	$("#dlgBotSelect .modal-footer button[type=submit]").click(function () {
		var ver = txtVersion.val();
		if (!currBot || validateFunctions.checkVersion(ver))
			return alert(__("noselection"));
		Botzone.$get("/participate/" + currContest.data("contestid"), { botid: currBot.versions[ver] }, function (result) {
			currContest.find(".myparticipant > span").text(__("group.contests.myparticipant.prompt", currBot.name, ver));
			detailBlock.find(".contest-participant").text(__("group.contests.myparticipant.prompt", currBot.name, ver));
			currContest.find(".myparticipant span.selectbot").text(__("group.contests.change"));
			$('#dlgBotSelect').modal('hide');
		}, function (errorThrown) {
			$("#dlgBotSelect .alert").addClass("alert-danger").text(errorThrown).slideDown();
		});
	});
	$("#dGroupMembers, #dGroupApply").click(function (e) {
		if ($(this).is(e.target))
			$(this).fadeOut();
	});

	Botzone.defineHashChangedAction(function (to) {
		if (to.length > 1) {
			var target = $("[href='" + to + "'], [href='" + to + "']");
			if (target.data("type") == "contest")
				ShowContestDetail(target[0]);
			else if (target.data("type") == "scoreboard")
				ShowScoreboardDetail(target[0]);
			else if (target.data("type") == "humancontest")
				ShowHumanContestDetail(target[0]);
		} else
			HideContestDetail(), HideScoreboardDetail(), HideHumanContestDetail();
	});

	// 填充用户列表
	var userOptionsHtml = "";
	for (var i = 0; i < _allUsers.length; i++) {
		var id = _allUsers[i]._id;
		if (!userMe || userMe._id != id) {
			userOptionsHtml += '<option value="' + id + '">' + _allUsers[i].name + '</option>';
		}
	}
	$("#cmbgrpOtherUsers").html(userOptionsHtml);
	var $cmbs = [
		$("#dlgUniversalBotSelect").find(".cmbUserName").selectize(),
		$("#cmbNewAdminList").selectize({
			plugins: ['remove_button', 'drag_drop'],
			options: _allUsers,
			labelField: 'name',
			valueField: '_id',
			searchField: ['name'],
			maxItems: Botzone.consts.group.admin_length_max,
			minItems: 1,
			persist: false
		}).each(function () {
			this.selectize.setValue(group.admins);
		}),
		$("#cmbNewUserList").selectize({
			plugins: ['remove_button', 'drag_drop'],
			options: _allUsers,
			labelField: 'name',
			valueField: '_id',
			searchField: ['name'],
			minItems: 1,
			persist: false
		})
	];
	ResetSelectize(document.getElementById("tabBadges_badge"), true);
	Botzone.onExit(function () {
		$cmbs[0][0].selectize.destroy();
		$cmbs[1][0].selectize.destroy();
		$cmbs[2][0].selectize.destroy();
		ResetSelectize(document.getElementById("tabBadges_badge"), false);
	});

	clist = $("#dlgUniversalBotSelect .list-group");
	$(".select-bot-by-user").one("click", function () {
		$("#frmSelectBotByUser button").click();
	});
	clist.find(".botlistitem").click(function (event) {
		clist.find(".botlistitem").removeClass("active");
		currBot = $(this).addClass("active").data("bot");
		$("#dlgUniversalBotSelect .modal-footer input[type=text]").val(currBot.versions.length - 1);
	});

	$("#dlgUniversalBotSelect .modal-footer button[type=submit]").off("click").on("click", function () {
		var selectedBot = clist.find(".botlistitem.active"),
			ver = $("#dlgUniversalBotSelect .modal-footer input[type=text]").val();
		if (selectedBot.length == 0 || validateFunctions.checkVersion(ver))
			return;
		$("#sBotName").text(currBot.name + "【" + ver + "】").data("botid", currBot.versions[ver]);
		ParametersToCode();
		$('#dlgUniversalBotSelect').modal('hide');
	});

	UpdateContestGameParameters();
	Botzone.onExit(function () {
		editor.destroy();
	});
});

function ToggleAdvanced(to) {
	if (to)
		$("#panRuleCodeParameters_contest").fadeOut(function () {
			ParametersToCode();
			$("#txtRuleCode_contest, #btnReturnToBasic").fadeIn();
		});
	else
		$("#txtRuleCode_contest, #btnReturnToBasic").fadeOut(function () {
			CodeToParameters();
			$("#panRuleCodeParameters_contest").fadeIn();
		});
}

function UpdateContestGameParameters() {
	// 读取比赛表单的默认游戏参数
	gameid = $("#cmbGame").val();
	$("#txtPlayerPerMatch").val($("#cmbGame option:selected").data("gamePlayerNum"));
}

/**
 * 将指定容器中的selectize摧毁或重新创建
 * @param {HTMLElement} container 容器
 * @param {boolean} to true为创建，false为摧毁
 */
function ResetSelectize(container, to) {
	var $ctrl = $(container);
	$ctrl.find("select").each(to ? function () {
		var $this = $(this), opt;
		var val = $this.data("lastselected") || this.value;
		if (opt = $this.data("options"))
			$this.selectize({
				options: eval(opt),
				labelField: 'name',
				valueField: '_id',
				searchField: ['name'],
				persist: false
			});
		else
			$this.selectize({
				create: true
			});
		this.selectize.setValue(val);
	} : function () {
		if (this.selectize) {
			var val = this.value;
			this.selectize.destroy();
			$(this).data("lastselected", this.value = val);
		}
	});
}

function RemoveItem(ctrl) {
	var $ctrl = $(ctrl);
	$ctrl.closest("table").find("tr:last-child").show();
	$ctrl.closest("tr").remove();
}

function AddItem(ctrl) {
	var $ctrl = $(ctrl);
	var $table = $ctrl.closest("table");
	var context = $table.attr("id");
	var $tr = $table.find("tr:not(:first-child)");
	if (context == "tabBadges_badge")
		ResetSelectize($tr[0], false);
	var $template = $tr.first().clone();
	if (context == "tabBadges_badge") {
		ResetSelectize($tr[0], true);
		ResetSelectize($template[0], true);
	}
	$template.find(".removerow").prop("disabled", false);
	$tr.last().before($template);
	if (context == "tabComponents_scoreboard") {
		if ($tr.length == Botzone.consts.contest.scoreboard_max_contest_count) // 这是增加了新行之前的行数
			$tr.last().hide();
	}
}

// 比赛表单用
function ViewUserBot(ctrl) {
	var firstone = clist.find(".botlistitem:eq(0)");
	Botzone.$get("/listbots/" + $(ctrl).closest("form").find(".cmbUserName").val(), { game: gameid }, function (result) {
		clist.find(".botlistitem:gt(0)").remove();
		firstone.addClass("hidden");
		for (var i = 0; i < result.bots.length; i++) {
			var template = firstone.clone(true).removeClass("hidden");
			template.data("bot", result.bots[i]);
			template.find("h4").text(result.bots[i].name);
			template.find("p.botversion span").text(__("gametable.slot.botselect.version.info", result.bots[i].versions.length - 1));
			template.find("p.botdesc").text(result.bots[i].desc);
			clist.append(template);
		}
	}, function (errorThrown) {
		firstone.removeClass("hidden").find("h4").text(__("gametable.slot.botselect.fail") + errorThrown);
	});
}

function ReplaceParameterPack(code, param) {
	var parts = code.split('/**AUTO_GENERATED_ABOVE**/\n');
	return "var params = " + JSON.stringify(param) + ";\n\n/**AUTO_GENERATED_ABOVE**/\n" + parts[parts.length - 1];
}

function ParseParameterPack(code) {
	var parts = code.split('/**AUTO_GENERATED_ABOVE**/\n');
	if (parts.length == 1)
		return {};
	return eval(parts[0] + ";params");
}

function ParametersToCode() {
	editor.setValue(ReplaceParameterPack(editor.getValue(), {
		sampleid: $("#sBotName").data("botid"),
		playerPerMatch: $("#txtPlayerPerMatch").val(),
		inheritFrom: $("#cmbInheritResult").val()
	}));
}

function CodeToParameters() {
	var param = ParseParameterPack(editor.getValue());
	var sampleid = param.sampleid || "";
	var playerPerMatch = parseInt(param.playerPerMatch);
	if (isNaN(playerPerMatch))
		playerPerMatch = 0;
	var inheritFrom = param.inheritFrom || "";

	if (sampleid.length > 0) {
		Botzone.$get("/mybots/detail/version/" + sampleid, { game: gameid }, function (result) {
			$("#sBotName").text(result.bot.bot.name + "【" + result.bot.ver + "】").data("botid", result.bot._id);
		});
	} else
		$("#sBotName").text(__("group.contests.rulecode.sampleid.select")).data("botid", "");
	$("#txtPlayerPerMatch").val(playerPerMatch);
	$("#cmbInheritResult").val(inheritFrom);
}

function UpdateRuleCode(ctrl) {
	if (ctrl.value == 'swiss')
		editor.setValue("// 瑞士轮赛制代码\r\n// ***请注意修改以下两个参数！***\r\n\r\n// 选手数不满游戏人数倍数时，填充的SampleBot的ID（可以在Bot页面查询）\r\nvar sampleBotID = params.sampleid || \"53c9ef2d9051741110bb123b\";\r\nscores[sampleBotID] = Number.NEGATIVE_INFINITY;\r\n\r\n// 游戏人数\r\nvar gamePlayerCount = parseInt(params.playerPerMatch);\r\nif (!gamePlayerCount || isNaN(gamePlayerCount))\r\n\tgamePlayerCount = 4;\r\n\r\n// 以下代码可根据需要修改\r\nvar len = players.length;\r\n\r\nfunction RandomizePlayers() {\r\n\t// 1 打乱players\r\n\tfor (var i = len - 1; i \u003e= 0; i--) {\r\n\t\tvar target = Math.floor(Math.random() * i);\r\n\t\tvar tmp = players[target];\r\n\t\tplayers[target] = players[i];\r\n\t\tplayers[i] = tmp;\r\n\t}\r\n\tFollowingSteps();\r\n};\r\n\r\nif (params.inheritFrom \u0026\u0026 params.inheritFrom.length \u003e 0) {\r\n\t// 1 根据继承比赛的结果给players排序\r\n\tobtainContestResult(params.inheritFrom, function (userid2score) {\r\n\t\tif (!userid2score)\r\n\t\t\treturn RandomizePlayers();\r\n\t\tplayers.sort(function (a, b) {\r\n\t\t\treturn (userid2score[b.userid] || 0) - (userid2score[a.userid] || 0);\r\n\t\t});\r\n\t\tFollowingSteps();\r\n\t});\r\n} else\r\n\tRandomizePlayers();\r\n\r\nfunction FollowingSteps() {\r\n\r\n\t// 2 填充Sample\r\n\tfor (var rest = len % gamePlayerCount == 0 ? 0 : (gamePlayerCount - (len % gamePlayerCount)) ; rest \u003e 0; rest--) {\r\n\t\tplayers.push({ _id: sampleBotID });\r\n\t\tlen++;\r\n\t}\r\n\r\n\t// 3 准备……\r\n\tvar roundCount = Math.ceil(Math.log(len) / Math.log(2));\r\n\tvar RoundFinish = function (round) {\r\n\t\tif (round == roundCount) {\r\n\t\t\tcomplete();\r\n\t\t\treturn;\r\n\t\t}\r\n\t\tvar progress = len / gamePlayerCount;\r\n\t\tfor (var i = 0; i \u003c len; i += gamePlayerCount)\r\n\t\t\t(function (i) {\r\n\t\t\t\tvar playerArray = [];\r\n\t\t\t\tfor (var j = 0; j \u003c gamePlayerCount; j++)\r\n\t\t\t\t\tplayerArray[j] = players[i + j]._id;\r\n\t\t\t\trunMatch(playerArray, function (matchid, result) {\r\n\t\t\t\t\t// 将分数录入scores数组\r\n\t\t\t\t\tif (result)\r\n\t\t\t\t\t\tfor (var j = 0; j \u003c gamePlayerCount; j++)\r\n\t\t\t\t\t\t\tif (players[i + j]._id != sampleBotID)\r\n\t\t\t\t\t\t\t\tscores[players[i + j]._id] = scores[players[i + j]._id] ? (scores[players[i + j]._id] + parseFloat(result[j])) : parseFloat(result[j]);\r\n\t\t\t\t\tif (--progress == 0) {\r\n\t\t\t\t\t\t// 根据分数排序\r\n\t\t\t\t\t\tplayers.sort(function (a, b) {\r\n\t\t\t\t\t\t\treturn scores[b._id] - scores[a._id];\r\n\t\t\t\t\t\t});\r\n\t\t\t\t\t\tRoundFinish(round + 1);\r\n\t\t\t\t\t}\r\n\t\t\t\t});\r\n\t\t\t})(i);\r\n\t};\r\n\r\n\t// 4 开始！\r\n\tRoundFinish(0);\r\n};");
	else if (ctrl.value == 'roundrobin')
		editor.setValue("// 1 打乱players\r\nvar len = players.length;\r\nfor (var i = len - 1; i \u003e= 0; i--) {\r\n    var target = Math.floor(Math.random() * i);\r\n    var tmp = players[target];\r\n    players[target] = players[i];\r\n    players[i] = tmp;\r\n}\r\n\r\n// 2 准备两两对局\r\nvar RoundFinish = function (a, b) {\r\n    console.log(\"###### ROUND \" + a + \" VS \" + b + \" ######\");\r\n    if (a \u003e= len) {\r\n        complete();\r\n        return;\r\n    }\r\n    if (b \u003e= len) {\r\n        return RoundFinish(a + 1, 0);\r\n    }\r\n    if (a == b) {\r\n        return RoundFinish(a, b + 1);\r\n    }\r\n    runMatch([players[a]._id, players[b]._id], function (matchid, result) {\r\n        console.log(\"### Match \" + a + \" VS \" + b + \" ends: \" + result + \" ###\");\r\n        if (result) {\r\n            if (result[0] \u003e result[1])\r\n                scores[players[a]._id] = scores[players[a]._id] ? (scores[players[a]._id] + 3) : 3;\r\n            else if (result[0] == result[1]) {\r\n                scores[players[a]._id] = scores[players[a]._id] ? (scores[players[a]._id] + 1) : 1;\r\n                scores[players[b]._id] = scores[players[b]._id] ? (scores[players[b]._id] + 1) : 1;\r\n            } else\r\n                scores[players[b]._id] = scores[players[b]._id] ? (scores[players[b]._id] + 3) : 3;\r\n        }\r\n        setTimeout(RoundFinish, 1, a, b + 1);\r\n    });\r\n};\r\n\r\n// 3 开始！\r\nRoundFinish(0, 0);");
	else if (ctrl.value == 'roundrobinasync')
		editor.setValue("// 1 打乱players\nvar len = players.length;\nfor (var i = len - 1; i >= 0; i--) {\n    var target = Math.floor(Math.random() * i);\n    var tmp = players[target];\n    players[target] = players[i];\n    players[i] = tmp;\n}\n\nfunction runMatchP(players) {\n\treturn new Promise(resolve => {\n\t\trunMatch(players, function (matchid, result) {\n\t\t\tresolve(result);\n\t\t});\n\t})\n}\n\n// 2 准备两两对局\n(async function () {\n\tfor (let a = 0; a < len; a++) {\n\t\tconsole.log(\"###### ROUND \" + a + \" VS all ######\");\n\t\tconst promises = [];\n\t\tfor (let b = 0; b < len; b++) {\n\t\t\tif (a == b) {\n\t\t\t\tcontinue;\n\t\t\t}\n\t\t\tpromises.push(runMatchP([players[a]._id, players[b]._id]).then(result => {\n\t\t\t\tconsole.log(\"### Match \" + a + \" VS \" + b + \" ends: \" + result + \" ###\");\n\t\t\t\tif (result) {\n\t\t\t\t\tif (result[0] > result[1])\n\t\t\t\t\t\tscores[players[a]._id] = scores[players[a]._id] ? (scores[players[a]._id] + 3) : 3;\n\t\t\t\t\telse if (result[0] == result[1]) {\n\t\t\t\t\t\tscores[players[a]._id] = scores[players[a]._id] ? (scores[players[a]._id] + 1) : 1;\n\t\t\t\t\t\tscores[players[b]._id] = scores[players[b]._id] ? (scores[players[b]._id] + 1) : 1;\n\t\t\t\t\t} else\n\t\t\t\t\t\tscores[players[b]._id] = scores[players[b]._id] ? (scores[players[b]._id] + 3) : 3;\n\t\t\t\t}\n\t\t\t}));\n\t\t}\n\t\tawait Promise.all(promises);\n\t}\n\tcomplete();\n})();");
	else if (ctrl.value == 'knockout')
		editor.setValue("// 二进一淘汰赛赛制\r\n// ###请更改以下初始量###\r\nvar initialMatches = [\r\n    [\u0027对局1号玩家ID\u0027, \u0027对局2号玩家ID\u0027],\r\n    [\u0027对局1号玩家ID\u0027, \u0027对局2号玩家ID\u0027],\r\n    [\u0027对局1号玩家ID\u0027, \u0027对局2号玩家ID\u0027],\r\n    [\u0027对局1号玩家ID\u0027, \u0027对局2号玩家ID\u0027]\r\n];\r\n\r\nvar num2chn = [\r\n    \u0027零\u0027, \u0027一\u0027, \u0027二\u0027, \u0027三\u0027, \u0027四\u0027, \u0027五\u0027, \u0027六\u0027, \u0027七\u0027, \u0027八\u0027, \u0027九\u0027\r\n];\r\n\r\n// 1 将players分配到uidmap中\r\nvar uid2player = {};\r\nfor (var i = 0; i < players.length; i++)\r\n    uid2player[players[i].userid] = players[i];\r\nfor (var i in initialMatches) {\r\n    for (var j in initialMatches[i])\r\n        initialMatches[i][j] = uid2player[initialMatches[i][j]];\r\n}\r\n\r\n// 2 准备两两对局\r\nvar matchInfo = [];\r\nvar RoundFinish = function (matches, i, finish) {\r\n    console.log(\"###### ROUND \" + matches[0].user + \" VS \" + matches[1].user + \" ######\");\r\n    if (i \u003e= matches.length) {\r\n        finish();\r\n        return;\r\n    }\r\n    var matchPlayers = matches[i];\r\n    runMatch([matchPlayers[0]._id, matchPlayers[1]._id], function (matchid1, result, loglen1) {\r\n        console.log(\"### Match \" + matchPlayers[0].user + \" VS \" + matchPlayers[1].user + \" (1) ends: \" + result + \" ###\");\r\n        if (result) {\r\n            if (result[0] \u003e result[1]) {\r\n                scores[matchPlayers[0]._id] = scores[matchPlayers[0]._id] ? (scores[matchPlayers[0]._id] + 1) : 1;\r\n                scores[matchPlayers[1]._id] = scores[matchPlayers[1]._id] ? scores[matchPlayers[1]._id] : 0;\r\n            } else if (result[0] == result[1]) {\r\n                scores[matchPlayers[0]._id] = scores[matchPlayers[0]._id] ? (scores[matchPlayers[0]._id] + 1) : 1;\r\n                scores[matchPlayers[1]._id] = scores[matchPlayers[1]._id] ? (scores[matchPlayers[1]._id] + 1) : 1;\r\n            } else {\r\n                scores[matchPlayers[0]._id] = scores[matchPlayers[0]._id] ? scores[matchPlayers[0]._id] : 0;\r\n                scores[matchPlayers[1]._id] = scores[matchPlayers[1]._id] ? (scores[matchPlayers[1]._id] + 1) : 1;\r\n            }\r\n        }\r\n        runMatch([matchPlayers[1]._id, matchPlayers[0]._id], function (matchid2, result, loglen2) {\r\n            console.log(\"### Match \" + matchPlayers[1].user + \" VS \" + matchPlayers[0].user + \" (2)ends: \" + result + \" ###\");\r\n            if (result) {\r\n                if (result[0] \u003e result[1]) {\r\n                    scores[matchPlayers[0]._id] = scores[matchPlayers[0]._id] ? scores[matchPlayers[0]._id] : 0;\r\n                    scores[matchPlayers[1]._id] = scores[matchPlayers[1]._id] ? (scores[matchPlayers[1]._id] + 1) : 1;\r\n                } else if (result[0] == result[1]) {\r\n                    scores[matchPlayers[0]._id] = scores[matchPlayers[0]._id] ? (scores[matchPlayers[0]._id] + 1) : 1;\r\n                    scores[matchPlayers[1]._id] = scores[matchPlayers[1]._id] ? (scores[matchPlayers[1]._id] + 1) : 1;\r\n                } else {\r\n                    scores[matchPlayers[0]._id] = scores[matchPlayers[0]._id] ? (scores[matchPlayers[0]._id] + 1) : 1;\r\n                    scores[matchPlayers[1]._id] = scores[matchPlayers[1]._id] ? scores[matchPlayers[1]._id] : 0;\r\n                }\r\n            }\r\n            if (scores[matchPlayers[0]._id] \u003e scores[matchPlayers[1]._id]) {\r\n                scores[matchPlayers[0]._id] = 1;\r\n                scores[matchPlayers[1]._id] = 0;\r\n                matchInfo.push({ matchPlayers: [matchid1, matchid2], winner: matchPlayers[0], loser: matchPlayers[1] });\r\n                setTimeout(RoundFinish, matchPlayers, i + 1, finish);\r\n            } else if (scores[matchPlayers[0]._id] \u003c scores[matchPlayers[1]._id]) {\r\n                scores[matchPlayers[0]._id] = 0;\r\n                scores[matchPlayers[1]._id] = 1;\r\n                matchInfo.push({ matchPlayers: [matchid1, matchid2], winner: matchPlayers[1], loser: matchPlayers[0] });\r\n                setTimeout(RoundFinish, matchPlayers, i + 1, finish);\r\n            } else {\r\n                console.log(\"### DRAW ###\");\r\n                if (loglen1 \u003e loglen2) {\r\n                    scores[matchPlayers[0]._id] = 0;\r\n                    scores[matchPlayers[1]._id] = 1;\r\n                    matchInfo.push({ matchPlayers: [matchid1, matchid2], winner: matchPlayers[1], loser: matchPlayers[0] });\r\n                    setTimeout(RoundFinish, matchPlayers, i + 1, finish);\r\n                } else if (loglen1 \u003c loglen2) {\r\n                    scores[matchPlayers[0]._id] = 1;\r\n                    scores[matchPlayers[1]._id] = 0;\r\n                    matchInfo.push({ matchPlayers: [matchid1, matchid2], winner: matchPlayers[0], loser: matchPlayers[1] });\r\n                    setTimeout(RoundFinish, matchPlayers, i + 1, finish);\r\n                } else {\r\n                    if (Math.random() \u003e 0.5)\r\n                        runMatch([matchPlayers[1]._id, matchPlayers[0]._id], function (matchid3, result, loglen) {\r\n                            console.log(\"###! Match \" + matchPlayers[1].user + \" VS \" + matchPlayers[0].user + \" (3)ends: \" + result + \" !###\");\r\n                            if (result) {\r\n                                if (result[0] \u003e result[1]) {\r\n                                    scores[matchPlayers[0]._id] = scores[matchPlayers[0]._id] ? scores[matchPlayers[0]._id] : 0;\r\n                                    scores[matchPlayers[1]._id] = scores[matchPlayers[1]._id] ? (scores[matchPlayers[1]._id] + 1) : 1;\r\n                                } else if (result[0] == result[1]) {\r\n                                    scores[matchPlayers[0]._id] = scores[matchPlayers[0]._id] ? (scores[matchPlayers[0]._id] + 1) : 1;\r\n                                    scores[matchPlayers[1]._id] = scores[matchPlayers[1]._id] ? (scores[matchPlayers[1]._id] + 1) : 1;\r\n                                } else {\r\n                                    scores[matchPlayers[0]._id] = scores[matchPlayers[0]._id] ? (scores[matchPlayers[0]._id] + 1) : 1;\r\n                                    scores[matchPlayers[1]._id] = scores[matchPlayers[1]._id] ? scores[matchPlayers[1]._id] : 0;\r\n                                }\r\n                            }\r\n                            if (scores[matchPlayers[0]._id] \u003e scores[matchPlayers[1]._id]) {\r\n                                scores[matchPlayers[0]._id] = 1;\r\n                                scores[matchPlayers[1]._id] = 0;\r\n                                matchInfo.push({ matchPlayers: [matchid1, matchid2, matchid3], winner: matchPlayers[0], loser: matchPlayers[1] });\r\n                            } else if (scores[matchPlayers[0]._id] \u003c scores[matchPlayers[1]._id]) {\r\n                                scores[matchPlayers[0]._id] = 0;\r\n                                scores[matchPlayers[1]._id] = 1;\r\n                                matchInfo.push({ matchPlayers: [matchid1, matchid2, matchid3], winner: matchPlayers[1], loser: matchPlayers[0] });\r\n                            } else {\r\n                                console.log(\"### DRAW2 ERROR ###\");\r\n                            }\r\n                            setTimeout(RoundFinish, matchPlayers, i + 1, finish);\r\n                        });\r\n                    else\r\n                        runMatch([matchPlayers[0]._id, matchPlayers[1]._id], function (matchid, result, loglen) {\r\n                            console.log(\"###! Match \" + matchPlayers[0].user + \" VS \" + matchPlayers[1].user + \" (3)ends: \" + result + \" !###\");\r\n                            if (result) {\r\n                                if (result[0] \u003e result[1]) {\r\n                                    scores[matchPlayers[0]._id] = scores[matchPlayers[0]._id] ? (scores[matchPlayers[0]._id] + 1) : 1;\r\n                                    scores[matchPlayers[1]._id] = scores[matchPlayers[1]._id] ? scores[matchPlayers[1]._id] : 0;\r\n                                } else if (result[0] == result[1]) {\r\n                                    scores[matchPlayers[0]._id] = scores[matchPlayers[0]._id] ? (scores[matchPlayers[0]._id] + 1) : 1;\r\n                                    scores[matchPlayers[1]._id] = scores[matchPlayers[1]._id] ? (scores[matchPlayers[1]._id] + 1) : 1;\r\n                                } else {\r\n                                    scores[matchPlayers[0]._id] = scores[matchPlayers[0]._id] ? scores[matchPlayers[0]._id] : 0;\r\n                                    scores[matchPlayers[1]._id] = scores[matchPlayers[1]._id] ? (scores[matchPlayers[1]._id] + 1) : 1;\r\n                                }\r\n                            }\r\n                            if (scores[matchPlayers[0]._id] \u003e scores[matchPlayers[1]._id]) {\r\n                                scores[matchPlayers[0]._id] = 1;\r\n                                scores[matchPlayers[1]._id] = 0;\r\n                                matchInfo.push({ matchPlayers: [matchid1, matchid2, matchid3], winner: matchPlayers[0], loser: matchPlayers[1] });\r\n                            } else if (scores[matchPlayers[0]._id] \u003c scores[matchPlayers[1]._id]) {\r\n                                scores[matchPlayers[0]._id] = 0;\r\n                                scores[matchPlayers[1]._id] = 1;\r\n                                matchInfo.push({ matchPlayers: [matchid1, matchid2, matchid3], winner: matchPlayers[1], loser: matchPlayers[0] });\r\n                            } else {\r\n                                console.log(\"### DRAW2 ERROR ###\");\r\n                            }\r\n                            setTimeout(RoundFinish, matchPlayers, i + 1, finish);\r\n                        });\r\n                }\r\n            }\r\n        });\r\n    });\r\n};\r\n\r\n// 3 开始！（第一层）\r\nRoundFinish(initialMatches, 0, function () {\r\n    // （第二层）\r\n    var matches = [];\r\n    for (var i = 0; i \u003c initialMatches.length; i += 2) {\r\n        matches[i / 2] = [matchInfo[i].winner, matchInfo[i + 1].winner];\r\n    }\r\n    RoundFinish(matches, 0, function () {\r\n        // （第三层）\r\n        var last = matchInfo.length - 1;\r\n        RoundFinish([[matchInfo[last - 1].loser, matchInfo[last].loser], [matchInfo[last - 1].winner, matchInfo[last].winner]], 0, function () {\r\n            complete(matchInfo);\r\n        });\r\n    });\r\n});");
	else if (ctrl.value == '1pinitdata')
		editor.setValue("/*\r\n * 带初始化数据的单人游戏比赛，需要改动的地方有初始化数据和轮数，随机种子算法可以自定义\r\n */\nvar count = players.length;\nvar roundCount = 3; // 轮数\nvar seed = Math.floor(Math.random() * 15213); // 随机种子\nfor (var i = 0; i < players.length; i++)\n    scores[players[i]._id] = 0;\nvar run = function (i) {\n    var curr = i;\n    runMatch([players[i]._id], function (id, result) {\n        scores[players[curr]._id] += result ? result[0] : 0;\n        if (i == count - 1) {\n            if (--roundCount == 0)\n                complete();\n            else\n                run(0);\n        } else\n            run(i + 1);\n    }, {\n        /* 请在这里调整初始化数据，这里给出的是扫雷游戏的样例 */\n        width: 20,\n        height: 20,\n        seed: seed + roundCount,\n        minecount: 99,\n        skipfirst: true\n    });\n};\nrun(0);");
	ParametersToCode();
}

function AttendGroup(id) {
	Botzone.$post("/group/attend", { group: id }, function (result) {
		Botzone.replacePage(location.href);
	});
}

function CheckUserApplication(id, userid, accept) {
	Botzone.$post("/group/checkuserapplication", { group: id, accept: accept, userid: userid }, function (result) {
		Botzone.replacePage(location.href);
	});
}
function KickUser(id, userid, ctrl) {
	if (!confirm(__("group.members.kick.confirm")))
		return;
	Botzone.$post("/group/kick", { group: id, userid: userid }, function (result) {
		$(ctrl).closest(".groupmember").remove();
	});
}
function ShowMembers() {
	$("#dGroupMembers").fadeIn(200);
}

function ShowApply() {
	$("#dGroupApply").fadeIn(200);
}

function ClearAndFillBadgeList() {
	var fromid = $("#cmbFillListFrom_badge").val();
	Botzone.$get("/contest/badgetitles", { fromid: fromid }, function (result) {
		var $table = $("#tabBadges_badge");
		var $tr = $table.find("tr:not(:first-child)");
		ResetSelectize($tr[0], false);
		$tr.slice(1, $tr.length - 1).remove();
		for (var i = 0; i < result.players.length; i++) {
			var $template;
			if (i == 0) {
				$template = $tr.first();
				$template.find("[name=badge_user]").data("lastselected", result.players[i].userid);
				$template.find("[name=badge_title]").data("lastselected", result.players[i].title);
			} else {
				$template = $tr.first().clone();
				$template.find(".removerow").prop("disabled", false);
				$template.find("[name=badge_user]").data("lastselected", result.players[i].userid);
				$template.find("[name=badge_title]").data("lastselected", result.players[i].title);
				$tr.last().before($template);
				ResetSelectize($template[0], true);
			}
		}
		ResetSelectize($tr[0], true);
	});
}